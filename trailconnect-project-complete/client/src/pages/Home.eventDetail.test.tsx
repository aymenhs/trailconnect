// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

if (!HTMLElement.prototype.setPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
}

const detail = vi.fn();
const safetyCheckIn = vi.fn();
const createRecap = vi.fn();
const joinEvent = vi.fn();
const leaveEvent = vi.fn();
const bookingRequest = vi.fn();
const carpoolState = vi.hoisted(() => ({ data: { logistics: {}, carpool: [] as any[], reservations: [] as any[] } }));
const weatherState = vi.hoisted(() => ({ data: { available: false, note: "No outlook" } as any, isLoading: false }));
const requestCarpoolSeat = vi.hoisted(() => vi.fn());
const offerCarpool = vi.hoisted(() => vi.fn());
const updateCarpoolOffer = vi.hoisted(() => vi.fn());
const decideCarpoolSeat = vi.hoisted(() => vi.fn());
const removeCarpoolPassenger = vi.hoisted(() => vi.fn());
const setPreparationReady = vi.hoisted(() => vi.fn());
const participantsState = vi.hoisted(() => ({ data: [] as any[] }));
const eventCheckIn = vi.hoisted(() => vi.fn());
const updateEvent = vi.hoisted(() => vi.fn());
const updateCoverFocalPoint = vi.hoisted(() => vi.fn());
const authenticated = { id: 7, name: "Camille" };

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: authenticated }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr", copy: { common: { close: "Fermer", joined: "Inscrit", join: "Participer" }, event: { distance: "Distance", elevation: "Dénivelé", duration: "Durée", places: "Places", carpool: "Covoiturage", safety: "Sécurité", safetyText: "Informations indicatives.", chat: "Discussion" }, explore: { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" }, community: { message: "Message" } } }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/components/OutingPreparationPanel", () => ({ default: ({ joined, isPreview }: { joined: boolean; isPreview: boolean }) => <div data-testid="preparation-state">{isPreview || !joined ? "locked" : "active"}</div> }));
vi.mock("@/components/WeatherOutlook", () => ({ default: () => <div /> }));
vi.mock("@/components/EventCoordinationPanels", () => ({ WeatherUpdateHistory: () => <div />, DepartureReadinessDashboard: () => <div />, ConditionReports: () => <div />, OrganizerReliabilitySignals: () => <div /> }));
vi.mock("@/components/EventFacilitiesPanel", () => ({ default: () => <div /> }));
vi.mock("@/components/LocationSharingControls", () => ({ default: () => <div /> }));
vi.mock("@/components/BookingRequestsPanel", () => ({ default: () => <div /> }));
vi.mock("@/components/OrganizerParticipantCockpit", () => ({ default: () => <div data-testid="organizer-participant-cockpit" /> }));
vi.mock("@/components/Map", () => ({ MapView: () => <div /> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    hiking: {
      events: {
        join: { useMutation: () => ({ mutate: joinEvent, isPending: false }) },
        leave: {
          useMutation: () => ({ mutate: leaveEvent, isPending: false }),
        },
        detail: { useQuery: (...args: unknown[]) => detail(...args) },
        participants: { useQuery: () => ({ ...participantsState, refetch: vi.fn() }) },
        myWaitlistOffer: { useQuery: () => ({ data: null, refetch: vi.fn() }) },
        checkIn: { useMutation: () => ({ mutate: eventCheckIn, isPending: false }) },
        update: { useMutation: () => ({ mutate: updateEvent, isPending: false }) },
        updateManualRoute: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        updateCoverFocalPoint: { useMutation: () => ({ mutate: updateCoverFocalPoint, isPending: false }) },
        cancel: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        promoteWaitlist: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        offerWaitlistPlace: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        acceptWaitlistPlace: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        declineWaitlistPlace: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        setPreparationReady: { useMutation: () => ({ mutate: setPreparationReady, isPending: false }) },
        actionAssignments: { useQuery: () => ({ data: [] }) },
        setActionAssignment: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        terrainLandmarks: { useQuery: () => ({ data: [] }) },
        routePlanHistory: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
        dayOfBriefComparison: { useQuery: () => ({ data: { current: null, previous: null }, refetch: vi.fn() }) },
        dayOfBriefReadStatus: { useQuery: () => ({ data: null, refetch: vi.fn() }) },
        operationalDecisions: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
        publishOperationalDecision: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        acknowledgeOperationalDecision: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        accessRadar: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
        createAccessRadarEntry: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        deleteAccessRadarEntry: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        paceGroups: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
        createPaceGroup: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        deletePaceGroup: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        selectPaceGroup: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        dateOptions: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
        createDateOption: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        updateDateAvailability: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        publishDateOption: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        invitationTemplates: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
        invitationShareStats: { useQuery: () => ({ data: { copies: 0, shares: 0, total: 0 }, refetch: vi.fn() }) },
        createInvitationTemplate: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        deleteInvitationTemplate: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        recordInvitationShare: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        postOutingSignals: { useQuery: () => ({ data: { available: false, confirmedParticipants: 0, departureCheckIns: 0, arrivalCheckIns: 0, conditionReports: 0, organizerDecisions: 0, briefVersions: 0 }, refetch: vi.fn() }) },
        series: {
          byEvent: { useQuery: () => ({ data: undefined, refetch: vi.fn() }) },
          toggleInterest: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          relaunchCandidates: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
          relaunch: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false }) },
        },
        departureReadiness: { useQuery: () => ({ data: [] }) },
        acknowledgeDayOfBrief: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        createTerrainLandmark: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        updateTerrainLandmark: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        deleteTerrainLandmark: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        coOrganizers: {
          sent: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
          invite: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          revoke: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        },
        preparation: {
          packingSummary: { useQuery: () => ({ data: { confirmedParticipants: 0, items: [] }, refetch: vi.fn() }) },
          addPackingItem: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          updatePackingItem: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          deletePackingItem: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          passport: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
          savePassport: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        },
      },
      community: {
        messages: { useQuery: () => ({ data: [] }) },
        sendMessage: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        pinMessage: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        createPost: { useMutation: () => ({ mutate: createRecap, isPending: false }) },
      },
      weather: { outlook: { useQuery: () => weatherState } },
      marketplace: {
        bookings: { request: { useMutation: () => ({ mutate: bookingRequest, isPending: false }) } },
        logistics: {
          detail: { useQuery: () => ({ ...carpoolState, refetch: vi.fn() }) },
          update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          offerCarpool: { useMutation: () => ({ mutate: offerCarpool, isPending: false }) },
          updateCarpool: { useMutation: () => ({ mutate: updateCarpoolOffer, isPending: false }) },
          hubs: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
          createHub: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          deleteHub: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          requestSeat: { useMutation: () => ({ mutate: requestCarpoolSeat, isPending: false }) },
          decideSeat: { useMutation: () => ({ mutate: decideCarpoolSeat, isPending: false }) },
          removePassenger: { useMutation: () => ({ mutate: removeCarpoolPassenger, isPending: false }) },
          withdrawCarpool: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          carpoolRecovery: { useQuery: () => ({ data: { replacementSeats: 0, withdrawnOffers: [] }, refetch: vi.fn() }) },
        },
      },
      media: { uploadImage: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
      safety: {
        consent: { useQuery: () => ({ data: null }) },
        saveConsent: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        checkIn: { useMutation: () => ({ mutate: safetyCheckIn, isPending: false }) },
        checkIns: { useQuery: () => ({ data: [] }) },
      },
      reports: { create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    },
    useUtils: () => ({ hiking: { events: { detail: { invalidate: vi.fn() }, list: { invalidate: vi.fn() }, mine: { invalidate: vi.fn() }, search: { invalidate: vi.fn() }, actionAssignments: { invalidate: vi.fn() }, terrainLandmarks: { invalidate: vi.fn() } }, marketplace: { logistics: { detail: { invalidate: vi.fn() } } } } }),
  },
}));
vi.mock("@shared/offline", () => ({ buildOfflinePack: vi.fn(), saveOfflinePack: vi.fn(), listOfflinePacks: vi.fn(() => []) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { CoordinationJournal, EventCard, EventDetail, MobileNav, PreparationReadiness, SkipToContentLink } from "./Home";

const event = { id: 17, title: "Boucle des lacs de Mont-Tremblant", locationName: "Laurentides · Québec", startsAt: new Date("2026-09-20T12:00:00.000Z"), difficulty: "intermediate" as const, distanceKm: 10, elevationGain: 450, durationMinutes: 300, capacity: 12, carpoolEnabled: true, preview: false };

afterEach(() => { cleanup(); vi.clearAllMocks(); carpoolState.data = { logistics: {}, carpool: [], reservations: [] }; weatherState.data = { available: false, note: "No outlook" }; weatherState.isLoading = false; participantsState.data = []; });

describe("EventDetail preparation access", () => {
  it("shows the AllTrails route source in the initial summary only when one is provided", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {}, allTrailsUrl: "https://www.alltrails.com/trail/canada/quebec/mont-royal" } });
    const { rerender } = render(<EventDetail event={event} onClose={vi.fn()} />);
    const source = screen.getByRole("link", { name: /itinéraire source sur alltrails/i });
    expect(source.getAttribute("href")).toBe("https://www.alltrails.com/trail/canada/quebec/mont-royal");
    expect(source.getAttribute("target")).toBe("_blank");
    expect(source.getAttribute("rel")).toContain("noreferrer");
    expect(screen.getByText("Dossier de la sortie")).toBeTruthy();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {} } });
    rerender(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /itinéraire source sur alltrails/i })).toBeNull();
  });

  it("shows the meeting point beside the main outing metrics or a clear pending state", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: { meetingPoint: "Station Montmorency · entrée B" } } });
    const { rerender } = render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByText("Rendez-vous")).toBeTruthy();
    expect(screen.getByText("Station Montmorency · entrée B")).toBeTruthy();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {} } });
    rerender(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByText("À préciser")).toBeTruthy();
  });

  it("shows the indicative weather range beside the primary metrics or a clear fallback", () => {
    weatherState.data = { available: true, temperatureMinC: 3, temperatureMaxC: 11 };
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {} } });
    const { rerender } = render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByText("Météo ind.")).toBeTruthy();
    expect(screen.getByText("3–11 °C")).toBeTruthy();
    weatherState.data = { available: false, note: "No outlook" };
    rerender(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByText("À vérifier")).toBeTruthy();
  });

  it("keeps preparation locked for a visitor who has not joined", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {}, hostTrust: { completedHostedOutings: 2, participantCheckInsRecorded: 4, participantCheckInTotal: 5, participantCheckInRate: 80 } } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByTestId("preparation-state").textContent).toBe("locked");
    expect(screen.getByText("Dossier de la sortie")).toBeTruthy();
    expect(screen.getByText("2 sorties réalisées")).toBeTruthy();
    expect(screen.getByText("Suivi de présence : 80 % (4/5)")).toBeTruthy();
  });

  it("keeps visible close controls available and closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {} } });
    render(<EventDetail event={event} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Retour aux sorties" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows the organizer status instead of a join action on their own outing", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 7, participationStatus: undefined, checklist: [], logistics: {} } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByText("Vous organisez cette sortie")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Participer" })).toBeNull();
  });

  it("shows a sent application as pending and prevents a second application", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "pending", checklist: [], logistics: {} } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Candidature en attente" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens the dedicated organizer profile from an outing when the organizer profile is public", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {}, hostPublicProfile: { publicSlug: "lucie-rando", avatarUrl: null } } });
    render(<EventDetail event={{ ...event, hostName: "Lucie" } as any} onClose={vi.fn()} />);
    const link = screen.getByRole("link", { name: "Voir le profil organisateur de Lucie" });
    expect(link.getAttribute("href")).toBe("/organizers/lucie-rando");
  });

  it("clearly identifies an illustrative outing instead of presenting a misleading join action", async () => {
    const user = userEvent.setup();
    const onCreatePublishedOuting = vi.fn();
    detail.mockReturnValue({ data: undefined });
    render(<EventDetail event={{ ...event, preview: true }} onClose={vi.fn()} onCreatePublishedOuting={onCreatePublishedOuting} />);

    expect(screen.getByRole("status").textContent).toContain("Aperçu illustratif");
    expect(screen.queryByRole("button", { name: "Participer" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Créer une sortie publiée" }));
    expect(onCreatePublishedOuting).toHaveBeenCalledOnce();
  });

  it("activates preparation for a confirmed participant", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: {} } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByTestId("preparation-state").textContent).toBe("active");
  });

  it("recognizes the organizer from the event card before detail data loads", () => {
    detail.mockReturnValue({ data: undefined });
    render(<EventDetail event={{ ...event, hostId: 7 }} onClose={vi.fn()} />);
    expect(screen.getByText("Vous organisez cette sortie")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Participer" })).toBeNull();
  });

  it("lets a confirmed participant request an available carpool seat", async () => {
    const user = userEvent.setup();
    carpoolState.data = { logistics: {}, carpool: [{ id: 22, driverId: 45, departureLocation: "Montréal · Rosemont", seatsAvailable: 2 }], reservations: [] };
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: {} } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Demander 1 place" }));
    expect(requestCarpoolSeat).toHaveBeenCalledWith({ offerId: 22, seatsRequested: 1 });
  });

  it("lets a confirmed participant declare their preparation without treating it as a safety clearance", async () => {
    const user = userEvent.setup();
    render(<PreparationReadiness locale="fr" readyAt={null} isPending={false} onChange={setPreparationReady} />);
    expect(screen.getByText(/Ce statut aide le groupe à se coordonner ; il ne confirme ni votre aptitude ni la sécurité de la sortie/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Je me déclare prêt" }));
    expect(setPreparationReady).toHaveBeenCalledWith(true);
  });

	it("opens the organizer cockpit in a dedicated management drawer instead of the main detail flow", async () => {
	    const user = userEvent.setup();
	    detail.mockReturnValue({ data: { id: 17, hostId: 7, participationStatus: undefined, checklist: [], logistics: {} } });
	    render(<EventDetail event={event} onClose={vi.fn()} />);
	    expect(screen.queryByTestId("organizer-participant-cockpit")).toBeNull();
	    await user.click(screen.getByRole("button", { name: "Gérer" }));
	    expect(screen.getAllByText("Pilotage de la sortie").length).toBeGreaterThan(0);
	    expect(screen.getByTestId("organizer-participant-cockpit")).toBeTruthy();
	  });

  it("keeps organizer navigation concise with a fixed shortcut and collapsed advanced sections", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 7, participationStatus: undefined, checklist: [], logistics: {} } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Gérer" })).toBeTruthy();
    expect(screen.getByText("Coorganisation et délégation")).toBeTruthy();
    expect(screen.getByText("Outils avancés de la sortie")).toBeTruthy();
    expect(screen.getAllByText("Journal de coordination").length).toBeGreaterThan(0);
  });

  it("keeps the long outing dossier collapsed until a visitor explicitly opens it", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {} } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    const dossier = screen.getByText("Dossier de la sortie").closest("details");
    expect(dossier).toBeTruthy();
    expect(dossier?.open).toBe(false);
    await user.click(screen.getByText("Dossier de la sortie"));
    expect(dossier?.open).toBe(true);
  });

  it("renders operational shortcut buttons once the outing dossier is opened", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: {}, hostTrust: { phoneVerified: true } } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    await user.click(screen.getByText("Dossier de la sortie"));
    expect(screen.getByRole("button", { name: /Parcours/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Confiance/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Conditions/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Logistique/i })).toBeTruthy();
  });

  it("turns shared departure into a concrete carpool seat request", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: {} } });
    carpoolState.data = { logistics: {}, carpool: [{ id: 41, driverId: 33, driverName: "Alex", departureLocation: "Station Montmorency", seatsAvailable: 2 }], reservations: [] };
    render(<EventDetail event={event} onClose={vi.fn()} />);
    await user.click(screen.getByText("Dossier de la sortie"));
    await user.click(screen.getByRole("button", { name: /Départ partagé/ }));
    await user.click(screen.getByRole("button", { name: "Demander 1 place" }));
    expect(requestCarpoolSeat).toHaveBeenCalledWith({ offerId: 41, seatsRequested: 1 });
  });

  it("shows an explicit no-offer state with an option to offer a ride", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: {} } });
    carpoolState.data = { logistics: {}, carpool: [], reservations: [] };
    render(<EventDetail event={event} onClose={vi.fn()} />);
    await user.click(screen.getByText("Dossier de la sortie"));
    expect(screen.getByText("Aucune offre de trajet pour le moment.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Proposer un trajet" })).toBeTruthy();
  });

  it("collects a departure location, time and seat count before publishing a ride", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: {} } });
    carpoolState.data = { logistics: {}, carpool: [], reservations: [] };
    render(<EventDetail event={event} onClose={vi.fn()} />);
    await user.click(screen.getByText("Dossier de la sortie"));
    await user.click(screen.getByRole("button", { name: "Proposer un trajet" }));
    await user.type(screen.getByLabelText("Lieu de départ"), "Station Montmorency");
    await user.type(screen.getByLabelText("Heure de départ"), "092120261000AM");
    await user.clear(screen.getByLabelText("Places proposées"));
    await user.type(screen.getByLabelText("Places proposées"), "3");
    await user.click(screen.getByRole("button", { name: "Publier le trajet" }));
    expect(offerCarpool).toHaveBeenCalledWith(expect.objectContaining({ eventId: 17, departureLocation: "Station Montmorency", seatsTotal: 3, seatsAvailable: 3 }));
  });

  it("lets the driver accept, decline and remove passenger requests", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: {} } });
    carpoolState.data = { logistics: {}, carpool: [{ id: 72, driverId: 7, driverName: "Camille", departureLocation: "Berri-UQAM", seatsTotal: 3, seatsAvailable: 1 }], reservations: [{ id: 81, offerId: 72, passengerId: 14, passengerName: "Alex", seatsRequested: 1, status: "pending" }, { id: 82, offerId: 72, passengerId: 15, passengerName: "Noa", seatsRequested: 1, status: "accepted" }] };
    render(<EventDetail event={event} onClose={vi.fn()} />);
    await user.click(screen.getByText("Dossier de la sortie"));
    await user.click(screen.getByRole("button", { name: "Accepter" }));
    await user.click(screen.getByRole("button", { name: "Refuser" }));
    // Removing a passenger now goes through a real dialog rather than window.confirm.
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    const removeDialog = await screen.findByRole("alertdialog");
    expect(removeDialog.textContent).toMatch(/La place sera libérée/);
    await user.click(within(removeDialog).getByRole("button", { name: "Retirer" }));
    expect(decideCarpoolSeat).toHaveBeenCalledWith({ reservationId: 81, status: "accepted" });
    expect(decideCarpoolSeat).toHaveBeenCalledWith({ reservationId: 81, status: "declined" });
    expect(removeCarpoolPassenger).toHaveBeenCalledWith({ reservationId: 82, note: "Place retirée par le conducteur" });
  });

  it("lets the driver edit a ride’s place, time and seats without withdrawing it", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: {} } });
    carpoolState.data = { logistics: {}, carpool: [{ id: 72, driverId: 7, driverName: "Camille", departureLocation: "Berri-UQAM", seatsTotal: 3, seatsAvailable: 1, note: "Départ ponctuel" }], reservations: [{ id: 82, offerId: 72, passengerId: 15, passengerName: "Noa", seatsRequested: 1, status: "accepted" }] };
    render(<EventDetail event={event} onClose={vi.fn()} />);
    await user.click(screen.getByText("Dossier de la sortie"));
    await user.click(screen.getByRole("button", { name: "Modifier" }));
    expect(screen.getByText("Modifier le trajet")).toBeTruthy();
    expect((screen.getByLabelText("Lieu de départ") as HTMLInputElement).value).toBe("Berri-UQAM");
    expect((screen.getByLabelText("Note facultative") as HTMLInputElement).value).toBe("Départ ponctuel");
    await user.clear(screen.getByLabelText("Lieu de départ"));
    await user.type(screen.getByLabelText("Lieu de départ"), "Station Montmorency");
    await user.clear(screen.getByLabelText("Places proposées"));
    await user.type(screen.getByLabelText("Places proposées"), "4");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));
    expect(updateCarpoolOffer).toHaveBeenCalledWith(expect.objectContaining({ offerId: 72, eventId: 17, departureLocation: "Station Montmorency", seatsTotal: 4, note: "Départ ponctuel" }));
    expect(offerCarpool).not.toHaveBeenCalled();
  });

  it("gathers collective level, readiness, attendance and carpool decisions for the organizer", () => {
    render(<CoordinationJournal locale="fr" participants={[{ id: 3, name: "Nora", status: "waitlist", levelExceptionStatus: "approved", preparationReadyAt: new Date(), checkedInAt: new Date() }]} reservations={[{ id: 8, passengerName: "Camille", status: "accepted", departureLocation: "Montréal · Rosemont" }]} />);
    expect(screen.getByLabelText("Journal de coordination")).toBeTruthy();
    expect(screen.getByText("Nora · liste d’attente")).toBeTruthy();
    expect(screen.getByText("Nora · exception de niveau : approved")).toBeTruthy();
    expect(screen.getByText("Nora · préparation déclarée")).toBeTruthy();
    expect(screen.getByText("Nora · présence pointée")).toBeTruthy();
    expect(screen.getByText("Camille · covoiturage : accepted · Montréal · Rosemont")).toBeTruthy();
  });

  it("lets an organizer open the edit controls, review logistics and check in a confirmed participant", async () => {
    const user = userEvent.setup();
    participantsState.data = [{ id: 3, userId: 48, name: "Nora", status: "going", preparationReadyAt: null, checkedInAt: null }];
	    detail.mockReturnValue({ data: { id: 17, hostId: 7, title: event.title, description: "Une randonnée préparée avec des consignes pratiques pour le groupe.", locationName: event.locationName, startsAt: event.startsAt, capacity: event.capacity, visibility: "public", difficulty: "intermediate", checklist: [], logistics: { meetingPoint: "Stationnement principal" } } });
	    render(<EventDetail event={event} onClose={vi.fn()} />);
	    expect(screen.getByText("Logistique du groupe")).toBeTruthy();
	    await user.click(screen.getByRole("button", { name: "Gérer" }));
    const editButton = screen.getAllByRole("button", { name: "Modifier les essentiels" })[0];
    expect(editButton.className).toContain("min-h-11");
    await user.click(editButton);
    expect(screen.getByRole("textbox", { name: "Titre" })).toBeTruthy();
  });

  it("shows a waitlist state while keeping the preparation hub locked", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "waitlist", checklist: [], logistics: {} } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByTestId("preparation-state").textContent).toBe("locked");
    expect((screen.getByRole("button", { name: "Liste d’attente" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("requires an explicit level confirmation before joining a level-confirmed outing", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {}, levelAdmissionPolicy: "confirmation", levelRequirementNote: "Autonomie sur terrain rocheux et rythme soutenu." } });
    render(<EventDetail event={event} onClose={vi.fn()} />);

    expect(screen.getByText("Confirmation de niveau demandée")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Participer" }));
    expect(joinEvent).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Participer" }));
    expect(joinEvent).toHaveBeenCalledWith({ eventId: 17, levelAcknowledged: true, levelExceptionNote: undefined });
  });

  it("shows a documented declined level exception to the participant without implying a safety judgment", () => {
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "cancelled", checklist: [], logistics: {}, levelExceptionStatus: "declined", levelExceptionDecisionNote: "Les prérequis annoncés restent nécessaires pour cette sortie." } });
    render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByText("Exception de niveau refusée")).toBeTruthy();
    expect(screen.getByText("Les prérequis annoncés restent nécessaires pour cette sortie.")).toBeTruthy();
    expect(screen.getByText("Cette décision concerne uniquement cette sortie et ne constitue pas une garantie de sécurité.")).toBeTruthy();
  });
});

describe("MobileNav accessibility", () => {
  it("keeps an outing card shrinkable inside a narrow mobile grid", () => {
    render(<div className="grid w-[288px]"><EventCard event={event} onOpen={vi.fn()} /></div>);
    const card = screen.getByRole("button", { name: /Boucle des lacs de Mont-Tremblant/ });
    expect(card.className).toContain("min-w-0");
    expect(card.className).toContain("max-w-full");
  });

  it("announces the mobile navigation, the active view, and the selected destination", async () => {
    const user = userEvent.setup();
    const setView = vi.fn();
    render(<MobileNav view="home" setView={setView} labels={{ create: "Créer", profile: "Profil" }} />);

    expect(screen.getByLabelText("Navigation mobile")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accueil" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Groupes" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Mes sorties" }));
    expect(setView).toHaveBeenCalledWith("my-outings");
  });

  it("treats community as a profile context and keeps Create in the central action slot", () => {
    render(<MobileNav view="community" setView={vi.fn()} labels={{ create: "Créer", profile: "Profil" }} />);
    expect(screen.getByRole("button", { name: "Profil" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Créer" }).innerHTML).toContain("-mt-6");
  });

  it("shows alert counts and offers an outing or group from the central create action", async () => {
    const user = userEvent.setup();
    const setView = vi.fn();
    render(<MobileNav view="home" setView={setView} labels={{ create: "Créer", profile: "Profil" }} unreadNotificationCount={2} imminentOutingCount={1} />);
    expect(screen.getByRole("button", { name: "Profil · 2 notifications non lues" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mes sorties · 1 sortie proche" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Créer" }));
    expect(screen.getByRole("dialog", { name: "Que souhaitez-vous créer ?" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Créer un groupe/i }));
    expect(setView).toHaveBeenCalledWith("community");
  });

  it("uses the protected group-creation callback when the mobile drawer offers a group", async () => {
    const user = userEvent.setup();
    const setView = vi.fn();
    const onCreateGroup = vi.fn();
    render(<MobileNav view="home" setView={setView} labels={{ create: "Créer", profile: "Profil" }} onCreateGroup={onCreateGroup} />);
    await user.click(screen.getByRole("button", { name: "Créer" }));
    await user.click(screen.getByRole("button", { name: /Créer un groupe/i }));
    expect(onCreateGroup).toHaveBeenCalledOnce();
    expect(setView).not.toHaveBeenCalled();
  });

  it("moves keyboard focus to the main content from the skip shortcut", async () => {
    const user = userEvent.setup();
    render(<><SkipToContentLink label="Aller au contenu" /><main id="main-content" tabIndex={-1}>Contenu</main></>);
    await user.click(screen.getByRole("link", { name: "Aller au contenu" }));
    expect(document.activeElement?.id).toBe("main-content");
  });
});

describe("Confirmed outing lifecycle", () => {
  it("connects discovery, confirmed preparation, departure check-in, and debrief on a completed outing", async () => {
    const user = userEvent.setup();
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: undefined, checklist: [], logistics: {} } });
    const { rerender } = render(<EventDetail event={event} onClose={vi.fn()} />);
    expect(screen.getByText("Avant de participer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Participer" })).toBeTruthy();

    const completedEvent = { ...event, startsAt: new Date("2025-09-20T12:00:00.000Z"), preview: false };
    detail.mockReturnValue({ data: { id: 17, hostId: 99, participationStatus: "going", checklist: [], logistics: { meetingPoint: "Stationnement" } } });
    rerender(<EventDetail event={completedEvent} onClose={vi.fn()} />);
    expect(screen.getByTestId("preparation-state").textContent).toBe("active");
    expect(screen.getByText("Votre plan d’action")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Je suis en sécurité" }));
    expect(safetyCheckIn).toHaveBeenCalledWith({ eventId: 17, kind: "manual_ok" });
    await user.type(screen.getByPlaceholderText("Conditions réellement rencontrées"), "Sentier sec et visibilité dégagée.");
    await user.click(screen.getByRole("button", { name: "Partager le débrief" }));
    expect(createRecap).toHaveBeenCalledWith(expect.objectContaining({ eventId: 17, postType: "outing_recap" }));
  });
});
