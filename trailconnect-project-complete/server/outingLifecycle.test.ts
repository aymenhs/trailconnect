import { beforeEach, describe, expect, it, vi } from "vitest";
import { userNotificationPreferences } from "../drizzle/schema";
import {
  tableRow,
  type RecordedQuery,
  type Responder,
} from "./testing/recordingDb";

const harness = vi.hoisted(() => {
  process.env.DATABASE_URL = "mysql://test:test@localhost:3306/trailconnect";
  return {
    respond: (() => undefined) as Responder,
    queries: [] as RecordedQuery[],
  };
});

vi.mock("drizzle-orm/mysql2", async importOriginal => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  const { createRecordingClient } = await import("./testing/recordingDb");
  return {
    ...actual,
    drizzle: () => {
      const { client } = createRecordingClient(query => {
        harness.queries.push(query);
        return harness.respond(query);
      });
      return actual.drizzle(client as never);
    },
  };
});

import {
  COMPLETION_GRACE_MINUTES,
  completeFinishedOutings,
  sendDepartureReminders,
} from "./outingLifecycle";

const now = new Date("2026-10-03T12:00:00.000Z");

const inserts = (table: string) =>
  harness.queries.filter(query =>
    query.sql.startsWith(`insert into \`${table}\``)
  );

beforeEach(() => {
  harness.queries.length = 0;
  harness.respond = () => undefined;
});

describe("completeFinishedOutings", () => {
  it("completes published outings once their planned end and the grace period are over", async () => {
    harness.respond = ({ sql }) =>
      sql.startsWith("update `events`") ? { affectedRows: 3 } : undefined;

    await expect(completeFinishedOutings(now)).resolves.toBe(3);

    const [update] = harness.queries;
    expect(update.sql).toMatch(/^update `events` set `status` = \?/);
    expect(update.sql).toMatch(
      /`events`\.`startsAt` \+ interval \(`events`\.`durationMinutes` \+ \?\) minute <= \?/
    );
    expect(update.params).toEqual([
      "completed",
      "published",
      COMPLETION_GRACE_MINUTES,
      // Same UTC text form as every other datetime drizzle sends.
      "2026-10-03 12:00:00.000",
    ]);
  });
});

describe("sendDepartureReminders", () => {
  const tomorrowsOuting = [
    30,
    42,
    "Mont Albert",
    "Gaspésie",
    "2026-10-04 08:00:00.000",
  ];

  it("reminds each confirmed participant once, the day before", async () => {
    harness.respond = ({ sql, params }) => {
      if (sql.includes("from `eventParticipants`"))
        return { rows: params.includes("day_before") ? [tomorrowsOuting] : [] };
      return undefined;
    };

    await expect(sendDepartureReminders(now)).resolves.toBe(1);

    const [claim] = inserts("eventReminders");
    expect(claim.params).toEqual(
      expect.arrayContaining([30, 42, "in_app", "day_before", "sent"])
    );
    const [notification] = inserts("userNotifications");
    expect(notification.params).toEqual(
      expect.arrayContaining([42, "departure_reminder", "/?event=30"])
    );
  });

  it("sends nothing when another run already recorded the reminder", async () => {
    harness.respond = ({ sql, params }) => {
      if (sql.includes("from `eventParticipants`"))
        return { rows: params.includes("day_before") ? [tomorrowsOuting] : [] };
      if (sql.startsWith("insert into `eventReminders`"))
        return { affectedRows: 0 };
      return undefined;
    };

    await expect(sendDepartureReminders(now)).resolves.toBe(0);
    expect(inserts("userNotifications")).toHaveLength(0);
  });

  it("gives the two reminders separate time windows", async () => {
    await sendDepartureReminders(now);

    const windows = harness.queries
      .filter(query => query.sql.includes("from `eventParticipants`"))
      .map(query => query.params.filter(param => typeof param === "string"));
    expect(windows).toEqual([
      expect.arrayContaining([
        "2026-10-03 14:00:00.000",
        "2026-10-04 12:00:00.000",
      ]),
      expect.arrayContaining([
        "2026-10-03 12:00:00.000",
        "2026-10-03 14:00:00.000",
      ]),
    ]);
  });

  it("does not remind a member who turned departure reminders off", async () => {
    harness.respond = ({ sql, params }) => {
      if (sql.includes("from `eventParticipants`"))
        return { rows: params.includes("day_before") ? [tomorrowsOuting] : [] };
      if (sql.includes("from `userNotificationPreferences`"))
        return {
          rows: [
            tableRow(userNotificationPreferences, {
              id: 1,
              userId: 42,
              departureReminders: false,
            }),
          ],
        };
      return undefined;
    };

    await sendDepartureReminders(now);

    expect(inserts("userNotifications")).toHaveLength(0);
  });
});
