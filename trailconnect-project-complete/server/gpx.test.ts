import { describe, expect, it } from "vitest";
import { analyzeGpx } from "../shared/gpx";

describe("GPX metrics", () => {
  it("extracts point count, distance and positive elevation from a GPX track", () => {
    const metrics = analyzeGpx(`<?xml version="1.0"?><gpx><trk><trkseg><trkpt lat="49.2827" lon="-123.1207"><ele>25</ele></trkpt><trkpt lat="49.2927" lon="-123.1107"><ele>125</ele></trkpt><trkpt lat="49.3027" lon="-123.1007"><ele>90</ele></trkpt></trkseg></trk></gpx>`);
    expect(metrics.pointCount).toBe(3);
    expect(metrics.distanceKm).toBeGreaterThan(2);
    expect(metrics.elevationGain).toBe(100);
    expect(metrics.elevationLoss).toBe(35);
    expect(metrics.weatherWaypoints).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "start", latitude: 49.2827, elevationMeters: 25 }),
      expect.objectContaining({ label: "high_point", latitude: 49.2927, elevationMeters: 125 }),
      expect.objectContaining({ label: "finish", latitude: 49.3027, elevationMeters: 90 }),
    ]));
  });
});
