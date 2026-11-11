import { describe, expect, it } from "vitest";
import { shouldActivateOutingPreparation } from "../shared/outingPreparation";

describe("outing preparation access", () => {
  it("keeps preview and non-enrolled outings locked", () => {
    expect(shouldActivateOutingPreparation({ isPreview: true, locallyJoined: true, participationStatus: "going", isOrganizer: true })).toBe(false);
    expect(shouldActivateOutingPreparation({ isPreview: false, locallyJoined: false, participationStatus: undefined, isOrganizer: false })).toBe(false);
  });

  it("activates the hub for a confirmed participant or organizer", () => {
    expect(shouldActivateOutingPreparation({ isPreview: false, locallyJoined: false, participationStatus: "going", isOrganizer: false })).toBe(true);
    expect(shouldActivateOutingPreparation({ isPreview: false, locallyJoined: false, participationStatus: undefined, isOrganizer: true })).toBe(true);
  });
});
