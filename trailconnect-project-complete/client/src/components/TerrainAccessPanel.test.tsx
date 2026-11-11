import { describe, expect, it } from "vitest";
import { terrainAccessLabel, terrainAccessTone } from "./TerrainAccessPanel";

describe("TerrainAccessPanel status helpers", () => {
  it("uses factual bilingual status labels", () => {
    expect(terrainAccessLabel("open", "fr")).toBe("Ouvert");
    expect(terrainAccessLabel("restricted", "en")).toBe("Restricted");
    expect(terrainAccessLabel("closed", "fr")).toBe("Fermé");
  });

  it("makes a closed status visually distinct from an open status", () => {
    expect(terrainAccessTone("open")).toContain("emerald");
    expect(terrainAccessTone("closed")).toContain("rose");
  });
});
