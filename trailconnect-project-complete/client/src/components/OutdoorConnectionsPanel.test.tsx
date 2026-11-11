// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ consentsQuery: vi.fn(), setConsent: vi.fn() }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { integrations: { myConsents: { useQuery: () => mocks.consentsQuery() }, setConsent: { useMutation: () => ({ mutate: mocks.setConsent, isPending: false }) } } } } }));

import { formatConsentDate, outdoorServiceCopy, OutdoorConnectionsPanel } from "./OutdoorConnectionsPanel";

beforeEach(() => {
  mocks.consentsQuery.mockReturnValue({ data: [{ provider: "strava", purpose: "activity_import", status: "prepared", consentedAt: new Date("2026-08-15T12:00:00Z") }], refetch: vi.fn() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("OutdoorConnectionsPanel", () => {
  it("identifies activity and satellite providers without translation ambiguity", () => {
    expect(outdoorServiceCopy("health_connect", "fr")).toBe("Health Connect");
    expect(outdoorServiceCopy("inreach", "en")).toBe("Garmin inReach");
    expect(formatConsentDate(new Date("2026-08-15T12:00:00Z"), "fr")).toMatch(/2026/);
  });

  it("shows the data scope and asks for confirmation before revoking a prepared consent", async () => {
    const user = userEvent.setup();
    render(<OutdoorConnectionsPanel />);

    expect(screen.getByText("1 consentement(s) préparé(s)")).toBeTruthy();
    expect(screen.getAllByText("Données concernées").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Révoquer" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Révoquer ce consentement");
    expect(mocks.setConsent).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Oui, révoquer" }));
    expect(mocks.setConsent).toHaveBeenCalledWith({ provider: "strava", purpose: "activity_import", enabled: false });
  });
});
