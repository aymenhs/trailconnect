import { describe, expect, it } from "vitest";
import { getDisplayedRoutePoints, parseCompatibleRouteLink } from "./ManualRoutePlanner";

describe("manual route link parsing", () => {
  it("reads route coordinates and explicit compatible metrics without requiring GPX", () => {
    const parsed = parseCompatibleRouteLink("https://maps.google.com/?origin=45.5017,-73.5673&destination=45.5120,-73.5840&distanceKm=4.2&durationMinutes=75&elevationGain=120");
    expect(parsed.points).toEqual([{ latitude: 45.5017, longitude: -73.5673 }, { latitude: 45.512, longitude: -73.584 }]);
    expect(parsed.metrics).toEqual({ distanceKm: 4.2, durationMinutes: 75, elevationGain: 120 });
  });

  it("keeps malformed links harmless and empty", () => {
    expect(parseCompatibleRouteLink("not a usable route").points).toEqual([]);
  });

  it("accepts coordinate pairs in Google route paths and Apple directions parameters", () => {
    expect(parseCompatibleRouteLink("https://www.google.com/maps/dir/45.5017,-73.5673/45.5120,-73.5840").points).toHaveLength(2);
    expect(parseCompatibleRouteLink("https://maps.apple.com/?saddr=45.5017,-73.5673&daddr=45.5120,-73.5840").points).toHaveLength(2);
  });

  it("builds a reversible out-and-back preview without changing the outgoing points", () => {
    const outgoing = [{ latitude: 45.5, longitude: -73.5 }, { latitude: 45.51, longitude: -73.51 }, { latitude: 45.52, longitude: -73.52 }];
    expect(getDisplayedRoutePoints(outgoing, true)).toEqual([...outgoing, outgoing[1], outgoing[0]]);
    expect(getDisplayedRoutePoints(outgoing, false)).toEqual(outgoing);
  });
});
