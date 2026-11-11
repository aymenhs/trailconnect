// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import MarketplacePage, { MarketplaceEmptyState, OutingCard } from "./MarketplacePage";

const updatePreferences = vi.fn();
const updateGuide = vi.fn();
const marketplaceFixtures = vi.hoisted(() => ({
  outing: { id: 19, title: "Randonnée guidée du Mont-Tremblant", locationName: "Laurentides", startsAt: "2026-09-20T12:00:00.000Z", distanceKm: 11, elevationGain: 540, capacity: 10, carpoolEnabled: true, guideStatus: "approved", matchScore: 91, matchReasons: ["difficulty", "carpool"] },
  guide: { status: "approved", headline: "Randonnées alpines", serviceRegions: "Laurentides", languages: "français, anglais" },
  preferences: { maxHikeDistanceKm: 15, maxElevationGain: 1000, carpoolPreference: "any", preferredDifficulties: "beginner, intermediate", preferredLanguages: "français, anglais", interests: "sommets", availabilityDays: "weekend" },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({}), hiking: { events: { list: { useQuery: () => ({ data: [marketplaceFixtures.outing] }) } }, marketplace: { matches: { useQuery: () => ({ data: [marketplaceFixtures.outing], refetch: vi.fn() }) }, guide: { mine: { useQuery: () => ({ data: marketplaceFixtures.guide, refetch: vi.fn() }) }, update: { useMutation: () => ({ mutate: updateGuide }) } }, preferences: { mine: { useQuery: () => ({ data: marketplaceFixtures.preferences, refetch: vi.fn() }) }, update: { useMutation: () => ({ mutate: updatePreferences }) } } } } } }));

describe("OutingCard trust signals", () => {
  it("announces the marketplace empty state and keeps a refresh action available", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<MarketplaceEmptyState locale="fr" onRefresh={onRefresh} />);
    expect(screen.getByRole("status").textContent).toContain("Aucune sortie correspondante");
    await user.click(screen.getByRole("button", { name: "Actualiser les suggestions" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows recorded organizer trust signals on marketplace discovery cards", () => {
    render(<OutingCard locale="fr" text={{ why: "Pourquoi cette sortie ?" }} onOpen={vi.fn()} event={{ id: 5, title: "Mont Tremblant", locationName: "Laurentides", distanceKm: 10, elevationGain: 450, capacity: 12, carpoolEnabled: true, hostTrust: { phoneVerified: true, guideStatus: "approved", completedHostedOutings: 3, participantCheckInsRecorded: 9, participantCheckInTotal: 12, participantCheckInRate: 75 } }} />);
    expect(screen.getByText("Téléphone confirmé")).toBeTruthy();
    expect(screen.getByText("Guide approuvé")).toBeTruthy();
    expect(screen.getByText("3 sorties réalisées")).toBeTruthy();
    expect(screen.getByText("Suivi : 75 %")).toBeTruthy();
  });

  it("lets a hiker refine matching, open a recommended guided outing, and submit guide information", async () => {
    const user = userEvent.setup();
    const onOpenEvent = vi.fn();
    render(<MarketplacePage onOpenEvent={onOpenEvent} />);
    await user.clear(screen.getByLabelText("Centres d’intérêt"));
    await user.type(screen.getByLabelText("Centres d’intérêt"), "sommets, lacs");
    await user.click(screen.getByRole("button", { name: "Actualiser mes suggestions" }));
    expect(updatePreferences).toHaveBeenCalledWith(expect.objectContaining({ interests: "sommets, lacs", availabilityDays: "weekend" }));
    await user.click(screen.getByRole("button", { name: /Randonnée guidée du Mont-Tremblant/ }));
    expect(onOpenEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 19, startsAt: expect.any(Date) }));
    await user.click(screen.getByRole("button", { name: "Soumettre mon profil guide" }));
    expect(updateGuide).toHaveBeenCalledWith(expect.objectContaining({ headline: "Randonnées alpines", submitForReview: true }));
  });
});
