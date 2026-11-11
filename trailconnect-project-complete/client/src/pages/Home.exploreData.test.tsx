import { describe, expect, it } from "vitest";
import { filterExploreEvents, resolveExploreEvents, type HikeEvent } from "./Home";

const baseFilters = { date: "", maxDistanceKm: "", maxElevationGain: "", maxDurationMinutes: "", minCapacity: "", carpoolOnly: false, outingType: "all" as const, bookingMode: "all" as const, period: "upcoming" as const };
const published = { id: 44, title: "Sortie publiée", locationName: "Montréal", startsAt: "2026-09-20T12:00:00.000Z", difficulty: "beginner" as const, distanceKm: 6, elevationGain: 160, durationMinutes: 180, capacity: 8, carpoolEnabled: true, preview: false };

describe("Explorer event sources and period filters", () => {
  it("uses Canadian demonstration outings only when no published outing is returned", () => {
    expect(resolveExploreEvents([]).every(event => event.preview)).toBe(true);
    const resolved = resolveExploreEvents([published]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ id: 44, preview: false });
  });

  it("filters published and demonstration outings consistently by upcoming or past period", () => {
    const reference = new Date("2026-09-15T12:00:00.000Z");
    const events: HikeEvent[] = [...resolveExploreEvents([published]), { ...resolveExploreEvents([])[0], id: -90, startsAt: new Date("2026-09-10T12:00:00.000Z"), preview: true }];
    expect(filterExploreEvents(events, "", "all", { ...baseFilters, period: "upcoming" }, reference).map(event => event.id)).toEqual([44]);
    expect(filterExploreEvents(events, "", "all", { ...baseFilters, period: "past" }, reference).map(event => event.id)).toEqual([-90]);
  });
});
