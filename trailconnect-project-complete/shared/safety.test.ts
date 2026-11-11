import { describe, expect, it } from "vitest";
import { buildSafetyNotice, normalizedDifficulty } from "./safety";

describe("TrailConnect safety guidance", () => {
  it("states when planning information is incomplete without presenting it as a safety guarantee", () => {
    const notice = buildSafetyNotice({ locale: "fr", hasWeatherSource: false, hasEmergencyPlan: true, hasOfflinePack: false });
    expect(notice.complete).toBe(false);
    expect(notice.missing).toEqual(["weather", "offline_pack"]);
    expect(notice.body).toContain("indicatives");
  });

  it("derives an indicative difficulty band from route metrics", () => {
    expect(normalizedDifficulty(4, 150, 90)).toBe("beginner");
    expect(normalizedDifficulty(18, 1200, 420)).toBe("advanced");
  });
});
