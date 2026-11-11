// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyOutingsPage from "./MyOutingsPage";

const { listOfflinePacks } = vi.hoisted(() => ({
  listOfflinePacks: vi.fn<() => unknown[]>(() => []),
}));

const mine = vi.fn();
const leaveEvent = vi.fn();
const pending = vi.fn();
const respond = vi.fn();
const departureCheckIn = vi.fn();
const notificationList = vi.fn();
const markNotificationRead = vi.fn();
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ locale: "fr" }),
}));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@shared/offline", () => ({ listOfflinePacks }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    hiking: {
      events: {
        mine: { useQuery: (...args: unknown[]) => mine(...args) },
        leave: {
          useMutation: () => ({ mutate: leaveEvent, isPending: false }),
        },
        departureReadiness: {
          useQuery: () => ({
            data: [
              {
                preparationReadyAt: new Date(),
                meetingAcknowledged: true,
                latestWeatherUpdateRead: true,
              },
            ],
          }),
        },
        coOrganizers: {
          pending: { useQuery: (...args: unknown[]) => pending(...args) },
          respond: { useMutation: () => ({ mutate: respond }) },
        },
        series: {
          mine: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
          create: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
          byEvent: { useQuery: () => ({ data: undefined, refetch: vi.fn() }) },
          toggleInterest: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
          relaunchCandidates: {
            useQuery: () => ({ data: [], refetch: vi.fn() }),
          },
          relaunch: {
            useMutation: () => ({
              mutate: vi.fn(),
              isPending: false,
              isSuccess: false,
            }),
          },
        },
      },
      safety: {
        checkIn: {
          useMutation: () => ({ mutate: departureCheckIn, isPending: false }),
        },
      },
      notifications: {
        list: {
          useQuery: (...args: unknown[]) =>
            notificationList(...args) ?? { data: [], refetch: vi.fn() },
        },
        markRead: {
          useMutation: () => ({
            mutate: markNotificationRead,
            isPending: false,
          }),
        },
      },
      media: {
        uploadImage: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
      },
      community: {
        createPost: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
  },
}));

// The fixtures use calendar dates ("2026-09-20" is upcoming). Against the real
// clock they silently turned into past outings and three tests broke on their
// own. Only Date is faked: userEvent and findBy still need real timers.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
  listOfflinePacks.mockReturnValue([]);
});

describe("MyOutingsPage", () => {
  it("shows authenticated preparation and debrief sections and opens an outing hub", async () => {
    const onOpen = vi.fn();
    mine.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 1,
          title: "Boucle des lacs de Mont-Tremblant",
          locationName: "Laurentides · Québec",
          startsAt: "2026-09-20T12:00:00.000Z",
          difficulty: "intermediate",
          distanceKm: 10,
          elevationGain: 450,
          durationMinutes: 300,
          capacity: 12,
          carpoolEnabled: true,
          relationship: "organizer",
          participationStatus: "going",
          coordinationAssignments: [
            { action: "meeting", assigneeId: 7, assigneeName: "Camille" },
            { action: "weather", assigneeId: 7, assigneeName: "Camille" },
            { action: "transport", assigneeId: 12, assigneeName: "Nora" },
          ],
        },
        {
          id: 2,
          title: "Sentier des Caps",
          locationName: "Charlevoix · Québec",
          startsAt: "2025-09-10T12:00:00.000Z",
          difficulty: "beginner",
          distanceKm: 7,
          elevationGain: 240,
          durationMinutes: 210,
          capacity: 10,
          carpoolEnabled: false,
          relationship: "participant",
          participationStatus: "going",
        },
      ],
    });
    pending.mockReturnValue({
      data: [
        {
          id: 8,
          eventTitle: "Boucle des lacs de Mont-Tremblant",
          inviterName: "Aymen",
          valid: true,
        },
        { id: 9, eventTitle: null, valid: false },
      ],
      refetch: vi.fn(),
    });
    render(
      <MyOutingsPage onOpen={onOpen} onExplore={vi.fn()} onCreate={vi.fn()} />
    );
    expect(screen.getByText("À préparer")).toBeTruthy();
    expect(screen.getByText("À débriefer")).toBeTruthy();
    expect(screen.getByText(/Compléter le rendez-vous/)).toBeTruthy();
    expect(screen.getByLabelText("Responsabilités du groupe")).toBeTruthy();
    expect(screen.getAllByText("Camille").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Covoiturage").length).toBeGreaterThan(1);
    expect(screen.getByText("Invitations à co-organiser")).toBeTruthy();
    expect(screen.getByText(/Cette invitation n’est plus valide/)).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Accepter" }));
    expect(respond).toHaveBeenCalledWith({ invitationId: 8, accept: true });
    await user.click(screen.getByRole("button", { name: "Ouvrir le dossier" }));
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relationship: "organizer" })
    );
  });

  it("opens the matching outing automatically when a day-of notification targets it", async () => {
    const onOpen = vi.fn();
    const onAutoOpenHandled = vi.fn();
    mine.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 31,
          title: "Boucle du Mont Saint-Hilaire",
          locationName: "Montérégie · Québec",
          startsAt: "2026-09-20T12:00:00.000Z",
          difficulty: "beginner",
          distanceKm: 7,
          elevationGain: 260,
          durationMinutes: 210,
          capacity: 10,
          carpoolEnabled: true,
          relationship: "participant",
          participationStatus: "going",
        },
      ],
    });
    pending.mockReturnValue({ data: [], refetch: vi.fn() });
    render(
      <MyOutingsPage
        onOpen={onOpen}
        onExplore={vi.fn()}
        onCreate={vi.fn()}
        autoOpenEventId={31}
        onAutoOpenHandled={onAutoOpenHandled}
      />
    );
    await waitFor(() =>
      expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 31 }))
    );
    expect(onAutoOpenHandled).toHaveBeenCalledTimes(1);
  });

  it("shows a sent application in My outings with its pending status and next step", () => {
    mine.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 42,
          title: "Sentier des Sommets",
          locationName: "Estrie · Québec",
          startsAt: "2026-09-22T12:00:00.000Z",
          difficulty: "intermediate",
          distanceKm: 9,
          elevationGain: 420,
          durationMinutes: 280,
          capacity: 10,
          carpoolEnabled: true,
          relationship: "participant",
          participationStatus: "pending",
        },
      ],
    });
    pending.mockReturnValue({ data: [], refetch: vi.fn() });
    render(
      <MyOutingsPage onOpen={vi.fn()} onExplore={vi.fn()} onCreate={vi.fn()} />
    );
    expect(screen.getAllByText("Sentier des Sommets").length).toBeGreaterThan(
      0
    );
    expect(screen.getByText("En attente de validation")).toBeTruthy();
    expect(
      screen.getByText(/Attendre la réponse de l’organisateur/)
    ).toBeTruthy();
  });

  it("announces an empty upcoming-outings state and exposes a tactile explore action", () => {
    const onExplore = vi.fn();
    mine.mockReturnValue({ isLoading: false, data: [] });
    pending.mockReturnValue({ data: [], refetch: vi.fn() });
    render(
      <MyOutingsPage
        onOpen={vi.fn()}
        onExplore={onExplore}
        onCreate={vi.fn()}
      />
    );
    const empty = screen.getByRole("status");
    expect(empty.textContent).toContain("Aucune sortie à préparer");
    const explore = screen.getByRole("button", {
      name: "Découvrir les sorties",
    });
    expect(explore.className).toContain("min-h-11");
  });

  it("surfaces a mobile Today departure card with weather, quick access and a voluntary check-in", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    mine.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 7,
          title: "Départ Mont Saint-Hilaire",
          locationName: "Mont Saint-Hilaire · Québec",
          startsAt: new Date().toISOString(),
          difficulty: "beginner",
          distanceKm: 5,
          elevationGain: 180,
          durationMinutes: 150,
          capacity: 8,
          carpoolEnabled: true,
          relationship: "organizer",
          participationStatus: "going",
          weatherUpdateNote: "Rafales signalées près du stationnement.",
        },
      ],
    });
    pending.mockReturnValue({ data: [], refetch: vi.fn() });
    render(
      <MyOutingsPage onOpen={onOpen} onExplore={vi.fn()} onCreate={vi.fn()} />
    );
    expect(screen.getByText("Aujourd’hui")).toBeTruthy();
    expect(screen.getByText(/Rafales signalées/i)).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Confirmer le départ" })
    );
    expect(departureCheckIn).toHaveBeenCalledWith({
      eventId: 7,
      kind: "departure",
    });
    await user.click(screen.getByRole("button", { name: "Ouvrir le départ" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
    expect(
      screen.getByRole("link", { name: "Urgence 911" }).getAttribute("href")
    ).toBe("tel:911");
  });

  it("shows a visual role badge and lets the hiker acknowledge a new responsibility", async () => {
    const user = userEvent.setup();
    mine.mockReturnValue({ isLoading: false, data: [] });
    pending.mockReturnValue({ data: [], refetch: vi.fn() });
    notificationList.mockReturnValue({
      data: [
        {
          id: 93,
          isRead: false,
          title: "Nouvelle responsabilité",
          body: "Boucle des lacs · vous êtes indiqué comme contact pour météo.",
          actionPath: "/?view=my-outings&focus=responsibilities",
        },
      ],
      refetch: vi.fn(),
    });
    render(
      <MyOutingsPage onOpen={vi.fn()} onExplore={vi.fn()} onCreate={vi.fn()} />
    );
    expect(screen.getByLabelText("1 nouveaux rôles")).toBeTruthy();
    expect(screen.getByText("Nouvelle responsabilité")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Vu" }));
    expect(markNotificationRead).toHaveBeenCalledWith({ notificationId: 93 });
  });

  it("opens a map link for indicative GPS coordinates kept in an offline day-of brief", () => {
    mine.mockReturnValue({ isLoading: false, data: [] });
    pending.mockReturnValue({ data: [], refetch: vi.fn() });
    listOfflinePacks.mockReturnValue([
      {
        version: 1,
        savedAt: "2026-09-05T17:00:00.000Z",
        event: {
          id: 14,
          title: "Mont Saint-Hilaire",
          locationName: "Montérégie · Québec",
          startsAt: "2026-09-06T08:00:00.000Z",
          distanceKm: 8,
          elevationGain: 320,
          durationMinutes: 240,
        },
        checklist: [],
        safetyNote: "Informations indicatives.",
        dayOfBrief: {
          generatedAt: "2026-09-05T17:00:00.000Z",
          operationalRoute: "Boucle du lac",
          backupPlan: "Retour par le belvédère",
          routeImageUrl: "/manus-storage/users/7/social/route.webp",
          terrainLandmarks: [
            {
              type: "water",
              label: "Fontaine du départ",
              status: "reported",
              latitude: 45.5356,
              longitude: -73.1529,
            },
          ],
          carpool: [],
        },
      },
    ]);
    render(
      <MyOutingsPage onOpen={vi.fn()} onExplore={vi.fn()} onCreate={vi.fn()} />
    );
    expect(
      screen.getByText("Coordonnées indicatives : 45.53560, -73.15290")
    ).toBeTruthy();
    expect(screen.getByText("Boucle du lac")).toBeTruthy();
    expect(screen.getByText("Retour par le belvédère")).toBeTruthy();
    expect(
      screen
        .getByRole("img", { name: "Schéma indicatif de l’itinéraire" })
        .getAttribute("src")
    ).toContain("route.webp");
    expect(
      screen
        .getByRole("link", { name: "Ouvrir la position" })
        .getAttribute("href")
    ).toContain("45.5356,-73.1529");
  });

  it("lets a participant withdraw, and never offers it on an outing they organize", async () => {
    mine.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 1,
          title: "Boucle des lacs",
          locationName: "Laurentides",
          startsAt: "2026-09-20T12:00:00.000Z",
          difficulty: "intermediate",
          distanceKm: 10,
          elevationGain: 450,
          durationMinutes: 300,
          capacity: 12,
          carpoolEnabled: true,
          relationship: "organizer",
          participationStatus: "going",
        },
        {
          id: 2,
          title: "Sentier des Caps",
          locationName: "Charlevoix",
          startsAt: "2026-09-22T12:00:00.000Z",
          difficulty: "beginner",
          distanceKm: 7,
          elevationGain: 240,
          durationMinutes: 210,
          capacity: 10,
          carpoolEnabled: false,
          relationship: "participant",
          participationStatus: "going",
        },
      ],
    });
    pending.mockReturnValue({ data: [], refetch: vi.fn() });
    render(
      <MyOutingsPage onOpen={vi.fn()} onExplore={vi.fn()} onCreate={vi.fn()} />
    );

    // One withdraw control only: the organizer cancels their outing instead.
    const trigger = await screen.findByRole("button", { name: /me retirer/i });
    expect(screen.getAllByRole("button", { name: /me retirer/i })).toHaveLength(
      1
    );

    await userEvent.click(trigger);
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toMatch(/place est rendue au groupe/i);

    await userEvent.click(
      within(dialog).getByRole("button", { name: /me retirer/i })
    );
    expect(leaveEvent).toHaveBeenCalledWith({ eventId: 2 });
  });

  it("phrases the action as taking a request back while an application is pending", async () => {
    mine.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 3,
          title: "Mont Albert",
          locationName: "Gaspésie",
          startsAt: "2026-10-02T12:00:00.000Z",
          difficulty: "advanced",
          distanceKm: 17,
          elevationGain: 1100,
          durationMinutes: 480,
          capacity: 8,
          carpoolEnabled: false,
          relationship: "participant",
          participationStatus: "pending",
        },
      ],
    });
    pending.mockReturnValue({ data: [], refetch: vi.fn() });
    render(
      <MyOutingsPage onOpen={vi.fn()} onExplore={vi.fn()} onCreate={vi.fn()} />
    );

    await userEvent.click(
      await screen.findByRole("button", { name: /retirer ma demande/i })
    );
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /retirer la demande/i })
    );
    expect(leaveEvent).toHaveBeenCalledWith({ eventId: 3 });
  });
});
