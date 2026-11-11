// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventOperationsHub } from "./EventOperationsHub";

const mocks = vi.hoisted(() => ({ createAccess: vi.fn(), createHub: vi.fn(), createPace: vi.fn(), selectPace: vi.fn(), publishDecision: vi.fn(), savePassport: vi.fn() }));
const localeState = vi.hoisted(() => ({ locale: "fr" as "fr" | "en" }));

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: localeState.locale }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({ hiking: { marketplace: { logistics: { detail: { invalidate: vi.fn() } } } } }),
  hiking: {
    events: {
      accessRadar: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      createAccessRadarEntry: { useMutation: () => ({ mutate: mocks.createAccess, isPending: false }) },
      deleteAccessRadarEntry: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      paceGroups: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      createPaceGroup: { useMutation: () => ({ mutate: mocks.createPace, isPending: false }) },
      deletePaceGroup: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      selectPaceGroup: { useMutation: () => ({ mutate: mocks.selectPace, isPending: false }) },
      operationalDecisions: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      publishOperationalDecision: { useMutation: () => ({ mutate: mocks.publishDecision, isPending: false }) },
      acknowledgeOperationalDecision: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      preparation: {
        passport: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
        savePassport: { useMutation: () => ({ mutate: mocks.savePassport, isPending: false }) },
      },
    },
    marketplace: { logistics: {
      hubs: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      createHub: { useMutation: () => ({ mutate: mocks.createHub, isPending: false }) },
      deleteHub: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      offerCarpool: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    } },
  },
} }));

afterEach(() => { cleanup(); vi.clearAllMocks(); localeState.locale = "fr"; });

describe("EventOperationsHub", () => {
  it("shows the organizer cockpit, role limits and optional modules without presenting them as guarantees", () => {
    render(<EventOperationsHub eventId={17} startsAt={new Date(Date.now() + 24 * 60 * 60 * 1000)} canManage carpoolEnabled candidates={[{ userId: 8, name: "Camille" }]} />);
    expect(screen.getByText("Cockpit organisateur")).toBeTruthy();
    expect(screen.getByText("Vous pilotez")).toBeTruthy();
    expect(screen.getByText("Vous ne garantissez pas")).toBeTruthy();
    expect(screen.getAllByText("Optionnel").length).toBeGreaterThan(3);
    fireEvent.click(screen.getByRole("button", { name: /Radar d’accès officiel/i }));
    expect(screen.getByLabelText("Lien HTTPS de la source officielle")).toBeTruthy();
    expect(screen.getByText(/vérifiez à nouveau avant le départ/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Groupes d’allure/i }));
    expect(screen.getByLabelText("Nom du groupe d’allure")).toBeTruthy();
  });

  it("keeps the day-of decision board visibly unavailable before its short window for a participant", () => {
    render(<EventOperationsHub eventId={17} startsAt={new Date(Date.now() + 72 * 60 * 60 * 1000)} canManage={false} carpoolEnabled={false} candidates={[]} />);
    expect(screen.getByText("Vous choisissez")).toBeTruthy();
    expect(screen.getByText("Vous ne modifiez pas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Décision Jour J/i }));
    expect(screen.getByText(/Disponible dans les 48 heures/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Publier la décision" })).toBeNull();
  });

  it("localizes operational labels and select choices in English", () => {
    localeState.locale = "en";
    render(<EventOperationsHub eventId={17} startsAt={new Date(Date.now() + 24 * 60 * 60 * 1000)} canManage carpoolEnabled candidates={[]} />);
    expect(screen.getByText("Organizer cockpit")).toBeTruthy();
    expect(screen.getByText("You coordinate")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Official access radar/i }));
    expect(screen.getByRole("option", { name: "Trail" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "To verify" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "trail" })).toBeNull();
  });
});
