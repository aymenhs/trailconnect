import { describe, expect, it } from "vitest";
import { formatLocationExpiry } from "./LocationSharingControls";

describe("LocationSharingControls", () => {
  it("shows a concise bilingual expiration time", () => {
    const expiry = new Date("2026-08-15T14:30:00Z");
    expect(formatLocationExpiry(expiry, "fr")).toMatch(/\d/);
    expect(formatLocationExpiry(expiry, "en")).toMatch(/\d/);
  });
});
