import { describe, expect, it } from "vitest";
import { getDynamicPackingChecklist } from "../shared/packing";

describe("dynamic packing checklist", () => {
  it("adds cold-weather and demanding-route equipment", () => {
    const items = getDynamicPackingChecklist({ startsAt: new Date("2026-01-12T10:00:00Z"), distanceKm: 18, elevationGain: 1200, difficulty: "advanced" }, "fr");
    expect(items).toContain("Couche chaude et gants selon les conditions");
    expect(items).toContain("Collation selon votre durée d’effort");
    expect(items).toContain("Couche adaptée aux changements de conditions");
  });

  it("adapts the list to English", () => {
    const items = getDynamicPackingChecklist({ startsAt: new Date("2026-07-12T10:00:00Z"), distanceKm: 5, elevationGain: 150, difficulty: "beginner" }, "en");
    expect(items).toContain("Sun protection for the exposure");
  });
});
