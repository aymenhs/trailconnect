import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * `sameSite: "lax"` is the first-party default: the session rides along on
 * top-level navigations (so returning from the OAuth portal keeps the user
 * signed in) but never on cross-site subrequests, which removes the CSRF
 * surface that `none` opened.
 *
 * `none` was only needed to run inside the Manus preview iframe, and it is a
 * liability outside it — browsers also reject a `SameSite=None` cookie that is
 * not `Secure`, so it broke plain-HTTP local runs.
 *
 * SESSION_COOKIE_SAMESITE=none is the escape hatch for anyone who still has to
 * embed the app cross-site; it forces `secure` on, since the pair is mandatory.
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const crossSite = process.env.SESSION_COOKIE_SAMESITE === "none";

  return {
    httpOnly: true,
    path: "/",
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite || isSecureRequest(req),
  };
}
