import { describe, expect, it } from "vitest";
import { safeUploadFilename } from "./uploadFilename";

// The rule the server applies to image and track names.
const ACCEPTED = /^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|gpx|kml)$/i;

describe("safeUploadFilename", () => {
  it.each([
    [
      "Capture d’écran 2026-09-27 à 10.15.png",
      "Capture-d-ecran-2026-09-27-a-10-15.png",
    ],
    ["Mont Albert.gpx", "Mont-Albert.gpx"],
    ["Sortie été — Chic-Chocs.KML", "Sortie-ete-Chic-Chocs.kml"],
    ["IMG_1234.JPEG", "IMG_1234.jpeg"],
  ])("makes %s acceptable", (name, expected) => {
    const safe = safeUploadFilename(name, "photo.jpg");
    expect(safe).toBe(expected);
    expect(safe).toMatch(ACCEPTED);
  });

  it("falls back when nothing usable is left", () => {
    expect(safeUploadFilename("日本.png", "photo.jpg")).toBe("photo.png");
    expect(safeUploadFilename("", "photo.jpg")).toBe("photo.jpg");
  });
});
