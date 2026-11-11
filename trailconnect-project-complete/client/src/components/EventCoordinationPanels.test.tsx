// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  createReport: vi.fn(),
  refetch: vi.fn(),
  weatherUpdates: [{ id: 12, note: "Des rafales sont signalées près du stationnement.", createdAt: "2026-08-15T10:30:00.000Z", authorName: "Camille", acknowledgedAt: null }],
  readiness: [{ userId: 9, name: "Alex", meetingAcknowledged: true, preparationReadyAt: "2026-08-15T09:00:00.000Z", latestWeatherUpdateRead: true, checkedInAt: null, carpoolConfirmed: true }],
  reports: [{ id: 3, category: "trail_surface", note: "Quelques sections boueuses après le deuxième belvédère.", createdAt: "2026-08-15T18:00:00.000Z", authorName: "Alex" }],
}));

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { events: {
  weatherUpdates: { useQuery: () => ({ data: mocks.weatherUpdates, isLoading: false, refetch: mocks.refetch }) },
  acknowledgeWeatherUpdate: { useMutation: () => ({ mutate: mocks.acknowledge, isPending: false }) },
  departureReadiness: { useQuery: () => ({ data: mocks.readiness, isLoading: false }) },
  conditionReports: { useQuery: () => ({ data: mocks.reports, refetch: mocks.refetch }) },
  createConditionReport: { useMutation: () => ({ mutate: mocks.createReport, isPending: false }) },
} } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ConditionReports, DepartureReadinessDashboard, WeatherUpdateHistory } from "./EventCoordinationPanels";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Event coordination panels", () => {
  it("shows timestamped weather history and lets a confirmed participant confirm a read receipt", async () => {
    const user = userEvent.setup();
    render(<WeatherUpdateHistory eventId={42} canAcknowledge />);
    expect(screen.getByText("Historique météo")).toBeTruthy();
    expect(screen.getByText(/rafales sont signalées/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Confirmer la lecture" }));
    expect(mocks.acknowledge).toHaveBeenCalledWith({ eventId: 42, weatherUpdateId: 12 });
  });

  it("shows organizer-only factual departure markers without making a safety claim", () => {
    render(<DepartureReadinessDashboard eventId={42} visible />);
    expect(screen.getByText("Prêt pour le départ")).toBeTruthy();
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText(/il n’évalue pas l’aptitude, la sécurité/i)).toBeTruthy();
  });

  it("shows reported conditions and submits a structured post-outing observation", async () => {
    const user = userEvent.setup();
    render(<ConditionReports eventId={42} canCreate isCompleted />);
    expect(screen.getByText("Conditions constatées")).toBeTruthy();
    expect(screen.getByText(/sections boueuses/i)).toBeTruthy();
    await user.type(screen.getByLabelText("Ce que vous avez constaté"), "La passerelle était glissante en fin de journée.");
    await user.click(screen.getByRole("button", { name: "Partager le constat" }));
    expect(mocks.createReport).toHaveBeenCalledWith({ eventId: 42, category: "trail_surface", note: "La passerelle était glissante en fin de journée." });
  });
});
