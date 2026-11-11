import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    externalId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      // First-party default: the cookie must not ride along on cross-site
      // subrequests. `none` was only ever needed for the preview iframe.
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });

  it("still allows an explicit cross-site session, and forces Secure with it", async () => {
    const previous = process.env.SESSION_COOKIE_SAMESITE;
    process.env.SESSION_COOKIE_SAMESITE = "none";
    try {
      const { ctx, clearedCookies } = createAuthContext();
      await appRouter.createCaller(ctx).auth.logout();

      expect(clearedCookies[0]?.options).toMatchObject({
        sameSite: "none",
        secure: true,
      });
    } finally {
      if (previous === undefined) delete process.env.SESSION_COOKIE_SAMESITE;
      else process.env.SESSION_COOKIE_SAMESITE = previous;
    }
  });
});
