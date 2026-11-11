import { describe, expect, it } from "vitest";
import { calculateHikerMatch } from "../shared/matching";

describe("hiker matching", () => {
  const outing = { title: "Lacs et sommets de la Mauricie", description: "Randonnée forestière avec points de vue", locationName: "Parc national de la Mauricie, Québec", startsAt: new Date("2026-09-12T13:00:00Z"), difficulty: "intermediate", distanceKm: 12, elevationGain: 520, capacity: 12, carpoolEnabled: true, guideLanguages: "français, anglais" };

  it("explains interest, weekend availability and suitable group capacity", () => {
    const result = calculateHikerMatch({ preferredDifficulties: "intermediate", preferredLanguages: "français", interests: "lacs, faune", availabilityDays: "weekend", maxHikeDistanceKm: 15, maxElevationGain: 700, carpoolPreference: "need" }, outing);
    expect(result.matchScore).toBeGreaterThan(80);
    expect(result.matchReasons).toEqual(expect.arrayContaining(["difficulty", "distance", "elevation", "carpool", "language", "interest", "availability", "group_size"]));
  });

  it("does not award unavailable weekday or unrelated-interest reasons", () => {
    const weekdayOuting = { ...outing, startsAt: new Date("2026-09-14T13:00:00Z"), capacity: 24 };
    const result = calculateHikerMatch({ interests: "escalade", availabilityDays: "weekend", maxHikeDistanceKm: 20, maxElevationGain: 1000, carpoolPreference: "any" }, weekdayOuting);
    expect(result.matchReasons).not.toContain("interest");
    expect(result.matchReasons).not.toContain("availability");
    expect(result.matchReasons).not.toContain("group_size");
  });
});
