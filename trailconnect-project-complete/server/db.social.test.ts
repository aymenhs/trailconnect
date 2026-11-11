import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordedQuery, Responder } from "./testing/recordingDb";

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

import { DomainError } from "./domainError";
import { acceptSocialInvite, sendDirectMessage, sendFriendRequest } from "./db";

const now = new Date("2026-10-03T12:00:00.000Z");
const nextWeek = "2026-10-10 12:00:00.000";
const lastWeek = "2026-09-26 12:00:00.000";

const statements = (prefix: string) =>
  harness.queries.filter(query => query.sql.startsWith(prefix));

/** Answers by table; anything not listed gets no rows. */
function answer(byTable: Record<string, unknown[][]>): Responder {
  return ({ sql }) => {
    if (!sql.startsWith("select")) return undefined;
    const match = Object.entries(byTable).find(([table]) =>
      sql.includes(`from \`${table}\``)
    );
    return match ? { rows: match[1] } : undefined;
  };
}

beforeEach(() => {
  harness.queries.length = 0;
  harness.respond = () => undefined;
});

describe("acceptSocialInvite", () => {
  it("makes the sender and the invitee friends and tells the sender", async () => {
    harness.respond = answer({
      socialInvitations: [[1, 7, "link", "pending", nextWeek]],
    });

    await expect(acceptSocialInvite("token", 42, now)).resolves.toEqual({
      senderId: 7,
    });

    const [friendship] = statements("insert into `friendships`");
    expect(friendship.params).toEqual(
      expect.arrayContaining([7, 42, "accepted"])
    );
    // A shareable link keeps working for the next person.
    expect(statements("update `socialInvitations`")).toHaveLength(0);
    const [notification] = statements("insert into `userNotifications`");
    expect(notification.params[0]).toBe(7);
  });

  it("uses up an invitation sent to a single address", async () => {
    harness.respond = answer({
      socialInvitations: [[1, 7, "email", "pending", nextWeek]],
    });

    await acceptSocialInvite("token", 42, now);

    const [claim] = statements("update `socialInvitations`");
    expect(claim.params).toEqual(["accepted", 1, "pending"]);
  });

  it.each([
    ["expired", [1, 7, "link", "pending", lastWeek]],
    ["already used", [1, 7, "email", "accepted", nextWeek]],
    ["cancelled", [1, 7, "link", "cancelled", nextWeek]],
  ])("refuses an invitation that is %s", async (_label, row) => {
    harness.respond = answer({ socialInvitations: [row] });

    await expect(acceptSocialInvite("token", 42, now)).rejects.toBeInstanceOf(
      DomainError
    );
    expect(statements("insert into `friendships`")).toHaveLength(0);
  });

  it("refuses one's own invitation and one between blocked members", async () => {
    harness.respond = answer({
      socialInvitations: [[1, 42, "link", "pending", nextWeek]],
    });
    await expect(acceptSocialInvite("token", 42, now)).rejects.toThrow(
      "This is your own invitation"
    );

    harness.respond = answer({
      socialInvitations: [[1, 7, "link", "pending", nextWeek]],
      userBlocks: [[3]],
    });
    await expect(acceptSocialInvite("token", 42, now)).rejects.toBeInstanceOf(
      DomainError
    );
    expect(statements("insert into `friendships`")).toHaveLength(0);
  });
});

describe("sendFriendRequest", () => {
  it("sends nothing between members when one blocked the other", async () => {
    harness.respond = answer({ userBlocks: [[3]] });

    await expect(sendFriendRequest(42, 7)).resolves.toBeUndefined();
    expect(statements("insert into")).toHaveLength(0);
  });
});

describe("direct messages default to friends and outing companions", () => {
  const message = { recipientId: 7, body: "Bonjour !" };

  it("creates the recipient's preferences with the friends policy", async () => {
    harness.respond = answer({ users: [[7]], userMessagingPreferences: [] });

    // The outcome depends on what the insert stored, which this stand-in
    // does not keep; the statement itself is what is checked.
    await sendDirectMessage(42, message).catch(() => undefined);
    const [preferences] = statements("insert into `userMessagingPreferences`");
    expect(preferences.params).toEqual(expect.arrayContaining([7, "friends"]));
  });

  it("refuses a stranger when the recipient keeps messages to friends", async () => {
    harness.respond = answer({
      users: [[7]],
      userMessagingPreferences: [[1, 7, "friends", nextWeek]],
    });

    await expect(sendDirectMessage(42, message)).rejects.toThrow(
      "friends and outing companions only"
    );
    expect(statements("insert into `directMessages`")).toHaveLength(0);
  });

  it("lets a participant write to the organizer of their outing", async () => {
    harness.respond = answer({
      users: [[7]],
      userMessagingPreferences: [[1, 7, "friends", nextWeek]],
      eventParticipants: [[12]],
    });

    await sendDirectMessage(42, message);

    expect(statements("insert into `directMessages`")).toHaveLength(1);
  });
});
