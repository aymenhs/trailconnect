import { describe, expect, it } from "vitest";
import { parseManualRouteJson } from "./ManualRouteMapPreview";

describe("manual route persistence", () => {
  it("keeps legacy arrays readable and defaults them to a one-way route", () => {
    expect(parseManualRouteJson(JSON.stringify([{ latitude: 45.5, longitude: -73.5 }, { latitude: 45.51, longitude: -73.51 }]))).toEqual({ points: [{ latitude: 45.5, longitude: -73.5 }, { latitude: 45.51, longitude: -73.51 }], roundTrip: false, attentionZones: [] });
  });

  it("reads the new route envelope and its out-and-back preference", () => {
    expect(parseManualRouteJson(JSON.stringify({ points: [{ latitude: 45.5, longitude: -73.5 }, { latitude: 45.51, longitude: -73.51 }], returnTrip: true, attentionZones: [{ type: "access", note: "Accès à vérifier", latitude: 45.505, longitude: -73.505 }] }))).toMatchObject({ roundTrip: true, points: [{ latitude: 45.5, longitude: -73.5 }, { latitude: 45.51, longitude: -73.51 }], attentionZones: [{ type: "access", note: "Accès à vérifier" }] });
  });
});
