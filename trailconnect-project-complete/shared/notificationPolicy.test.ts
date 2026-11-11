import { describe, expect, it } from "vitest";
import { shouldDeliverNotification } from "./notificationPolicy";

describe("shouldDeliverNotification", () => {
  it("delivers everything when the member saved no preferences", () => {
    expect(shouldDeliverNotification("group_message", undefined)).toBe(true);
    expect(shouldDeliverNotification("departure_reminder", null)).toBe(true);
  });

  it("honours the switch governing each type", () => {
    const quietChat = { groupMessages: false };
    expect(shouldDeliverNotification("group_message", quietChat)).toBe(false);
    expect(shouldDeliverNotification("event_update", quietChat)).toBe(true);
    expect(
      shouldDeliverNotification("departure_reminder", {
        departureReminders: false,
      })
    ).toBe(false);
    expect(
      shouldDeliverNotification("safety", { safetyAlerts: false })
    ).toBe(false);
  });

  it("silences every optional type when in-app notifications are off", () => {
    const off = { inAppEnabled: false, groupMessages: true };
    expect(shouldDeliverNotification("group_message", off)).toBe(false);
    expect(shouldDeliverNotification("event_update", off)).toBe(false);
  });

  it("always delivers the member's own registration and account notices", () => {
    const allOff = {
      inAppEnabled: false,
      eventUpdates: false,
      groupMessages: false,
      departureReminders: false,
      safetyAlerts: false,
    };
    expect(shouldDeliverNotification("registration", allOff)).toBe(true);
    expect(shouldDeliverNotification("account", allOff)).toBe(true);
  });
});
