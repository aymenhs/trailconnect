/**
 * An error whose message is written for the person using the app: "This outing
 * is already at full capacity", "Only the organizer can…".
 *
 * The router used to forward `error.message` of anything thrown, so a failing
 * query sent its SQL text — table names, columns, parameters — to the browser.
 * Only a DomainError's message now reaches the client; any other error is
 * logged and replaced by the procedure's generic fallback.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** The message safe to show for `error`, or `fallback` for anything else. */
export function publicMessage(error: unknown, fallback: string): string {
  if (error instanceof DomainError) return error.message;
  console.error("[API] unexpected error:", error);
  return fallback;
}
