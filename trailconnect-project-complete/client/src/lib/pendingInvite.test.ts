// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { rememberPendingInvite, takePendingInvite } from "./pendingInvite";

describe("pending invitation across sign-in", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("hands the token back once, after sign-in", () => {
    rememberPendingInvite("V1StGXR8_Z5jdHi6B-myT0123456789ab");

    expect(takePendingInvite()).toBe("V1StGXR8_Z5jdHi6B-myT0123456789ab");
    expect(takePendingInvite()).toBeNull();
  });

  it("ignores anything that is not an invitation token", () => {
    rememberPendingInvite("../../compte");
    window.sessionStorage.setItem(
      "trailconnect-pending-invite",
      "javascript:alert(1)"
    );

    expect(takePendingInvite()).toBeNull();
  });
});
