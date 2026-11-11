import { publicProcedure, router } from "./trpc";
import * as db from "../db";

export const systemRouter = router({
  /**
   * Readiness probe.
   *
   * The previous version took a `timestamp` input it never looked at and
   * answered `{ok:true}` unconditionally — it could not tell a healthy server
   * from one whose database was down. `/healthz` is the HTTP equivalent for
   * process supervisors.
   */
  health: publicProcedure.query(async () => {
    // Public: the driver's error text (host, user) stays in the server log.
    const { error, ...database } = await db.checkDatabaseHealth();
    if (error) console.error("[Health] database check failed:", error);
    return { ok: database.ok, database };
  }),

  // `notifyOwner` used to POST to the Manus notification service to alert the
  // project owner. It served no user-facing purpose and was the last caller of
  // that vendor API, so it was removed with the migration. Wire a webhook here
  // (Discord, Slack, ntfy) if an operator alert channel is wanted.
});
