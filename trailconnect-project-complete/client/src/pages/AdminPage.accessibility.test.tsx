// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updateSettings: vi.fn() }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 1, role: "admin" } }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({ hiking: { admin: { dashboard: { invalidate: vi.fn() }, users: { invalidate: vi.fn() }, guides: { invalidate: vi.fn() }, reports: { invalidate: vi.fn() }, events: { invalidate: vi.fn() }, posts: { invalidate: vi.fn() }, settings: { invalidate: vi.fn() } } } }),
  hiking: { admin: {
    dashboard: { useQuery: () => ({ data: { users: 4, activeEvents: 2, posts: 3, openReports: 1, suspendedUsers: 0 } }) },
    users: { useQuery: () => ({ data: [] }) }, guides: { useQuery: () => ({ data: [] }) }, reports: { useQuery: () => ({ data: [] }) }, events: { useQuery: () => ({ data: [] }) }, posts: { useQuery: () => ({ data: [] }) },
    settings: { useQuery: () => ({ data: { defaultLocale: "fr", defaultUnits: "metric", defaultTimezone: "America/Toronto", requireEventApproval: false, communityPostingEnabled: true, eventRemindersEnabled: false, externalAlertsEnabled: false, allTrailsEnabled: false, gaiaEnabled: false, stravaEnabled: false, garminEnabled: false } }) },
    updateUserStatus: { useMutation: () => ({ mutate: vi.fn() }) }, reviewGuide: { useMutation: () => ({ mutate: vi.fn() }) }, moderateContent: { useMutation: () => ({ mutate: vi.fn() }) }, updateReport: { useMutation: () => ({ mutate: vi.fn() }) }, updateSettings: { useMutation: () => ({ mutate: mocks.updateSettings }) },
  } },
} }));

import AdminPage from "./AdminPage";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("AdminPage accessibility", () => {
  it("exposes semantic admin tabs and an announced settings switch", async () => {
    const user = userEvent.setup();
    render(<AdminPage onBack={vi.fn()} />);

    const overview = screen.getByRole("tab", { name: "Vue d’ensemble" });
    expect(overview.getAttribute("aria-selected")).toBe("true");
    await user.click(screen.getByRole("tab", { name: "Réglages" }));

    const reminders = screen.getByRole("switch", { name: "Rappels de départ" });
    expect(reminders.getAttribute("aria-checked")).toBe("false");
    await user.click(reminders);
    expect(mocks.updateSettings).toHaveBeenCalledWith({ eventRemindersEnabled: true });

    await user.click(screen.getByRole("tab", { name: "Guides" }));
    expect(screen.getByRole("status").textContent).toContain("Aucun profil guide à examiner");
  });
});
