// Authentication.
//
// This replaces the Manus OAuth SDK, which reached out to api.manus.im on every
// login and on any request whose user was missing from the database. Identity
// now comes from Google directly and the session stays exactly what it already
// was: a locally signed JWT.
//
// `externalId` is the identity column: the user's subject at the identity
// provider. It is an opaque string, so provider identities are namespaced
// (`google:1234…`) and accounts created under Manus keep their existing value
// untouched.

import {
  COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  SESSION_RENEW_AFTER_MS,
} from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  externalId: string;
  appId: string;
  name: string;
  /** Seconds since epoch; absent on tokens minted before renewal existed. */
  issuedAt?: number;
};

export type ExternalIdentity = {
  externalId: string;
  name: string | null;
  email: string | null;
  loginMethod: string;
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

class GoogleOAuthProvider {
  get isConfigured(): boolean {
    return Boolean(ENV.googleClientId && ENV.googleClientSecret);
  }

  /** URL the browser is sent to in order to sign in. */
  buildAuthorizeUrl(state: string, redirectUri: string): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  async exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<ExternalIdentity> {
    if (!this.isConfigured)
      throw new Error("Google OAuth is not configured on this server");

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text().catch(() => "");
      throw new Error(
        `Token exchange failed (${tokenResponse.status}) ${detail}`
      );
    }

    const { access_token: accessToken } = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!accessToken)
      throw new Error("Token exchange returned no access token");

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!profileResponse.ok)
      throw new Error(`User info failed (${profileResponse.status})`);

    const profile = (await profileResponse.json()) as {
      sub?: string;
      name?: string;
      email?: string;
      email_verified?: boolean;
    };
    if (!profile.sub) throw new Error("User info returned no subject");

    return {
      externalId: `google:${profile.sub}`,
      name: profile.name ?? null,
      // An unverified address must not be trusted for account matching.
      email: profile.email_verified ? (profile.email ?? null) : null,
      loginMethod: "google",
    };
  }
}

class SDKServer {
  private readonly google = new GoogleOAuthProvider();

  get isLoginConfigured(): boolean {
    return this.google.isConfigured;
  }

  buildAuthorizeUrl(state: string, redirectUri: string): string {
    return this.google.buildAuthorizeUrl(state, redirectUri);
  }

  async exchangeCodeForIdentity(
    code: string,
    redirectUri: string
  ): Promise<ExternalIdentity> {
    return this.google.exchangeCode(code, redirectUri);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    externalId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      { externalId, appId: ENV.appId, name: options.name || "" },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const expiresInMs = options.expiresInMs ?? SESSION_MAX_AGE_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

    return new SignJWT({
      externalId: payload.externalId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(
        cookieValue,
        this.getSessionSecret(),
        {
          algorithms: ["HS256"],
        }
      );
      const { externalId, appId, name, iat } = payload as Record<
        string,
        unknown
      >;

      if (!isNonEmptyString(externalId) || !isNonEmptyString(appId)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      // The claim was read but never checked, so a token minted by any other
      // app sharing this JWT secret was accepted here.
      if (ENV.appId && appId !== ENV.appId) {
        console.warn("[Auth] Session issued for a different app");
        return null;
      }

      return {
        externalId,
        appId,
        name: isNonEmptyString(name) ? name : "",
        issuedAt: typeof iat === "number" ? iat : undefined,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // Header fallback for clients that cannot keep cookies (native wrappers).
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer "))
        sessionToken = authHeader.slice(7);
    }

    const session = await this.verifySession(sessionToken);
    if (!session) throw ForbiddenError("Invalid session cookie");

    const user = await db.getUserByExternalId(session.externalId);
    // The account is created at the OAuth callback, so a session pointing at
    // nothing means it was deleted — no remote lookup can rescue it.
    if (!user) throw ForbiddenError("User not found");

    // `lastSignedIn` is an activity marker, not an audit trail: refreshing it
    // at most once per window keeps the UPDATE off the hot path.
    const previous = user.lastSignedIn?.getTime() ?? 0;
    const now = Date.now();
    if (now - previous > LAST_SIGNED_IN_REFRESH_MS)
      await db.upsertUser({
        externalId: user.externalId,
        lastSignedIn: new Date(now),
      });

    return user;
  }

  /**
   * Sliding renewal: re-issues the session cookie once it is older than
   * SESSION_RENEW_AFTER_MS, so a 30-day session never lapses for someone who
   * keeps using the app. Tokens from before this change carry no `iat` and are
   * swapped for a 30-day one on first use. Header-based sessions (native
   * wrappers) are left alone: there is no cookie to rewrite.
   */
  async renewSessionCookie(
    req: Request,
    res: Response,
    user: User
  ): Promise<void> {
    const token = this.parseCookies(req.headers.cookie).get(COOKIE_NAME);
    if (!token) return;
    const session = await this.verifySession(token);
    if (!session || session.externalId !== user.externalId) return;
    const ageMs = session.issuedAt
      ? Date.now() - session.issuedAt * 1000
      : Number.POSITIVE_INFINITY;
    if (ageMs < SESSION_RENEW_AFTER_MS) return;
    const fresh = await this.createSessionToken(user.externalId, {
      name: session.name,
      expiresInMs: SESSION_MAX_AGE_MS,
    });
    res.cookie(COOKIE_NAME, fresh, {
      ...getSessionCookieOptions(req),
      maxAge: SESSION_MAX_AGE_MS,
    });
  }
}

/** How stale `users.lastSignedIn` may get before a request refreshes it. */
const LAST_SIGNED_IN_REFRESH_MS = 15 * 60 * 1000;

export type AuthenticatedUser = User;

export const sdk = new SDKServer();
