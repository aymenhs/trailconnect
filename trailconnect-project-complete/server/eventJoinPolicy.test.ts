import { describe, expect, it } from "vitest";
import { getJoinRefusal } from "./eventJoinPolicy";

const now = new Date("2026-09-24T12:00:00.000Z");
const openOuting = {
  hostId: 7,
  visibility: "public" as const,
  status: "published" as const,
  moderationStatus: "visible" as const,
  startsAt: new Date("2026-10-01T12:00:00.000Z"),
};

describe("getJoinRefusal", () => {
  it("lets a member join a public, published, upcoming outing", () => {
    expect(getJoinRefusal(openOuting, 42, now)).toBeNull();
  });

  it("refuses the organizer on their own outing", () => {
    expect(getJoinRefusal(openOuting, 7, now)).toBe("organizer");
  });

  it.each([
    { visibility: "private" as const },
    { visibility: "invite" as const },
    { status: "draft" as const },
    { status: "cancelled" as const },
    { status: "completed" as const },
    { moderationStatus: "hidden" as const },
  ])("treats a non-listed outing as unavailable: %o", override => {
    expect(getJoinRefusal({ ...openOuting, ...override }, 42, now)).toBe(
      "unavailable"
    );
  });

  it("refuses an outing that has already started", () => {
    expect(
      getJoinRefusal({ ...openOuting, startsAt: new Date(now) }, 42, now)
    ).toBe("started");
  });
});
