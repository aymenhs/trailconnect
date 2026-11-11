import { describe, expect, it } from "vitest";
import { buildRouteShareUrl } from "./ManualRouteShareQrPanel";

describe("manual route QR sharing", () => {
  it("builds a stable event destination without encoding a navigation claim", () => {
    expect(buildRouteShareUrl("https://trailconnect.example/?view=explore", 27)).toBe("https://trailconnect.example/?view=explore&event=27");
  });
});
