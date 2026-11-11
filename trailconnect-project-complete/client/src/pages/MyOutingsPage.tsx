import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { LeaveOutingButton } from "@/components/LeaveOutingButton";
import { ResponsiveCoverImage } from "@/components/ResponsiveCoverImage";
import {
  NextOutingActionPanel,
  PostOutingRecapPanel,
  RecurringSeriesPanel,
} from "@/components/EngagementPanels";
import { listOfflinePacks, type OfflinePack } from "@shared/offline";
import {
  BellRing,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CloudSun,
  Compass,
  FileText,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  WifiOff,
} from "lucide-react";
import React, { useEffect } from "react";

type MyOuting = {
  id: number;
  title: string;
  locationName: string;
  startsAt: Date | string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  distanceKm: number;
  elevationGain: number;
  durationMinutes: number;
  capacity: number;
  carpoolEnabled: boolean;
  coverImageUrl?: string | null;
  coverImageFocalX?: number | null;
  coverImageFocalY?: number | null;
  hostName?: string | null;
  relationship: "organizer" | "participant";
  participationStatus: "going" | "pending";
  checkedInAt?: Date | string | null;
  weatherUpdateNote?: string | null;
  weatherUpdatedAt?: Date | string | null;
  coordinationAssignments?: Array<{
    action: "meeting" | "weather" | "transport" | "readiness" | "day_of";
    assigneeId: number;
    assigneeName?: string | null;
    updatedAt?: Date | string | null;
  }>;
};

export default function MyOutingsPage({
  onOpen,
  onExplore,
  onCreate,
  autoOpenEventId,
  onAutoOpenHandled,
}: {
  onOpen: (outing: MyOuting) => void;
  onExplore: () => void;
  onCreate: () => void;
  autoOpenEventId?: number | null;
  onAutoOpenHandled?: () => void;
}) {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const outings = trpc.hiking.events.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const coOrganizerInvites = trpc.hiking.events.coOrganizers.pending.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const respondCoOrganizerInvite =
    trpc.hiking.events.coOrganizers.respond.useMutation({
      onSuccess: () => coOrganizerInvites.refetch(),
    });
  const notifications = trpc.hiking.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const markNotificationRead = trpc.hiking.notifications.markRead.useMutation({
    onSuccess: () => notifications.refetch(),
  });
  const [offlinePacks, setOfflinePacks] = React.useState(() =>
    listOfflinePacks()
  );
  const now = new Date();
  const all = (outings.data ?? []) as MyOuting[];
  useEffect(() => {
    if (!autoOpenEventId) return;
    const outing = all.find(candidate => candidate.id === autoOpenEventId);
    if (outing) {
      onOpen(outing);
      onAutoOpenHandled?.();
    }
  }, [all, autoOpenEventId, onOpen, onAutoOpenHandled]);
  const upcoming = all.filter(outing => new Date(outing.startsAt) >= now);
  const past = all.filter(outing => new Date(outing.startsAt) < now);
  const today = all.filter(outing => isToday(outing.startsAt, now));
  const responsibilityAlerts = (notifications.data ?? []).filter(
    notification =>
      !notification.isRead &&
      notification.actionPath?.includes("focus=responsibilities")
  );
  const copy =
    locale === "fr"
      ? {
          eyebrow: "Mon espace de départ",
          title: "Mes sorties",
          subtitle: "Préparez chaque étape avant de partir.",
          signInTitle: "Vos prochaines sorties, au même endroit",
          signInBody:
            "Retrouvez les rendez-vous, le covoiturage, la préparation et les discussions après votre inscription.",
          signIn: "Se connecter",
          explore: "Découvrir les sorties",
          create: "Créer une sortie",
          today: "Aujourd’hui",
          todayDetail:
            "Vos informations opérationnelles de départ sont réunies ici.",
          departure: "Départ",
          openDeparture: "Ouvrir le départ",
          departureCheckIn: "Confirmer le départ",
          departureDone: "Départ confirmé",
          weatherUpdate: "Météo : mise à jour importante",
          noWeatherUpdate: "Aucune mise à jour météo importante.",
          carpoolStatus: "Covoiturage à consulter",
          noCarpool: "Pas de covoiturage prévu",
          readiness: "participants prêts",
          sos: "Urgence 911",
          sosNote: "Utilisez les services d’urgence lorsque nécessaire.",
          upcoming: "À préparer",
          upcomingDetail:
            "Vos départs, vos actions utiles et votre coordination de groupe.",
          past: "À débriefer",
          organizer: "Vous organisez",
          participant: "Vous participez",
          pending: "En attente de validation",
          prepare: "Ouvrir le dossier",
          debrief: "Voir le débrief",
          noUpcoming: "Aucune sortie à préparer pour le moment.",
          noPast:
            "Les sorties terminées apparaîtront ici pour garder une trace et partager un retour utile.",
          meeting: "Rendez-vous",
          carpool: "Covoiturage",
          checklist: "Préparation",
          offline: "Hors ligne",
          next: "Prochaine action",
          organizerAction: "Compléter le rendez-vous et les consignes",
          participantAction: "Vérifier les informations de départ",
          pendingAction: "Attendre la réponse de l’organisateur",
          responsibilities: "Responsabilités du groupe",
          responsibilitiesDetail: "Repères attribués par l’organisation.",
          noResponsibilities:
            "Aucune responsabilité de coordination n’est encore attribuée.",
          roleAlerts: "Nouveaux rôles",
          roleAlertDetail:
            "Une responsabilité de coordination vous a été attribuée.",
          markRead: "Vu",
        }
      : {
          eyebrow: "My departure hub",
          title: "My outings",
          subtitle: "Prepare every step before you set off.",
          signInTitle: "Your upcoming outings, in one place",
          signInBody:
            "Find meeting details, carpooling, preparation and group discussion after you join an outing.",
          signIn: "Log in",
          explore: "Explore outings",
          create: "Create an outing",
          today: "Today",
          todayDetail:
            "Your operational departure information is gathered here.",
          departure: "Departure",
          openDeparture: "Open departure",
          departureCheckIn: "Confirm departure",
          departureDone: "Departure confirmed",
          weatherUpdate: "Weather: important update",
          noWeatherUpdate: "No important weather update.",
          carpoolStatus: "Review carpool",
          noCarpool: "No carpool planned",
          readiness: "participants ready",
          sos: "Emergency 911",
          sosNote: "Use emergency services when needed.",
          upcoming: "To prepare",
          upcomingDetail:
            "Your departures, useful actions and group coordination.",
          past: "To debrief",
          organizer: "You organize",
          participant: "You are joining",
          pending: "Awaiting approval",
          prepare: "Open outing hub",
          debrief: "View debrief",
          noUpcoming: "No outings to prepare yet.",
          noPast:
            "Completed outings will appear here to preserve a useful record and share a debrief.",
          meeting: "Meeting point",
          carpool: "Carpool",
          checklist: "Preparation",
          offline: "Offline",
          next: "Next action",
          organizerAction: "Complete the meeting details and guidance",
          participantAction: "Check departure details",
          pendingAction: "Wait for the organizer’s response",
          responsibilities: "Group responsibilities",
          responsibilitiesDetail: "Cues assigned by the organizers.",
          noResponsibilities:
            "No coordination responsibility has been assigned yet.",
          roleAlerts: "New roles",
          roleAlertDetail: "A coordination responsibility was assigned to you.",
          markRead: "Seen",
        };

  if (!isAuthenticated)
    return (
      <div className="mx-auto max-w-3xl pb-8">
        <header className="pt-[max(.3rem,env(safe-area-inset-top))]">
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#728e7f]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.065em] text-[#1b3c2f]">
            {copy.title}
          </h1>
        </header>
        <section className="mt-6 overflow-hidden rounded-[2rem] bg-[#1b4939] p-6 text-[#f5faef] shadow-[0_18px_42px_rgba(22,64,48,.2)] sm:p-8">
          <Navigation size={28} className="text-[#f4cc79]" />
          <h2 className="mt-5 text-2xl font-extrabold tracking-[-.055em]">
            {copy.signInTitle}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#d9ead6]">
            {copy.signInBody}
          </p>
          <button
            onClick={startLogin}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f5faef] px-4 text-sm font-extrabold text-[#214b3a]"
          >
            <CheckCircle2 size={16} />
            {copy.signIn}
          </button>
        </section>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <header className="flex items-end justify-between gap-4 pt-[max(.3rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#728e7f]">
            {copy.eyebrow}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-[-.065em] text-[#1b3c2f]">
              {copy.title}
            </h1>
            {responsibilityAlerts.length ? (
              <span
                aria-label={`${responsibilityAlerts.length} ${copy.roleAlerts.toLowerCase()}`}
                className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#bf5d38] px-1.5 text-[10px] font-extrabold text-white"
              >
                {responsibilityAlerts.length}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-semibold text-[#708b7c]">
            {copy.subtitle}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="hidden h-10 items-center gap-2 rounded-xl bg-[#1d493a] px-3 text-xs font-extrabold text-white shadow-sm sm:inline-flex"
        >
          <Plus size={15} />
          {copy.create}
        </button>
      </header>
      {coOrganizerInvites.data?.length ? (
        <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-[#f0dca8] bg-[#fff9e9] p-4">
          <h2 className="text-sm font-extrabold text-[#73511e]">
            {locale === "fr"
              ? "Invitations à co-organiser"
              : "Co-organizer invitations"}
          </h2>
          <div className="mt-3 space-y-2">
            {coOrganizerInvites.data.map(invite => (
              <article
                key={invite.id}
                className="rounded-xl bg-white p-3 ring-1 ring-[#f1e3bd]"
              >
                <p className="text-xs font-extrabold text-[#604a25]">
                  {invite.eventTitle ||
                    (locale === "fr"
                      ? "Sortie indisponible"
                      : "Unavailable outing")}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#8a7350]">
                  {invite.valid
                    ? locale === "fr"
                      ? `Invitation de ${invite.inviterName || "l’organisateur"}.`
                      : `Invitation from ${invite.inviterName || "the organizer"}.`
                    : locale === "fr"
                      ? "Cette invitation n’est plus valide : la sortie a été retirée, clôturée ou l’invitation a expiré."
                      : "This invitation is no longer valid: the outing was removed, closed or the invitation expired."}
                </p>
                {invite.valid && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        respondCoOrganizerInvite.mutate({
                          invitationId: invite.id,
                          accept: true,
                        })
                      }
                      className="rounded-lg bg-[#2e674b] px-3 py-1.5 text-[10px] font-extrabold text-white"
                    >
                      {locale === "fr" ? "Accepter" : "Accept"}
                    </button>
                    <button
                      onClick={() =>
                        respondCoOrganizerInvite.mutate({
                          invitationId: invite.id,
                          accept: false,
                        })
                      }
                      className="rounded-lg bg-[#f5ead0] px-3 py-1.5 text-[10px] font-extrabold text-[#846333]"
                    >
                      {locale === "fr" ? "Refuser" : "Decline"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {responsibilityAlerts.length ? (
        <ResponsibilityAlerts
          notifications={responsibilityAlerts}
          locale={locale}
          copy={copy}
          onMarkRead={notificationId =>
            markNotificationRead.mutate({ notificationId })
          }
        />
      ) : null}
      {today.length ? (
        <TodayDepartureSection
          outings={today}
          locale={locale}
          copy={copy}
          onOpen={onOpen}
        />
      ) : null}
      {offlinePacks.length ? (
        <OfflineDayOfPacks
          packs={offlinePacks}
          locale={locale}
          onRefresh={() => setOfflinePacks(listOfflinePacks())}
        />
      ) : null}
      <NextOutingActionPanel
        outings={upcoming}
        onOpen={outing => onOpen(outing as MyOuting)}
      />
      <section className="mt-6 rounded-[1.65rem] border border-[#dce9d8] bg-[#edf5e9] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-[#3e775a] shadow-sm">
            <ClipboardCheck size={19} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-[#284e3e]">
              {copy.upcoming}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#678174]">
              {copy.upcomingDetail}
            </p>
          </div>
        </div>
      </section>
      <section className="mt-4 space-y-3">
        {outings.isLoading ? (
          <LoadingCards />
        ) : upcoming.length ? (
          upcoming.map(outing => (
            <OutingHubCard
              key={outing.id}
              outing={outing}
              locale={locale}
              copy={copy}
              onOpen={() => onOpen(outing)}
              onLeft={() => outings.refetch()}
            />
          ))
        ) : (
          <EmptyState
            text={copy.noUpcoming}
            action={copy.explore}
            onAction={onExplore}
          />
        )}
      </section>
      <RecurringSeriesPanel
        organizerOutings={all.filter(
          outing => outing.relationship === "organizer"
        )}
        onOpen={outing => onOpen(outing as MyOuting)}
      />
      <section className="mt-8">
        <div className="flex items-center gap-2">
          <CalendarDays size={17} className="text-[#6f8d7c]" />
          <h2 className="text-lg font-extrabold tracking-[-.04em] text-[#284538]">
            {copy.past}
          </h2>
        </div>
        <div className="mt-3 space-y-2">
          {past.length ? (
            past.slice(0, 6).map(outing => (
              <button
                key={outing.id}
                onClick={() => onOpen(outing)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#e0eadc] bg-white p-3 text-left transition hover:bg-[#fbfdf9]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[#f3f7f1] text-[#6e927b]">
                  <MessageCircle size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-[#355846]">
                    {outing.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[#789185]">
                    {dateLabel(outing.startsAt, locale)} · {copy.debrief}
                  </span>
                </span>
                <ChevronRight size={17} className="text-[#88a092]" />
              </button>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[#d4e1d0] bg-white px-4 py-5 text-xs leading-relaxed font-semibold text-[#789083]">
              {copy.noPast}
            </p>
          )}
        </div>
      </section>
      <PostOutingRecapPanel outings={past} />
    </div>
  );
}

function OutingHubCard({
  outing,
  locale,
  copy,
  onOpen,
  onLeft,
}: {
  outing: MyOuting;
  locale: "fr" | "en";
  copy: Record<string, string>;
  onOpen: () => void;
  onLeft: () => void;
}) {
  const pending = outing.participationStatus === "pending";
  const action = pending
    ? copy.pendingAction
    : outing.relationship === "organizer"
      ? copy.organizerAction
      : copy.participantAction;
  const relationship = pending
    ? copy.pending
    : outing.relationship === "organizer"
      ? copy.organizer
      : copy.participant;
  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-[#dce9d8] bg-white shadow-[0_8px_24px_rgba(29,69,52,.06)]">
      <div className="flex gap-3 p-4 sm:p-5">
        <div className="hidden h-22 w-22 shrink-0 overflow-hidden rounded-2xl bg-[#e5efe2] sm:block">
          {outing.coverImageUrl ? (
            <ResponsiveCoverImage
              src={outing.coverImageUrl}
              focalX={outing.coverImageFocalX}
              focalY={outing.coverImageFocalY}
              alt=""
              sizes="88px"
              className="size-full object-cover"
            />
          ) : (
            <Compass className="m-7 text-[#71927e]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.1em] ${pending ? "bg-[#fff3d8] text-[#a46f20]" : outing.relationship === "organizer" ? "bg-[#e7f2e4] text-[#397357]" : "bg-[#edf3fb] text-[#466c9b]"}`}
              >
                {relationship}
              </span>
              <h3 className="mt-2 truncate text-base font-extrabold tracking-[-.035em] text-[#294d3c]">
                {outing.title}
              </h3>
            </div>
            <ChevronRight size={18} className="shrink-0 text-[#7f988a]" />
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-[#718d7f]">
            <MapPin size={13} />
            {outing.locationName}
          </p>
          <p className="mt-2 text-xs font-extrabold text-[#496b59]">
            {dateLabel(outing.startsAt, locale)} · {outing.distanceKm} km · +
            {outing.elevationGain} m
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 border-t border-[#edf2ea] bg-[#fbfdf9] px-3 py-3 text-center text-[9px] font-extrabold text-[#638275]">
        <Status icon={<MapPin size={14} />} label={copy.meeting} />
        <Status
          icon={<Car size={14} />}
          label={copy.carpool}
          active={outing.carpoolEnabled}
        />
        <Status icon={<ClipboardCheck size={14} />} label={copy.checklist} />
        <Status icon={<WifiOff size={14} />} label={copy.offline} />
      </div>
      <ParticipantResponsibilities
        assignments={outing.coordinationAssignments ?? []}
        locale={locale}
        copy={copy}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2ea] px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#6e887a]">
          <ShieldCheck size={13} className="mr-1 inline text-[#4b8261]" />
          {copy.next}: {action}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {/* The organizer cancels the outing instead of leaving it. */}
          {outing.relationship === "participant" && (
            <LeaveOutingButton
              eventId={outing.id}
              participationStatus={outing.participationStatus}
              onLeft={onLeft}
            />
          )}
          <button
            onClick={onOpen}
            className="min-h-11 shrink-0 rounded-xl bg-[#1d493a] px-3 py-2 text-[11px] font-extrabold text-white"
          >
            {copy.prepare}
          </button>
        </div>
      </div>
    </article>
  );
}

function ParticipantResponsibilities({
  assignments,
  locale,
  copy,
}: {
  assignments: NonNullable<MyOuting["coordinationAssignments"]>;
  locale: "fr" | "en";
  copy: Record<string, string>;
}) {
  const actionLabels =
    locale === "fr"
      ? {
          meeting: "Rendez-vous",
          weather: "Météo",
          transport: "Covoiturage",
          readiness: "Préparation",
          day_of: "Jour J",
        }
      : {
          meeting: "Meeting",
          weather: "Weather",
          transport: "Carpool",
          readiness: "Preparation",
          day_of: "Day of",
        };
  const grouped = assignments.reduce<
    Record<number, { name: string; actions: string[] }>
  >((result, assignment) => {
    const current = result[assignment.assigneeId] ?? {
      name: assignment.assigneeName || `#${assignment.assigneeId}`,
      actions: [],
    };
    current.actions.push(actionLabels[assignment.action]);
    result[assignment.assigneeId] = current;
    return result;
  }, {});
  const participants = Object.values(grouped);
  return (
    <section
      className="border-t border-[#edf2ea] bg-[#f8fbf7] px-4 py-3"
      aria-label={copy.responsibilities}
    >
      <div className="flex items-start gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#e5f1e3] text-[#47775a]">
          <UsersRound size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[#406650]">
            {copy.responsibilities}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-[#789081]">
            {copy.responsibilitiesDetail}
          </p>
        </div>
      </div>
      {participants.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {participants.map(person => (
            <div
              key={person.name}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-[#dfebdc] bg-white px-2.5 py-2"
            >
              <UserRoundCheck size={14} className="shrink-0 text-[#588269]" />
              <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-[#496b58]">
                {person.name}
              </span>
              <span className="flex flex-wrap justify-end gap-1">
                {person.actions.map(action => (
                  <span
                    key={action}
                    className="rounded-full bg-[#eef5eb] px-1.5 py-0.5 text-[9px] font-extrabold text-[#53785f]"
                  >
                    {action}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs font-semibold text-[#7b9183]">
          {copy.noResponsibilities}
        </p>
      )}
    </section>
  );
}

function ResponsibilityAlerts({
  notifications,
  copy,
  onMarkRead,
}: {
  notifications: Array<{ id: number; title: string; body: string }>;
  locale: "fr" | "en";
  copy: Record<string, string>;
  onMarkRead: (notificationId: number) => void;
}) {
  return (
    <section
      aria-live="polite"
      className="mt-5 overflow-hidden rounded-[1.55rem] border border-[#f2cfb8] bg-[#fff7f1] shadow-[0_8px_20px_rgba(159,79,47,.07)]"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#bf5d38] text-white">
          <BellRing size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-[#844128]">
            {copy.roleAlerts}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-[#a2664e]">
            {copy.roleAlertDetail}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-[#aa5536]">
          {notifications.length}
        </span>
      </div>
      <div className="divide-y divide-[#f3d9c9] border-t border-[#f3d9c9]">
        {notifications.map(notification => (
          <article
            key={notification.id}
            className="flex items-center gap-3 bg-white/70 px-4 py-3"
          >
            <span className="min-w-0 flex-1">
              <strong className="block text-xs text-[#78432f]">
                {notification.title}
              </strong>
              <span className="mt-1 block text-xs leading-relaxed font-semibold text-[#926854]">
                {notification.body}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              className="min-h-11 shrink-0 rounded-xl bg-[#fff0e5] px-3 text-xs font-extrabold text-[#9d4d31]"
            >
              {copy.markRead}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Status({
  icon,
  label,
  active = true,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`flex flex-col items-center gap-1 ${active ? "text-[#4b7a61]" : "text-[#b1c0b6]"}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}
function TodayDepartureSection({
  outings,
  locale,
  copy,
  onOpen,
}: {
  outings: MyOuting[];
  locale: "fr" | "en";
  copy: Record<string, string>;
  onOpen: (outing: MyOuting) => void;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-[1.65rem] border border-[#cfe4d6] bg-[#eef8ef]">
      <div className="flex items-center gap-3 border-b border-[#dcecdf] px-4 py-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-[#1e513d] text-white">
          <Navigation size={18} />
        </span>
        <div>
          <h2 className="text-base font-extrabold tracking-[-.035em] text-[#234c39]">
            {copy.today}
          </h2>
          <p className="text-[11px] font-semibold text-[#698474]">
            {copy.todayDetail}
          </p>
        </div>
      </div>
      <div className="divide-y divide-[#dcecdf]">
        {outings.map(outing => (
          <TodayDepartureCard
            key={outing.id}
            outing={outing}
            locale={locale}
            copy={copy}
            onOpen={() => onOpen(outing)}
          />
        ))}
      </div>
    </section>
  );
}
function TodayDepartureCard({
  outing,
  locale,
  copy,
  onOpen,
}: {
  outing: MyOuting;
  locale: "fr" | "en";
  copy: Record<string, string>;
  onOpen: () => void;
}) {
  const checkIn = trpc.hiking.safety.checkIn.useMutation();
  const readiness = trpc.hiking.events.departureReadiness.useQuery(
    { eventId: outing.id },
    { enabled: outing.relationship === "organizer" }
  );
  const readyCount = readiness.data?.filter(
    item =>
      item.preparationReadyAt &&
      item.meetingAcknowledged &&
      item.latestWeatherUpdateRead !== false
  ).length;
  const isCheckedIn = Boolean(outing.checkedInAt);
  return (
    <article className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#366e52] shadow-sm">
          <CalendarDays size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-sm font-extrabold text-[#294d3c]">
              {outing.title}
            </h3>
            <time className="shrink-0 rounded-full bg-[#dff0df] px-2 py-1 text-[10px] font-extrabold text-[#3f7657]">
              {copy.departure}{" "}
              {new Intl.DateTimeFormat(locale, {
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(outing.startsAt))}
            </time>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#6e887b]">
            <MapPin size={13} />
            {outing.locationName}
          </p>
          <div className="mt-3 grid gap-2 text-[11px] font-semibold text-[#5d786a]">
            <p className="rounded-xl bg-white/80 px-3 py-2">
              <Car size={13} className="mr-1 inline text-[#4e8164]" />
              {outing.carpoolEnabled ? copy.carpoolStatus : copy.noCarpool}
            </p>
            <p className="rounded-xl bg-white/80 px-3 py-2">
              <ShieldCheck size={13} className="mr-1 inline text-[#8b6a27]" />
              {outing.weatherUpdateNote
                ? `${copy.weatherUpdate} · ${outing.weatherUpdateNote}`
                : copy.noWeatherUpdate}
            </p>
            {outing.relationship === "organizer" && readyCount !== undefined ? (
              <p className="rounded-xl bg-white/80 px-3 py-2">
                <ClipboardCheck
                  size={13}
                  className="mr-1 inline text-[#4e8164]"
                />
                {readyCount} {copy.readiness}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <button
          onClick={onOpen}
          className="min-h-11 rounded-xl bg-[#1d493a] px-3 text-xs font-extrabold text-white"
        >
          {copy.openDeparture}
        </button>
        <button
          onClick={() =>
            checkIn.mutate({ eventId: outing.id, kind: "departure" })
          }
          disabled={isCheckedIn || checkIn.isPending}
          className="min-h-11 rounded-xl border border-[#b9d7bf] bg-white px-3 text-xs font-extrabold text-[#37684d] disabled:opacity-60"
        >
          {isCheckedIn ? copy.departureDone : copy.departureCheckIn}
        </button>
        <a
          href="tel:911"
          className="flex min-h-11 items-center justify-center rounded-xl bg-[#fff1e8] px-3 text-xs font-extrabold text-[#9b4e35]"
        >
          {copy.sos}
        </a>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed font-semibold text-[#779082]">
        {copy.sosNote}
      </p>
    </article>
  );
}
function OfflineDayOfPacks({
  packs,
  locale,
  onRefresh,
}: {
  packs: OfflinePack[];
  locale: "fr" | "en";
  onRefresh: () => void;
}) {
  const copy =
    locale === "fr"
      ? {
          title: "Fiches Jour J hors connexion",
          refresh: "Actualiser",
          available: "Fiche opérationnelle disponible",
          open: "Ouvrir la synthèse",
          meeting: "Rendez-vous",
          weather: "Météo",
          carpool: "Covoiturage",
          route: "Itinéraire opérationnel",
          planB: "Option de plan B",
          terrain: "Repères terrain",
          none: "Aucune fiche Jour J détaillée n’a encore été enregistrée.",
        }
      : {
          title: "Offline day-of briefs",
          refresh: "Refresh",
          available: "Operational brief available",
          open: "Open summary",
          meeting: "Meeting",
          weather: "Weather",
          carpool: "Carpool",
          route: "Operational route",
          planB: "Plan B option",
          terrain: "Terrain landmarks",
          none: "No detailed day-of brief has been saved yet.",
        };
  const detailed = packs.filter(pack => pack.dayOfBrief);
  return (
    <section className="mt-5 overflow-hidden rounded-[1.65rem] border border-[#d5e4d3] bg-[#f7fbf6]">
      <div className="flex items-center gap-3 border-b border-[#e0ebdf] px-4 py-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-[#e5f1e3] text-[#3d7658]">
          <WifiOff size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-[#315945]">
            {copy.title}
          </h2>
          <p className="text-[11px] font-semibold text-[#779084]">
            {detailed.length} {copy.available.toLowerCase()}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="min-h-11 rounded-xl px-3 text-xs font-extrabold text-[#3a7055]"
        >
          {copy.refresh}
        </button>
      </div>
      {detailed.length ? (
        <div className="divide-y divide-[#e4ece2]">
          {detailed.map(pack => (
            <details key={pack.event.id} className="group bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#edf5ea] text-[#47795d]">
                  <FileText size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-[#315746]">
                    {pack.event.title}
                  </span>
                  <span className="block truncate text-xs font-semibold text-[#779084]">
                    {pack.event.locationName} · {copy.open}
                  </span>
                </span>
                <ChevronRight
                  className="transition group-open:rotate-90"
                  size={17}
                />
              </summary>
              <div className="grid gap-2 border-t border-[#edf2ea] px-4 pb-4 pt-3">
                <OfflineBriefLine
                  icon={<MapPin size={14} />}
                  label={copy.meeting}
                  value={pack.dayOfBrief?.meetingPoint || "—"}
                />
                <OfflineBriefLine
                  icon={<CloudSun size={14} />}
                  label={copy.weather}
                  value={pack.dayOfBrief?.weatherUpdate || "—"}
                />
                <OfflineBriefLine
                  icon={<Car size={14} />}
                  label={copy.carpool}
                  value={
                    pack.dayOfBrief?.carpool.length
                      ? pack.dayOfBrief.carpool
                          .map(
                            ride =>
                              `${ride.departureLocation} · ${ride.seatsAvailable}`
                          )
                          .join(" · ")
                      : "—"
                  }
                />
                {pack.dayOfBrief?.operationalRoute && (
                  <OfflineBriefLine
                    icon={<Navigation size={14} />}
                    label={copy.route}
                    value={pack.dayOfBrief.operationalRoute}
                  />
                )}
                {pack.dayOfBrief?.backupPlan && (
                  <OfflineBriefLine
                    icon={<ShieldCheck size={14} />}
                    label={copy.planB}
                    value={pack.dayOfBrief.backupPlan}
                  />
                )}
                {pack.dayOfBrief?.routeImageUrl && (
                  <figure className="overflow-hidden rounded-xl border border-[#dce9d9] bg-[#f7faf6]">
                    <img
                      src={pack.dayOfBrief.routeImageUrl}
                      alt={
                        locale === "fr"
                          ? "Schéma indicatif de l’itinéraire"
                          : "Indicative route diagram"
                      }
                      className="max-h-64 w-full object-cover"
                    />
                  </figure>
                )}
                {pack.dayOfBrief?.terrainLandmarks?.length ? (
                  <OfflineTerrainLandmarks
                    landmarks={pack.dayOfBrief.terrainLandmarks}
                    locale={locale}
                    label={copy.terrain}
                  />
                ) : null}
                {pack.dayOfBrief?.pinnedMessage?.content && (
                  <p className="rounded-xl bg-[#fff7e4] px-3 py-2 text-xs font-semibold text-[#765e30]">
                    {pack.dayOfBrief.pinnedMessage.content}
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-xs font-semibold text-[#779084]">
          {copy.none}
        </p>
      )}
    </section>
  );
}
function OfflineTerrainLandmarks({
  landmarks,
  locale,
  label,
}: {
  landmarks: Array<{
    label: string;
    status: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  locale: "fr" | "en";
  label: string;
}) {
  const copy =
    locale === "fr"
      ? { coordinates: "Coordonnées indicatives", open: "Ouvrir la position" }
      : { coordinates: "Indicative coordinates", open: "Open location" };
  return (
    <div className="rounded-xl bg-[#f7faf6] px-3 py-2 text-xs font-semibold text-[#5d7869]">
      <p className="flex gap-2">
        <span className="mt-0.5 text-[#4a7d5d]">
          <MapPin size={14} />
        </span>
        <span>
          <strong className="text-[#456d57]">{label} :</strong>
        </span>
      </p>
      <div className="mt-2 grid gap-2">
        {landmarks.map(landmark => {
          const hasCoordinates =
            landmark.latitude !== null &&
            landmark.latitude !== undefined &&
            landmark.longitude !== null &&
            landmark.longitude !== undefined;
          const coordinatePair = hasCoordinates
            ? {
                latitude: landmark.latitude as number,
                longitude: landmark.longitude as number,
              }
            : null;
          const mapUrl = coordinatePair
            ? `https://www.google.com/maps/search/?api=1&query=${coordinatePair.latitude},${coordinatePair.longitude}`
            : null;
          return (
            <div
              key={`${landmark.label}-${landmark.status}`}
              className="rounded-lg bg-white px-2.5 py-2"
            >
              <p>
                {landmark.label} · {landmark.status}
              </p>
              {coordinatePair && (
                <>
                  <p className="mt-1 text-[10px] text-[#6c8777]">
                    {copy.coordinates} : {coordinatePair.latitude.toFixed(5)},{" "}
                    {coordinatePair.longitude.toFixed(5)}
                  </p>
                  <a
                    href={mapUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-[#edf5ea] px-2.5 text-[10px] font-extrabold text-[#3e7456]"
                  >
                    <MapPin className="mr-1" size={13} />
                    {copy.open}
                  </a>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function OfflineBriefLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <p className="flex gap-2 rounded-xl bg-[#f7faf6] px-3 py-2 text-xs font-semibold text-[#5d7869]">
      <span className="mt-0.5 text-[#4a7d5d]">{icon}</span>
      <span>
        <strong className="text-[#456d57]">{label} :</strong> {value}
      </span>
    </p>
  );
}
export function EmptyState({
  text,
  action,
  onAction,
}: {
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[1.6rem] border border-dashed border-[#cdddc9] bg-white p-7 text-center"
    >
      <Compass
        aria-hidden="true"
        className="mx-auto text-[#82a28a]"
        size={26}
      />
      <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-[#6d8779]">
        {text}
      </p>
      <button
        onClick={onAction}
        className="mt-4 min-h-11 px-3 text-xs font-extrabold text-[#397058]"
      >
        {action}
      </button>
    </div>
  );
}
function LoadingCards() {
  return (
    <>
      <div className="h-44 animate-pulse rounded-[1.6rem] bg-[#eaf2e6]" />
      <div className="h-44 animate-pulse rounded-[1.6rem] bg-[#eaf2e6]" />
    </>
  );
}
function dateLabel(value: Date | string, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
function isToday(value: Date | string, now: Date) {
  const date = new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
