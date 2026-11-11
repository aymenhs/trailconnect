// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationalReadinessPanel } from "./OperationalReadinessPanel";

const mocks = vi.hoisted(() => ({ publish: vi.fn(), publishDate: vi.fn(), addDate: vi.fn(), availability: vi.fn(), withdraw: vi.fn(), saveTemplate: vi.fn(), recordShare: vi.fn(), deleteTemplate: vi.fn() }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({ hiking: { marketplace: { logistics: { detail: { invalidate: vi.fn() } } } } }),
  hiking: {
    events: {
      dayOfBriefComparison: { useQuery: () => ({ data: { current: { meetingPoint: "Stationnement P1", meetingInstructions: null, emergencyPlan: null, operationalRoute: "Boucle principale", backupPlan: null, routeImageUrl: null, createdAt: new Date() }, previous: { meetingPoint: "Accueil", meetingInstructions: null, emergencyPlan: null, operationalRoute: "Ancienne boucle", backupPlan: null, routeImageUrl: null, createdAt: new Date() } } }) },
      operationalDecisions: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      publishOperationalDecision: { useMutation: () => ({ mutate: mocks.publish, isPending: false }) },
      dateOptions: { useQuery: () => ({ data: [{ id: 41, startsAt: "2026-09-20T12:00:00.000Z", label: "Samedi matin", availableCount: 4, myAvailability: null }], refetch: vi.fn() }) },
      createDateOption: { useMutation: () => ({ mutate: mocks.addDate, isPending: false }) },
      updateDateAvailability: { useMutation: () => ({ mutate: mocks.availability, isPending: false }) },
      publishDateOption: { useMutation: (options: { onSuccess?: (result: { eventId: number }, input: { optionId: number }) => void }) => ({ mutate: (input: { optionId: number }) => { mocks.publishDate(input); options.onSuccess?.({ eventId: 92 }, input); }, isPending: false }) },
      invitationTemplates: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      invitationShareStats: { useQuery: () => ({ data: { copies: 2, shares: 1, total: 3 }, refetch: vi.fn() }) },
      createInvitationTemplate: { useMutation: () => ({ mutate: mocks.saveTemplate, isPending: false }) },
      deleteInvitationTemplate: { useMutation: () => ({ mutate: mocks.deleteTemplate, isPending: false }) },
      recordInvitationShare: { useMutation: () => ({ mutate: mocks.recordShare, isPending: false }) },
      postOutingSignals: { useQuery: () => ({ data: { available: true, confirmedParticipants: 5, departureCheckIns: 4, arrivalCheckIns: 3, conditionReports: 2, organizerDecisions: 1, briefVersions: 2 }, refetch: vi.fn() }) },
      departureReadiness: { useQuery: () => ({ data: [{ meetingAcknowledged: true, transportConfirmed: true, checklistCompleted: false, offlineReady: true }, { meetingAcknowledged: true, transportConfirmed: false, checklistCompleted: true, offlineReady: false }] }) },
      dayOfBriefReadStatus: { useQuery: () => ({ data: { confirmedParticipants: 2, acknowledgedParticipants: 1 } }) },
    },
    marketplace: { logistics: { carpoolRecovery: { useQuery: () => ({ data: { replacementSeats: 2, withdrawnOffers: [{ id: 2, departureLocation: "Longueuil", withdrawalNote: "Imprévu", withdrawnAt: new Date() }] }, refetch: vi.fn() }) }, detail: { useQuery: () => ({ data: { carpool: [{ id: 8, driverId: 7, status: "active" }] }, refetch: vi.fn() }) }, withdrawCarpool: { useMutation: () => ({ mutate: mocks.withdraw, isPending: false }) } } },
  },
} }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("OperationalReadinessPanel", () => {
  it("surfaces factual changes and runs the organizer, carpool and availability actions", async () => {
    render(<OperationalReadinessPanel eventId={17} startsAt="2026-09-19T12:00:00.000Z" canManage currentUserId={7} />);
    expect(screen.getAllByText("Rendez-vous").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Itinéraire").length).toBeGreaterThan(0);
    expect(screen.getByText("places de remplacement actuellement proposées")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Décision de l’organisation"), { target: { value: "adapted" } });
    fireEvent.change(screen.getByPlaceholderText(/Note factuelle/), { target: { value: "Départ déplacé au stationnement P1." } });
    fireEvent.click(screen.getByRole("button", { name: "Publier la décision" }));
    expect(mocks.publish).toHaveBeenCalledWith({ eventId: 17, outcome: "adapted", note: "Départ déplacé au stationnement P1." });
    fireEvent.click(screen.getByRole("button", { name: "Retirer mon trajet" }));
    expect(mocks.withdraw).toHaveBeenCalledWith({ offerId: 8 });
    fireEvent.click(screen.getByRole("button", { name: "Je suis disponible" }));
    expect(mocks.availability).toHaveBeenCalledWith({ optionId: 41, available: true });
    fireEvent.click(screen.getByRole("button", { name: "Publier une nouvelle sortie à cette date" }));
    expect(mocks.publishDate).toHaveBeenCalledWith({ optionId: 41 });
    expect((screen.getByLabelText("Brouillon pour les anciens participants") as HTMLTextAreaElement).value).toContain("Samedi");
    expect(screen.getByText("À relire et partager manuellement : aucun message n’est envoyé automatiquement.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Appliquer: Date la plus compatible" }));
    expect((screen.getByLabelText("Brouillon pour les anciens participants") as HTMLTextAreaElement).value).toContain("reçu le plus de disponibilités");
    fireEvent.click(screen.getByRole("button", { name: "Aperçu avant partage" }));
    expect(screen.getByRole("dialog", { name: "Aperçu avant partage" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nom du modèle"), { target: { value: "Invitation de reprise" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer ce modèle" }));
    expect(mocks.saveTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: "Invitation de reprise" }));
    expect(screen.getByText((_, element) => element?.textContent === "2 copies manuelles")).toBeTruthy();
  });
});
