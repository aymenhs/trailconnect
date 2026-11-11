import { useAuth } from "@/_core/hooks/useAuth";
import { safeUploadFilename } from "@shared/uploadFilename";
import { startLogin } from "@/const";
import WeatherOutlook, {
  getWeatherChecklistHints,
  type WeatherAlertInput,
} from "@/components/WeatherOutlook";
import LocationSharingControls from "@/components/LocationSharingControls";
import EventFacilitiesPanel from "@/components/EventFacilitiesPanel";
import OrganizerParticipantCockpit from "@/components/OrganizerParticipantCockpit";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useConfirm } from "@/components/ConfirmDialog";
import { useModalOverlay } from "@/hooks/useModalOverlay";
import { LeaveOutingButton } from "@/components/LeaveOutingButton";
import {
  legacyViewRedirect,
  pathToView,
  viewToPath,
  type View as NavigationView,
} from "@/lib/navigation";
import { ResponsiveCoverImage } from "@/components/ResponsiveCoverImage";
import { PublicProfileLink } from "@/components/PublicProfileLink";
import { CoverFocalPointManager } from "@/components/CoverFocalPointManager";
import { AllTrailsSourcePanel } from "@/components/AllTrailsSourcePanel";
import OutingPreparationPanel from "@/components/OutingPreparationPanel";
import {
  RelaunchFormerParticipantsPanel,
  SeriesInterestPanel,
} from "@/components/EngagementPanels";
import ChecklistManagementPanel from "@/components/ChecklistManagementPanel";
import WaitlistOfferManager from "@/components/WaitlistOfferManager";
import {
  ConditionReports,
  DepartureReadinessDashboard,
  OrganizerReliabilitySignals,
  WeatherUpdateHistory,
} from "@/components/EventCoordinationPanels";
import { shouldActivateOutingPreparation } from "@shared/outingPreparation";
import {
  buildOfflinePack,
  listOfflinePacks,
  saveOfflinePack,
} from "@shared/offline";
import {
  getDynamicPackingChecklist,
  getDynamicPackingSuggestions,
} from "@shared/packing";
import { buildSafetyNotice } from "@shared/safety";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Bot,
  Car,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  ClipboardList,
  CloudSun,
  Compass,
  Edit3,
  Flame,
  Footprints,
  Gauge,
  Heart,
  Home as HomeIcon,
  Info,
  Languages,
  Map,
  MapPin,
  MessageCircle,
  ExternalLink,
  Mountain,
  Navigation,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UsersRound,
  WifiOff,
  X,
} from "lucide-react";
import React, {
  ChangeEvent,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useLocation } from "wouter";

const DeferredExplorePage = lazy(
  () => import("@/components/EnhancedExplorePage")
);
const DeferredMyOutingsPage = lazy(() => import("@/pages/MyOutingsPage"));
const DeferredMarketplacePage = lazy(() => import("@/pages/MarketplacePage"));
const DeferredCreateEventPage = lazy(() => import("@/pages/CreateEventPage"));
const DeferredSocialCommunityPage = lazy(
  () => import("@/pages/SocialCommunityPage")
);
const DeferredSocialProfilePage = lazy(
  () => import("@/pages/SocialProfilePage")
);
const DeferredAccountProfilePage = lazy(
  () => import("@/pages/AccountProfilePage")
);
const DeferredAdminPage = lazy(() => import("@/pages/AdminPage"));
const DeferredMapView = lazy(() =>
  import("@/components/Map").then(({ MapView }) => ({ default: MapView }))
);
const DayOfBrief = lazy(() =>
  import("@/components/DayOfBrief").then(({ DayOfBrief }) => ({
    default: DayOfBrief,
  }))
);
const OutingActionPlan = lazy(() =>
  import("@/components/OutingActionPlan").then(({ OutingActionPlan }) => ({
    default: OutingActionPlan,
  }))
);
const VoluntaryPreparationReminder = lazy(() =>
  import("@/components/VoluntaryPreparationReminder").then(
    ({ VoluntaryPreparationReminder }) => ({
      default: VoluntaryPreparationReminder,
    })
  )
);
const ActionAssignmentsPanel = lazy(() =>
  import("@/components/ActionAssignmentsPanel").then(
    ({ ActionAssignmentsPanel }) => ({ default: ActionAssignmentsPanel })
  )
);
const TerrainLandmarksPanel = lazy(() =>
  import("@/components/TerrainLandmarksPanel").then(
    ({ TerrainLandmarksPanel }) => ({ default: TerrainLandmarksPanel })
  )
);
const TerrainAccessPanel = lazy(() =>
  import("@/components/TerrainAccessPanel").then(({ TerrainAccessPanel }) => ({
    default: TerrainAccessPanel,
  }))
);
const GpxExchangePanel = lazy(() =>
  import("@/components/GpxExchangePanel").then(({ GpxExchangePanel }) => ({
    default: GpxExchangePanel,
  }))
);
const ManualRouteMapPreview = lazy(() =>
  import("@/components/ManualRouteMapPreview").then(
    ({ ManualRouteMapPreview }) => ({ default: ManualRouteMapPreview })
  )
);
const ManualRouteEditorPanel = lazy(() =>
  import("@/components/ManualRouteEditorPanel").then(
    ({ ManualRouteEditorPanel }) => ({ default: ManualRouteEditorPanel })
  )
);
const ManualRouteShareQrPanel = lazy(() =>
  import("@/components/ManualRouteShareQrPanel").then(
    ({ ManualRouteShareQrPanel }) => ({ default: ManualRouteShareQrPanel })
  )
);
const OperationalRoutePanel = lazy(() =>
  import("@/components/OperationalRoutePanel").then(
    ({ OperationalRoutePanel }) => ({ default: OperationalRoutePanel })
  )
);
const OperationalReadinessPanel = lazy(() =>
  import("@/components/OperationalReadinessPanel").then(
    ({ OperationalReadinessPanel }) => ({ default: OperationalReadinessPanel })
  )
);
const EventOperationsHub = lazy(() =>
  import("@/components/EventOperationsHub").then(({ EventOperationsHub }) => ({
    default: EventOperationsHub,
  }))
);

// Screens are real routes now; the mapping lives in `lib/navigation`.
type View = NavigationView;
type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";
type AdvancedFilters = {
  date: string;
  maxDistanceKm: string;
  maxElevationGain: string;
  maxDurationMinutes: string;
  minCapacity: string;
  carpoolOnly: boolean;
  outingType:
    | "all"
    | "group_hike"
    | "guided_hike"
    | "training"
    | "private_group";
  bookingMode: "all" | "instant" | "request";
  period: "upcoming" | "past" | "all";
};

export type HikeEvent = {
  id: number;
  title: string;
  locationName: string;
  startsAt: Date;
  difficulty: Difficulty;
  distanceKm: number;
  elevationGain: number;
  durationMinutes: number;
  capacity: number;
  carpoolEnabled: boolean;
  bookingMode?: "instant" | "request";
  priceCents?: number;
  currency?: "CAD";
  outingType?: "group_hike" | "guided_hike" | "training" | "private_group";
  hostId?: number;
  coverImageUrl?: string | null;
  coverImageFocalX?: number | null;
  coverImageFocalY?: number | null;
  hostName?: string | null;
  relationship?: "organizer" | "participant";
  participationStatus?: "going" | "pending" | "waitlist";
  preview?: boolean;
};

const heroImage = "/media/trailconnect-hero.webp";

const previewEvents: HikeEvent[] = [
  {
    id: -1,
    title: "Boucle des lacs de Mont-Tremblant",
    locationName: "Laurentides · Québec",
    startsAt: new Date("2026-09-06T06:30:00"),
    difficulty: "intermediate",
    distanceKm: 10,
    elevationGain: 450,
    durationMinutes: 300,
    capacity: 14,
    carpoolEnabled: true,
    hostName: "TrailConnect",
    coverImageUrl: "/media/trailconnect-event-alpine.webp",
    preview: true,
  },
  {
    id: -2,
    title: "Sentiers boisés du Mont-Saint-Hilaire",
    locationName: "Réserve naturelle Gault · Montérégie",
    startsAt: new Date("2026-09-07T08:15:00"),
    difficulty: "beginner",
    distanceKm: 7,
    elevationGain: 260,
    durationMinutes: 210,
    capacity: 10,
    carpoolEnabled: true,
    hostName: "TrailConnect",
    coverImageUrl: "/media/trailconnect-event-ridge.webp",
    preview: true,
  },
  {
    id: -3,
    title: "Sentier du lac Pimbina",
    locationName: "Parc national de la Mauricie · Québec, Canada",
    startsAt: new Date("2026-09-13T07:00:00"),
    difficulty: "advanced",
    distanceKm: 13.1,
    elevationGain: 520,
    durationMinutes: 360,
    capacity: 9,
    carpoolEnabled: true,
    hostName: "TrailConnect",
    coverImageUrl: heroImage,
    preview: true,
  },
  {
    id: -4,
    title: "Panoramas du Calvaire d’Oka",
    locationName: "Parc national d’Oka · Laurentides",
    startsAt: new Date("2026-09-20T08:30:00"),
    difficulty: "beginner",
    distanceKm: 6.2,
    elevationGain: 210,
    durationMinutes: 195,
    capacity: 12,
    carpoolEnabled: true,
    hostName: "TrailConnect",
    coverImageUrl: "/media/trailconnect-event-ridge.webp",
    preview: true,
  },
  {
    id: -5,
    title: "Traversée douce du mont Royal",
    locationName: "Parc du Mont-Royal · Montréal",
    startsAt: new Date("2026-09-24T17:45:00"),
    difficulty: "beginner",
    distanceKm: 5.4,
    elevationGain: 220,
    durationMinutes: 150,
    capacity: 16,
    carpoolEnabled: false,
    hostName: "TrailConnect",
    coverImageUrl: "/media/trailconnect-event-alpine.webp",
    preview: true,
  },
  {
    id: -6,
    title: "Crêtes d’automne du Mont-Orford",
    locationName: "Estrie · Québec",
    startsAt: new Date("2026-09-27T07:15:00"),
    difficulty: "advanced",
    distanceKm: 12.8,
    elevationGain: 610,
    durationMinutes: 390,
    capacity: 10,
    carpoolEnabled: true,
    hostName: "TrailConnect",
    coverImageUrl: heroImage,
    preview: true,
  },
  {
    id: -7,
    title: "Belvédères de la Gatineau",
    locationName: "Parc de la Gatineau · Outaouais",
    startsAt: new Date("2026-10-03T08:00:00"),
    difficulty: "intermediate",
    distanceKm: 11.5,
    elevationGain: 380,
    durationMinutes: 330,
    capacity: 11,
    carpoolEnabled: true,
    hostName: "TrailConnect",
    coverImageUrl: "/media/trailconnect-event-ridge.webp",
    preview: true,
  },
  {
    id: -8,
    title: "Forêt boréale du parc Jacques-Cartier",
    locationName: "Région de Québec · Québec",
    startsAt: new Date("2026-10-10T06:45:00"),
    difficulty: "intermediate",
    distanceKm: 9.6,
    elevationGain: 340,
    durationMinutes: 300,
    capacity: 8,
    carpoolEnabled: true,
    hostName: "TrailConnect",
    coverImageUrl: heroImage,
    preview: true,
  },
];

export function resolveExploreEvents(
  loadedEvents?: Array<
    Omit<HikeEvent, "startsAt"> & { startsAt: Date | string }
  >
): HikeEvent[] {
  const published = (loadedEvents ?? []).map(event => ({
    ...event,
    startsAt: new Date(event.startsAt),
    difficulty: event.difficulty as Difficulty,
  }));
  return published.length ? published : previewEvents;
}

export function filterExploreEvents(
  events: HikeEvent[],
  query: string,
  activeLevel: "all" | Difficulty,
  filters: AdvancedFilters,
  referenceDate = new Date()
): HikeEvent[] {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  return events.filter(
    event =>
      (activeLevel === "all" || event.difficulty === activeLevel) &&
      `${event.title} ${event.locationName}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      (!filters.date ||
        event.startsAt.toISOString().slice(0, 10) === filters.date) &&
      (!filters.maxDistanceKm ||
        event.distanceKm <= Number(filters.maxDistanceKm)) &&
      (!filters.maxElevationGain ||
        event.elevationGain <= Number(filters.maxElevationGain)) &&
      (!filters.maxDurationMinutes ||
        event.durationMinutes <= Number(filters.maxDurationMinutes)) &&
      (!filters.minCapacity || event.capacity >= Number(filters.minCapacity)) &&
      (!filters.carpoolOnly || event.carpoolEnabled) &&
      (filters.outingType === "all" ||
        event.outingType === filters.outingType) &&
      (filters.bookingMode === "all" ||
        event.bookingMode === filters.bookingMode) &&
      (filters.period === "all" ||
        (filters.period === "upcoming"
          ? event.startsAt >= today
          : event.startsAt < today))
  );
}

function formatDuration(minutes: number, locale: "fr" | "en") {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (locale === "fr")
    return remaining ? `${hours} h ${remaining}` : `${hours} h`;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function formatDay(date: Date, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function difficultyTone(difficulty: Difficulty) {
  return {
    beginner: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    intermediate: "bg-amber-50 text-amber-700 ring-amber-100",
    advanced: "bg-orange-50 text-orange-700 ring-orange-100",
    expert: "bg-rose-50 text-rose-700 ring-rose-100",
  }[difficulty];
}

function PageHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const { locale, toggleLocale } = useLocale();
  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-[#dce7d8]/80 bg-[#f8fbf4]/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:-mx-7 sm:px-7 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              aria-label={locale === "fr" ? "Retour" : "Back"}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#214338] shadow-sm transition active:scale-95"
            >
              <ArrowLeft size={19} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[1.42rem] font-extrabold tracking-[-0.045em] text-[#1b392f]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs font-medium text-[#668177]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={toggleLocale}
          aria-label={locale === "fr" ? "Changer la langue" : "Change language"}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#d7e5d4] bg-white px-3 text-xs font-extrabold text-[#355b4d] transition hover:bg-[#edf4e9] active:scale-95"
        >
          <Languages size={14} /> {locale === "fr" ? "FR" : "EN"}
        </button>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="grid size-10 place-items-center rounded-2xl bg-[#1d483a] text-[#e8f0df] shadow-[0_8px_18px_rgba(26,69,55,.2)]">
      <Mountain size={21} strokeWidth={2.4} />
    </div>
  );
}

export function EventCard({
  event,
  onOpen,
  compact = false,
}: {
  event: HikeEvent;
  onOpen: () => void;
  compact?: boolean;
}) {
  const { locale, copy } = useLocale();
  const name = {
    beginner: copy.explore.beginner,
    intermediate: copy.explore.intermediate,
    advanced: copy.explore.advanced,
    expert: "Expert",
  }[event.difficulty];
  return (
    <button
      onClick={onOpen}
      className={`group min-w-0 w-full max-w-full text-left ${compact ? "" : "tc-enter"}`}
    >
      <article
        className={`relative overflow-hidden rounded-[1.55rem] bg-white shadow-[0_10px_28px_rgba(21,57,42,.08)] ring-1 ring-[#dfe9dc] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_32px_rgba(21,57,42,.12)] ${compact ? "" : "sm:flex"}`}
      >
        <div
          className={`${compact ? "h-36" : "h-48 sm:h-auto sm:w-[38%]"} relative overflow-hidden bg-[#456b5c]`}
        >
          <ResponsiveCoverImage
            src={event.coverImageUrl || heroImage}
            alt={
              locale === "fr"
                ? "Sentier de randonnée en montagne"
                : "Mountain hiking trail"
            }
            sizes="(min-width: 640px) 38vw, 100vw"
            focalX={event.coverImageFocalX}
            focalY={event.coverImageFocalY}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f2c23]/60 via-transparent to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.11em] text-[#315b4a] backdrop-blur">
            {formatDay(event.startsAt, locale)}
          </span>
          {event.preview && (
            <span className="absolute right-3 top-3 rounded-full bg-[#1d483a]/90 px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-white">
              {locale === "fr" ? "Aperçu" : "Preview"}
            </span>
          )}
        </div>
        <div className="min-w-0 p-4.5 sm:flex sm:flex-1 sm:flex-col sm:justify-center sm:p-6">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <h3 className="w-full min-w-0 max-w-full break-words line-clamp-2 text-lg font-extrabold leading-snug tracking-[-.035em] text-[#1d392f]">
                {event.title}
              </h3>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[#6b857a]">
                <MapPin size={15} className="shrink-0 text-[#6c9580]" />{" "}
                <span className="min-w-0 truncate">{event.locationName}</span>
              </p>
            </div>
            <span
              className={`shrink-0 self-start rounded-full px-2.5 py-1.5 text-xs font-extrabold ring-1 ${difficultyTone(event.difficulty)}`}
            >
              {name}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm font-bold text-[#436658] sm:mt-5">
            <span className="flex items-center gap-1">
              <Footprints size={15} /> {event.distanceKm} km
            </span>
            <span className="flex items-center gap-1">
              <Gauge size={15} /> {event.elevationGain} m
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon /> {formatDuration(event.durationMinutes, locale)}
            </span>
            {event.carpoolEnabled && (
              <span className="ml-auto hidden items-center gap-1 rounded-full bg-[#f1f6ed] px-2 py-1 text-[#527260] sm:flex">
                <Car size={13} />
              </span>
            )}
          </div>
        </div>
      </article>
    </button>
  );
}

function ClockIcon() {
  return (
    <span className="inline-grid size-[13px] place-items-center rounded-full border border-current text-[8px] leading-none">
      ·
    </span>
  );
}

export function EventDetail({
  event,
  onClose,
  onCreatePublishedOuting,
}: {
  event: HikeEvent;
  onClose: () => void;
  onCreatePublishedOuting?: () => void;
}) {
  const { locale, copy } = useLocale();
  // Announced as a modal dialog, keeps focus inside, locks the page behind and
  // still closes on Escape — it used to be a bare div with only the key handler.
  const { containerRef, dialogProps } = useModalOverlay<HTMLDivElement>({
    onClose,
    label: locale === "fr" ? "Fiche de la sortie" : "Outing details",
  });
  const [savedOffline, setSavedOffline] = useState(false);
  const [joined, setJoined] = useState(Boolean(event.relationship));
  const [weatherContext, setWeatherContext] =
    useState<WeatherAlertInput | null>(null);
  const [levelAcknowledged, setLevelAcknowledged] = useState(false);
  const [levelExceptionNote, setLevelExceptionNote] = useState("");
  const [waitlistResponseWindow, setWaitlistResponseWindow] = useState("6");
  const [requested, setRequested] = useState(false);
  const [organizerManagementOpen, setOrganizerManagementOpen] = useState(false);
  const [outingDetailsOpen, setOutingDetailsOpen] = useState(false);
  const joinMutation = trpc.hiking.events.join.useMutation({
    onSuccess: result => {
      setJoined(result.status === "going");
      setRequested(result.status === "pending");
      toast.success(
        result.status === "going"
          ? locale === "fr"
            ? "Votre participation est confirmée."
            : "Your attendance is confirmed."
          : locale === "fr"
            ? "Votre demande est envoyée à l’organisateur."
            : "Your request was sent to the organizer."
      );
    },
  });
  const { isAuthenticated, user } = useAuth();
  const [chatMessage, setChatMessage] = useState("");
  const messages = trpc.hiking.community.messages.useQuery(
    { eventId: event.id },
    { enabled: isAuthenticated && !event.preview }
  );
  const sendMessage = trpc.hiking.community.sendMessage.useMutation({
    onSuccess: () => {
      setChatMessage("");
      messages.refetch();
    },
  });
  const eventDetail = trpc.hiking.events.detail.useQuery(
    { eventId: event.id },
    { enabled: !event.preview }
  );
  const terrainLandmarks = trpc.hiking.events.terrainLandmarks.useQuery(
    { eventId: event.id },
    { enabled: !event.preview }
  );
  const dayOfLogistics = trpc.hiking.marketplace.logistics.detail.useQuery(
    { eventId: event.id },
    { enabled: isAuthenticated && !event.preview }
  );
  const bookingRequest = trpc.hiking.marketplace.bookings.request.useMutation({
    onSuccess: () => {
      setJoined(false);
      setRequested(true);
      eventDetail.refetch();
      toast.success(
        locale === "fr"
          ? "Demande envoyée à l’organisateur."
          : "Request sent to the organizer."
      );
    },
  });
  const isOrganizer =
    event.relationship === "organizer" ||
    event.hostId === user?.id ||
    eventDetail.data?.hostId === user?.id;
  const isCoOrganizer = eventDetail.data?.managementRole === "co_organizer";
  const canManage = Boolean(isOrganizer || isCoOrganizer);
  useEffect(() => {
    setWeatherContext(null);
  }, [event.id]);
  const resolvedLevelExceptionStatus =
    eventDetail.data?.levelExceptionStatus === "approved" ||
    eventDetail.data?.levelExceptionStatus === "declined"
      ? eventDetail.data.levelExceptionStatus
      : null;
  const awaitingWaitlist = eventDetail.data?.participationStatus === "waitlist";
  const awaitingApproval =
    requested || eventDetail.data?.participationStatus === "pending";
  const myWaitlistOffer = trpc.hiking.events.myWaitlistOffer.useQuery(
    { eventId: event.id },
    { enabled: isAuthenticated && !event.preview && Boolean(awaitingWaitlist) }
  );
  const hasConfirmedParticipation = shouldActivateOutingPreparation({
    isPreview: Boolean(event.preview),
    locallyJoined: joined,
    participationStatus: eventDetail.data?.participationStatus,
    isOrganizer: canManage,
  });
  const dayOfBriefReadStatus = trpc.hiking.events.dayOfBriefReadStatus.useQuery(
    { eventId: event.id },
    { enabled: isAuthenticated && !event.preview && hasConfirmedParticipation }
  );
  const acknowledgeDayOfBrief =
    trpc.hiking.events.acknowledgeDayOfBrief.useMutation({
      onSuccess: () => dayOfBriefReadStatus.refetch(),
    });
  const participants = trpc.hiking.events.participants.useQuery(
    { eventId: event.id },
    { enabled: Boolean(isOrganizer) }
  );
  const coordination = trpc.hiking.marketplace.logistics.detail.useQuery(
    { eventId: event.id },
    { enabled: Boolean(isOrganizer) }
  );
  const checkIn = trpc.hiking.events.checkIn.useMutation({
    onSuccess: () => participants.refetch(),
  });
  const promoteWaitlist = trpc.hiking.events.promoteWaitlist.useMutation({
    onSuccess: () => participants.refetch(),
  });
  const offerWaitlist = trpc.hiking.events.offerWaitlistPlace.useMutation({
    onSuccess: () => {
      participants.refetch();
      toast.success(
        locale === "fr"
          ? "Une place a été proposée avec un délai de réponse."
          : "A place was offered with a response window."
      );
    },
    onError: error => toast.error(error.message),
  });
  const acceptWaitlist = trpc.hiking.events.acceptWaitlistPlace.useMutation({
    onSuccess: () => {
      setJoined(true);
      eventDetail.refetch();
      myWaitlistOffer.refetch();
      toast.success(
        locale === "fr"
          ? "Votre place est confirmée."
          : "Your spot is confirmed."
      );
    },
    onError: error => toast.error(error.message),
  });
  const declineWaitlist = trpc.hiking.events.declineWaitlistPlace.useMutation({
    onSuccess: () => {
      myWaitlistOffer.refetch();
      toast.success(
        locale === "fr" ? "La place a été refusée." : "The spot was declined."
      );
    },
    onError: error => toast.error(error.message),
  });
  const setPreparationReady =
    trpc.hiking.events.setPreparationReady.useMutation({
      onSuccess: () => eventDetail.refetch(),
    });
  const pinMessage = trpc.hiking.community.pinMessage.useMutation({
    onSuccess: () => messages.refetch(),
    onError: error => toast.error(error.message),
  });
  const pinnedMessage =
    messages.data?.find(message => message.isPinned) ?? null;
  const incompleteActionLabels = [
    !(
      dayOfLogistics.data?.logistics?.meetingPoint ||
      eventDetail.data?.logistics?.meetingPoint
    )
      ? locale === "fr"
        ? "Point de rendez-vous"
        : "Meeting point"
      : null,
    eventDetail.data?.weatherUpdateNote
      ? locale === "fr"
        ? "Mise à jour météo importante"
        : "Important weather update"
      : null,
    !event.carpoolEnabled
      ? locale === "fr"
        ? "Options de covoiturage"
        : "Carpool options"
      : null,
    !eventDetail.data?.preparationReadyAt
      ? locale === "fr"
        ? "Statut de préparation"
        : "Preparation status"
      : null,
    !savedOffline
      ? locale === "fr"
        ? "Fiche Jour J hors ligne"
        : "Offline day-of brief"
      : null,
  ].filter((label): label is string => Boolean(label));
  const actionAssignmentCandidates = [
    eventDetail.data?.hostId
      ? {
          userId: eventDetail.data.hostId,
          name:
            event.hostName || (locale === "fr" ? "Organisateur" : "Organizer"),
        }
      : null,
    ...(participants.data ?? []).map(participant => ({
      userId: participant.userId,
      name: participant.name,
    })),
  ].filter((candidate): candidate is { userId: number; name: string | null } =>
    Boolean(candidate)
  );
  const micro =
    locale === "fr"
      ? {
          offline: "Enregistrer hors ligne",
          offlineDone: "Sortie enregistrée pour consultation hors connexion",
          brief: "En bref",
          track: "Trace & dénivelé",
          essentials: "Indispensables",
          transport: "Départ partagé",
          backup: "Itinéraire sauvegardé",
        }
      : {
          offline: "Save offline",
          offlineDone: "Outing saved for offline viewing",
          brief: "At a glance",
          track: "Track & elevation",
          essentials: "Essentials",
          transport: "Shared ride",
          backup: "Route saved",
        };
  const register = () => {
    if (!isAuthenticated) return startLogin();
    if (event.preview) {
      toast.info(
        locale === "fr"
          ? "Connectez-vous à une sortie publiée pour participer et activer le dossier."
          : "Join a published outing to activate the preparation hub."
      );
      return;
    }
    if (canManage || joined || awaitingWaitlist || awaitingApproval) return;
    const policy = eventDetail.data?.levelAdmissionPolicy ?? "declarative";
    const exceptionNote = levelExceptionNote.trim() || undefined;
    if (policy !== "declarative" && !levelAcknowledged && !exceptionNote)
      return toast.error(
        locale === "fr"
          ? "Confirmez le niveau demandé ou demandez une exception documentée."
          : "Confirm the required level or request a documented exception."
      );
    const levelInput =
      policy === "declarative"
        ? {}
        : { levelAcknowledged, levelExceptionNote: exceptionNote };
    if (event.bookingMode === "request")
      bookingRequest.mutate({ eventId: event.id, ...levelInput });
    else joinMutation.mutate({ eventId: event.id, ...levelInput });
  };
  const saveOffline = () => {
    saveOfflinePack(
      buildOfflinePack({
        event: {
          id: event.id,
          title: event.title,
          locationName: event.locationName,
          startsAt: event.startsAt.toISOString(),
          distanceKm: event.distanceKm,
          elevationGain: event.elevationGain,
          durationMinutes: event.durationMinutes,
          gpxUrl: eventDetail.data?.gpxUrl,
        },
        checklist:
          eventDetail.data?.checklist.map(item => item.label) ??
          (locale === "fr"
            ? [
                "Eau · 1,5 L",
                "Veste coupe-vent",
                "Chaussures adaptées",
                "Téléphone chargé",
              ]
            : ["Water · 1.5 L", "Wind jacket", "Trail shoes", "Charged phone"]),
        safetyNote: copy.event.safetyText,
        dayOfBrief: {
          generatedAt: new Date().toISOString(),
          meetingPoint: dayOfLogistics.data?.logistics?.meetingPoint,
          meetingInstructions:
            dayOfLogistics.data?.logistics?.meetingInstructions,
          emergencyPlan: dayOfLogistics.data?.logistics?.emergencyPlan,
          operationalRoute: dayOfLogistics.data?.logistics?.operationalRoute,
          backupPlan: dayOfLogistics.data?.logistics?.backupPlan,
          routeImageUrl: dayOfLogistics.data?.logistics?.routeImageUrl,
          weatherUpdate: eventDetail.data?.weatherUpdateNote,
          weatherUpdatedAt: eventDetail.data?.weatherUpdatedAt
            ? new Date(eventDetail.data.weatherUpdatedAt).toISOString()
            : null,
          localWeatherSource: eventDetail.data?.localWeatherSourceUrl
            ? {
                label: eventDetail.data.localWeatherSourceLabel || "",
                url: eventDetail.data.localWeatherSourceUrl,
              }
            : null,
          terrainAccess: dayOfLogistics.data?.logistics
            ? {
                terrainStatus: dayOfLogistics.data.logistics.terrainStatus,
                accessStatus: dayOfLogistics.data.logistics.accessStatus,
                note: dayOfLogistics.data.logistics.terrainAccessNote,
                source: dayOfLogistics.data.logistics.terrainSourceUrl
                  ? {
                      label:
                        dayOfLogistics.data.logistics.terrainSourceLabel || "",
                      url: dayOfLogistics.data.logistics.terrainSourceUrl,
                    }
                  : null,
                checkedAt: dayOfLogistics.data.logistics.terrainCheckedAt
                  ? new Date(
                      dayOfLogistics.data.logistics.terrainCheckedAt
                    ).toISOString()
                  : null,
              }
            : null,
          pinnedMessage: pinnedMessage
            ? {
                content: pinnedMessage.content,
                senderName: pinnedMessage.senderName,
                createdAt: pinnedMessage.createdAt
                  ? new Date(pinnedMessage.createdAt).toISOString()
                  : null,
              }
            : null,
          terrainLandmarks: (terrainLandmarks.data ?? []).map(landmark => ({
            type: landmark.type,
            label: landmark.label,
            note: landmark.note,
            status: landmark.status,
            latitude: landmark.latitude,
            longitude: landmark.longitude,
            verifiedAt: landmark.verifiedAt
              ? new Date(landmark.verifiedAt).toISOString()
              : null,
          })),
          carpool: (dayOfLogistics.data?.carpool ?? []).map(ride => ({
            departureLocation: ride.departureLocation,
            seatsAvailable: ride.seatsAvailable,
            departureAt: ride.departureAt
              ? new Date(ride.departureAt).toISOString()
              : null,
            driverName: ride.driverName,
          })),
        },
      })
    );
    setSavedOffline(true);
    toast.success(micro.offlineDone);
  };
  const publishMessage = () => {
    if (!isAuthenticated) return startLogin();
    if (event.preview)
      return toast.info(
        locale === "fr"
          ? "La messagerie s’active pour les sorties publiées."
          : "Group chat activates for published outings."
      );
    if (chatMessage.trim())
      sendMessage.mutate({ eventId: event.id, content: chatMessage.trim() });
  };
  const openOutingSection = (sectionId: string) => {
    setOutingDetailsOpen(true);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() =>
        document
          .getElementById(sectionId)
          ?.scrollIntoView?.({ behavior: "smooth", block: "start" })
      )
    );
  };
  return (
    <div
      ref={containerRef}
      {...dialogProps}
      className="fixed inset-0 z-50 overflow-x-clip overflow-y-auto bg-[#16342a]/45 p-0 backdrop-blur-sm sm:p-6"
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex items-center justify-between gap-3 p-3 sm:p-5">
        <button
          type="button"
          onClick={onClose}
          aria-label={
            locale === "fr" ? "Retour aux sorties" : "Back to outings"
          }
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/95 px-3 text-xs font-extrabold text-[#244d3d] shadow-lg ring-1 ring-[#dce8d9] backdrop-blur active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>{locale === "fr" ? "Retour" : "Back"}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.common.close}
          className="pointer-events-auto grid size-11 place-items-center rounded-full bg-white/95 text-[#26483c] shadow-lg ring-1 ring-[#dce8d9] backdrop-blur active:scale-95"
        >
          <X size={19} />
        </button>
      </div>
      {isOrganizer && !event.preview && (
        <button
          type="button"
          onClick={() => setOrganizerManagementOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={organizerManagementOpen}
          className="fixed right-16 top-3 z-[71] inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white shadow-lg ring-1 ring-white/35 active:scale-95 sm:right-20 sm:top-5"
        >
          <UsersRound size={15} />
          {locale === "fr" ? "Gérer" : "Manage"}
        </button>
      )}
      <div className="mx-auto min-h-full w-full min-w-0 max-w-3xl overflow-hidden bg-[#f8fbf4] shadow-2xl sm:min-h-0 sm:rounded-[2rem]">
        <div className="relative h-64 sm:h-80">
          <ResponsiveCoverImage
            src={event.coverImageUrl || heroImage}
            alt={locale === "fr" ? "Paysage de randonnée" : "Hiking landscape"}
            sizes="(min-width: 640px) 768px, 100vw"
            focalX={event.coverImageFocalX}
            focalY={event.coverImageFocalY}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#112f25]/85 via-[#112f25]/10 to-transparent" />
          <button
            onClick={onClose}
            aria-label={copy.common.close}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full bg-white/90 text-[#26483c] shadow-lg active:scale-95"
          >
            <X size={19} />
          </button>
          <div className="absolute inset-x-5 bottom-5 min-w-0 text-white">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] backdrop-blur">
              {formatDay(event.startsAt, locale)}
            </span>
            <h2 className="mt-3 max-w-xl break-words text-3xl font-extrabold tracking-[-.06em] sm:text-4xl">
              {event.title}
            </h2>
            <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-medium text-white/85">
              <MapPin className="shrink-0" size={15} />
              <span className="min-w-0 break-words">{event.locationName}</span>
            </p>
          </div>
        </div>
        <main className="mx-auto min-w-0 max-w-2xl px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <Metric
              icon={<Footprints size={17} />}
              label={copy.event.distance}
              value={`${event.distanceKm} km`}
            />
            <Metric
              icon={<Gauge size={17} />}
              label={copy.event.elevation}
              value={`${event.elevationGain} m`}
            />
            <Metric
              icon={<ClockIcon />}
              label={copy.event.duration}
              value={formatDuration(event.durationMinutes, locale)}
            />
            <Metric
              icon={<UsersRound size={17} />}
              label={copy.event.places}
              value={`${event.capacity}`}
            />
            <Metric
              icon={<MapPin size={17} />}
              label={locale === "fr" ? "Rendez-vous" : "Meet-up"}
              value={
                eventDetail.data?.logistics?.meetingPoint ||
                (locale === "fr" ? "À préciser" : "To confirm")
              }
            />
            <SummaryWeatherMetric eventId={event.id} />
          </div>
          {!event.preview && (
            <AllTrailsSourcePanel
              eventId={event.id}
              eventData={eventDetail.data}
              canManage={canManage}
            />
          )}
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold tracking-[-.04em] text-[#204033]">
                {micro.brief}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ${difficultyTone(event.difficulty)}`}
              >
                {
                  {
                    beginner: copy.explore.beginner,
                    intermediate: copy.explore.intermediate,
                    advanced: copy.explore.advanced,
                    expert: "Expert",
                  }[event.difficulty]
                }
              </span>
            </div>
            <p className="mt-3 leading-relaxed text-sm text-[#5f796e]">
              {eventDetail.data?.participantGuidance ||
                (locale === "fr"
                  ? "Une journée pensée pour progresser à son rythme, partager les décisions terrain et profiter de chaque point de vue."
                  : "A day designed to move at your own pace, make field decisions together and enjoy every viewpoint.")}
            </p>
            {eventDetail.data?.cancellationPolicy && (
              <div className="mt-3 rounded-xl border border-[#e7dec5] bg-[#fffaf0] px-3 py-2.5 text-xs leading-relaxed text-[#76653f]">
                <Info className="mr-1.5 inline text-[#9a7b35]" size={14} />
                <b>
                  {locale === "fr"
                    ? "Annulation ou report : "
                    : "Cancellation or rescheduling: "}
                </b>
                {eventDetail.data.cancellationPolicy}
              </div>
            )}
          </section>
          {!event.preview && (
            <OrganizerProfileLink
              profile={eventDetail.data?.hostPublicProfile}
              name={event.hostName || eventDetail.data?.hostTrust?.hostName}
            />
          )}
          {!event.preview && eventDetail.data?.hostTrust && (
            <>
              <HostTrustPanel trust={eventDetail.data.hostTrust} />
              <OrganizerReliabilitySignals trust={eventDetail.data.hostTrust} />
            </>
          )}
          {!event.preview &&
            !joined &&
            eventDetail.data?.levelAdmissionPolicy &&
            eventDetail.data.levelAdmissionPolicy !== "declarative" && (
              <LevelAdmissionPanel
                locale={locale}
                policy={eventDetail.data.levelAdmissionPolicy}
                requirementNote={eventDetail.data.levelRequirementNote}
                acknowledged={levelAcknowledged}
                exceptionNote={levelExceptionNote}
                onAcknowledge={setLevelAcknowledged}
                onExceptionNote={setLevelExceptionNote}
              />
            )}
          {!event.preview && resolvedLevelExceptionStatus && (
            <LevelExceptionDecision
              locale={locale}
              status={resolvedLevelExceptionStatus}
              note={eventDetail.data?.levelExceptionDecisionNote}
            />
          )}
          {!event.preview && awaitingWaitlist && (
            <WaitlistStatusPanel
              locale={locale}
              info={myWaitlistOffer.data}
              accepting={acceptWaitlist.isPending}
              declining={declineWaitlist.isPending}
              onAccept={() => acceptWaitlist.mutate({ eventId: event.id })}
              onDecline={() => declineWaitlist.mutate({ eventId: event.id })}
            />
          )}
          {/* Joining used to be one-way for participants: only the organizer could undo it. */}
          {!event.preview &&
            !canManage &&
            (hasConfirmedParticipation ||
              awaitingApproval ||
              awaitingWaitlist) && (
              <div className="mt-5 flex justify-end">
                <LeaveOutingButton
                  eventId={event.id}
                  participationStatus={
                    awaitingApproval
                      ? "pending"
                      : awaitingWaitlist
                        ? "waitlist"
                        : "going"
                  }
                  onLeft={() => {
                    setJoined(false);
                    setRequested(false);
                    eventDetail.refetch();
                  }}
                />
              </div>
            )}
          <details
            open={outingDetailsOpen}
            onToggle={toggleEvent =>
              setOutingDetailsOpen(toggleEvent.currentTarget.open)
            }
            className="group mt-6 overflow-hidden rounded-[1.45rem] border border-[#dce9d8] bg-white"
          >
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 text-left marker:content-none">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9f3e6] text-[#3b745a]">
                <BookOpen size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-[#244738]">
                  {locale === "fr" ? "Dossier de la sortie" : "Outing details"}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-[#789185]">
                  {locale === "fr"
                    ? "Parcours, météo, préparation, transport, sécurité et discussion"
                    : "Route, weather, preparation, transport, safety and chat"}
                </span>
              </span>
              <ChevronRight
                size={19}
                className="shrink-0 text-[#779287] transition-transform duration-200 group-open:rotate-90"
              />
            </summary>
            <div className="border-t border-[#e7eee3] px-4 pb-5 pt-1 sm:px-5">
              <ActionableParticipationJourney
                event={event}
                joined={hasConfirmedParticipation}
                hasTrust={Boolean(eventDetail.data?.hostTrust)}
                onOpenSection={openOutingSection}
              />
              <ActionableTrailConnectPillars
                carpoolAvailable={event.carpoolEnabled}
                joined={hasConfirmedParticipation}
                onOpenSection={openOutingSection}
              />
              {!event.preview && hasConfirmedParticipation && (
                <PreparationReadiness
                  locale={locale}
                  readyAt={eventDetail.data?.preparationReadyAt}
                  isPending={setPreparationReady.isPending}
                  onChange={isReady =>
                    setPreparationReady.mutate({ eventId: event.id, isReady })
                  }
                />
              )}
              <div id="tc-preparation" className="scroll-mt-5">
                <OutingPreparationPanel
                  eventId={event.id}
                  joined={hasConfirmedParticipation}
                  isPreview={Boolean(event.preview)}
                  hasMeetingPoint={Boolean(
                    eventDetail.data?.logistics?.meetingPoint
                  )}
                  carpoolAvailable={event.carpoolEnabled}
                  offlineReady={savedOffline}
                  onSaveOffline={saveOffline}
                  onOpenSection={openOutingSection}
                  weatherContext={weatherContext}
                  packingItems={
                    eventDetail.data?.checklist.length
                      ? eventDetail.data.checklist.map(item => ({
                          key: `packing:${item.id}`,
                          label: item.label,
                          category: item.category,
                        }))
                      : getDynamicPackingSuggestions(event, locale).map(
                          item => ({
                            key: `dynamic:${item.id}`,
                            label: item.label,
                            category: item.category,
                          })
                        )
                  }
                />
              </div>
              <section
                id="tc-route"
                className="mt-7 scroll-mt-5 overflow-hidden rounded-[1.4rem] border border-[#dce8d9] bg-white"
              >
                <div className="flex items-center gap-3 border-b border-[#e7eee3] px-4 py-3.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#ebf4e7] text-[#3b745d]">
                    <Navigation size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#244638]">
                      {micro.track}
                    </h3>
                    <p className="text-xs text-[#769084]">{micro.backup}</p>
                  </div>
                  <ChevronRight className="ml-auto text-[#7e988c]" size={18} />
                </div>
                <div className="relative h-32 overflow-hidden bg-[#dcebd9]">
                  <div className="absolute inset-0 opacity-75 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]" />
                  <svg
                    viewBox="0 0 360 125"
                    className="absolute inset-0 size-full"
                  >
                    <path
                      d="M-10 92 C 30 70 55 105 88 72 S 142 38 180 72 S 235 101 270 51 S 330 42 375 17"
                      fill="none"
                      stroke="#1b5b45"
                      strokeLinecap="round"
                      strokeWidth="5"
                    />
                    <circle
                      cx="88"
                      cy="72"
                      r="6"
                      fill="#f6c972"
                      stroke="#1b5b45"
                      strokeWidth="3"
                    />
                    <circle
                      cx="270"
                      cy="51"
                      r="6"
                      fill="#f6c972"
                      stroke="#1b5b45"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
              </section>
              {!event.preview && (
                <DeferredSection>
                  <GpxExchangePanel
                    title={event.title}
                    gpxUrl={eventDetail.data?.gpxUrl}
                  />
                </DeferredSection>
              )}
              {!event.preview && (
                <DeferredSection>
                  <ManualRouteMapPreview
                    manualRouteJson={eventDetail.data?.manualRouteJson}
                    locale={locale}
                  />
                </DeferredSection>
              )}
              {!event.preview && eventDetail.data?.manualRouteJson && (
                <DeferredSection>
                  <ManualRouteShareQrPanel
                    eventId={event.id}
                    title={event.title}
                    locale={locale}
                  />
                </DeferredSection>
              )}
              <section className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    event.carpoolEnabled
                      ? openOutingSection("tc-carpool")
                      : openOutingSection("tc-logistics")
                  }
                  className="min-h-28 rounded-[1.35rem] bg-[#edf5e8] p-4 text-left transition hover:bg-[#e4f1dd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d9f7a]"
                >
                  <div className="flex items-center gap-2 text-[#345f4b]">
                    <Car size={17} />
                    <h3 className="text-sm font-extrabold">
                      {micro.transport}
                    </h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#628071]">
                    {event.carpoolEnabled
                      ? locale === "fr"
                        ? "Voir les offres et demander une place"
                        : "View offers and request a seat"
                      : locale === "fr"
                        ? "Coordination à définir avec le groupe."
                        : "Coordinate with the group."}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#3f7359]">
                    {event.carpoolEnabled
                      ? locale === "fr"
                        ? "Ouvrir le covoiturage"
                        : "Open carpool"
                      : locale === "fr"
                        ? "Voir la logistique"
                        : "View logistics"}
                    <ChevronRight size={13} />
                  </span>
                </button>
                <div className="rounded-[1.35rem] bg-[#fff5dc] p-4">
                  <div className="flex items-center gap-2 text-[#866324]">
                    <ShieldCheck size={17} />
                    <h3 className="text-sm font-extrabold">
                      {copy.event.safety}
                    </h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#8a774d]">
                    {copy.event.safetyText}
                  </p>
                </div>
              </section>
              {!event.preview && (
                <div id="tc-weather" className="scroll-mt-5">
                  <WeatherOutlook
                    eventId={event.id}
                    locationName={event.locationName}
                    isOrganizer={canManage}
                    localWeatherSourceLabel={
                      eventDetail.data?.localWeatherSourceLabel
                    }
                    localWeatherSourceUrl={
                      eventDetail.data?.localWeatherSourceUrl
                    }
                    weatherUpdateNote={eventDetail.data?.weatherUpdateNote}
                    weatherUpdatedAt={eventDetail.data?.weatherUpdatedAt}
                    onConditionsChange={setWeatherContext}
                  />
                </div>
              )}
              {!event.preview && (
                <WeatherUpdateHistory
                  eventId={event.id}
                  canAcknowledge={hasConfirmedParticipation && !canManage}
                />
              )}
              <DynamicChecklist
                event={event}
                title={micro.essentials}
                locale={locale}
                customItems={eventDetail.data?.checklist.map(
                  item => item.label
                )}
                weatherContext={weatherContext}
              />
              {!event.preview && hasConfirmedParticipation && (
                <DeferredSection>
                  <OutingActionPlan
                    hasMeetingPoint={Boolean(
                      dayOfLogistics.data?.logistics?.meetingPoint ||
                        eventDetail.data?.logistics?.meetingPoint
                    )}
                    carpoolEnabled={event.carpoolEnabled}
                    hasWeatherUpdate={Boolean(
                      eventDetail.data?.weatherUpdateNote
                    )}
                    weatherRead={null}
                    preparationReady={Boolean(
                      eventDetail.data?.preparationReadyAt
                    )}
                    hasPinnedMessage={Boolean(pinnedMessage)}
                    offlineReady={savedOffline}
                    isOrganizer={canManage}
                  />
                </DeferredSection>
              )}
              {!event.preview && hasConfirmedParticipation && (
                <DeferredSection>
                  <ActionAssignmentsPanel
                    eventId={event.id}
                    candidates={actionAssignmentCandidates}
                    canManage={canManage}
                  />
                </DeferredSection>
              )}
              {!event.preview && hasConfirmedParticipation && (
                <DeferredSection>
                  <VoluntaryPreparationReminder
                    eventId={event.id}
                    incompleteLabels={incompleteActionLabels}
                  />
                </DeferredSection>
              )}
              {!event.preview && (
                <DeferredSection>
                  <TerrainAccessPanel
                    eventId={event.id}
                    canManage={canManage}
                    data={eventDetail.data?.logistics}
                  />
                </DeferredSection>
              )}
              {!event.preview && (
                <DeferredSection>
                  <TerrainLandmarksPanel
                    eventId={event.id}
                    canManage={canManage}
                  />
                </DeferredSection>
              )}
              {!event.preview && (hasConfirmedParticipation || canManage) && (
                <div id="tc-logistics" className="scroll-mt-5">
                  <GroupLogisticsPanel event={event} isOrganizer={canManage} />
                  <SeriesInterestPanel eventId={event.id} />
                  <DeferredSection>
                    <OperationalRoutePanel
                      eventId={event.id}
                      canManage={canManage}
                    />
                  </DeferredSection>
                  <ConfigurableCarpoolActionHub
                    eventId={event.id}
                    carpoolEnabled={event.carpoolEnabled}
                  />
                  <DeferredSection>
                    <OperationalReadinessPanel
                      eventId={event.id}
                      startsAt={event.startsAt}
                      canManage={canManage}
                      currentUserId={user?.id}
                    />
                  </DeferredSection>
                  {canManage && (
                    <RelaunchFormerParticipantsPanel eventId={event.id} />
                  )}
                  <DeferredSection>
                    <EventOperationsHub
                      eventId={event.id}
                      startsAt={event.startsAt}
                      canManage={canManage}
                      carpoolEnabled={event.carpoolEnabled}
                      candidates={actionAssignmentCandidates}
                    />
                  </DeferredSection>
                </div>
              )}
              {!event.preview && hasConfirmedParticipation && (
                <div id="tc-day-of">
                  <DeferredSection>
                    <DayOfBrief
                      event={event}
                      checklist={
                        eventDetail.data?.checklist.map(item => item.label) ??
                        (locale === "fr"
                          ? [
                              "Eau · 1,5 L",
                              "Veste coupe-vent",
                              "Chaussures adaptées",
                              "Téléphone chargé",
                            ]
                          : [
                              "Water · 1.5 L",
                              "Wind jacket",
                              "Trail shoes",
                              "Charged phone",
                            ])
                      }
                      logistics={dayOfLogistics.data?.logistics}
                      carpool={dayOfLogistics.data?.carpool ?? []}
                      weatherUpdateNote={eventDetail.data?.weatherUpdateNote}
                      weatherUpdatedAt={eventDetail.data?.weatherUpdatedAt}
                      localWeatherSource={{
                        label: eventDetail.data?.localWeatherSourceLabel,
                        url: eventDetail.data?.localWeatherSourceUrl,
                      }}
                      pinnedMessage={pinnedMessage}
                      landmarks={terrainLandmarks.data ?? []}
                      savedOffline={savedOffline}
                      onSaveOffline={saveOffline}
                      briefReadStatus={dayOfBriefReadStatus.data}
                      onAcknowledgeBrief={() =>
                        acknowledgeDayOfBrief.mutate({ eventId: event.id })
                      }
                      acknowledgementPending={acknowledgeDayOfBrief.isPending}
                    />
                  </DeferredSection>
                </div>
              )}
              {!event.preview && eventDetail.data && (
                <EventFacilitiesPanel event={eventDetail.data} />
              )}
              {!event.preview && hasConfirmedParticipation && (
                <LocationSharingControls eventId={event.id} />
              )}
              {!event.preview && hasConfirmedParticipation && (
                <SafetyHub
                  eventId={event.id}
                  isOrganizer={Boolean(isOrganizer)}
                  hasEmergencyPlan={Boolean(
                    eventDetail.data?.logistics?.emergencyPlan
                  )}
                  hasWeatherSource={Boolean(
                    eventDetail.data?.localWeatherSourceUrl
                  )}
                />
              )}
              {!event.preview &&
                hasConfirmedParticipation &&
                event.startsAt < new Date() && (
                  <>
                    <OutingDebrief event={event} />
                    <ConditionReports
                      eventId={event.id}
                      canCreate={hasConfirmedParticipation || canManage}
                      isCompleted={event.startsAt < new Date()}
                    />
                  </>
                )}
              {!event.preview && <ReportEvent eventId={event.id} />}
              {isOrganizer && !event.preview && (
                <details className="mt-7 overflow-hidden rounded-[1.35rem] border border-[#dce9d8] bg-white">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-sm font-extrabold text-[#315b48]">
                    <UsersRound size={17} className="text-[#47775d]" />
                    <span className="min-w-0 flex-1">
                      {locale === "fr"
                        ? "Coorganisation et délégation"
                        : "Co-organization and delegation"}
                    </span>
                    <ChevronRight size={17} className="text-[#779287]" />
                  </summary>
                  <div className="border-t border-[#e7eee3] px-4 pb-4">
                    <CoOrganizerInvitePanel eventId={event.id} />
                  </div>
                </details>
              )}
              {canManage && !event.preview && (
                <details className="mt-4 overflow-hidden rounded-[1.35rem] border border-[#dce9d8] bg-white">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-sm font-extrabold text-[#315b48]">
                    <Edit3 size={17} className="text-[#47775d]" />
                    <span className="min-w-0 flex-1">
                      {locale === "fr"
                        ? "Outils avancés de la sortie"
                        : "Advanced outing tools"}
                    </span>
                    <ChevronRight size={17} className="text-[#779287]" />
                  </summary>
                  <div className="border-t border-[#e7eee3] px-4 pb-4">
                    <DeferredSection>
                      <ManualRouteEditorPanel
                        eventId={event.id}
                        manualRouteJson={eventDetail.data?.manualRouteJson}
                        locationName={event.locationName}
                        latitude={eventDetail.data?.latitude}
                        longitude={eventDetail.data?.longitude}
                        onChanged={() => eventDetail.refetch()}
                      />
                    </DeferredSection>
                    <ChecklistManagementPanel
                      eventId={event.id}
                      items={eventDetail.data?.checklist ?? []}
                      onChanged={() => eventDetail.refetch()}
                    />
                    <CoverFocalPointManager eventId={event.id} />
                    {isOrganizer && (
                      <WaitlistOfferManager
                        locale={locale}
                        eventId={event.id}
                        participants={participants.data ?? []}
                        pending={offerWaitlist.isPending}
                        onOffer={(participantId, responseWindowHours) =>
                          offerWaitlist.mutate({
                            eventId: event.id,
                            participantId,
                            responseWindowHours,
                          })
                        }
                      />
                    )}
                  </div>
                </details>
              )}
              {isOrganizer && (
                <details className="mt-4 overflow-hidden rounded-[1.35rem] border border-[#dce9d8] bg-white">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-sm font-extrabold text-[#315b48]">
                    <ClipboardList size={17} className="text-[#47775d]" />
                    <span className="min-w-0 flex-1">
                      {locale === "fr"
                        ? "Journal de coordination"
                        : "Coordination journal"}
                    </span>
                    <ChevronRight size={17} className="text-[#779287]" />
                  </summary>
                  <div className="border-t border-[#e7eee3] px-4 pb-4">
                    <CoordinationJournal
                      locale={locale}
                      participants={participants.data ?? []}
                      reservations={coordination.data?.reservations ?? []}
                    />
                  </div>
                </details>
              )}
              {!event.preview && (
                <DepartureReadinessDashboard
                  eventId={event.id}
                  visible={canManage}
                />
              )}
              <section
                id="tc-chat"
                className="mt-7 scroll-mt-5 overflow-hidden rounded-[1.45rem] border border-[#dce9d8] bg-white"
              >
                <div className="flex items-center gap-3 border-b border-[#e7eee3] px-4 py-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#e9f3e6] text-[#3b745a]">
                    <MessageCircle size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#244738]">
                      {event.startsAt.toDateString() ===
                      new Date().toDateString()
                        ? locale === "fr"
                          ? "Canal Jour J"
                          : "Day-of channel"
                        : copy.event.chat}
                    </h3>
                    <p className="text-[11px] font-semibold text-[#7a9487]">
                      {event.preview
                        ? locale === "fr"
                          ? "Bientôt"
                          : "Coming soon"
                        : `${messages.data?.length ?? 0} messages`}
                    </p>
                  </div>
                </div>
                {isAuthenticated &&
                !event.preview &&
                messages.data &&
                messages.data.length > 0 ? (
                  <div className="max-h-52 space-y-2 overflow-y-auto px-4 py-3">
                    {messages.data.map(message => (
                      <div
                        key={message.id}
                        className={`rounded-xl px-3 py-2 ${message.isPinned ? "border border-[#f0d295] bg-[#fff7e3]" : "bg-[#f2f7ef]"}`}
                      >
                        {message.isPinned && (
                          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#986c1f]">
                            {locale === "fr"
                              ? "Épinglé · Jour J"
                              : "Pinned · Day of"}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {message.publicProfile ? (
                            <PublicProfileLink
                              profile={message.publicProfile}
                              name={message.senderName}
                              className="min-w-0 flex-1 truncate text-[10px] font-extrabold text-[#4e7965] hover:underline"
                            >
                              {message.senderName || "TrailConnect"}
                            </PublicProfileLink>
                          ) : (
                            <p className="min-w-0 flex-1 text-[10px] font-extrabold text-[#4e7965]">
                              {message.senderName || "TrailConnect"}
                            </p>
                          )}
                          {canManage && (
                            <button
                              onClick={() =>
                                pinMessage.mutate({
                                  eventId: event.id,
                                  messageId: message.id,
                                  isPinned: !message.isPinned,
                                })
                              }
                              disabled={pinMessage.isPending}
                              className="min-h-8 rounded-lg px-2 text-[10px] font-extrabold text-[#8a641e] hover:bg-white/70 disabled:opacity-50"
                            >
                              {message.isPinned
                                ? locale === "fr"
                                  ? "Désépingler"
                                  : "Unpin"
                                : locale === "fr"
                                  ? "Épingler"
                                  : "Pin"}
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#4c6c5d]">
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-center text-xs font-semibold text-[#718b7e]">
                    {isAuthenticated
                      ? locale === "fr"
                        ? "Lancez la conversation avec le groupe."
                        : "Start the conversation with the group."
                      : locale === "fr"
                        ? "Connectez-vous pour participer à la discussion."
                        : "Log in to join the conversation."}
                  </div>
                )}
                <div className="flex gap-2 border-t border-[#e7eee3] p-3">
                  <input
                    value={chatMessage}
                    onChange={event => setChatMessage(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") publishMessage();
                    }}
                    placeholder={copy.community.message}
                    className="min-w-0 flex-1 rounded-xl bg-[#f2f7ef] px-3 text-xs font-semibold text-[#385a49] outline-none"
                  />
                  <button
                    onClick={publishMessage}
                    disabled={sendMessage.isPending}
                    className="grid size-10 place-items-center rounded-xl bg-[#244d3d] text-white disabled:opacity-50 active:scale-95"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </section>
            </div>
          </details>
          {event.preview ? (
            <section
              role="status"
              className="mt-8 rounded-2xl border border-[#dbe7d6] bg-[#f4f8f2] p-4"
            >
              <p className="text-sm font-extrabold text-[#365c49]">
                {locale === "fr"
                  ? "Aperçu illustratif : cette sortie ne reçoit pas d’inscriptions."
                  : "Illustrative preview: this outing does not accept registrations."}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#718a7c]">
                {locale === "fr"
                  ? "Les inscriptions, la préparation et la discussion s’ouvrent sur les sorties publiées par la communauté."
                  : "Registration, preparation and group chat are available on outings published by the community."}
              </p>
              {onCreatePublishedOuting && (
                <button
                  onClick={onCreatePublishedOuting}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white"
                >
                  <Plus size={15} />
                  {locale === "fr"
                    ? "Créer une sortie publiée"
                    : "Create a published outing"}
                </button>
              )}
            </section>
          ) : (
            <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
              {canManage ? (
                <div className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-[#bcd8bf] bg-[#eef8ec] px-5 text-sm font-extrabold text-[#3e704f]">
                  <Check size={17} />
                  {locale === "fr"
                    ? "Vous organisez cette sortie"
                    : "You organize this outing"}
                </div>
              ) : (
                <button
                  onClick={register}
                  disabled={
                    joinMutation.isPending ||
                    joined ||
                    awaitingWaitlist ||
                    awaitingApproval
                  }
                  className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#1d493a] px-5 text-sm font-extrabold text-[#f5f9f0] shadow-[0_10px_22px_rgba(25,70,53,.2)] transition hover:bg-[#153c2f] active:scale-[.98] disabled:opacity-70"
                >
                  <UsersRound size={17} />{" "}
                  {awaitingWaitlist
                    ? locale === "fr"
                      ? "Liste d’attente"
                      : "Waitlisted"
                    : awaitingApproval
                      ? locale === "fr"
                        ? "Candidature en attente"
                        : "Request pending"
                      : joined
                        ? copy.common.joined
                        : copy.common.join}
                </button>
              )}
              <button
                onClick={saveOffline}
                className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-[#cfe0ca] bg-white px-5 text-sm font-extrabold text-[#315946] transition hover:bg-[#f1f6ed] active:scale-[.98]"
              >
                <WifiOff size={17} />{" "}
                {savedOffline ? <Check size={17} /> : micro.offline}
              </button>
            </div>
          )}
        </main>
        {isOrganizer && !event.preview && (
          <Drawer
            open={organizerManagementOpen}
            onOpenChange={setOrganizerManagementOpen}
          >
            <DrawerContent className="max-h-[92dvh] border-[#dce8d9] bg-[#f8fbf4] sm:mx-auto sm:max-w-3xl sm:rounded-t-[2rem]">
              <div className="min-h-0 overflow-y-auto overscroll-contain">
                <DrawerHeader className="sticky top-0 z-10 border-b border-[#dce8d9] bg-[#f8fbf4]/95 px-5 pb-3 pt-4 backdrop-blur sm:px-7">
                  <div className="flex items-start gap-3 text-left">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f2e3] text-[#35684d]">
                      <UsersRound size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DrawerTitle className="text-base font-extrabold tracking-[-.03em] text-[#214536]">
                        {locale === "fr"
                          ? "Pilotage de la sortie"
                          : "Outing management"}
                      </DrawerTitle>
                      <DrawerDescription className="mt-1 text-xs font-semibold leading-relaxed text-[#6e877b]">
                        {locale === "fr"
                          ? "Décidez des candidatures, suivez les présences et modifiez les essentiels sans parcourir toute la fiche."
                          : "Decide requests, track attendance and edit essentials without scrolling through the entire outing."}
                      </DrawerDescription>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrganizerManagementOpen(false)}
                      aria-label={copy.common.close}
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#315846] ring-1 ring-[#dce8d9] active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </DrawerHeader>
                <div
                  id="tc-organizer-control"
                  className="space-y-4 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-7"
                >
                  <EventLifecyclePanel
                    eventId={event.id}
                    canCancel={true}
                    onCancelled={onClose}
                  />
                  <OrganizerParticipantCockpit
                    eventId={event.id}
                    capacity={event.capacity}
                  />
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>
    </div>
  );
}

function DeferredSection({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function LevelAdmissionPanel({
  locale,
  policy,
  requirementNote,
  acknowledged,
  exceptionNote,
  onAcknowledge,
  onExceptionNote,
}: {
  locale: "fr" | "en";
  policy: "confirmation" | "organizer_review";
  requirementNote?: string | null;
  acknowledged: boolean;
  exceptionNote: string;
  onAcknowledge: (value: boolean) => void;
  onExceptionNote: (value: string) => void;
}) {
  const fr = locale === "fr";
  const title =
    policy === "organizer_review"
      ? fr
        ? "Admission revue par l’organisateur"
        : "Organizer-reviewed admission"
      : fr
        ? "Confirmation de niveau demandée"
        : "Level confirmation required";
  return (
    <section className="mt-7 rounded-[1.45rem] border border-[#e6d4a8] bg-[#fff9ea] p-4">
      <div className="flex gap-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#997029]" size={19} />
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-[#70531d]">{title}</h3>
          {requirementNote && (
            <p className="mt-2 text-xs leading-relaxed text-[#7e693f]">
              {requirementNote}
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-[#8d7649]">
            {fr
              ? "Ce repère sert à préparer la sortie. Il ne constitue ni une autorisation de sécurité ni une garantie d’aptitude."
              : "This is preparation guidance only. It is not a safety clearance or a guarantee of fitness."}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="checkbox"
        aria-checked={acknowledged}
        onClick={() => onAcknowledge(!acknowledged)}
        className={`mt-4 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-extrabold ${acknowledged ? "bg-[#e9f4e5] text-[#315d48]" : "bg-white text-[#6b775f] ring-1 ring-[#eadab9]"}`}
      >
        <span
          aria-hidden="true"
          className={`grid size-5 place-items-center rounded-md ${acknowledged ? "bg-[#3f7957] text-white" : "border border-[#c9b887]"}`}
        >
          {acknowledged && <Check size={14} />}
        </span>
        {fr
          ? "Je confirme que ce niveau et ces prérequis me semblent adaptés à ma préparation."
          : "I confirm this level and these requirements appear suitable for my preparation."}
      </button>
      <label className="mt-3 block">
        <span className="text-[11px] font-extrabold text-[#715d34]">
          {fr
            ? "Demander une exception à l’organisateur"
            : "Request an exception from the organizer"}
        </span>
        <textarea
          rows={2}
          value={exceptionNote}
          onChange={event => onExceptionNote(event.target.value)}
          placeholder={
            fr
              ? "Expliquez brièvement le contexte ; l’organisateur devra décider."
              : "Briefly explain the context; the organizer will decide."
          }
          className="mt-1.5 w-full resize-none rounded-xl border border-[#eadab9] bg-white px-3 py-2 text-xs font-semibold text-[#5e664f] outline-none"
        />
      </label>
    </section>
  );
}
function LevelExceptionDecision({
  locale,
  status,
  note,
}: {
  locale: "fr" | "en";
  status: "approved" | "declined";
  note?: string | null;
}) {
  const fr = locale === "fr";
  const accepted = status === "approved";
  return (
    <section
      className={`mt-7 rounded-[1.45rem] border p-4 ${accepted ? "border-[#cce2c7] bg-[#f1f8ee]" : "border-[#ebcfbf] bg-[#fff3ee]"}`}
    >
      <h3
        className={`text-sm font-extrabold ${accepted ? "text-[#356147]" : "text-[#934f3e]"}`}
      >
        {accepted
          ? fr
            ? "Exception de niveau acceptée"
            : "Level exception accepted"
          : fr
            ? "Exception de niveau refusée"
            : "Level exception declined"}
      </h3>
      {note && (
        <p
          className={`mt-2 text-xs leading-relaxed ${accepted ? "text-[#587664]" : "text-[#866456]"}`}
        >
          {note}
        </p>
      )}
      <p
        className={`mt-2 text-[11px] leading-relaxed ${accepted ? "text-[#6c8472]" : "text-[#94766b]"}`}
      >
        {fr
          ? "Cette décision concerne uniquement cette sortie et ne constitue pas une garantie de sécurité."
          : "This decision applies only to this outing and is not a safety guarantee."}
      </p>
    </section>
  );
}
function WaitlistStatusPanel({
  locale,
  info,
  accepting,
  declining,
  onAccept,
  onDecline,
}: {
  locale: "fr" | "en";
  info?: {
    position: number;
    offer: {
      status: "pending" | "accepted" | "declined" | "expired" | "withdrawn";
      expiresAt: Date | string;
    } | null;
  } | null;
  accepting: boolean;
  declining: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const fr = locale === "fr";
  const offer = info?.offer;
  const expiry = offer?.expiresAt
    ? new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(offer.expiresAt))
    : null;
  const pending = offer?.status === "pending";
  return (
    <section
      role="status"
      aria-live="polite"
      className={`mt-7 rounded-[1.45rem] border p-4 ${pending ? "border-[#b8d8bb] bg-[#f0f8ed]" : "border-[#d7dff0] bg-[#f2f5fc]"}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${pending ? "bg-[#d9eed5] text-[#35704d]" : "bg-white text-[#4b668d]"}`}
        >
          <UsersRound size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-extrabold ${pending ? "text-[#315f45]" : "text-[#3d557a]"}`}
          >
            {pending
              ? fr
                ? "Une place vous est proposée"
                : "A spot is offered to you"
              : fr
                ? "Vous êtes sur la liste d’attente"
                : "You are on the waitlist"}
          </h3>
          <p
            className={`mt-1.5 text-xs leading-relaxed ${pending ? "text-[#547763]" : "text-[#687d9e]"}`}
          >
            {pending
              ? fr
                ? `Répondez avant le ${expiry}. Votre participation sera confirmée seulement si vous acceptez avant cette échéance.`
                : `Reply by ${expiry}. Your attendance is confirmed only if you accept before this deadline.`
              : fr
                ? `Votre rang actuel est ${info?.position ?? "—"}. L’organisateur peut vous proposer une place lorsqu’une place confirmée se libère.`
                : `Your current position is ${info?.position ?? "—"}. The organizer may offer you a spot when a confirmed place opens.`}
          </p>
          {pending && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={accepting || declining}
                onClick={onAccept}
                className="min-h-11 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white disabled:opacity-50"
              >
                {fr ? "Accepter la place" : "Accept spot"}
              </button>
              <button
                type="button"
                disabled={accepting || declining}
                onClick={onDecline}
                className="min-h-11 rounded-xl border border-[#b9d3bb] bg-white px-3 text-xs font-extrabold text-[#48715a] disabled:opacity-50"
              >
                {fr ? "Refuser" : "Decline"}
              </button>
            </div>
          )}
          {offer?.status === "expired" && (
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-[11px] font-bold text-[#627797]">
              {fr
                ? "Le délai de cette proposition est écoulé. Votre rang demeure indicatif jusqu’à une nouvelle proposition."
                : "This offer has expired. Your position remains indicative until a new offer is made."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
export function PreparationReadiness({
  locale,
  readyAt,
  isPending,
  onChange,
}: {
  locale: "fr" | "en";
  readyAt?: Date | string | null;
  isPending: boolean;
  onChange: (isReady: boolean) => void;
}) {
  const fr = locale === "fr";
  const isReady = Boolean(readyAt);
  return (
    <section
      className={`mt-7 rounded-[1.45rem] border p-4 ${isReady ? "border-[#cbe3c7] bg-[#f0f8ed]" : "border-[#d9e6d5] bg-[#f8fbf6]"}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-xl ${isReady ? "bg-[#dcefd8] text-[#3b7750]" : "bg-white text-[#6c8879]"}`}
        >
          <Check size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-[#315d48]">
            {isReady
              ? fr
                ? "Préparation déclarée"
                : "Preparation declared"
              : fr
                ? "Prêt pour la sortie ?"
                : "Ready for the outing?"}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#658071]">
            {fr
              ? "Indiquez que vous avez vérifié votre préparation. Ce statut aide le groupe à se coordonner ; il ne confirme ni votre aptitude ni la sécurité de la sortie."
              : "Indicate that you reviewed your preparation. This helps group coordination; it does not confirm fitness or outing safety."}
          </p>
          <button
            onClick={() => onChange(!isReady)}
            disabled={isPending}
            className={`mt-3 min-h-11 rounded-xl px-3 text-xs font-extrabold disabled:opacity-50 ${isReady ? "bg-white text-[#4a745a] ring-1 ring-[#c6ddc1]" : "bg-[#244d3d] text-white"}`}
          >
            {isReady
              ? fr
                ? "Retirer mon statut prêt"
                : "Remove ready status"
              : fr
                ? "Je me déclare prêt"
                : "Declare ready"}
          </button>
        </div>
      </div>
    </section>
  );
}
export function CoordinationJournal({
  locale,
  participants,
  reservations,
}: {
  locale: "fr" | "en";
  participants: Array<{
    id: number;
    name?: string | null;
    status: string;
    preparationReadyAt?: Date | string | null;
    checkedInAt?: Date | string | null;
    levelExceptionStatus?: string | null;
  }>;
  reservations: Array<{
    id: number;
    passengerName?: string | null;
    status: string;
    departureLocation?: string | null;
  }>;
}) {
  const fr = locale === "fr";
  const participantEntries = participants.flatMap(participant =>
    [
      participant.status === "waitlist"
        ? `${participant.name || "Participant"} · ${fr ? "liste d’attente" : "waitlist"}`
        : null,
      participant.levelExceptionStatus &&
      participant.levelExceptionStatus !== "none"
        ? `${participant.name || "Participant"} · ${fr ? "exception de niveau" : "level exception"} : ${participant.levelExceptionStatus}`
        : null,
      participant.preparationReadyAt
        ? `${participant.name || "Participant"} · ${fr ? "préparation déclarée" : "preparation declared"}`
        : null,
      participant.checkedInAt
        ? `${participant.name || "Participant"} · ${fr ? "présence pointée" : "attendance checked in"}`
        : null,
    ].filter((entry): entry is string => Boolean(entry))
  );
  const entries = [
    ...participantEntries,
    ...reservations.map(
      reservation =>
        `${reservation.passengerName || "Participant"} · ${fr ? "covoiturage" : "carpool"} : ${reservation.status} · ${reservation.departureLocation || (fr ? "lieu à confirmer" : "location to confirm")}`
    ),
  ];
  return (
    <section
      aria-label={fr ? "Journal de coordination" : "Coordination journal"}
      className="mt-7 overflow-hidden rounded-[1.45rem] border border-[#d8e5ec] bg-[#f8fcfe]"
    >
      <div className="flex items-center gap-3 border-b border-[#e5eef2] px-4 py-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[#e8f3f8] text-[#3c718c]">
          <ClipboardCheck size={17} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#315a70]">
            {fr ? "Journal de coordination" : "Coordination journal"}
          </h3>
          <p className="text-[11px] font-semibold text-[#748d9b]">
            {fr
              ? "Décisions et états utiles à l’organisation"
              : "Decisions and statuses useful for coordination"}
          </p>
        </div>
      </div>
      <div className="p-4">
        {entries.length ? (
          <ul className="space-y-2">
            {entries.map((entry, index) => (
              <li
                key={`${entry}-${index}`}
                className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#4c6d7d] ring-1 ring-[#e2edf2]"
              >
                {entry}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs font-semibold text-[#78919e]">
            {fr
              ? "Aucune décision collective à signaler pour le moment."
              : "No collective decision to report yet."}
          </p>
        )}
        <p className="mt-3 text-[10px] leading-relaxed font-semibold text-[#78919e]">
          {fr
            ? "Les notifications in-app associées restent consultables par la personne concernée ; ce journal ne remplace ni une alerte officielle ni une coordination terrain."
            : "Related in-app notifications remain available to the person concerned; this journal does not replace official alerts or field coordination."}
        </p>
      </div>
    </section>
  );
}
function CarpoolSeatControls({ eventId }: { eventId: number }) {
  const { locale } = useLocale();
  const { user } = useAuth();
  const logistics = trpc.hiking.marketplace.logistics.detail.useQuery({
    eventId,
  });
  const request = trpc.hiking.marketplace.logistics.requestSeat.useMutation({
    onSuccess: () => logistics.refetch(),
  });
  const decide = trpc.hiking.marketplace.logistics.decideSeat.useMutation({
    onSuccess: () => logistics.refetch(),
  });
  const fr = locale === "fr";
  const rides = logistics.data?.carpool ?? [];
  const reservations = logistics.data?.reservations ?? [];
  const pendingForDriver = reservations.filter(
    item => item.driverId === user?.id && item.status === "pending"
  );
  if (!rides.length) return null;
  return (
    <section className="mt-4 overflow-hidden rounded-[1.45rem] border border-[#d7e5ef] bg-[#fbfdff]">
      <div className="flex items-center gap-3 border-b border-[#e3edf3] px-4 py-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[#eaf4f9] text-[#39708d]">
          <Car size={17} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#294f64]">
            {fr
              ? "Réserver une place de covoiturage"
              : "Reserve a carpool seat"}
          </h3>
          <p className="text-[11px] font-semibold text-[#708b9a]">
            {fr
              ? "La réservation reste à confirmer par le conducteur."
              : "The driver must confirm each reservation."}
          </p>
        </div>
      </div>
      <div className="divide-y divide-[#e8f0f4]">
        {rides.map(ride => {
          const own = reservations.find(
            reservation =>
              reservation.offerId === ride.id &&
              reservation.passengerId === user?.id
          );
          return (
            <div key={ride.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-[#365d71]">
                  {ride.departureLocation}
                </p>
                <p className="text-[10px] font-semibold text-[#7893a1]">
                  {ride.seatsAvailable}{" "}
                  {fr ? "place(s) disponible(s)" : "seat(s) available"}
                </p>
              </div>
              {ride.driverId === user?.id ? (
                <span className="text-[10px] font-extrabold text-[#6d8492]">
                  {fr ? "Votre trajet" : "Your ride"}
                </span>
              ) : own ? (
                <span
                  className={`rounded-lg px-2.5 py-2 text-[10px] font-extrabold ${own.status === "accepted" ? "bg-[#e7f4e6] text-[#47755b]" : own.status === "declined" ? "bg-[#fff0ed] text-[#94594c]" : "bg-[#fff5df] text-[#8a6a2b]"}`}
                >
                  {own.status === "accepted"
                    ? fr
                      ? "Confirmée"
                      : "Confirmed"
                    : own.status === "declined"
                      ? fr
                        ? "Refusée"
                        : "Declined"
                      : fr
                        ? "En attente"
                        : "Pending"}
                </span>
              ) : (
                <button
                  disabled={ride.seatsAvailable < 1 || request.isPending}
                  onClick={() =>
                    request.mutate({ offerId: ride.id, seatsRequested: 1 })
                  }
                  className="min-h-11 rounded-lg bg-[#244d3d] px-3 text-[10px] font-extrabold text-white disabled:opacity-40"
                >
                  {fr ? "Demander 1 place" : "Request 1 seat"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {pendingForDriver.length > 0 && (
        <div className="border-t border-[#e3edf3] bg-[#f4f9fc] px-4 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#547b90]">
            {fr ? "Demandes à décider" : "Requests to decide"}
          </p>
          <div className="mt-2 space-y-2">
            {pendingForDriver.map(reservation => (
              <div
                key={reservation.id}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#466878]">
                  {reservation.passengerName || "TrailConnect"} ·{" "}
                  {reservation.seatsRequested} {fr ? "place" : "seat"}
                </span>
                <button
                  aria-label={
                    fr
                      ? "Accepter la demande de covoiturage"
                      : "Accept carpool request"
                  }
                  onClick={() =>
                    decide.mutate({
                      reservationId: reservation.id,
                      status: "accepted",
                    })
                  }
                  className="grid size-11 place-items-center rounded-lg bg-[#244d3d] text-white"
                >
                  <Check size={15} />
                </button>
                <button
                  aria-label={
                    fr
                      ? "Refuser la demande de covoiturage"
                      : "Decline carpool request"
                  }
                  onClick={() =>
                    decide.mutate({
                      reservationId: reservation.id,
                      status: "declined",
                    })
                  }
                  className="grid size-11 place-items-center rounded-lg bg-[#fff0ed] text-[#98594d]"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e1ebde] bg-white p-3">
      <div className="flex items-center gap-1.5 text-[#69917c]">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[.08em]">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-extrabold tracking-[-.02em] text-[#204233]">
        {value}
      </p>
    </div>
  );
}
function SummaryWeatherMetric({ eventId }: { eventId: number }) {
  const { locale } = useLocale();
  const outlook = trpc.hiking.weather.outlook.useQuery({ eventId });
  const fr = locale === "fr";
  const data = outlook.data;
  const hasTemperatureRange =
    data?.available &&
    typeof data.temperatureMinC === "number" &&
    Number.isFinite(data.temperatureMinC) &&
    typeof data.temperatureMaxC === "number" &&
    Number.isFinite(data.temperatureMaxC);
  const value = outlook.isLoading
    ? fr
      ? "Chargement"
      : "Loading"
    : hasTemperatureRange
      ? `${Math.round(data.temperatureMinC)}–${Math.round(data.temperatureMaxC)} °C`
      : fr
        ? "À vérifier"
        : "Check conditions";
  return (
    <Metric
      icon={<CloudSun size={17} />}
      label={fr ? "Météo ind." : "Weather adv."}
      value={value}
    />
  );
}
function OrganizerProfileLink({
  profile,
  name,
}: {
  profile?: { publicSlug: string; avatarUrl?: string | null } | null;
  name?: string | null;
}) {
  const { locale } = useLocale();
  if (!profile?.publicSlug) return null;
  const organizerName =
    name ||
    (locale === "fr" ? "Organisateur TrailConnect" : "TrailConnect organizer");
  return (
    <section className="mt-7 overflow-hidden rounded-[1.45rem] border border-[#d6e7d3] bg-[#f3f9f0] p-3">
      <Link
        href={`/organizers/${profile.publicSlug}`}
        aria-label={
          locale === "fr"
            ? `Voir le profil organisateur de ${organizerName}`
            : `View organizer profile of ${organizerName}`
        }
        className="flex min-h-12 items-center gap-3 rounded-xl px-1.5 outline-none transition hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-[#6c9c7a]"
      >
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#dcecd8] text-sm font-black text-[#3d7154]">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            organizerName.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#648675]">
            {locale === "fr" ? "Votre organisateur" : "Your organizer"}
          </p>
          <p className="truncate text-sm font-extrabold text-[#294d3b]">
            {organizerName}
          </p>
          <p className="text-[11px] font-semibold text-[#557968]">
            {locale === "fr"
              ? "Voir le profil, les sorties et les repères"
              : "View profile, outings and signals"}
          </p>
        </div>
        <ChevronRight className="shrink-0 text-[#49765a]" size={18} />
      </Link>
    </section>
  );
}
function ActionableTrailConnectPillars({
  carpoolAvailable,
  joined,
  onOpenSection,
}: {
  carpoolAvailable: boolean;
  joined: boolean;
  onOpenSection: (sectionId: string) => void;
}) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const logisticsTarget =
    joined && carpoolAvailable
      ? "tc-carpool"
      : joined
        ? "tc-logistics"
        : "tc-preparation";
  const pillars = fr
    ? [
        {
          label: "Logistique",
          body: carpoolAvailable
            ? "Offres et checklist"
            : "Checklist et rendez-vous",
          target: logisticsTarget,
        },
        {
          label: "Discussion",
          body: "Échanges avec le groupe",
          target: "tc-chat",
        },
        { label: "Parcours", body: "Trace et difficultés", target: "tc-route" },
        { label: "Confiance", body: "Profil organisateur", target: "tc-trust" },
        { label: "Conditions", body: "Météo et repères", target: "tc-weather" },
      ]
    : [
        {
          label: "Logistics",
          body: carpoolAvailable
            ? "Offers and checklist"
            : "Checklist and meeting point",
          target: logisticsTarget,
        },
        { label: "Chat", body: "Group conversation", target: "tc-chat" },
        { label: "Route", body: "Track and difficulty", target: "tc-route" },
        { label: "Trust", body: "Organizer profile", target: "tc-trust" },
        { label: "Conditions", body: "Weather and cues", target: "tc-weather" },
      ];
  return (
    <section className="mt-7 overflow-hidden rounded-[1.45rem] border border-[#dce9d8] bg-[#f8fbf5]">
      <div className="flex items-center gap-3 border-b border-[#e5eee1] px-4 py-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[#e9f3e6] text-[#3d7659]">
          <Compass size={17} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#244738]">
            {fr ? "Accès rapides" : "Quick access"}
          </h3>
          <p className="text-[11px] font-semibold text-[#789185]">
            {fr
              ? "Ouvrez directement l’information ou l’action utile."
              : "Open the relevant information or action directly."}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-[#deeadb] sm:grid-cols-5">
        {pillars.map(pillar => (
          <button
            type="button"
            key={pillar.label}
            onClick={() => onOpenSection(pillar.target)}
            className="min-h-24 bg-[#f8fbf5] px-3 py-3 text-left transition hover:bg-white focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d9f7a]"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#38664f]">
              {pillar.label}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed font-semibold text-[#718b7e]">
              {pillar.body}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#3f7359]">
              {fr ? "Ouvrir" : "Open"}
              <ChevronRight size={12} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
function ConfigurableCarpoolActionHub({
  eventId,
  carpoolEnabled,
}: {
  eventId: number;
  carpoolEnabled: boolean;
}) {
  const { locale } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const fr = locale === "fr";
  const logistics = trpc.hiking.marketplace.logistics.detail.useQuery(
    { eventId },
    { enabled: carpoolEnabled && isAuthenticated }
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [departureLocation, setDepartureLocation] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("2");
  const [note, setNote] = useState("");
  const refresh = () => logistics.refetch();
  const offer = trpc.hiking.marketplace.logistics.offerCarpool.useMutation({
    onSuccess: () => {
      refresh();
      resetForm();
      toast.success(fr ? "Trajet proposé." : "Ride offered.");
    },
    onError: error => toast.error(error.message),
  });
  const updateOffer =
    trpc.hiking.marketplace.logistics.updateCarpool.useMutation({
      onSuccess: () => {
        refresh();
        resetForm();
        toast.success(fr ? "Trajet mis à jour." : "Ride updated.");
      },
      onError: error => toast.error(error.message),
    });
  const request = trpc.hiking.marketplace.logistics.requestSeat.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });
  const decide = trpc.hiking.marketplace.logistics.decideSeat.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });
  const removePassenger =
    trpc.hiking.marketplace.logistics.removePassenger.useMutation({
      onSuccess: refresh,
      onError: error => toast.error(error.message),
    });
  const withdraw =
    trpc.hiking.marketplace.logistics.withdrawCarpool.useMutation({
      onSuccess: refresh,
      onError: error => toast.error(error.message),
    });
  const rides = logistics.data?.carpool ?? [];
  const reservations = logistics.data?.reservations ?? [];
  const pending =
    offer.isPending ||
    updateOffer.isPending ||
    request.isPending ||
    decide.isPending ||
    removePassenger.isPending ||
    withdraw.isPending;
  const resetForm = () => {
    setFormOpen(false);
    setEditingOfferId(null);
    setDepartureLocation("");
    setDepartureAt("");
    setSeatsTotal("2");
    setNote("");
  };
  const startEditing = (ride: any) => {
    setEditingOfferId(ride.id);
    setDepartureLocation(ride.departureLocation);
    setDepartureAt(
      ride.departureAt
        ? new Date(ride.departureAt).toISOString().slice(0, 16)
        : ""
    );
    setSeatsTotal(String(ride.seatsTotal));
    setNote(ride.note || "");
    setFormOpen(true);
  };
  const submitOffer = () => {
    const seats = Number(seatsTotal);
    if (
      !departureLocation.trim() ||
      !Number.isInteger(seats) ||
      seats < 1 ||
      seats > 8
    )
      return;
    const payload = {
      eventId,
      departureLocation: departureLocation.trim(),
      departureAt: departureAt ? new Date(departureAt) : undefined,
      seatsTotal: seats,
      seatsAvailable: seats,
      note: note.trim() || undefined,
    };
    if (editingOfferId)
      updateOffer.mutate({ ...payload, offerId: editingOfferId });
    else offer.mutate(payload);
  };
  if (!carpoolEnabled) return null;
  if (!isAuthenticated)
    return (
      <section
        id="tc-carpool"
        className="mt-7 scroll-mt-5 rounded-[1.45rem] border border-[#d7e5ef] bg-[#fbfdff] p-4"
      >
        <h3 className="text-sm font-extrabold text-[#294f64]">
          {fr ? "Covoiturage" : "Carpool"}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#66818f]">
          {fr
            ? "Connectez-vous après confirmation pour consulter ou proposer un trajet."
            : "Log in after confirmation to view or offer a ride."}
        </p>
        <button
          type="button"
          onClick={startLogin}
          className="mt-3 min-h-11 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white"
        >
          {fr ? "Se connecter" : "Log in"}
        </button>
      </section>
    );
  return (
    <>
      <section
        id="tc-carpool"
        className="mt-7 scroll-mt-5 overflow-hidden rounded-[1.45rem] border border-[#d7e5ef] bg-[#fbfdff]"
      >
        <div className="flex items-center gap-3 border-b border-[#e3edf3] px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#eaf4f9] text-[#39708d]">
            <Car size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-[#294f64]">
              {fr ? "Covoiturage" : "Carpool"}
            </h3>
            <p className="text-[11px] font-semibold text-[#708b9a]">
              {rides.length
                ? fr
                  ? `${rides.length} trajet${rides.length > 1 ? "s" : ""} proposé${rides.length > 1 ? "s" : ""}`
                  : `${rides.length} ride${rides.length > 1 ? "s" : ""} offered`
                : fr
                  ? "Aucune offre de trajet pour le moment."
                  : "No ride has been offered yet."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (formOpen ? resetForm() : setFormOpen(true))}
            className="min-h-11 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white"
          >
            {formOpen
              ? fr
                ? "Fermer"
                : "Close"
              : fr
                ? "Proposer un trajet"
                : "Offer a ride"}
          </button>
        </div>
        {formOpen && (
          <div className="border-b border-[#e3edf3] bg-white p-4">
            <p className="text-xs font-extrabold text-[#355f74]">
              {editingOfferId
                ? fr
                  ? "Modifier le trajet"
                  : "Edit ride"
                : fr
                  ? "Proposer un trajet"
                  : "Offer a ride"}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-extrabold text-[#52707e]">
                <span>{fr ? "Lieu de départ" : "Departure location"}</span>
                <input
                  aria-label={fr ? "Lieu de départ" : "Departure location"}
                  value={departureLocation}
                  onChange={event => setDepartureLocation(event.target.value)}
                  placeholder={
                    fr ? "ex. Station Montmorency" : "e.g. Montmorency station"
                  }
                  className="min-h-11 rounded-xl border border-[#d6e4ec] bg-[#fbfdff] px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#76a1b6]"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-extrabold text-[#52707e]">
                <span>{fr ? "Heure de départ" : "Departure time"}</span>
                <input
                  aria-label={fr ? "Heure de départ" : "Departure time"}
                  type="datetime-local"
                  value={departureAt}
                  onChange={event => setDepartureAt(event.target.value)}
                  className="min-h-11 rounded-xl border border-[#d6e4ec] bg-[#fbfdff] px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#76a1b6]"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-extrabold text-[#52707e]">
                <span>{fr ? "Places proposées" : "Seats offered"}</span>
                <input
                  aria-label={fr ? "Places proposées" : "Seats offered"}
                  type="number"
                  min="1"
                  max="8"
                  value={seatsTotal}
                  onChange={event => setSeatsTotal(event.target.value)}
                  className="min-h-11 rounded-xl border border-[#d6e4ec] bg-[#fbfdff] px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#76a1b6]"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-extrabold text-[#52707e]">
                <span>{fr ? "Note facultative" : "Optional note"}</span>
                <input
                  aria-label={fr ? "Note facultative" : "Optional note"}
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder={
                    fr ? "Point de rencontre, bagages…" : "Meeting point, gear…"
                  }
                  className="min-h-11 rounded-xl border border-[#d6e4ec] bg-[#fbfdff] px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#76a1b6]"
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={submitOffer}
                disabled={
                  pending ||
                  !departureLocation.trim() ||
                  Number(seatsTotal) < 1 ||
                  Number(seatsTotal) > 8
                }
                className="min-h-11 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white disabled:opacity-50"
              >
                {editingOfferId
                  ? fr
                    ? "Enregistrer les modifications"
                    : "Save changes"
                  : fr
                    ? "Publier le trajet"
                    : "Publish ride"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="min-h-11 rounded-xl border border-[#d6e4ec] bg-white px-3 text-xs font-extrabold text-[#557585]"
              >
                {fr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </div>
        )}
        <div className="divide-y divide-[#e3edf3]">
          {rides.map(ride => {
            const ownRide = ride.driverId === user?.id;
            const ownReservation = reservations.find(
              reservation =>
                reservation.offerId === ride.id &&
                reservation.passengerId === user?.id
            );
            const requests = reservations.filter(
              reservation =>
                reservation.offerId === ride.id &&
                reservation.status === "pending"
            );
            const confirmed = reservations.filter(
              reservation =>
                reservation.offerId === ride.id &&
                reservation.status === "accepted"
            );
            const departure = ride.departureAt
              ? new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(ride.departureAt))
              : null;
            return (
              <div key={ride.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-[#365d71]">
                      {ride.departureLocation}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#718b9a]">
                      {ride.driverName || (fr ? "Conducteur" : "Driver")}
                      {departure ? ` · ${departure}` : ""}
                      {ride.note ? ` · ${ride.note}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] font-extrabold text-[#3f755c]">
                      {ride.seatsAvailable}/{ride.seatsTotal}{" "}
                      {fr ? "place(s) disponible(s)" : "seat(s) available"}
                    </p>
                  </div>
                  {ownRide ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(ride)}
                        disabled={pending}
                        className="min-h-11 rounded-xl border border-[#d6e4ec] bg-white px-3 text-xs font-extrabold text-[#365d71] disabled:opacity-50"
                      >
                        {fr ? "Modifier" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          confirm({
                            title: fr
                              ? "Retirer ce trajet ?"
                              : "Withdraw this ride?",
                            body: fr
                              ? "Les places confirmées seront annulées et les passagers en seront informés."
                              : "Confirmed seats will be cancelled and passengers informed.",
                            confirmLabel: fr ? "Retirer" : "Withdraw",
                            destructive: true,
                            onConfirm: () =>
                              withdraw.mutate({
                                offerId: ride.id,
                                note: fr
                                  ? "Trajet retiré par le conducteur"
                                  : "Ride withdrawn by the driver",
                              }),
                          });
                        }}
                        disabled={pending}
                        className="min-h-11 rounded-xl border border-[#edd1c8] bg-[#fff8f5] px-3 text-xs font-extrabold text-[#9b584b] disabled:opacity-50"
                      >
                        {fr ? "Retirer le trajet" : "Withdraw ride"}
                      </button>
                    </div>
                  ) : ownReservation ? (
                    <span
                      className={`rounded-xl px-3 py-2 text-[11px] font-extrabold ${ownReservation.status === "accepted" ? "bg-[#e7f4e6] text-[#47755b]" : ownReservation.status === "declined" || ownReservation.status === "cancelled" ? "bg-[#fff0ed] text-[#94594c]" : "bg-[#fff5df] text-[#8a6a2b]"}`}
                    >
                      {ownReservation.status === "accepted"
                        ? fr
                          ? "Place confirmée"
                          : "Seat confirmed"
                        : ownReservation.status === "pending"
                          ? fr
                            ? "Demande en attente"
                            : "Request pending"
                          : fr
                            ? "Demande non retenue"
                            : "Request unavailable"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        request.mutate({ offerId: ride.id, seatsRequested: 1 })
                      }
                      disabled={pending || ride.seatsAvailable < 1}
                      className="min-h-11 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white disabled:opacity-50"
                    >
                      {fr ? "Demander 1 place" : "Request 1 seat"}
                    </button>
                  )}
                </div>
                {ownRide && requests.length > 0 && (
                  <div className="mt-3 rounded-xl border border-[#e1ebef] bg-white p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#587789]">
                      {fr ? "Demandes à décider" : "Requests to decide"}
                    </p>
                    <div className="mt-2 space-y-2">
                      {requests.map(reservation => (
                        <div
                          key={reservation.id}
                          className="flex items-center gap-2"
                        >
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#466878]">
                            {reservation.passengerName || "TrailConnect"} ·{" "}
                            {reservation.seatsRequested}{" "}
                            {fr ? "place(s)" : "seat(s)"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              decide.mutate({
                                reservationId: reservation.id,
                                status: "accepted",
                              })
                            }
                            disabled={pending}
                            className="min-h-11 rounded-lg bg-[#244d3d] px-3 text-[10px] font-extrabold text-white"
                          >
                            {fr ? "Accepter" : "Accept"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              decide.mutate({
                                reservationId: reservation.id,
                                status: "declined",
                              })
                            }
                            disabled={pending}
                            className="min-h-11 rounded-lg border border-[#efd5cc] bg-[#fff8f5] px-3 text-[10px] font-extrabold text-[#98594d]"
                          >
                            {fr ? "Refuser" : "Decline"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ownRide && confirmed.length > 0 && (
                  <div className="mt-3 rounded-xl border border-[#dbead8] bg-[#f6fbf4] p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#547965]">
                      {fr ? "Passagers confirmés" : "Confirmed passengers"}
                    </p>
                    <div className="mt-2 space-y-2">
                      {confirmed.map(reservation => (
                        <div
                          key={reservation.id}
                          className="flex items-center gap-2"
                        >
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#466878]">
                            {reservation.passengerName || "TrailConnect"} ·{" "}
                            {reservation.seatsRequested}{" "}
                            {fr ? "place(s)" : "seat(s)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              confirm({
                                title: fr
                                  ? "Retirer ce passager ?"
                                  : "Remove this passenger?",
                                body: fr
                                  ? "La place sera libérée et la personne en sera informée."
                                  : "Their seat will be released and they will be notified.",
                                confirmLabel: fr ? "Retirer" : "Remove",
                                destructive: true,
                                onConfirm: () =>
                                  removePassenger.mutate({
                                    reservationId: reservation.id,
                                    note: fr
                                      ? "Place retirée par le conducteur"
                                      : "Seat removed by the driver",
                                  }),
                              });
                            }}
                            disabled={pending}
                            className="min-h-11 rounded-lg border border-[#efd5cc] bg-[#fff8f5] px-3 text-[10px] font-extrabold text-[#98594d]"
                          >
                            {fr ? "Retirer" : "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!rides.length && !formOpen && (
          <p className="px-4 py-4 text-xs font-semibold text-[#66818f]">
            {fr
              ? "Proposez le premier trajet avec son lieu, son horaire et ses places."
              : "Offer the first ride with its location, time and seats."}
          </p>
        )}
      </section>
      {confirmDialog}
    </>
  );
}
function ActionableParticipationJourney({
  event,
  joined,
  hasTrust,
  onOpenSection,
}: {
  event: HikeEvent;
  joined: boolean;
  hasTrust: boolean;
  onOpenSection: (sectionId: string) => void;
}) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const steps = fr
    ? [
        {
          icon: <Gauge size={15} />,
          title: "1. Vérifier l’adéquation",
          body: `${event.distanceKm} km · +${event.elevationGain} m · ${formatDuration(event.durationMinutes, locale)}`,
          target: "tc-route",
        },
        {
          icon: <BadgeCheck size={15} />,
          title: "2. Lire les repères",
          body: hasTrust
            ? "Profil et repères organisateur"
            : "Informations de sortie",
          target: hasTrust ? "tc-trust" : "tc-route",
        },
        {
          icon: <ClipboardCheck size={15} />,
          title: "3. Préparer le départ",
          body: joined
            ? "Dossier personnel actif"
            : "À activer après confirmation",
          target: "tc-preparation",
        },
      ]
    : [
        {
          icon: <Gauge size={15} />,
          title: "1. Check the fit",
          body: `${event.distanceKm} km · +${event.elevationGain} m · ${formatDuration(event.durationMinutes, locale)}`,
          target: "tc-route",
        },
        {
          icon: <BadgeCheck size={15} />,
          title: "2. Read the signals",
          body: hasTrust
            ? "Organizer profile and signals"
            : "Outing information",
          target: hasTrust ? "tc-trust" : "tc-route",
        },
        {
          icon: <ClipboardCheck size={15} />,
          title: "3. Prepare departure",
          body: joined
            ? "Personal hub is active"
            : "Available after confirmation",
          target: "tc-preparation",
        },
      ];
  return (
    <section className="mt-7">
      <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#789184]">
        {fr ? "Avant de participer" : "Before joining"}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {steps.map(step => (
          <button
            type="button"
            key={step.title}
            onClick={() => onOpenSection(step.target)}
            className="min-h-24 rounded-[1.2rem] border border-[#dfe9dc] bg-white p-3 text-left transition hover:border-[#b8d8bd] hover:bg-[#fbfef9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d9f7a]"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#365a49]">
              {step.icon}
              {step.title}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed font-semibold text-[#748d80]">
              {step.body}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#3f7359]">
              {fr ? "Ouvrir" : "Open"}
              <ChevronRight size={12} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
function HostTrustPanel({
  trust,
}: {
  trust: {
    hostName?: string | null;
    phoneVerified?: boolean;
    totalOutings?: number;
    completedHostedOutings?: number;
    safetyCheckInsRecorded?: number;
    participantCheckInsRecorded?: number;
    participantCheckInTotal?: number;
    participantCheckInRate?: number | null;
    primaryLanguage?: string | null;
    guideStatus?: string | null;
    guideLanguages?: string | null;
    insuranceConfirmed?: boolean;
  };
}) {
  const { locale } = useLocale();
  const signals = [
    trust.phoneVerified
      ? locale === "fr"
        ? "Téléphone confirmé"
        : "Phone confirmed"
      : null,
    trust.guideStatus === "approved"
      ? locale === "fr"
        ? "Guide approuvé"
        : "Approved guide"
      : null,
    trust.insuranceConfirmed
      ? locale === "fr"
        ? "Assurance déclarée confirmée"
        : "Declared insurance confirmed"
      : null,
    trust.completedHostedOutings && trust.completedHostedOutings > 0
      ? locale === "fr"
        ? `${trust.completedHostedOutings} sorties réalisées`
        : `${trust.completedHostedOutings} completed outings`
      : null,
    trust.totalOutings && trust.totalOutings > 0
      ? locale === "fr"
        ? `${trust.totalOutings} sorties au profil`
        : `${trust.totalOutings} outings on profile`
      : null,
    trust.participantCheckInRate !== null &&
    trust.participantCheckInRate !== undefined &&
    trust.participantCheckInTotal
      ? locale === "fr"
        ? `Suivi de présence : ${trust.participantCheckInRate} % (${trust.participantCheckInsRecorded}/${trust.participantCheckInTotal})`
        : `Attendance tracking: ${trust.participantCheckInRate}% (${trust.participantCheckInsRecorded}/${trust.participantCheckInTotal})`
      : null,
    trust.safetyCheckInsRecorded && trust.safetyCheckInsRecorded > 0
      ? locale === "fr"
        ? `${trust.safetyCheckInsRecorded} suivis sécurité enregistrés`
        : `${trust.safetyCheckInsRecorded} safety check-ins recorded`
      : null,
    trust.guideLanguages || trust.primaryLanguage
      ? locale === "fr"
        ? `Langues : ${trust.guideLanguages || trust.primaryLanguage}`
        : `Languages: ${trust.guideLanguages || trust.primaryLanguage}`
      : null,
  ].filter(Boolean);
  if (!signals.length) return null;
  return (
    <section
      id="tc-trust"
      className="mt-7 scroll-mt-5 overflow-hidden rounded-[1.45rem] border border-[#d6e7d3] bg-[#f3f9f0]"
    >
      <div className="flex items-center gap-3 border-b border-[#deedd9] px-4 py-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[#e2f1de] text-[#417758]">
          <BadgeCheck size={18} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#294d3b]">
            {locale === "fr" ? "Repères de confiance" : "Trust signals"}
          </h3>
          <p className="text-[11px] font-semibold text-[#728d7b]">
            {trust.hostName || (locale === "fr" ? "Organisateur" : "Organizer")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {signals.map(signal => (
          <span
            key={String(signal)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-[#4d735b] ring-1 ring-[#d7e7d3]"
          >
            <Check size={12} />
            {signal}
          </span>
        ))}
      </div>
      <p className="px-4 pb-3 text-[10px] leading-relaxed font-semibold text-[#7d9482]">
        {locale === "fr"
          ? "Ces repères décrivent des éléments enregistrés ; ils ne constituent pas une garantie de sécurité, de présence ou de qualité."
          : "These signals describe recorded activity; they do not guarantee safety, attendance, or quality."}
      </p>
    </section>
  );
}
function CoOrganizerInvitePanel({ eventId }: { eventId: number }) {
  const { locale } = useLocale();
  const [publicSlug, setPublicSlug] = useState("");
  const sent = trpc.hiking.events.coOrganizers.sent.useQuery({ eventId });
  const invite = trpc.hiking.events.coOrganizers.invite.useMutation({
    onSuccess: () => {
      setPublicSlug("");
      sent.refetch();
      toast.success(
        locale === "fr"
          ? "Invitation de co-organisation envoyée."
          : "Co-organizer invitation sent."
      );
    },
    onError: error => toast.error(error.message),
  });
  const revoke = trpc.hiking.events.coOrganizers.revoke.useMutation({
    onSuccess: () => {
      sent.refetch();
      toast.success(
        locale === "fr" ? "Invitation révoquée." : "Invitation revoked."
      );
    },
    onError: error => toast.error(error.message),
  });
  return (
    <section className="mt-7 rounded-[1.45rem] border border-[#dce9d8] bg-white p-4">
      <div className="flex items-center gap-2 text-[#315b48]">
        <UsersRound size={17} />
        <h3 className="text-sm font-extrabold">
          {locale === "fr"
            ? "Déléguer l’organisation"
            : "Delegate organization"}
        </h3>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed font-semibold text-[#789185]">
        {locale === "fr"
          ? "Invitez un profil par son identifiant public. La personne doit accepter avant d’obtenir le rôle ; vous pouvez révoquer une invitation en attente."
          : "Invite a profile by its public handle. The person must accept before receiving the role; pending invitations can be revoked."}
      </p>
      <div className="mt-3 flex gap-2">
        <input
          aria-label={
            locale === "fr"
              ? "Identifiant public du co-organisateur"
              : "Co-organizer public handle"
          }
          value={publicSlug}
          onChange={event => setPublicSlug(event.target.value.toLowerCase())}
          placeholder="ex. camille-rando"
          className="min-w-0 flex-1 rounded-xl border border-[#d9e6d5] bg-[#fbfdf9] px-3 py-2 text-xs font-bold text-[#3e6250] outline-none"
        />
        <button
          onClick={() => publicSlug && invite.mutate({ eventId, publicSlug })}
          disabled={!publicSlug || invite.isPending}
          className="rounded-xl bg-[#244d3d] px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"
        >
          {locale === "fr" ? "Inviter" : "Invite"}
        </button>
      </div>
      {sent.data?.length ? (
        <div className="mt-3 space-y-1.5">
          {sent.data.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg bg-[#f7faf5] px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[10px] font-extrabold text-[#496b59]">
                @{item.publicSlug || item.name || `#${item.id}`}
              </span>
              <button
                onClick={() => revoke.mutate({ invitationId: item.id })}
                disabled={revoke.isPending}
                className="text-[10px] font-extrabold text-[#a05a4f] disabled:opacity-50"
              >
                {locale === "fr" ? "Révoquer" : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
function EventLifecyclePanel({
  eventId,
  canCancel,
  onCancelled,
}: {
  eventId: number;
  canCancel: boolean;
  onCancelled: () => void;
}) {
  const { locale } = useLocale();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const detail = trpc.hiking.events.detail.useQuery({ eventId });
  const data = detail.data as any;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("2");
  useEffect(() => {
    if (!data) return;
    setTitle(data.title || "");
    setDescription(data.description || "");
    setLocationName(data.locationName || "");
    setStartsAt(
      data.startsAt ? new Date(data.startsAt).toISOString().slice(0, 16) : ""
    );
    setCapacity(String(data.capacity || 2));
  }, [data?.id, data?.updatedAt]);
  const update = trpc.hiking.events.update.useMutation({
    onSuccess: () => {
      detail.refetch();
      setEditing(false);
      toast.success(
        locale === "fr" ? "Sortie mise à jour." : "Outing updated."
      );
    },
    onError: error => toast.error(error.message),
  });
  const cancel = trpc.hiking.events.cancel.useMutation({
    onSuccess: () => {
      toast.success(
        locale === "fr"
          ? "Sortie annulée et participants informés."
          : "Outing cancelled and participants informed."
      );
      onCancelled();
    },
    onError: error => toast.error(error.message),
  });
  if (!data) return null;
  const save = () =>
    update.mutate({
      eventId,
      title,
      description,
      locationName,
      startsAt: new Date(startsAt),
      visibility: data.visibility || "public",
      difficulty: data.difficulty,
      terrainType: data.terrainType || "maintained",
      technicality: data.technicality || "none",
      exposureLevel: data.exposureLevel || "low",
      navigationLevel: data.navigationLevel || "marked",
      routeCondition: data.routeCondition || "normal",
      distanceKm: data.distanceKm,
      elevationGain: data.elevationGain,
      durationMinutes: data.durationMinutes,
      capacity: Number(capacity),
      requiresApproval: Boolean(data.requiresApproval),
      carpoolEnabled: Boolean(data.carpoolEnabled),
      outingType: data.outingType || "group_hike",
      bookingMode: data.bookingMode || "instant",
      priceCents: data.priceCents || 0,
      toiletsStatus: data.toiletsStatus || "unknown",
      waterStatus: data.waterStatus || "unknown",
      parkingStatus: data.parkingStatus || "unknown",
      receptionStatus: data.receptionStatus || "unknown",
      cellReceptionStatus: data.cellReceptionStatus || "unknown",
      accessibilityNotes: data.accessibilityNotes || undefined,
      facilitiesNotes: data.facilitiesNotes || undefined,
      facilitiesVerifiedAt: data.facilitiesVerifiedAt || undefined,
      gpxUrl: data.gpxUrl || undefined,
      coverImageUrl: data.coverImageUrl || undefined,
      difficultyOverrideReason: data.difficultyOverrideReason || undefined,
    });
  const copy =
    locale === "fr"
      ? {
          title: "Gérer la sortie",
          edit: "Modifier les essentiels",
          save: "Enregistrer",
          cancel: "Annuler la sortie",
          cancelNote: canCancel
            ? "Les participations seront annulées et les participants seront informés."
            : "Vous pouvez mettre à jour les informations essentielles en tant que coorganisateur.",
          titleField: "Titre",
          description: "Description",
          location: "Lieu",
          starts: "Départ",
          capacity: "Capacité",
        }
      : {
          title: "Manage outing",
          edit: "Edit essentials",
          save: "Save",
          cancel: "Cancel outing",
          cancelNote: canCancel
            ? "Participations will be cancelled and participants will be informed."
            : "As a co-organizer, you can update essential information.",
          titleField: "Title",
          description: "Description",
          location: "Location",
          starts: "Start",
          capacity: "Capacity",
        };
  return (
    <>
      <section className="mt-7 overflow-hidden rounded-[1.45rem] border border-[#dce9d8] bg-white">
        <div className="flex items-center gap-3 border-b border-[#e7eee3] px-4 py-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#e9f3e6] text-[#3b745a]">
            <Edit3 size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-[#244738]">
              {copy.title}
            </h3>
            <p className="text-[11px] font-semibold text-[#789185]">
              {copy.cancelNote}
            </p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white shadow-sm"
          >
            {copy.edit}
          </button>
        </div>
        {editing && (
          <div className="grid gap-2 p-4">
            <input
              aria-label={copy.titleField}
              value={title}
              onChange={event => setTitle(event.target.value)}
              className="rounded-xl border border-[#d9e6d5] bg-[#fbfdf9] px-3 py-2.5 text-xs font-bold text-[#3e6250] outline-none"
            />
            <textarea
              aria-label={copy.description}
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={3}
              className="rounded-xl border border-[#d9e6d5] bg-[#fbfdf9] px-3 py-2.5 text-xs font-semibold text-[#3e6250] outline-none"
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                aria-label={copy.location}
                value={locationName}
                onChange={event => setLocationName(event.target.value)}
                className="rounded-xl border border-[#d9e6d5] bg-[#fbfdf9] px-3 py-2.5 text-xs font-bold text-[#3e6250] outline-none"
              />
              <input
                aria-label={copy.starts}
                type="datetime-local"
                value={startsAt}
                onChange={event => setStartsAt(event.target.value)}
                className="rounded-xl border border-[#d9e6d5] bg-[#fbfdf9] px-3 py-2.5 text-xs font-bold text-[#3e6250] outline-none"
              />
              <input
                aria-label={copy.capacity}
                type="number"
                min={2}
                value={capacity}
                onChange={event => setCapacity(event.target.value)}
                className="rounded-xl border border-[#d9e6d5] bg-[#fbfdf9] px-3 py-2.5 text-xs font-bold text-[#3e6250] outline-none"
              />
            </div>
            <button
              onClick={save}
              disabled={
                update.isPending ||
                !title.trim() ||
                description.trim().length < 20 ||
                !startsAt
              }
              className="mt-1 min-h-11 rounded-xl bg-[#244d3d] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {copy.save}
            </button>
          </div>
        )}
        {canCancel && (
          <div className="border-t border-[#f1e1db] bg-[#fffaf8] px-4 py-3">
            <button
              onClick={() =>
                confirm({
                  title:
                    locale === "fr"
                      ? "Annuler cette sortie ?"
                      : "Cancel this outing?",
                  body:
                    locale === "fr"
                      ? "Les participations seront annulées et les participants informés. Cette action est irréversible."
                      : "Participations will be cancelled and participants informed. This cannot be undone.",
                  confirmLabel:
                    locale === "fr" ? "Annuler la sortie" : "Cancel the outing",
                  cancelLabel: locale === "fr" ? "Revenir" : "Go back",
                  destructive: true,
                  onConfirm: () => cancel.mutate({ eventId }),
                })
              }
              disabled={cancel.isPending}
              className="inline-flex min-h-11 items-center rounded-xl px-2 text-xs font-extrabold text-[#9b5b4e] disabled:opacity-50"
            >
              {copy.cancel}
            </button>
          </div>
        )}
      </section>
      {confirmDialog}
    </>
  );
}
function ParticipationJourney({
  event,
  joined,
  hasTrust,
}: {
  event: HikeEvent;
  joined: boolean;
  hasTrust: boolean;
}) {
  const { locale } = useLocale();
  const steps =
    locale === "fr"
      ? [
          {
            icon: <Gauge size={15} />,
            title: "1. Vérifier l’adéquation",
            body: `${event.distanceKm} km · +${event.elevationGain} m · ${formatDuration(event.durationMinutes, locale)} · niveau ${{ beginner: "débutant", intermediate: "intermédiaire", advanced: "avancé", expert: "expert" }[event.difficulty]}`,
          },
          {
            icon: <BadgeCheck size={15} />,
            title: "2. Lire les repères",
            body: hasTrust
              ? "Les éléments confirmés de l’organisateur sont affichés ci-dessus."
              : "Consultez le profil, les règles et les informations de sortie.",
          },
          {
            icon: <ClipboardCheck size={15} />,
            title: "3. Préparer le départ",
            body: joined
              ? "Votre dossier de préparation est maintenant actif."
              : "Après confirmation, rendez-vous, transport et checklist sont réunis ici.",
          },
        ]
      : [
          {
            icon: <Gauge size={15} />,
            title: "1. Check the fit",
            body: `${event.distanceKm} km · +${event.elevationGain} m · ${formatDuration(event.durationMinutes, locale)} · ${event.difficulty}`,
          },
          {
            icon: <BadgeCheck size={15} />,
            title: "2. Read the signals",
            body: hasTrust
              ? "Confirmed organizer signals are shown above."
              : "Review the profile, rules and outing details.",
          },
          {
            icon: <ClipboardCheck size={15} />,
            title: "3. Prepare departure",
            body: joined
              ? "Your preparation hub is now active."
              : "Once confirmed, meeting details, transport and checklist are gathered here.",
          },
        ];
  return (
    <section className="mt-7">
      <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#789184]">
        {locale === "fr" ? "Avant de participer" : "Before joining"}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {steps.map(step => (
          <div
            key={step.title}
            className="rounded-[1.2rem] border border-[#dfe9dc] bg-white p-3"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#365a49]">
              {step.icon}
              {step.title}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed font-semibold text-[#748d80]">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
function OutingDebrief({ event }: { event: HikeEvent }) {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const [conditions, setConditions] = useState("");
  const [logistics, setLogistics] = useState("");
  const [highlight, setHighlight] = useState("");
  const createRecap = trpc.hiking.community.createPost.useMutation({
    onSuccess: () => {
      setConditions("");
      setLogistics("");
      setHighlight("");
      toast.success(
        locale === "fr"
          ? "Débrief partagé avec la communauté."
          : "Debrief shared with the community."
      );
    },
  });
  const copy =
    locale === "fr"
      ? {
          title: "Débriefer la sortie",
          subtitle:
            "Gardez une trace utile pour le groupe et les prochaines sorties.",
          conditions: "Conditions réellement rencontrées",
          logistics: "Ce qui a bien fonctionné ou à améliorer",
          highlight: "Votre moment fort",
          publish: "Partager le débrief",
          note: "Les photos peuvent être ajoutées depuis votre publication communautaire, avec une limite de cinq.",
        }
      : {
          title: "Debrief the outing",
          subtitle: "Keep a useful record for the group and future outings.",
          conditions: "Conditions actually encountered",
          logistics: "What worked well or should improve",
          highlight: "Your highlight",
          publish: "Share debrief",
          note: "Photos can be added from your community post, with a limit of five.",
        };
  const submit = () => {
    if (!isAuthenticated) return startLogin();
    if (!conditions.trim() && !logistics.trim() && !highlight.trim())
      return toast.info(
        locale === "fr"
          ? "Ajoutez au moins un élément au débrief."
          : "Add at least one debrief item."
      );
    const body = [
      conditions.trim() && `${copy.conditions} : ${conditions.trim()}`,
      logistics.trim() && `${copy.logistics} : ${logistics.trim()}`,
      highlight.trim() && `${copy.highlight} : ${highlight.trim()}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    createRecap.mutate({
      eventId: event.id,
      postType: "outing_recap",
      title:
        locale === "fr"
          ? `Débrief · ${event.title}`
          : `Debrief · ${event.title}`,
      summary: logistics.trim() || undefined,
      locationName: event.locationName,
      distanceKm: event.distanceKm,
      elevationGain: event.elevationGain,
      durationMinutes: event.durationMinutes,
      body,
      visibility: "public",
      images: [],
    });
  };
  return (
    <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-[#dbe8d7] bg-white">
      <div className="flex items-center gap-3 border-b border-[#e6eee3] px-4 py-3.5">
        <div className="grid size-9 place-items-center rounded-xl bg-[#e9f3e6] text-[#3d7658]">
          <BookOpen size={17} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#264738]">
            {copy.title}
          </h3>
          <p className="text-[11px] font-semibold text-[#789184]">
            {copy.subtitle}
          </p>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <textarea
          value={conditions}
          onChange={e => setConditions(e.target.value)}
          rows={2}
          placeholder={copy.conditions}
          className="rounded-xl border border-[#dce9d8] bg-[#fbfdf9] px-3 py-2.5 text-xs font-semibold text-[#3d6050] outline-none"
        />
        <textarea
          value={logistics}
          onChange={e => setLogistics(e.target.value)}
          rows={2}
          placeholder={copy.logistics}
          className="rounded-xl border border-[#dce9d8] bg-[#fbfdf9] px-3 py-2.5 text-xs font-semibold text-[#3d6050] outline-none"
        />
        <textarea
          value={highlight}
          onChange={e => setHighlight(e.target.value)}
          rows={2}
          placeholder={copy.highlight}
          className="rounded-xl border border-[#dce9d8] bg-[#fbfdf9] px-3 py-2.5 text-xs font-semibold text-[#3d6050] outline-none"
        />
        <p className="text-[10px] leading-relaxed font-semibold text-[#809589]">
          {copy.note}
        </p>
        <button
          onClick={submit}
          disabled={createRecap.isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1d493a] px-4 text-xs font-extrabold text-white disabled:opacity-60"
        >
          <BookOpen size={15} />
          {copy.publish}
        </button>
      </div>
    </section>
  );
}
function OutingDossier({
  event,
  joined,
  hasMeetingPoint,
}: {
  event: HikeEvent;
  joined: boolean;
  hasMeetingPoint: boolean;
}) {
  const { locale } = useLocale();
  const steps =
    locale === "fr"
      ? [
          { label: "Rendez-vous", ready: hasMeetingPoint },
          { label: "Covoiturage", ready: event.carpoolEnabled },
          { label: "Préparation", ready: true },
          { label: "Hors ligne", ready: false },
        ]
      : [
          { label: "Meeting point", ready: hasMeetingPoint },
          { label: "Carpool", ready: event.carpoolEnabled },
          { label: "Preparation", ready: true },
          { label: "Offline", ready: false },
        ];
  return (
    <section
      className={`mt-7 overflow-hidden rounded-[1.5rem] border ${joined ? "border-[#cfe3c9] bg-[#edf7e9]" : "border-[#dce9d8] bg-[#f8fbf5]"}`}
    >
      <div className="flex items-center gap-3 border-b border-[#dbead6] px-4 py-3.5">
        <div className="grid size-10 place-items-center rounded-2xl bg-[#1d493a] text-white">
          <ClipboardList size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-[#254839]">
            {locale === "fr" ? "Dossier de sortie" : "Outing hub"}
          </h3>
          <p className="mt-0.5 text-[11px] font-semibold text-[#6b8677]">
            {joined
              ? locale === "fr"
                ? "Vos repères utiles avant le départ."
                : "Your useful preparation points before departure."
              : locale === "fr"
                ? "Inscrivez-vous pour centraliser votre préparation."
                : "Join to centralize your preparation."}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${joined ? "bg-white text-[#397057]" : "bg-[#e8f0e5] text-[#718979]"}`}
        >
          {joined
            ? locale === "fr"
              ? "Actif"
              : "Active"
            : locale === "fr"
              ? "À rejoindre"
              : "Join to unlock"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-[#dce9d8] sm:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.label} className="bg-white px-3 py-3 text-center">
            <span
              className={`mx-auto grid size-7 place-items-center rounded-full ${step.ready ? "bg-[#e8f4e5] text-[#3e7a59]" : "bg-[#f1f4ef] text-[#96aa9d]"}`}
            >
              {step.ready ? <Check size={14} /> : index + 1}
            </span>
            <p className="mt-1.5 text-[10px] font-extrabold text-[#547263]">
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-[#5a7669] ring-1 ring-[#e1ebde]">
      <span className="grid size-4 place-items-center rounded-full border border-[#a8c8ad] text-[#4f8363]">
        <Check size={11} />
      </span>
      {label}
    </div>
  );
}
function DynamicChecklist({
  event,
  title,
  locale,
  customItems,
  weatherContext,
}: {
  event: HikeEvent;
  title: string;
  locale: "fr" | "en";
  customItems?: string[];
  weatherContext?: WeatherAlertInput | null;
}) {
  const items = customItems?.length
    ? customItems
    : getDynamicPackingChecklist(event, locale);
  const weatherHints = weatherContext
    ? getWeatherChecklistHints(weatherContext, locale)
    : [];
  return (
    <section className="mt-7">
      <h3 className="text-lg font-extrabold tracking-[-.04em] text-[#204033]">
        {title}
      </h3>
      <p className="mt-1 text-xs font-semibold text-[#789185]">
        {locale === "fr"
          ? "Adaptée au parcours et à la saison"
          : "Adapted to the route and season"}
      </p>
      {weatherHints.length > 0 && (
        <div
          role="status"
          className="mt-3 rounded-2xl border border-[#f0deb1] bg-[#fff8e8] p-3"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#826220]">
            {locale === "fr"
              ? "Repères météo à vérifier"
              : "Weather cues to review"}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed font-semibold text-[#806f48]">
            {locale === "fr"
              ? "Ces éléments sont proposés à titre indicatif ; choisissez ce qui correspond à vos besoins et aux conditions réelles."
              : "These cues are indicative; choose what fits your needs and actual conditions."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {weatherHints.map(hint => (
              <span
                key={hint.id}
                className="rounded-full bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-[#785f2c] ring-1 ring-[#eedcad]"
              >
                {hint.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map(item => (
          <ChecklistItem key={item} label={item} />
        ))}
      </div>
    </section>
  );
}
function GroupLogisticsPanel({
  event,
  isOrganizer,
}: {
  event: HikeEvent;
  isOrganizer: boolean;
}) {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const logistics = trpc.hiking.marketplace.logistics.detail.useQuery(
    { eventId: event.id },
    { enabled: isAuthenticated }
  );
  const update = trpc.hiking.marketplace.logistics.update.useMutation({
    onSuccess: () => logistics.refetch(),
  });
  const offer = trpc.hiking.marketplace.logistics.offerCarpool.useMutation({
    onSuccess: () => logistics.refetch(),
  });
  const [editing, setEditing] = useState(false);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [instructions, setInstructions] = useState("");
  const [emergencyPlan, setEmergencyPlan] = useState("");
  const [departure, setDeparture] = useState("");
  const [seats, setSeats] = useState("2");
  const data = logistics.data?.logistics;
  const copy =
    locale === "fr"
      ? {
          title: "Logistique du groupe",
          rendezvous: "Rendez-vous",
          carpool: "Covoiturage",
          safety: "Plan de sécurité",
          edit: "Configurer",
          save: "Enregistrer",
          offer: "Proposer un trajet",
          noLogistics:
            "L’organisateur complétera les consignes de rendez-vous et de sécurité avant le départ.",
          noCarpool: "Aucune place proposée pour le moment.",
          verified: "Coordination du groupe",
        }
      : {
          title: "Group logistics",
          rendezvous: "Meeting point",
          carpool: "Carpool",
          safety: "Safety plan",
          edit: "Configure",
          save: "Save",
          offer: "Offer a ride",
          noLogistics:
            "The organizer will complete meeting and safety instructions before departure.",
          noCarpool: "No rides offered yet.",
          verified: "Group coordination",
        };
  const openEdit = () => {
    setMeetingPoint(data?.meetingPoint || "");
    setInstructions(data?.meetingInstructions || "");
    setEmergencyPlan(data?.emergencyPlan || "");
    setEditing(true);
  };
  return (
    <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-[#dce9d8] bg-white">
      <div className="flex items-center gap-3 border-b border-[#e7eee3] px-4 py-3.5">
        <div className="grid size-9 place-items-center rounded-xl bg-[#e9f3e6] text-[#3b745a]">
          <UsersRound size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-[#244738]">
            {copy.title}
          </h3>
          <p className="text-[11px] font-semibold text-[#789185]">
            {copy.verified}
          </p>
        </div>
        {isOrganizer && (
          <button
            onClick={openEdit}
            className="rounded-lg bg-[#eef5e9] px-2.5 py-1.5 text-[10px] font-extrabold text-[#47775d]"
          >
            {copy.edit}
          </button>
        )}
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#f2f7ef] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#5a806b]">
            <MapPin size={13} />
            {copy.rendezvous}
          </p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-[#557267]">
            {data?.meetingPoint || copy.noLogistics}
          </p>
          {data?.meetingInstructions && (
            <p className="mt-1 text-xs leading-relaxed text-[#789185]">
              {data.meetingInstructions}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-[#fff5df] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#8d6a26]">
            <ShieldCheck size={13} />
            {copy.safety}
          </p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-[#806d46]">
            {data?.emergencyPlan ||
              (locale === "fr"
                ? "Vérifiez la météo, prévenez un proche et suivez les consignes de l’organisateur."
                : "Check conditions, tell a contact and follow the organizer’s instructions.")}
          </p>
        </div>
      </div>
      <div className="border-t border-[#e7eee3] px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#365b49]">
            <Car size={15} />
            {copy.carpool}
          </p>
          {isAuthenticated && (
            // This shortcut collected only a departure location, through a
            // `window.prompt` — untranslated, unstyled — and published a ride
            // with no time and a default seat count. The complete form already
            // exists further down the sheet, so point at it instead of keeping
            // a third, degraded carpool implementation.
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("tc-carpool")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="min-h-11 text-[10px] font-extrabold text-[#3d7159]"
            >
              + {copy.offer}
            </button>
          )}
        </div>
        {logistics.data?.carpool?.length ? (
          <div className="mt-2 space-y-1.5">
            {logistics.data.carpool.map(ride => (
              <div
                key={ride.id}
                className="flex items-center gap-2 rounded-xl bg-[#f7faf5] px-3 py-2 text-xs"
              >
                <span className="grid size-6 place-items-center rounded-full bg-[#e9f3e6] text-[10px] font-black text-[#47775d]">
                  {(ride.driverName || "T").slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold text-[#547266]">
                  {ride.departureLocation}
                </span>
                <span className="font-extrabold text-[#3f7457]">
                  {ride.seatsAvailable} {locale === "fr" ? "pl." : "seats"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-[#789185]">
            {copy.noCarpool}
          </p>
        )}
      </div>
      {editing && (
        <div className="border-t border-[#e7eee3] bg-[#fbfdf9] p-4">
          <input
            value={meetingPoint}
            onChange={e => setMeetingPoint(e.target.value)}
            placeholder={copy.rendezvous}
            className="w-full rounded-xl border border-[#d9e6d5] bg-white px-3 py-2.5 text-xs font-semibold outline-none"
          />
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={2}
            placeholder={
              locale === "fr"
                ? "Consignes d’accès / horaires"
                : "Access / timing notes"
            }
            className="mt-2 w-full rounded-xl border border-[#d9e6d5] bg-white px-3 py-2.5 text-xs font-semibold outline-none"
          />
          <textarea
            value={emergencyPlan}
            onChange={e => setEmergencyPlan(e.target.value)}
            rows={2}
            placeholder={copy.safety}
            className="mt-2 w-full rounded-xl border border-[#d9e6d5] bg-white px-3 py-2.5 text-xs font-semibold outline-none"
          />
          <button
            onClick={() =>
              update.mutate({
                eventId: event.id,
                meetingPoint: meetingPoint || undefined,
                meetingInstructions: instructions || undefined,
                emergencyPlan: emergencyPlan || undefined,
              })
            }
            className="mt-3 rounded-xl bg-[#244d3d] px-4 py-2.5 text-xs font-extrabold text-white"
          >
            {copy.save}
          </button>
        </div>
      )}
    </section>
  );
}
function SafetyHub({
  eventId,
  isOrganizer,
  hasEmergencyPlan,
  hasWeatherSource,
}: {
  eventId: number;
  isOrganizer: boolean;
  hasEmergencyPlan: boolean;
  hasWeatherSource: boolean;
}) {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const consent = trpc.hiking.safety.consent.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const saveConsent = trpc.hiking.safety.saveConsent.useMutation({
    onSuccess: () => consent.refetch(),
  });
  const checkIn = trpc.hiking.safety.checkIn.useMutation({
    onSuccess: () =>
      toast.success(
        locale === "fr"
          ? "Pointage de sécurité enregistré."
          : "Safety check-in saved."
      ),
  });
  const checkIns = trpc.hiking.safety.checkIns.useQuery(
    { eventId },
    { enabled: isAuthenticated && isOrganizer }
  );
  // These two were hardcoded to `false`, so the safety notice always claimed
  // the weather source and the offline pack were missing even when they were
  // there. On a safety message, saying something false is worse than saying
  // nothing, so they are read from the real state.
  const hasOfflinePack = useMemo(
    () => listOfflinePacks().some(pack => pack.event.id === eventId),
    [eventId]
  );
  const notice = buildSafetyNotice({
    locale,
    hasWeatherSource,
    hasEmergencyPlan,
    hasOfflinePack,
  });
  const copy =
    locale === "fr"
      ? {
          title: "Préparation sécurité",
          accept: "J’ai lu et compris",
          sos: "Urgence · appeler le 911",
          check: "Je suis en sécurité",
          organizer: "Points de sécurité",
          location: "Autoriser le partage de position",
          emergency: "Autoriser les contacts d’urgence",
          caution:
            "TrailConnect ne remplace pas les services d’urgence ni votre préparation personnelle.",
        }
      : {
          title: "Safety preparation",
          accept: "I have read and understood",
          sos: "Emergency · call 911",
          check: "I am safe",
          organizer: "Safety check-ins",
          location: "Allow location sharing",
          emergency: "Allow emergency contacts",
          caution:
            "TrailConnect does not replace emergency services or your personal preparation.",
        };
  const agree = () => {
    if (!isAuthenticated) return startLogin();
    saveConsent.mutate({
      locationSharingEnabled: Boolean(consent.data?.locationSharingEnabled),
      emergencyContactEnabled: Boolean(consent.data?.emergencyContactEnabled),
    });
  };
  return (
    <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-[#f0dcac] bg-[#fff9e9]">
      <div className="flex items-center gap-3 border-b border-[#f2e4be] px-4 py-3.5">
        <div className="grid size-9 place-items-center rounded-xl bg-[#ffeab7] text-[#8e6822]">
          <ShieldCheck size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-[#75551d]">
            {copy.title}
          </h3>
          <p className="text-[11px] font-semibold text-[#927740]">
            {notice.heading}
          </p>
        </div>
        <a
          href="tel:911"
          className="rounded-xl bg-[#9b5547] px-3 py-2 text-[10px] font-extrabold text-white"
        >
          {copy.sos}
        </a>
      </div>
      <div className="p-4">
        <p className="text-xs leading-relaxed text-[#806b42]">{notice.body}</p>
        <p className="mt-2 text-[10px] font-bold text-[#9a8356]">
          {copy.caution}
        </p>
        {isAuthenticated && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={agree}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold ${consent.data ? "bg-[#e7f3e4] text-[#47775c]" : "bg-[#244d3d] text-white"}`}
            >
              {consent.data ? (
                <Check size={14} className="mr-1 inline" />
              ) : null}
              {copy.accept}
            </button>
            <button
              onClick={() => checkIn.mutate({ eventId, kind: "manual_ok" })}
              className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-[#705d35] ring-1 ring-[#e8d7a8]"
            >
              {copy.check}
            </button>
          </div>
        )}
        {isOrganizer && checkIns.data?.length ? (
          <div className="mt-4 border-t border-[#f2e4be] pt-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#8e743c]">
              {copy.organizer}
            </p>
            <div className="mt-2 space-y-1">
              {checkIns.data.slice(0, 4).map(item => (
                <p
                  key={item.id}
                  className="text-xs font-semibold text-[#756542]"
                >
                  {item.name || "TrailConnect"} · {item.kind.replace("_", " ")}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
function ReportEvent({ eventId }: { eventId: number }) {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<
    "safety" | "harassment" | "fraud" | "inappropriate_content" | "other"
  >("safety");
  const [description, setDescription] = useState("");
  const report = trpc.hiking.reports.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setDescription("");
      toast.success(
        locale === "fr"
          ? "Réclamation transmise à l’administration."
          : "Report sent to administration."
      );
    },
  });
  const labels =
    locale === "fr"
      ? {
          report: "Signaler cette sortie",
          title: "Faire une réclamation",
          info: "Expliquez le problème de façon factuelle. L’administration examinera votre signalement.",
          send: "Envoyer",
          safety: "Sécurité",
          harassment: "Harcèlement",
          fraud: "Fraude",
          content: "Contenu inapproprié",
          other: "Autre",
          placeholder: "Décrivez la situation (10 caractères minimum)…",
        }
      : {
          report: "Report this outing",
          title: "File a report",
          info: "Describe the issue factually. Administration will review your report.",
          send: "Send report",
          safety: "Safety",
          harassment: "Harassment",
          fraud: "Fraud",
          content: "Inappropriate content",
          other: "Other",
          placeholder: "Describe the situation (10 characters minimum)…",
        };
  if (!open)
    return (
      <button
        onClick={() => (isAuthenticated ? setOpen(true) : startLogin())}
        className="mt-5 text-xs font-extrabold text-[#7b8f83] underline decoration-[#bdd0c2] underline-offset-4"
      >
        {labels.report}
      </button>
    );
  return (
    <section className="mt-5 rounded-[1.35rem] border border-[#f0d7cf] bg-[#fffaf8] p-4">
      <h3 className="text-sm font-extrabold text-[#8b5548]">{labels.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#9a766a]">
        {labels.info}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr]">
        <select
          value={category}
          onChange={event => setCategory(event.target.value as typeof category)}
          className="rounded-xl border border-[#efd8d0] bg-white px-3 py-2 text-xs font-bold text-[#70574f] outline-none"
        >
          <option value="safety">{labels.safety}</option>
          <option value="harassment">{labels.harassment}</option>
          <option value="fraud">{labels.fraud}</option>
          <option value="inappropriate_content">{labels.content}</option>
          <option value="other">{labels.other}</option>
        </select>
        <textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={3}
          placeholder={labels.placeholder}
          className="rounded-xl border border-[#efd8d0] bg-white px-3 py-2 text-xs font-medium text-[#70574f] outline-none"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            report.mutate({
              targetType: "event",
              targetId: eventId,
              category,
              description,
            })
          }
          disabled={description.trim().length < 10 || report.isPending}
          className="rounded-xl bg-[#9a5a4c] px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"
        >
          {labels.send}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-[#80685e] ring-1 ring-[#efd8d0]"
        >
          ×
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  const { locale, copy } = useLocale();
  const { user, isAuthenticated } = useAuth();
  // The screen is derived from the URL, so Back/Forward, refresh, bookmarks and
  // shared links all behave. `setView` pushes a history entry rather than
  // overwriting the current one.
  const [location, navigate] = useLocation();
  const view: View = pathToView(location);
  const setView = useCallback(
    (nextView: View) => {
      const target = viewToPath(nextView);
      if (target !== window.location.pathname)
        navigate(`${target}${window.location.search}`);
    },
    [navigate]
  );
  const [selectedEvent, setSelectedEvent] = useState<HikeEvent | null>(null);
  const [urlEventId, setUrlEventId] = useState<number | null>(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get("event")
    );
    return Number.isInteger(value) && value > 0 ? value : null;
  });
  const [groupComposerOpen, setGroupComposerOpen] = useState(false);
  const [notificationEventId, setNotificationEventId] = useState<number | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [activeLevel, setActiveLevel] = useState<"all" | Difficulty>("all");
  const [filters, setFilters] = useState<AdvancedFilters>({
    date: "",
    maxDistanceKm: "",
    maxElevationGain: "",
    maxDurationMinutes: "",
    minCapacity: "",
    carpoolOnly: false,
    outingType: "all",
    bookingMode: "all",
    period: "upcoming",
  });
  const [mapMode, setMapMode] = useState(false);
  const [form, setForm] = useState({
    title: "",
    locationName: "",
    date: "",
    description: "",
    distance: "8",
    elevation: "350",
    duration: "210",
    capacity: "12",
    difficulty: "beginner" as Difficulty,
    gpxUrl: "",
    gpxName: "",
  });
  // Discovery is paginated: `pageLimit` grows as the visitor asks for more,
  // which keeps a single query (and a single cache entry) per screen.
  const [pageLimit, setPageLimit] = useState(20);
  const eventsQuery = trpc.hiking.events.list.useQuery({ limit: pageLimit });
  const linkedEventInput = useMemo(
    () => ({ eventId: urlEventId ?? 1 }),
    [urlEventId]
  );
  const linkedEventQuery = trpc.hiking.events.detail.useQuery(
    linkedEventInput,
    { enabled: urlEventId !== null }
  );
  const navNotifications = trpc.hiking.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const navOutings = trpc.hiking.events.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const hasAdvancedFilters = Boolean(
    filters.date ||
      filters.maxDistanceKm ||
      filters.maxElevationGain ||
      filters.maxDurationMinutes ||
      filters.minCapacity ||
      filters.carpoolOnly ||
      filters.outingType !== "all" ||
      filters.bookingMode !== "all" ||
      filters.period !== "upcoming"
  );
  const searchInput = useMemo(
    () => ({
      query: query || undefined,
      difficulty: activeLevel === "all" ? undefined : activeLevel,
      startsAfter: filters.date
        ? new Date(`${filters.date}T00:00:00`)
        : undefined,
      startsBefore: filters.date
        ? new Date(`${filters.date}T23:59:59`)
        : undefined,
      maxDistanceKm: filters.maxDistanceKm
        ? Number(filters.maxDistanceKm)
        : undefined,
      maxElevationGain: filters.maxElevationGain
        ? Number(filters.maxElevationGain)
        : undefined,
      maxDurationMinutes: filters.maxDurationMinutes
        ? Number(filters.maxDurationMinutes)
        : undefined,
      minCapacity: filters.minCapacity
        ? Number(filters.minCapacity)
        : undefined,
      carpoolOnly: filters.carpoolOnly || undefined,
      outingType: filters.outingType === "all" ? undefined : filters.outingType,
      bookingMode:
        filters.bookingMode === "all" ? undefined : filters.bookingMode,
    }),
    [query, activeLevel, filters]
  );
  const searchedEvents = trpc.hiking.events.search.useQuery(
    { ...searchInput, limit: pageLimit },
    { enabled: Boolean(query || activeLevel !== "all" || hasAdvancedFilters) }
  );
  const createEvent = trpc.hiking.events.create.useMutation({
    onSuccess: () => {
      eventsQuery.refetch();
      toast.success(copy.create.saved);
      setView("explore");
    },
  });
  const trackUpload = trpc.hiking.tracks.upload.useMutation({
    onSuccess: result => {
      setForm(previous => ({ ...previous, gpxUrl: result.url }));
      toast.success(
        locale === "fr" ? "Trace GPX/KML importée." : "GPX/KML track imported."
      );
    },
  });
  // The listings are paginated now, so both queries return { items, nextOffset }.
  const isSearching = Boolean(
    query || activeLevel !== "all" || hasAdvancedFilters
  );
  const activeQuery = isSearching ? searchedEvents : eventsQuery;
  const loadedEvents = activeQuery.data?.items;
  const nextOffset = activeQuery.data?.nextOffset ?? null;
  const events = resolveExploreEvents(
    loadedEvents as
      | Array<Omit<HikeEvent, "startsAt"> & { startsAt: Date | string }>
      | undefined
  );
  const visibleEvents = useMemo(
    () => filterExploreEvents(events, query, activeLevel, filters),
    [activeLevel, events, query, filters]
  );
  const openEvent = useCallback((event: HikeEvent) => {
    if (event.id > 0) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("event") !== String(event.id)) {
        url.searchParams.set("event", String(event.id));
        window.history.pushState(
          { trailConnectEvent: event.id },
          "",
          `${url.pathname}${url.search}${url.hash}`
        );
      }
    }
    setUrlEventId(event.id > 0 ? event.id : null);
    setSelectedEvent(event);
  }, []);
  const closeSelectedEvent = useCallback(() => {
    const url = new URL(window.location.href);
    if (
      url.searchParams.has("event") &&
      window.history.state?.trailConnectEvent
    ) {
      window.history.back();
      return;
    }
    url.searchParams.delete("event");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
    setUrlEventId(null);
    setSelectedEvent(null);
  }, []);
  const unreadNotificationCount = (navNotifications.data ?? []).filter(
    notification => !notification.isRead
  ).length;
  const imminentOutingCount = (
    (navOutings.data ?? []) as Array<{ startsAt: Date | string }>
  ).filter(outing => {
    const departure = new Date(outing.startsAt).getTime();
    const now = Date.now();
    return departure >= now && departure <= now + 72 * 60 * 60 * 1000;
  }).length;
  const micro =
    locale === "fr"
      ? {
          goodMorning: "La montagne appelle.",
          ready: "Prêt pour une sortie qui compte ?",
          account: "Mon espace",
          signIn: "Se connecter",
          viewAll: "Tout explorer",
          through: "par",
          tip: "Conseil terrain",
          tipText:
            "Prends une couche chaude : le vent se renforce souvent sur les crêtes.",
          badges: ["Premier sommet", "8 sorties", "D+ 2 000 m"],
          shareTitle: "Racontez la suite",
          shareText: "Vos photos et récits font vivre la communauté.",
          loginToPost: "Connectez-vous pour publier",
          upload: "Importer GPX ou KML",
          uploadDetail: "Votre trace sera associée à la sortie",
          routeReady: "Trace ajoutée",
          filter: "Niveau",
          live: "Bientôt",
          saved: "Sauvegardé hors ligne",
        }
      : {
          goodMorning: "The mountains are calling.",
          ready: "Ready for an outing that matters?",
          account: "My space",
          signIn: "Log in",
          viewAll: "Explore all",
          through: "by",
          tip: "Trail tip",
          tipText: "Bring a warm layer: wind often picks up on ridgelines.",
          badges: ["First summit", "8 outings", "2,000 m climbed"],
          shareTitle: "Tell the next chapter",
          shareText: "Your photos and stories bring the community to life.",
          loginToPost: "Log in to post",
          upload: "Import GPX or KML",
          uploadDetail: "Your track will be attached to the outing",
          routeReady: "Track added",
          filter: "Level",
          live: "Coming soon",
          saved: "Saved offline",
        };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  // Changing the search or the filters starts a new result set, so the page
  // size goes back to one page rather than keeping the previous depth.
  useEffect(() => {
    setPageLimit(20);
  }, [query, activeLevel, filters]);

  // Links shared before the screens had their own URLs still carry `?view=`.
  useEffect(() => {
    const redirect = legacyViewRedirect(window.location.search);
    if (redirect) navigate(redirect, { replace: true });
  }, [navigate]);
  useEffect(() => {
    const syncEventFromUrl = () => {
      const raw = new URLSearchParams(window.location.search).get("event");
      const eventId = raw ? Number(raw) : NaN;
      const validEventId =
        Number.isInteger(eventId) && eventId > 0 ? eventId : null;
      setUrlEventId(validEventId);
      if (!validEventId) setSelectedEvent(null);
    };
    syncEventFromUrl();
    window.addEventListener("popstate", syncEventFromUrl);
    return () => window.removeEventListener("popstate", syncEventFromUrl);
  }, []);
  useEffect(() => {
    if (!urlEventId) return;
    const found = eventsQuery.data?.items.find(item => item.id === urlEventId);
    const source = found ?? linkedEventQuery.data;
    if (source)
      setSelectedEvent({
        ...source,
        startsAt: new Date(source.startsAt),
      } as HikeEvent);
  }, [urlEventId, eventsQuery.data, linkedEventQuery.data]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedEvent && selectedEvent.id > 0)
      url.searchParams.set("event", String(selectedEvent.id));
    else url.searchParams.delete("event");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [selectedEvent?.id]);

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const contentBase64 = String(reader.result).split(",")[1];
      if (!contentBase64)
        return toast.error(
          locale === "fr"
            ? "Fichier impossible à lire."
            : "Unable to read file."
        );
      trackUpload.mutate({
        filename: safeUploadFilename(file.name, "parcours.gpx"),
        mimeType:
          file.type === "application/vnd.google-earth.kml+xml"
            ? file.type
            : "application/gpx+xml",
        contentBase64,
      });
      setForm(previous => ({ ...previous, gpxName: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const publishEvent = () => {
    if (!isAuthenticated) return startLogin();
    if (!form.date)
      return toast.error(
        locale === "fr"
          ? "Ajoutez une date et une heure."
          : "Add a date and time."
      );
    createEvent.mutate({
      title: form.title,
      description: form.description,
      locationName: form.locationName,
      startsAt: new Date(form.date),
      difficulty: form.difficulty,
      distanceKm: Number(form.distance),
      elevationGain: Number(form.elevation),
      durationMinutes: Number(form.duration),
      capacity: Number(form.capacity),
      carpoolEnabled: true,
      requiresApproval: false,
      visibility: "public",
      gpxUrl: form.gpxUrl || undefined,
    });
  };
  const openGroupComposer = () => {
    if (!isAuthenticated) return startLogin();
    setGroupComposerOpen(true);
    setView("community");
  };

  const page = {
    home: (
      <HomePage
        events={events}
        onOpen={openEvent}
        onNavigate={setView}
        micro={micro}
      />
    ),
    explore: (
      <DeferredExplorePage
        events={visibleEvents}
        query={query}
        setQuery={setQuery}
        activeLevel={activeLevel}
        setActiveLevel={setActiveLevel}
        filters={filters}
        setFilters={setFilters}
        mapMode={mapMode}
        setMapMode={setMapMode}
        onOpen={openEvent}
        hasMore={nextOffset !== null}
        isLoadingMore={activeQuery.isFetching}
        onLoadMore={() => setPageLimit(current => current + 20)}
      />
    ),
    "my-outings": (
      <DeferredMyOutingsPage
        onOpen={outing =>
          openEvent({
            ...outing,
            startsAt: new Date(outing.startsAt),
          } as HikeEvent)
        }
        onExplore={() => setView("explore")}
        onCreate={() => setView("create")}
        autoOpenEventId={notificationEventId}
        onAutoOpenHandled={() => setNotificationEventId(null)}
      />
    ),
    marketplace: <DeferredMarketplacePage onOpenEvent={openEvent} />,
    create: (
      <DeferredCreateEventPage
        onPublished={() => {
          eventsQuery.refetch();
          setView("explore");
        }}
        onBack={() => setView("home")}
      />
    ),
    community: (
      <DeferredSocialCommunityPage
        onOpenProfile={() => setView("profile")}
        openGroupComposer={groupComposerOpen}
        onGroupComposerHandled={() => setGroupComposerOpen(false)}
      />
    ),
    profile: (
      <DeferredSocialProfilePage
        onOpenSettings={() => setView("account")}
        onOpenCommunity={() => {
          setGroupComposerOpen(false);
          setView("community");
        }}
      />
    ),
    account: (
      <DeferredAccountProfilePage
        userName={user?.name || (locale === "fr" ? "Aventurier" : "Adventurer")}
        onOpenAdmin={() => setView("admin")}
        onNavigate={view => setView(view)}
        onOpenEvent={eventId => {
          setNotificationEventId(eventId);
          setView("my-outings");
        }}
      />
    ),
    admin: <DeferredAdminPage onBack={() => setView("account")} />,
  }[view];

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#f8fbf4] text-[#1b392f]">
      <SkipToContentLink
        label={locale === "fr" ? "Aller au contenu" : "Skip to content"}
      />
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1440px] lg:px-6">
        <aside className="hidden w-66 shrink-0 flex-col border-r border-[#dfe9dc] py-7 lg:flex">
          <div className="flex items-center gap-3 px-3">
            <Logo />
            <div>
              <p className="text-base font-extrabold tracking-[-.05em]">
                TrailConnect
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#769182]">
                Move together
              </p>
            </div>
          </div>
          <nav
            aria-label={
              locale === "fr" ? "Navigation principale" : "Primary navigation"
            }
            className="mt-12 space-y-1"
          >
            {(
              [
                "home",
                "explore",
                // The matching screen was fully built but had no entry in
                // either navigation bar, so it was only reachable by typing
                // the URL by hand.
                "marketplace",
                "my-outings",
                "create",
                "community",
                "profile",
              ] as View[]
            ).map(item => (
              <NavButton
                key={item}
                item={item}
                active={view === item}
                label={
                  item === "my-outings"
                    ? locale === "fr"
                      ? "Mes sorties"
                      : "My outings"
                    : copy.nav[item === "home" ? "discover" : item]
                }
                onClick={() => {
                  setGroupComposerOpen(false);
                  setView(item);
                }}
              />
            ))}
          </nav>
          <div className="mt-auto px-3">
            <div className="rounded-[1.3rem] bg-[#eaf3e6] p-4">
              <p className="text-xs font-extrabold text-[#315a48]">
                {micro.tip}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#698273]">
                {micro.tipText}
              </p>
            </div>
          </div>
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 w-full max-w-full flex-1 px-4 pb-[calc(5.7rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pt-5 lg:pb-8 lg:pt-7"
        >
          <Suspense fallback={<PageLoadingFallback locale={locale} />}>
            {page}
          </Suspense>
        </main>
      </div>
      <MobileNav
        view={view}
        setView={setView}
        labels={copy.nav}
        unreadNotificationCount={unreadNotificationCount}
        imminentOutingCount={imminentOutingCount}
        onCreateGroup={openGroupComposer}
      />
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={closeSelectedEvent}
          onCreatePublishedOuting={() => {
            closeSelectedEvent();
            setView("create");
          }}
        />
      )}
    </div>
  );
}

function PageLoadingFallback({ locale }: { locale: "fr" | "en" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-52 flex-col items-center justify-center rounded-[1.5rem] border border-[#dce9d8] bg-white p-6 text-center shadow-sm"
    >
      <span
        aria-hidden="true"
        className="size-9 animate-spin rounded-full border-3 border-[#dce9d8] border-t-[#2f7255]"
      />
      <p className="mt-4 text-sm font-extrabold text-[#3c6451]">
        {locale === "fr" ? "Chargement de l’espace…" : "Loading this space…"}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#789083]">
        {locale === "fr"
          ? "Les informations restent disponibles dès qu’elles sont prêtes."
          : "Information will appear as soon as it is ready."}
      </p>
    </div>
  );
}

function HomePage({
  events,
  onOpen,
  onNavigate,
  micro,
}: {
  events: HikeEvent[];
  onOpen: (event: HikeEvent) => void;
  onNavigate: (view: View) => void;
  micro: Record<string, any>;
}) {
  const { locale, copy, toggleLocale } = useLocale();
  const { user, isAuthenticated } = useAuth();
  return (
    <>
      <header className="flex items-center justify-between pb-5 pt-[max(.3rem,env(safe-area-inset-top))] lg:pt-0">
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <p className="text-xs font-bold text-[#638074]">
              {copy.home.greeting}
              {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold tracking-[-.05em] text-[#1a392e]">
              {micro.goodMorning}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLocale}
            className="grid size-10 place-items-center rounded-full border border-[#dce8d8] bg-white text-xs font-extrabold text-[#3e6253] active:scale-95"
          >
            {locale === "fr" ? "EN" : "FR"}
          </button>
          <button
            onClick={() =>
              isAuthenticated ? onNavigate("profile") : startLogin()
            }
            className="grid size-10 place-items-center rounded-full border border-[#dce8d8] bg-white text-[#3e6253] shadow-sm active:scale-95"
          >
            <CircleUserRound size={19} />
          </button>
        </div>
      </header>
      <section className="tc-enter relative isolate overflow-hidden rounded-[2rem] bg-[#1a4538] px-5 pb-6 pt-6 text-[#f5faef] shadow-[0_20px_42px_rgba(20,62,48,.22)] sm:px-8 sm:py-9">
        <ResponsiveCoverImage
          src={heroImage}
          alt="Hikers walking in the mountains"
          priority
          sizes="100vw"
          className="absolute inset-0 -z-10 size-full object-cover opacity-60"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#12362b] via-[#12362b]/75 to-[#12362b]/25" />
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] backdrop-blur">
            <Sparkles size={13} className="text-[#f6cc78]" /> {micro.ready}
          </span>
          <h2 className="mt-5 whitespace-pre-line text-[2.4rem] font-extrabold leading-[.94] tracking-[-.075em] sm:text-5xl">
            {copy.home.heroTitle}
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#e3efe0]/85">
            {copy.home.heroSubtitle}
          </p>
          <button
            onClick={() => onNavigate("explore")}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f5f8ec] px-5 text-sm font-extrabold text-[#1c4938] shadow-lg transition active:scale-[.98]"
          >
            <Compass size={17} /> {copy.home.explore}
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#789285]">
              {copy.common.today}
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-.05em]">
              {copy.home.upcoming}
            </h2>
          </div>
          <button
            onClick={() => onNavigate("explore")}
            className="text-xs font-extrabold text-[#397058]"
          >
            {micro.viewAll}
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {events.slice(0, 2).map(event => (
            <EventCard
              key={event.id}
              event={event}
              onOpen={() => onOpen(event)}
            />
          ))}
        </div>
      </section>
      <section className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.45rem] bg-[#fff5de] p-4">
          <div className="flex items-center gap-2 text-[#8a6521]">
            <CloudSun size={20} />
            <h2 className="text-sm font-extrabold">{copy.home.weather}</h2>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#977c43]">
            {copy.home.weatherDetail}
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ebd7a7]">
            <div className="h-full w-4/5 rounded-full bg-[#f1b857]" />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[1.45rem] bg-[#e9f3e7] p-4">
          <div className="relative">
            <div className="flex items-center gap-2 text-[#32614b]">
              <Flame size={20} />
              <h2 className="text-sm font-extrabold">{copy.profile.badges}</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {micro.badges.map((badge: string) => (
                <span
                  key={badge}
                  className="rounded-full bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-[#4f7966] shadow-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <Mountain
            className="absolute -bottom-4 -right-4 text-[#cddfc7]"
            size={96}
          />
        </div>
      </section>
    </>
  );
}

/* Legacy internal views retained in history only. Dedicated page modules above now serve these paths through deferred imports. */
/*
function ExplorePage({ events, query, setQuery, activeLevel, setActiveLevel, mapMode, setMapMode, onOpen, micro }: { events: HikeEvent[]; query: string; setQuery: (value: string) => void; activeLevel: "all" | Difficulty; setActiveLevel: (value: "all" | Difficulty) => void; mapMode: boolean; setMapMode: (value: boolean) => void; onOpen: (event: HikeEvent) => void; micro: Record<string, any> }) {
  const { copy } = useLocale();
  const levels: Array<{ value: "all" | Difficulty; label: string }> = [{ value: "all", label: copy.explore.all }, { value: "beginner", label: copy.explore.beginner }, { value: "intermediate", label: copy.explore.intermediate }, { value: "advanced", label: copy.explore.advanced }];
  return <><PageHeader title={copy.explore.title} subtitle={copy.explore.subtitle} /><div className="mt-5 flex gap-2"><label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#dce9d8] bg-white px-4 shadow-sm"><Search size={18} className="shrink-0 text-[#789284]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.explore.search} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#355a4b] outline-none placeholder:text-[#9eb2a7]" /></label><button className="grid size-12 place-items-center rounded-2xl border border-[#dce9d8] bg-white text-[#4c735f] shadow-sm"><SlidersHorizontal size={18} /></button></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{levels.map(level => <button key={level.value} onClick={() => setActiveLevel(level.value)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold transition ${activeLevel === level.value ? "bg-[#244d3d] text-white shadow-md" : "bg-white text-[#658174] ring-1 ring-[#dce9d8]"}`}>{level.label}</button>)}</div><div className="mt-5 flex rounded-2xl bg-[#edf4e9] p-1"><button onClick={() => setMapMode(false)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold ${!mapMode ? "bg-white text-[#234838] shadow-sm" : "text-[#769083]"}`}><BookOpen size={15} /> {copy.explore.list}</button><button onClick={() => setMapMode(true)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold ${mapMode ? "bg-white text-[#234838] shadow-sm" : "text-[#769083]"}`}><Map size={15} /> {copy.explore.map}</button></div>{mapMode ? <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-[#dbe8d8] bg-white shadow-sm"><DeferredMapView initialCenter={{ lat: 45.85, lng: 6.62 }} initialZoom={8} className="h-[420px]" onMapReady={(map: google.maps.Map) => { const positions = [{ lat: 45.85, lng: 6.62 }, { lat: 45.32, lng: 6.54 }, { lat: 45.92, lng: 6.87 }]; positions.forEach((position, index) => new google.maps.marker.AdvancedMarkerElement({ map, position, title: events[index]?.title || "TrailConnect" })); }} /><div className="border-t border-[#e5eee1] px-4 py-3"><p className="text-xs font-semibold text-[#668074]">{events.length} {copy.event.participants} · {micro.live}</p></div></section> : <section className="mt-4 space-y-3">{events.map(event => <EventCard key={event.id} event={event} onOpen={() => onOpen(event)} />)}{events.length === 0 && <div className="rounded-[1.5rem] border border-dashed border-[#cbdcc7] bg-white p-10 text-center"><Compass className="mx-auto text-[#7fa187]" /><p className="mt-3 text-sm font-bold text-[#5e776b]">{copy.explore.subtitle}</p></div>}</section>}</>;
}

function CreatePage({ form, setForm, onUpload, onPublish, busy, micro }: { form: any; setForm: React.Dispatch<React.SetStateAction<any>>; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onPublish: () => void; busy: boolean; micro: Record<string, any> }) {
  const { copy, locale } = useLocale();
  const set = (key: string, value: string) => setForm((previous: any) => ({ ...previous, [key]: value }));
  return <><PageHeader title={copy.create.title} subtitle={copy.create.subtitle} /><div className="mx-auto mt-5 max-w-3xl"><section className="rounded-[1.55rem] bg-white p-4 shadow-[0_8px_26px_rgba(31,65,49,.07)] ring-1 ring-[#e0eadc] sm:p-6"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-[#e9f3e6] text-[#3c735a]"><Plus size={16} /></span><h2 className="font-extrabold tracking-[-.03em]">{copy.create.basics}</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label={copy.create.titleLabel} className="sm:col-span-2"><input value={form.title} onChange={event => set("title", event.target.value)} placeholder={locale === "fr" ? "Ex. Lever de soleil au lac Noir" : "E.g. Sunrise at Black Lake"} /></Field><Field label={copy.create.placeLabel}><input value={form.locationName} onChange={event => set("locationName", event.target.value)} placeholder={locale === "fr" ? "Ville, refuge ou parking" : "Town, hut or parking"} /></Field><Field label={copy.create.dateLabel}><input type="datetime-local" value={form.date} onChange={event => set("date", event.target.value)} /></Field><Field label={copy.create.descriptionLabel} className="sm:col-span-2"><textarea rows={4} value={form.description} onChange={event => set("description", event.target.value)} placeholder={locale === "fr" ? "Rythme, ambiance, points d’attention…" : "Pace, vibe, points of attention…"} /></Field></div></section><section className="mt-4 rounded-[1.55rem] bg-white p-4 shadow-[0_8px_26px_rgba(31,65,49,.07)] ring-1 ring-[#e0eadc] sm:p-6"><h2 className="font-extrabold tracking-[-.03em]">{copy.create.details}</h2><div className="mt-5 grid gap-4 grid-cols-2 sm:grid-cols-4"><Field label={copy.create.distanceLabel}><input inputMode="decimal" value={form.distance} onChange={event => set("distance", event.target.value)} /></Field><Field label={copy.create.elevationLabel}><input inputMode="numeric" value={form.elevation} onChange={event => set("elevation", event.target.value)} /></Field><Field label={copy.create.capacityLabel}><input inputMode="numeric" value={form.capacity} onChange={event => set("capacity", event.target.value)} /></Field><Field label={copy.create.levelLabel}><select value={form.difficulty} onChange={event => set("difficulty", event.target.value)}><option value="beginner">{copy.explore.beginner}</option><option value="intermediate">{copy.explore.intermediate}</option><option value="advanced">{copy.explore.advanced}</option><option value="expert">Expert</option></select></Field></div><Field label={copy.event.duration} className="mt-4 max-w-[12rem]"><input inputMode="numeric" value={form.duration} onChange={event => set("duration", event.target.value)} /></Field><label className={`mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed ${form.gpxUrl ? "border-[#85ab8a] bg-[#edf6eb]" : "border-[#bdd5b9] bg-[#fafdf8]"} p-4 transition hover:bg-[#f2f8ef]`}><span className="grid size-10 place-items-center rounded-xl bg-white text-[#477862] shadow-sm">{form.gpxUrl ? <Check size={19} /> : <UploadCloud size={19} />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-[#315a47]">{form.gpxUrl ? micro.routeReady : micro.upload}</span><span className="mt-0.5 block truncate text-xs text-[#789286]">{form.gpxName || micro.uploadDetail}</span></span><input onChange={onUpload} accept=".gpx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml" type="file" className="sr-only" /></label></section><button onClick={onPublish} disabled={busy} className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d493a] text-sm font-extrabold text-[#f8fbf4] shadow-[0_10px_22px_rgba(25,70,53,.2)] transition hover:bg-[#153d2f] active:scale-[.98] disabled:opacity-70"><Plus size={18} /> {copy.create.publish}</button></div></>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`block ${className}`}><span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.08em] text-[#708b7d]">{label}</span><div className="rounded-xl border border-[#dce9d8] bg-[#fbfdf9] px-3 py-2.5 [&_input]:w-full [&_input]:bg-transparent [&_input]:text-sm [&_input]:font-semibold [&_input]:text-[#294e3e] [&_input]:outline-none [&_select]:w-full [&_select]:bg-transparent [&_select]:text-sm [&_select]:font-semibold [&_select]:text-[#294e3e] [&_select]:outline-none [&_textarea]:w-full [&_textarea]:resize-none [&_textarea]:bg-transparent [&_textarea]:text-sm [&_textarea]:font-semibold [&_textarea]:text-[#294e3e] [&_textarea]:outline-none">{children}</div></label>; }

function CommunityPage({ onNavigate, micro }: { onNavigate: (view: View) => void; micro: Record<string, any> }) {
  const { copy, locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const [postBody, setPostBody] = useState("");
  const feed = trpc.hiking.community.feed.useQuery();
  const createPost = trpc.hiking.community.createPost.useMutation({ onSuccess: () => { setPostBody(""); feed.refetch(); toast.success(locale === "fr" ? "Aventure partagée avec la communauté." : "Adventure shared with the community."); } });
  const publishPost = () => {
    if (!isAuthenticated) return startLogin();
    if (!postBody.trim()) return;
    createPost.mutate({ body: postBody.trim() });
  };
  return <><PageHeader title={copy.community.title} subtitle={copy.community.subtitle} /><section className="mt-5 overflow-hidden rounded-[1.65rem] bg-[#1d493a] p-5 text-[#f5faef] sm:p-7"><div className="flex items-start justify-between gap-4"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em]"><Heart size={12} className="text-[#f6c872]" /> {copy.home.adventures}</span><h2 className="mt-4 text-2xl font-extrabold leading-[.98] tracking-[-.06em]">{micro.shareTitle}</h2><p className="mt-3 max-w-sm text-sm leading-relaxed text-[#d9e8d5]">{micro.shareText}</p></div><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e5f0de] text-[#2f654e]"><MessageCircle size={22} /></div></div><div className="mt-6 rounded-2xl bg-white/10 p-2"><textarea value={postBody} onChange={event => setPostBody(event.target.value)} onFocus={() => { if (!isAuthenticated) startLogin(); }} rows={2} placeholder={isAuthenticated ? copy.community.post : micro.loginToPost} className="w-full resize-none bg-transparent px-2 py-1 text-sm font-medium text-white outline-none placeholder:text-[#d0e1cc]/70" /><div className="flex justify-end"><button disabled={!postBody.trim() || createPost.isPending} onClick={publishPost} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#f6faef] px-3 text-xs font-extrabold text-[#214938] disabled:opacity-50 active:scale-95"><Plus size={15} /> {copy.community.post}</button></div></div></section>{feed.data && feed.data.length > 0 ? <section className="mt-5 space-y-3">{feed.data.map(post => <article key={post.id} className="rounded-[1.45rem] border border-[#dce9d8] bg-white p-4 shadow-[0_8px_22px_rgba(31,65,49,.05)]"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-[#e9f3e6] text-xs font-black text-[#3d7459]">{(post.authorName || "T").slice(0, 1).toUpperCase()}</div><div><p className="text-sm font-extrabold text-[#294c3c]">{post.authorName || "TrailConnect"}</p><p className="text-[11px] font-semibold text-[#829a8d]">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(post.createdAt))}</p></div></div><p className="mt-3 text-sm leading-relaxed text-[#547265]">{post.body}</p></article>)}</section> : <section className="mt-5 rounded-[1.45rem] border border-dashed border-[#cbdcc7] bg-white p-7 text-center"><Heart className="mx-auto text-[#80a189]" size={26} /><p className="mt-3 text-sm font-bold text-[#5a7768]">{locale === "fr" ? "Soyez le premier à partager une aventure." : "Be the first to share an adventure."}</p></section>}<section className="mt-6 rounded-[1.55rem] border border-[#dce9d8] bg-white shadow-[0_8px_22px_rgba(31,65,49,.06)]"><div className="flex items-center gap-3 border-b border-[#e5eee2] p-4"><div className="grid size-10 place-items-center rounded-full bg-[#e9f3e6] text-[#3c755a]"><UsersRound size={18} /></div><div className="min-w-0"><h2 className="truncate text-sm font-extrabold text-[#254536]">{copy.community.chatTitle}</h2><p className="mt-0.5 text-xs text-[#729082]">{locale === "fr" ? "Le fil de coordination apparaît ici après inscription." : "Coordination appears here after you join."}</p></div><span className="ml-auto rounded-full bg-[#e9f3e6] px-2.5 py-1 text-[10px] font-extrabold text-[#4b775e]">{micro.live}</span></div><div className="flex min-h-42 flex-col justify-center px-5 py-6 text-center"><Bot className="mx-auto text-[#9ab6a4]" size={28} /><p className="mt-3 text-sm font-bold text-[#557366]">{locale === "fr" ? "Rejoignez une sortie pour discuter avec le groupe." : "Join an outing to chat with the group."}</p><button onClick={() => onNavigate("explore")} className="mx-auto mt-4 text-xs font-extrabold text-[#397057]">{copy.home.explore}</button></div><div className="flex gap-2 border-t border-[#e5eee2] p-3"><input value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && message.trim()) { toast.info(locale === "fr" ? "Choisissez d’abord une sortie." : "Choose an outing first."); setMessage(""); } }} placeholder={copy.community.message} className="min-w-0 flex-1 rounded-xl bg-[#f2f7ef] px-3 text-sm font-semibold text-[#345846] outline-none" /><button onClick={() => toast.info(locale === "fr" ? "Choisissez d’abord une sortie." : "Choose an outing first.")} className="grid size-10 place-items-center rounded-xl bg-[#244d3d] text-white active:scale-95"><Send size={16} /></button></div></section></>;
}

function ProfilePage({ userName, micro }: { userName: string; micro: Record<string, any> }) {
  const { copy, locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const profile = trpc.hiking.profile.mine.useQuery(undefined, { enabled: isAuthenticated });
  const [offlinePacks, setOfflinePacks] = useState(() => listOfflinePacks());
  const name = isAuthenticated ? userName : locale === "fr" ? "Votre prochaine aventure" : "Your next adventure";
  return <><PageHeader title={copy.profile.title} /><section className="mt-5 overflow-hidden rounded-[1.7rem] bg-[#214c3d] p-5 text-[#f7fbf1] sm:p-7"><div className="flex items-center gap-4"><div className="grid size-16 place-items-center rounded-[1.3rem] bg-[#d7e8cf] text-2xl font-black text-[#2c5f48]">{name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-2xl font-extrabold tracking-[-.06em]">{name}</h2><p className="mt-1 text-sm font-medium text-[#d2e4ce]">{profile.data?.experienceLevel ? ({ beginner: copy.explore.beginner, intermediate: copy.explore.intermediate, advanced: copy.explore.advanced, expert: "Expert" })[profile.data.experienceLevel] : copy.profile.level}</p></div></div><div className="mt-6 grid grid-cols-3 border-t border-white/12 pt-5">{[["8", copy.profile.stats.outings], ["94", copy.profile.stats.kilometers], ["2 460", copy.profile.stats.elevation]].map(([value, label]) => <div key={label} className="border-r border-white/12 px-2 text-center last:border-0"><p className="text-xl font-extrabold tracking-[-.05em]">{value}</p><p className="mt-1 text-[10px] font-bold text-[#c8dec5]">{label}</p></div>)}</div></section><section className="mt-7"><h2 className="text-lg font-extrabold tracking-[-.04em]">{copy.profile.badges}</h2><div className="mt-3 grid grid-cols-3 gap-3">{micro.badges.map((badge: string, index: number) => <div key={badge} className="rounded-[1.3rem] bg-white p-3 text-center ring-1 ring-[#dfe9dc]"><div className={`mx-auto grid size-10 place-items-center rounded-2xl ${index === 0 ? "bg-[#fff0cc] text-[#be8123]" : index === 1 ? "bg-[#e6f1e2] text-[#49805a]" : "bg-[#e8eef8] text-[#6075ae]"}`}><BadgeCheck size={20} /></div><p className="mt-2 text-[10px] font-extrabold leading-tight text-[#4d6d5e]">{badge}</p></div>)}</div></section>{offlinePacks.length > 0 && <section className="mt-7"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold tracking-[-.04em]">{locale === "fr" ? "Hors connexion" : "Offline"}</h2><button onClick={() => setOfflinePacks(listOfflinePacks())} className="text-xs font-extrabold text-[#3c7159]">{locale === "fr" ? "Actualiser" : "Refresh"}</button></div><div className="mt-3 space-y-2">{offlinePacks.map(pack => <div key={pack.event.id} className="flex items-center gap-3 rounded-2xl border border-[#dce9d8] bg-white p-3"><div className="grid size-10 place-items-center rounded-xl bg-[#e9f3e6] text-[#47795d]"><WifiOff size={18} /></div><div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#315746]">{pack.event.title}</p><p className="truncate text-xs font-semibold text-[#779084]">{pack.event.locationName} · {pack.checklist.length} {locale === "fr" ? "éléments" : "items"}</p></div></div>)}</div></section>}<button onClick={() => isAuthenticated ? toast.info(locale === "fr" ? "Gestion des sorties à venir." : "Outing management coming next.") : startLogin()} className="mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#cfe0cb] bg-white text-sm font-extrabold text-[#315b47] active:scale-[.98]"><Navigation size={17} /> {isAuthenticated ? copy.profile.manage : micro.signIn}</button></>;
}

*/
function NavButton({
  item,
  active,
  label,
  onClick,
}: {
  item: View;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const { locale } = useLocale();
  const Icon = {
    home: HomeIcon,
    explore: Compass,
    "my-outings": Navigation,
    marketplace: Sparkles,
    create: Plus,
    community: MessageCircle,
    profile: CircleUserRound,
    account: CircleUserRound,
    admin: ShieldCheck,
  }[item];
  const scope =
    item === "profile"
      ? locale === "fr"
        ? "Cercle"
        : "Personal"
      : item === "community"
        ? locale === "fr"
          ? "Communauté"
          : "Community"
        : item === "my-outings" || item === "create"
          ? locale === "fr"
            ? "Sortie"
            : "Outing"
          : null;
  return (
    <button
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-3 text-sm font-extrabold transition ${active ? "bg-[#e9f3e6] text-[#285541]" : "text-[#6c877a] hover:bg-[#eff5ec]"}`}
    >
      <Icon size={18} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {scope && (
          <span className="mt-0.5 block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#7c9788]">
            {scope}
          </span>
        )}
      </span>
    </button>
  );
}
export function MobileNav({
  view,
  setView,
  labels,
  unreadNotificationCount = 0,
  imminentOutingCount = 0,
  onCreateGroup,
}: {
  view: View;
  setView: (view: View) => void;
  labels: Record<string, string>;
  unreadNotificationCount?: number;
  imminentOutingCount?: number;
  onCreateGroup?: () => void;
}) {
  const { locale } = useLocale();
  const [createOpen, setCreateOpen] = useState(false);
  const t =
    locale === "fr"
      ? {
          createTitle: "Que souhaitez-vous créer ?",
          createDescription:
            "Choisissez le point de départ de votre prochaine organisation.",
          outing: "Créer une sortie",
          outingDetail: "Parcours, logistique et participants.",
          group: "Créer un groupe",
          groupDetail: "Communauté, échanges et invitations.",
          close: "Fermer",
          unread: (count: number) =>
            `${count} notification${count > 1 ? "s" : ""} non lue${count > 1 ? "s" : ""}`,
          imminent: (count: number) =>
            `${count} sortie${count > 1 ? "s" : ""} proche${count > 1 ? "s" : ""}`,
        }
      : {
          createTitle: "What would you like to create?",
          createDescription:
            "Choose the starting point for your next organization.",
          outing: "Create an outing",
          outingDetail: "Route, logistics and participants.",
          group: "Create a group",
          groupDetail: "Community, conversation and invitations.",
          close: "Close",
          unread: (count: number) =>
            `${count} unread notification${count > 1 ? "s" : ""}`,
          imminent: (count: number) =>
            `${count} upcoming outing${count > 1 ? "s" : ""}`,
        };
  const items: Array<{
    view: "home" | "explore" | "create" | "my-outings" | "profile";
    label: string;
    icon: React.ReactNode;
    central?: boolean;
  }> = [
    {
      view: "home",
      label: locale === "fr" ? "Accueil" : "Home",
      icon: <HomeIcon size={18} />,
    },
    {
      view: "explore",
      label: locale === "fr" ? "Explorer" : "Explore",
      icon: <Compass size={18} />,
    },
    {
      view: "create",
      label: labels.create,
      icon: <Plus size={21} />,
      central: true,
    },
    {
      view: "my-outings",
      label: locale === "fr" ? "Mes sorties" : "My outings",
      icon: <Navigation size={18} />,
    },
    {
      view: "profile",
      label: labels.profile,
      icon: <CircleUserRound size={18} />,
    },
  ];

  const countLabel = (count: number) => (count > 99 ? "99+" : String(count));
  const selectCreate = (nextView: "create" | "community") => {
    setCreateOpen(false);
    if (nextView === "community" && onCreateGroup) return onCreateGroup();
    setView(nextView);
  };

  return (
    <>
      <nav
        aria-label={locale === "fr" ? "Navigation mobile" : "Mobile navigation"}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dce8d8]/90 bg-[#fbfdf9]/95 px-1 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-xl items-end justify-around">
          {items.map(item => {
            const active =
              view === item.view ||
              (item.view === "profile" && view === "community");
            const profileBadge =
              item.view === "profile" ? unreadNotificationCount : 0;
            const outingBadge =
              item.view === "my-outings" ? imminentOutingCount : 0;
            const badge = profileBadge || outingBadge;
            const badgeDescription = profileBadge
              ? t.unread(profileBadge)
              : outingBadge
                ? t.imminent(outingBadge)
                : "";
            return (
              <button
                key={item.view}
                aria-current={active ? "page" : undefined}
                aria-label={
                  badgeDescription
                    ? `${item.label} · ${badgeDescription}`
                    : item.label
                }
                onClick={() =>
                  item.central ? setCreateOpen(true) : setView(item.view)
                }
                className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[14px] font-extrabold leading-tight transition ${active ? "text-[#24513e]" : "text-[#80988d]"}`}
              >
                <span className="relative">
                  {item.central ? (
                    <span className="-mt-6 grid size-12 place-items-center rounded-2xl bg-[#1d493a] text-white shadow-[0_8px_18px_rgba(25,70,53,.28)]">
                      {item.icon}
                    </span>
                  ) : (
                    item.icon
                  )}
                  {badge ? (
                    <span
                      aria-hidden="true"
                      className={`absolute -right-3 -top-2 grid min-w-4 place-items-center rounded-full px-1 py-0.5 text-[9px] font-black leading-none text-white ring-2 ring-[#fbfdf9] ${profileBadge ? "bg-[#c83f3f]" : "bg-[#b87524]"}`}
                    >
                      {countLabel(badge)}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full whitespace-normal break-words text-center text-[11px] leading-tight tracking-[-.04em]">
                  {item.label}
                </span>
                {active && !item.central && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[#2e6b51]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
      <Drawer open={createOpen} onOpenChange={setCreateOpen}>
        <DrawerContent className="border-[#dce8d8] bg-[#fbfdf9] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(25,70,53,.16)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            aria-label={t.close}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-[#edf4e9] text-[#47735d]"
          >
            <X size={18} />
          </button>
          <DrawerHeader className="px-0 pb-3 pt-4 pr-11 text-left">
            <DrawerTitle className="text-xl font-extrabold tracking-[-.045em] text-[#234938]">
              {t.createTitle}
            </DrawerTitle>
            <DrawerDescription className="leading-relaxed text-[#708b7c]">
              {t.createDescription}
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3 pb-2">
            <button
              type="button"
              onClick={() => selectCreate("create")}
              className="flex min-h-18 items-center gap-3 rounded-2xl bg-[#1d493a] p-4 text-left text-white shadow-[0_10px_22px_rgba(25,70,53,.18)]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15">
                <Navigation size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">{t.outing}</span>
                <span className="mt-0.5 block text-xs font-semibold text-white/75">
                  {t.outingDetail}
                </span>
              </span>
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => selectCreate("community")}
              className="flex min-h-18 items-center gap-3 rounded-2xl border border-[#d9e7d5] bg-white p-4 text-left text-[#315a48]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eaf3e6] text-[#3c7457]">
                <UsersRound size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">{t.group}</span>
                <span className="mt-0.5 block text-xs font-semibold text-[#708b7c]">
                  {t.groupDetail}
                </span>
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
export function SkipToContentLink({ label }: { label: string }) {
  return (
    <a
      className="tc-skip-link"
      href="#main-content"
      onClick={event => {
        event.preventDefault();
        document.getElementById("main-content")?.focus();
      }}
    >
      {label}
    </a>
  );
}
