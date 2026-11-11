// Scheduled upkeep of outings, run every 15 minutes by the maintenance timer.
//
// Two things never happened before this module existed:
// - no outing ever reached `completed`. Nothing wrote that status, so the
//   organizer's "outings led", check-in and preparation rates stayed empty,
//   the organizer page listed no past outing and "invite former participants"
//   never found anyone;
// - no departure reminder was ever sent, although the settings page had a
//   switch for them.

import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { eventParticipants, eventReminders, events } from "../drizzle/schema";
import { createUserNotification, getDb } from "./db";

/** How long after its planned end an outing still counts as under way. */
export const COMPLETION_GRACE_MINUTES = 3 * 60;

const MINUTE_MS = 60_000;

type ReminderKind = "day_before" | "two_hours";

/**
 * Each reminder covers its own slice of time, so an outing created an hour
 * before departure gets the short reminder only, not both at once.
 */
const REMINDER_WINDOWS: ReadonlyArray<{
  kind: ReminderKind;
  fromMinutes: number;
  toMinutes: number;
  title: string;
  body: string;
}> = [
  {
    kind: "day_before",
    fromMinutes: 2 * 60,
    toMinutes: 24 * 60,
    title: "Départ demain / Departure tomorrow",
    body: "Vérifiez la météo, le rendez-vous et votre équipement. / Check the weather, the meeting point and your gear.",
  },
  {
    kind: "two_hours",
    fromMinutes: 0,
    toMinutes: 2 * 60,
    title: "Départ bientôt / Departure soon",
    body: "La sortie commence dans moins de deux heures. / The outing starts in less than two hours.",
  },
];

/** Marks as completed every published outing whose planned end has passed. */
export async function completeFinishedOutings(
  now: Date = new Date()
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .update(events)
    .set({ status: "completed" })
    .where(
      and(
        eq(events.status, "published"),
        // `sql.param` with the column as encoder: the date is sent in the
        // same UTC text form drizzle uses for every other datetime.
        sql`${events.startsAt} + interval (${events.durationMinutes} + ${COMPLETION_GRACE_MINUTES}) minute <= ${sql.param(now, events.startsAt)}`
      )
    );
  return result[0].affectedRows;
}

/**
 * Sends each confirmed participant the reminders due now. Every reminder is
 * recorded in `eventReminders` first; the unique key on
 * (event, user, channel, kind) makes a second run — or two runs at once —
 * skip what was already sent.
 */
export async function sendDepartureReminders(
  now: Date = new Date()
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  let sent = 0;
  for (const window of REMINDER_WINDOWS) {
    const due = await db
      .select({
        eventId: events.id,
        userId: eventParticipants.userId,
        title: events.title,
        locationName: events.locationName,
        startsAt: events.startsAt,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(events.id, eventParticipants.eventId))
      .leftJoin(
        eventReminders,
        and(
          eq(eventReminders.eventId, eventParticipants.eventId),
          eq(eventReminders.userId, eventParticipants.userId),
          eq(eventReminders.channel, "in_app"),
          eq(eventReminders.kind, window.kind)
        )
      )
      .where(
        and(
          eq(eventParticipants.status, "going"),
          eq(events.status, "published"),
          gt(
            events.startsAt,
            new Date(now.getTime() + window.fromMinutes * MINUTE_MS)
          ),
          lte(
            events.startsAt,
            new Date(now.getTime() + window.toMinutes * MINUTE_MS)
          ),
          isNull(eventReminders.id)
        )
      );
    for (const reminder of due) {
      const claimed = await db
        .insert(eventReminders)
        .values({
          eventId: reminder.eventId,
          userId: reminder.userId,
          channel: "in_app",
          kind: window.kind,
          scheduledFor: now,
          status: "sent",
        })
        .onDuplicateKeyUpdate({ set: { id: sql`id` } });
      // 0 rows affected: another run recorded it first.
      if (!claimed[0].affectedRows) continue;
      await createUserNotification(reminder.userId, {
        type: "departure_reminder",
        title: `${window.title} · ${reminder.title}`,
        body: `${reminder.locationName} · ${window.body}`,
        actionPath: `/?event=${reminder.eventId}`,
      });
      sent += 1;
    }
  }
  return sent;
}

export async function runOutingMaintenance(now: Date = new Date()) {
  const completed = await completeFinishedOutings(now);
  const reminders = await sendDepartureReminders(now);
  return { completed, reminders };
}
