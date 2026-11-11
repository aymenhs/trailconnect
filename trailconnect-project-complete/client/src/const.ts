export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Starts the sign-in flow.
 *
 * This used to build the authorization URL in the browser: it needed the
 * identity provider's origin and the app id in the client bundle, and it minted
 * the CSRF nonce cookie itself — which made it unsafe to call during render,
 * because a stray call would overwrite the cookie and desync an in-flight
 * login.
 *
 * The server owns all of that now (`/api/oauth/login`), so this is a plain
 * navigation with no side effects beyond leaving the page. Changing identity
 * provider no longer touches the front end.
 */
export const startLogin = () => {
  window.location.href = "/api/oauth/login";
};
