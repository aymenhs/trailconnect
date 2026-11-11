import { describe, expect, it } from "vitest";
import { getGpxDownloadName } from "./GpxExchangePanel";

describe("getGpxDownloadName", () => {
  it("creates a portable GPX filename from an accented outing title", () => {
    expect(getGpxDownloadName("Boucle des lacs à Mont-Tremblant")).toBe("boucle-des-lacs-a-mont-tremblant.gpx");
  });
});
