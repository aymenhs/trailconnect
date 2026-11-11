import {
  COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  OAUTH_STATE_COOKIE,
  decodeOAuthState,
  encodeOAuthState,
} from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function callbackUrl(): string {
  return `${ENV.appUrl}/api/oauth/callback`;
}

/**
 * The login redirect is built on the server now.
 *
 * It used to be assembled in the browser, which meant the client bundle had to
 * carry the identity provider's URL and the app id, and any provider change was
 * a front-end change. `/api/oauth/login` keeps that entirely server-side: the
 * client just navigates to it.
 */
export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/login", (req: Request, res: Response) => {
    if (!sdk.isLoginConfigured) {
      res.status(503).json({ error: "login-not-configured" });
      return;
    }

    // CSRF guard: this one-time nonce is echoed back in `state` and compared
    // with the cookie. An attacker can forge `state` but cannot plant a cookie
    // in the victim's browser.
    const nonce = randomUUID();
    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });

    const state = encodeOAuthState({ redirectUri: callbackUrl(), nonce });
    res.redirect(302, sdk.buildAuthorizeUrl(state, callbackUrl()));
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[
      OAUTH_STATE_COOKIE
    ];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, {
      path: "/",
      secure: true,
      sameSite: "lax",
    });

    try {
      const identity = await sdk.exchangeCodeForIdentity(code, callbackUrl());

      await db.upsertUser({
        externalId: identity.externalId,
        name: identity.name,
        email: identity.email,
        loginMethod: identity.loginMethod,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(identity.externalId, {
        name: identity.name || "",
        expiresInMs: SESSION_MAX_AGE_MS,
      });

      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_MAX_AGE_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
