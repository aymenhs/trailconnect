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

vi.mock("./storage", () => ({
  storageDeleteByUrl: vi.fn(async () => true),
}));

import { finalizeDueAccountDeletions } from "./accountErasure";
import { storageDeleteByUrl } from "./storage";

const now = new Date("2026-10-03T12:00:00.000Z");

/** Member 42 is due; they have an avatar and one post with a photo. */
const dueMember: Responder = ({ sql }) => {
  if (sql.includes("`deletionScheduledAt` <= ?")) return { rows: [[42]] };
  if (sql.startsWith("select `avatarUrl`, `coverImageUrl`"))
    return { rows: [["/uploads/users/42/avatar.webp", null]] };
  if (sql.startsWith("select `id`, `imageUrl` from `posts`"))
    return { rows: [[5, "/uploads/users/42/social/recap.jpg"]] };
  if (sql.startsWith("select `id` from `posts`")) return { rows: [[5]] };
  return undefined;
};

const touched = (verb: "delete from" | "update", table: string) =>
  harness.queries.find(query => query.sql.startsWith(`${verb} \`${table}\``));

/** The `set` clause of an UPDATE as { column: value }. */
function assignments(update: RecordedQuery): Record<string, unknown> {
  const setClause = update.sql.slice(0, update.sql.indexOf(" where "));
  const columns = Array.from(setClause.matchAll(/`(\w+)` = \?/g), m => m[1]);
  return Object.fromEntries(
    columns.map((column, index) => [column, update.params[index]])
  );
}

beforeEach(() => {
  harness.queries.length = 0;
  harness.respond = dueMember;
  vi.mocked(storageDeleteByUrl).mockClear();
});

describe("finalizeDueAccountDeletions", () => {
  it("erases a due account inside one transaction", async () => {
    await expect(finalizeDueAccountDeletions(now)).resolves.toBe(1);

    const statements = harness.queries.map(query => query.sql);
    const begin = statements.findIndex(sql => /^begin/i.test(sql));
    const commit = statements.findIndex(sql => /^commit/i.test(sql));
    expect(begin).toBeGreaterThan(-1);
    expect(commit).toBeGreaterThan(begin);
    const anonymize = statements.findIndex(sql =>
      sql.startsWith("update `users`")
    );
    expect(anonymize).toBeGreaterThan(begin);
    expect(anonymize).toBeLessThan(commit);
  });

  it.each([
    "emergencyContacts",
    "liveLocationShares",
    "eventSafetyCheckIns",
    "phoneVerificationChallenges",
    "directMessages",
    "eventMessages",
    "communityGroupMessages",
    "posts",
    "postMedia",
    "userNotifications",
    "linkedSocialAccounts",
    "friendships",
    "follows",
    "userBlocks",
    "eventActionAssignments",
    "eventInvitationShareEvents",
  ])("deletes the member's rows in %s", table => {
    return finalizeDueAccountDeletions(now).then(() => {
      expect(touched("delete from", table)).toBeDefined();
    });
  });

  it("anonymizes the user so that no sign-in can match it again", async () => {
    await finalizeDueAccountDeletions(now);

    const user = touched("update", "users")!;
    const assigned = assignments(user);
    expect(assigned.name).toBeNull();
    expect(assigned.email).toBeNull();
    expect(assigned.loginMethod).toBeNull();
    expect(assigned.externalId).toMatch(/^deleted:42:[\w-]{16}$/);
  });

  it("blanks free text kept on rows other members rely on", async () => {
    await finalizeDueAccountDeletions(now);

    const carpool = touched("update", "carpoolOffers")!;
    expect(carpool.sql).toMatch(/`withdrawalNote` = \?/);
    expect(carpool.params).toContain("Retiré / Removed");
  });

  it("marks the profile deleted and removes the uploaded files", async () => {
    await finalizeDueAccountDeletions(now);

    const profile = touched("update", "userProfiles")!;
    expect(profile.sql).toMatch(/`deletedAt` = \?/);
    expect(profile.params).toContain("private");
    expect(
      vi
        .mocked(storageDeleteByUrl)
        .mock.calls.map(([url]) => url)
        .sort()
    ).toEqual([
      "/uploads/users/42/avatar.webp",
      "/uploads/users/42/social/recap.jpg",
    ]);
  });

  it("leaves the account for the next run when the purge fails", async () => {
    const errors = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    harness.respond = query => {
      if (query.sql.startsWith("update `users`"))
        throw new Error("Lock wait timeout exceeded");
      return dueMember(query);
    };

    await expect(finalizeDueAccountDeletions(now)).resolves.toBe(0);

    const statements = harness.queries.map(query => query.sql);
    expect(statements.some(sql => /^rollback/i.test(sql))).toBe(true);
    expect(
      statements.some(sql => sql.startsWith("update `userProfiles`"))
    ).toBe(false);
    expect(storageDeleteByUrl).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
