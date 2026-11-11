// Sign-in always returns to "/", so an invitation opened while signed out would
// be lost on the way. Its token waits in this tab's sessionStorage and is
// picked up once the member is back and signed in.

const STORAGE_KEY = "trailconnect-pending-invite";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;

export function rememberPendingInvite(token: string): void {
  if (!TOKEN_PATTERN.test(token)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Storage unavailable: the member can open the link again after sign-in.
  }
}

/** The waiting token, removed as it is read so it is only used once. */
export function takePendingInvite(): string | null {
  try {
    const token = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    return token && TOKEN_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}
