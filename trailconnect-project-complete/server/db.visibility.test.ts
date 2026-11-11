import { beforeEach, describe, expect, it, vi } from "vitest";
import { events } from "../drizzle/schema";
import {
  queriesOn,
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

import { DomainError } from "./domainError";
import { eventSearchSchema } from "./hikingValidation";
import {
  createBookingRequest,
  getHikerMatches,
  getOrganizerProfileByPublicSlug,
  getOutingTotals,
  searchPublishedEvents,
} from "./db";

const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

function outing(overrides: Record<string, unknown> = {}) {
  return tableRow(events, {
    id: 30,
    hostId: 7,
    title: "Mont Albert",
    locationName: "Gaspésie",
    startsAt: inTwoDays,
    visibility: "public",
    status: "published",
    moderationStatus: "visible",
    difficulty: "moderate",
    levelAdmissionPolicy: "declarative",
    capacity: 10,
    requiresApproval: true,
    carpoolEnabled: false,
    distanceKm: 12,
    elevationGain: 800,
    durationMinutes: 360,
    ...overrides,
  });
}

/** Asserts that a statement only lets publicly listed outings through. */
function expectPubliclyListed(query: RecordedQuery | undefined) {
  expect(query).toBeDefined();
  expect(query!.sql).toMatch(/`events`\.`visibility` = \?/);
  expect(query!.sql).toMatch(/`events`\.`moderationStatus` = \?/);
  expect(query!.params).toEqual(expect.arrayContaining(["public", "visible"]));
}

beforeEach(() => {
  harness.queries.length = 0;
  harness.respond = () => undefined;
});

describe("outing listings never show a private or moderated outing", () => {
  it("filters the matching candidates on public, visible outings", async () => {
    await getHikerMatches(42);

    expectPubliclyListed(queriesOn(harness.queries, "events")[0]);
  });

  it("filters both outing lists of a public organizer page", async () => {
    harness.respond = ({ sql }) =>
      sql.includes("from `userProfiles`") && sql.includes("`publicSlug` = ?")
        ? {
            rows: [
              [
                7,
                "Ana",
                "ana",
                null,
                null,
                null,
                null,
                "unverified",
                "public",
                "everyone",
              ],
            ],
          }
        : undefined;

    await getOrganizerProfileByPublicSlug("ana");

    const lists = queriesOn(harness.queries, "events").filter(query =>
      query.sql.includes("`events`.`hostId` = ?")
    );
    const outingLists = lists.filter(query =>
      query.sql.includes("`coverImageUrl`")
    );
    expect(outingLists).toHaveLength(2);
    outingLists.forEach(expectPubliclyListed);
  });
});

describe("getOutingTotals", () => {
  it("adds up the completed outings a member led or took part in", async () => {
    harness.respond = ({ sql }) =>
      sql.includes("from `events`")
        ? {
            rows: [
              [12.4, 800],
              [8, 300],
            ],
          }
        : undefined;

    await expect(getOutingTotals(42)).resolves.toEqual({
      totalOutings: 2,
      totalDistanceKm: 20.4,
      totalElevationGain: 1100,
    });
    const [query] = queriesOn(harness.queries, "events");
    expect(query.sql).toMatch(/`events`\.`status` = \?/);
    expect(query.sql).toMatch(/from `eventParticipants`/);
    expect(query.params).toEqual(
      expect.arrayContaining(["completed", 42, "going"])
    );
  });
});

describe("searchPublishedEvents", () => {
  it("never returns an outing that has already started", async () => {
    const before = Date.now();

    await searchPublishedEvents(
      eventSearchSchema.parse({ startsAfter: "2020-01-01" })
    );

    const [search] = queriesOn(harness.queries, "events");
    expectPubliclyListed(search);
    expect(search.sql).toMatch(/`events`\.`startsAt` >= \?/);
    const lowerBound = search.params.find(
      param => typeof param === "string" && /^\d{4}-\d{2}-\d{2} /.test(param)
    ) as string;
    expect(
      Date.parse(`${lowerBound.replace(" ", "T")}Z`)
    ).toBeGreaterThanOrEqual(before - 1000);
  });
});

describe("createBookingRequest", () => {
  const answerWith =
    (event: unknown[], request?: unknown[]): Responder =>
    ({ sql }) => {
      if (sql.includes("from `events`")) return { rows: [event] };
      if (sql.includes("from `eventBookingRequests`"))
        return { rows: request ? [request] : [] };
      return undefined;
    };

  it("refuses a private outing reached by its id", async () => {
    harness.respond = answerWith(outing({ visibility: "private" }));

    await expect(
      createBookingRequest(42, { eventId: 30, levelAcknowledged: false })
    ).resolves.toBeUndefined();
    expect(
      harness.queries.some(query =>
        query.sql.startsWith("insert into `eventBookingRequests`")
      )
    ).toBe(false);
  });

  it("refuses an outing that has already started", async () => {
    harness.respond = answerWith(
      outing({ startsAt: new Date(Date.now() - 60_000) })
    );

    await expect(
      createBookingRequest(42, { eventId: 30, levelAcknowledged: false })
    ).resolves.toBeUndefined();
  });

  it("does not let a declined applicant ask again", async () => {
    harness.respond = answerWith(outing(), [5, "declined"]);

    await expect(
      createBookingRequest(42, { eventId: 30, levelAcknowledged: false })
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("keeps an accepted request accepted", async () => {
    harness.respond = answerWith(outing(), [5, "accepted"]);

    await expect(
      createBookingRequest(42, { eventId: 30, levelAcknowledged: false })
    ).resolves.toBe(5);
    expect(
      harness.queries.some(query =>
        query.sql.startsWith("update `eventBookingRequests`")
      )
    ).toBe(false);
  });

  it("creates the request and tells the organizer", async () => {
    harness.respond = answerWith(outing());

    await createBookingRequest(42, {
      eventId: 30,
      levelAcknowledged: false,
      note: "Première sortie en montagne",
    });

    const insert = harness.queries.find(query =>
      query.sql.startsWith("insert into `eventBookingRequests`")
    );
    expect(insert?.params).toEqual(expect.arrayContaining([30, 42]));
    const notification = harness.queries.find(query =>
      query.sql.startsWith("insert into `userNotifications`")
    );
    expect(notification?.params[0]).toBe(7);
    expect(notification?.params).toContain("/?event=30");
  });
});
