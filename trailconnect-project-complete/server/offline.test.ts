import { describe, expect, it } from "vitest";
import { buildOfflinePack } from "../shared/offline";

describe("offline hiking packs", () => {
  it("bundles an outing with its route, checklist and safety information", () => {
    const pack = buildOfflinePack({
      event: { id: 12, title: "Lac Noir", locationName: "Vanoise", startsAt: "2026-09-06T06:30:00.000Z", distanceKm: 12.4, elevationGain: 890, durationMinutes: 300, gpxUrl: "/manus-storage/trace.gpx" },
      checklist: ["Water · 1.5 L", "Wind jacket"],
      safetyNote: "Check the weather before leaving.",
    }, "2026-08-13T18:00:00.000Z");

    expect(pack).toMatchObject({ version: 1, savedAt: "2026-08-13T18:00:00.000Z" });
    expect(pack.checklist).toHaveLength(2);
    expect(pack.event.gpxUrl).toContain(".gpx");
  });

  it("preserves a printable day-of brief alongside the existing offline route pack", () => {
    const pack = buildOfflinePack({
      event: { id: 14, title: "Mont Saint-Hilaire", locationName: "Montérégie", startsAt: "2026-09-06T08:00:00.000Z", distanceKm: 8, elevationGain: 320, durationMinutes: 240 },
      checklist: ["Water"],
      safetyNote: "Indicative information.",
      dayOfBrief: { generatedAt: "2026-09-05T17:00:00.000Z", meetingPoint: "Main parking", weatherUpdate: "Wind reported", terrainLandmarks: [{ type: "water", label: "Fontaine du départ", status: "reported", latitude: 45.5356, longitude: -73.1529, verifiedAt: "2026-09-04T12:00:00.000Z" }], carpool: [{ departureLocation: "Longueuil", seatsAvailable: 2 }] },
    });
    expect(pack.dayOfBrief?.meetingPoint).toBe("Main parking");
    expect(pack.dayOfBrief?.carpool[0]?.seatsAvailable).toBe(2);
    expect(pack.dayOfBrief?.terrainLandmarks?.[0]?.label).toBe("Fontaine du départ");
    expect(pack.dayOfBrief?.terrainLandmarks?.[0]).toMatchObject({ latitude: 45.5356, longitude: -73.1529 });
    expect(pack.dayOfBrief?.terrainLandmarks?.[0]?.verifiedAt).toBe("2026-09-04T12:00:00.000Z");
  });
});
