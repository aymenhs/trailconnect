// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OutingPreparationPanel from "./OutingPreparationPanel";

let activeLocale: "fr" | "en" = "fr";
const detail = vi.fn();
const mutate = vi.fn();
const checklistProgress = vi.fn();
const updateChecklistItem = vi.fn();
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: activeLocale }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { events: { preparation: { detail: { useQuery: (...args: unknown[]) => detail(...args) }, checklistProgress: { useQuery: (...args: unknown[]) => checklistProgress(...args) }, update: { useMutation: () => ({ mutate, isPending: false }) }, updateChecklistItem: { useMutation: () => ({ mutate: updateChecklistItem, isPending: false }) } } } } } }));

afterEach(() => { cleanup(); activeLocale = "fr"; vi.clearAllMocks(); });

describe("OutingPreparationPanel", () => {
  it("keeps the preparation hub locked for a non-enrolled outing", () => {
    detail.mockReturnValue({ data: undefined, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined={false} isPreview={false} hasMeetingPoint={false} carpoolAvailable={false} offlineReady={false} onSaveOffline={vi.fn()} />);
    expect(screen.getByText("Inscrivez-vous pour activer votre dossier personnel.")).toBeTruthy();
    expect(screen.queryByText("0/4")).toBeNull();
  });

  it("persists checklist confirmation for a joined outing", async () => {
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint carpoolAvailable offlineReady={false} onSaveOffline={vi.fn()} />);
    expect(screen.getByText("Dossier de préparation")).toBeTruthy();
    await userEvent.setup().click(screen.getByText("Ma préparation globale est prête"));
    expect(mutate).toHaveBeenCalledWith({ eventId: 12, checklistCompleted: true });
  });

  it("opens logistics details rather than disabling a missing meeting or transport action", async () => {
    const onOpenSection = vi.fn();
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint={false} carpoolAvailable={false} offlineReady={false} onSaveOffline={vi.fn()} onOpenSection={onOpenSection} />);
    await userEvent.setup().click(screen.getByText("J’ai lu le rendez-vous"));
    expect(onOpenSection).toHaveBeenCalledWith("tc-logistics");
    expect(screen.getByRole("button", { name: /J’ai lu le rendez-vous.*Voir le détail/ })).toBeTruthy();
  });

  it("persists an individual suggested item for the joined participant", async () => {
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint carpoolAvailable offlineReady={false} onSaveOffline={vi.fn()} packingItems={[{ key: "dynamic:water", label: "Eau adaptée à la sortie", category: "essential" }]} />);
    await userEvent.setup().click(screen.getByText("Eau adaptée à la sortie"));
    expect(updateChecklistItem).toHaveBeenCalledWith({ eventId: 12, itemKey: "dynamic:water", checked: true });
  });

  it("adds a voluntary rain cue from the indicative forecast and persists its personal check", async () => {
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint carpoolAvailable offlineReady={false} onSaveOffline={vi.fn()} weatherContext={{ precipitationProbability: 80 }} />);
    expect(screen.getByText("Repères météo personnels")).toBeTruthy();
    expect(screen.getAllByText("Protection contre les précipitations")).toHaveLength(2);
    expect(screen.getByText(/prévisions indicatives de la sortie/)).toBeTruthy();
    await userEvent.setup().click(screen.getAllByText("Protection contre les précipitations")[1]);
    expect(updateChecklistItem).toHaveBeenCalledWith({ eventId: 12, itemKey: "weather:rain", checked: true });
  });

  it("summarizes rain and UV clothing cues in the personal what-to-wear card", () => {
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint carpoolAvailable offlineReady={false} onSaveOffline={vi.fn()} weatherContext={{ precipitationProbability: 80, uvIndexMax: 6 }} />);
    const summary = screen.getByRole("region", { name: "Quoi porter aujourd’hui" });
    expect(summary.textContent).toContain("Protection contre les précipitations");
    expect(summary.textContent).toContain("Crème solaire et lunettes de soleil");
    expect(summary.textContent).toContain("Vérifiez les conditions avant le départ");
  });

  it("shows wind and cold weather cues when both indicative thresholds are reached", () => {
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint carpoolAvailable offlineReady={false} onSaveOffline={vi.fn()} weatherContext={{ windGustKmh: 60, temperatureMinC: -4 }} />);
    expect(screen.getAllByText("Couche coupe-vent")).toHaveLength(2);
    expect(screen.getAllByText("Couche chaude")).toHaveLength(2);
  });

  it("uses the English advisory wording for automatic weather cues", () => {
    activeLocale = "en";
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint carpoolAvailable offlineReady={false} onSaveOffline={vi.fn()} weatherContext={{ precipitationProbability: 80 }} />);
    expect(screen.getByText("Personal weather cues")).toBeTruthy();
    expect(screen.getAllByText("Rain protection")).toHaveLength(2);
    expect(screen.getByText(/indicative forecast/)).toBeTruthy();
  });

  it("uses English wording and handles unavailable weather in the what-to-wear card", () => {
    activeLocale = "en";
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint carpoolAvailable offlineReady={false} onSaveOffline={vi.fn()} />);
    const summary = screen.getByRole("region", { name: "What to wear today" });
    expect(summary.textContent).toContain("Indicative weather is not available yet");
  });

  it("does not create weather cues from ordinary forecast data", () => {
    detail.mockReturnValue({ data: { meetingAcknowledged: false, transportConfirmed: false, checklistCompleted: false, offlineReady: false }, refetch: vi.fn() });
    checklistProgress.mockReturnValue({ data: [], refetch: vi.fn() });
    render(<OutingPreparationPanel eventId={12} joined isPreview={false} hasMeetingPoint carpoolAvailable offlineReady={false} onSaveOffline={vi.fn()} weatherContext={{ temperatureMinC: 8, precipitationProbability: 20, windGustKmh: 25, weatherCode: 2 }} />);
    expect(screen.queryByText("Repères météo personnels")).toBeNull();
  });
});
