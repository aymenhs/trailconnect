import type { events } from "../drizzle/schema";

type Outing = typeof events.$inferSelect;

export type JoinTarget = Pick<
  Outing,
  "hostId" | "visibility" | "status" | "moderationStatus" | "startsAt"
>;

export type JoinRefusal = "organizer" | "unavailable" | "started";

/**
 * Why a member who is not yet attached to an outing may not join it, or null
 * when they may.
 *
 * `events.join` used to trust the bare `eventId`. Ids are sequential, so walking
 * the range signed anyone up to private outings — and a confirmed place is what
 * unlocks the private sheet, the logistics and the carpool. Only an outing that
 * is publicly listed and still ahead can take a new participant.
 */
export function getJoinRefusal(
  event: JoinTarget,
  userId: number,
  now: Date = new Date()
): JoinRefusal | null {
  if (event.hostId === userId) return "organizer";
  if (
    event.visibility !== "public" ||
    event.status !== "published" ||
    event.moderationStatus !== "visible"
  )
    return "unavailable";
  if (event.startsAt.getTime() <= now.getTime()) return "started";
  return null;
}
