import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CarFront, CheckCircle2, ClipboardCheck, Copy, Eye, GitCompareArrows, ListChecks, Save, Share2, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import React, { useMemo, useState } from "react";

type Props = { eventId: number; startsAt: Date | string; canManage: boolean; currentUserId?: number };

const briefFields = [
  ["meetingPoint", "Rendez-vous", "Meeting point"],
  ["meetingInstructions", "Consignes", "Instructions"],
  ["emergencyPlan", "Repères d’urgence", "Emergency notes"],
  ["operationalRoute", "Itinéraire", "Operational route"],
  ["backupPlan", "Plan B", "Backup plan"],
  ["routeImageUrl", "Visuel d’itinéraire", "Route visual"],
] as const;

const builtInInvitationTemplates = {
  fr: [
    { id: "new-date", name: "Nouvelle date", content: "Bonjour, une nouvelle sortie est proposée le {{date}}. Vous pouvez consulter les détails et décider librement si vous souhaitez y participer." },
    { id: "best-date", name: "Date la plus compatible", content: "Bonjour, cette date a reçu le plus de disponibilités : {{date}}. La sortie est maintenant publiée ; votre participation reste entièrement facultative." },
    { id: "adapted-plan", name: "Plan adapté", content: "Bonjour, une version adaptée de la sortie est disponible le {{date}}. Consultez la fiche Jour J et ses changements avant de décider si elle vous convient." },
    { id: "small-group", name: "Petit groupe", content: "Bonjour, une nouvelle date en petit groupe est proposée le {{date}}. Les places et la logistique sont indiquées dans la fiche de sortie." },
    { id: "friendly-follow-up", name: "Relance conviviale", content: "Bonjour, nous ouvrons une nouvelle occasion de marcher ensemble le {{date}}. Aucun engagement n’est attendu : consultez simplement la sortie si elle vous intéresse." },
  ],
  en: [
    { id: "new-date", name: "New date", content: "Hello, a new outing is proposed for {{date}}. You can review the details and freely decide whether you would like to join." },
    { id: "best-date", name: "Best-matched date", content: "Hello, this date received the most availability: {{date}}. The outing is now published; joining remains entirely optional." },
    { id: "adapted-plan", name: "Adapted plan", content: "Hello, an adapted version of the outing is available on {{date}}. Review the day-of brief and its changes before deciding whether it works for you." },
    { id: "small-group", name: "Small group", content: "Hello, a new small-group date is proposed for {{date}}. Places and logistics are listed in the outing brief." },
    { id: "friendly-follow-up", name: "Friendly follow-up", content: "Hello, we are opening another opportunity to hike together on {{date}}. No commitment is expected; simply review the outing if it interests you." },
  ],
} as const;

export function OperationalReadinessPanel({ eventId, startsAt, canManage, currentUserId }: Props) {
  const { locale } = useLocale();
  const [decisionOutcome, setDecisionOutcome] = useState<"maintained" | "adapted" | "cancelled">("maintained");
  const [decisionNote, setDecisionNote] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [publishedEventId, setPublishedEventId] = useState<number | null>(null);
  const [invitationDraft, setInvitationDraft] = useState("");
  const [invitationDate, setInvitationDate] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("select-template");

  const comparison = trpc.hiking.events.dayOfBriefComparison.useQuery({ eventId });
  const decisions = trpc.hiking.events.operationalDecisions.useQuery({ eventId });
  const dates = trpc.hiking.events.dateOptions.useQuery({ eventId });
  const signals = trpc.hiking.events.postOutingSignals.useQuery({ eventId });
  const readiness = trpc.hiking.events.departureReadiness.useQuery({ eventId });
  const briefRead = trpc.hiking.events.dayOfBriefReadStatus.useQuery({ eventId });
  const recovery = trpc.hiking.marketplace.logistics.carpoolRecovery.useQuery({ eventId });
  const logistics = trpc.hiking.marketplace.logistics.detail.useQuery({ eventId });
  const templates = trpc.hiking.events.invitationTemplates.useQuery();
  const shareStats = trpc.hiking.events.invitationShareStats.useQuery({ eventId: publishedEventId ?? 1 }, { enabled: Boolean(publishedEventId) });
  const utils = trpc.useUtils();

  const publishDecision = trpc.hiking.events.publishOperationalDecision.useMutation({
    onSuccess: () => { setDecisionNote(""); decisions.refetch(); signals.refetch(); },
  });
  const addDate = trpc.hiking.events.createDateOption.useMutation({
    onSuccess: () => { setDateValue(""); setDateLabel(""); dates.refetch(); },
  });
  const setAvailability = trpc.hiking.events.updateDateAvailability.useMutation({ onSuccess: () => dates.refetch() });
  const publishDateOption = trpc.hiking.events.publishDateOption.useMutation({
    onSuccess: (result, variables) => {
      const option = dates.data?.find(item => item.id === variables.optionId);
      const date = option ? `${option.label ? `${option.label} — ` : ""}${new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" }).format(new Date(option.startsAt))}` : "";
      setInvitationDate(date);
      setInvitationDraft(locale === "fr"
        ? `Bonjour, une nouvelle sortie est proposée pour la randonnée à une date alternative : ${date}. Vous pouvez consulter les détails et choisir librement si vous souhaitez y participer.`
        : `Hello, a new outing has been proposed for this hike on an alternate date: ${date}. You can review the details and freely decide whether you would like to join.`);
      setPublishedEventId(result.eventId);
      setPreviewOpen(false);
      dates.refetch();
    },
  });
  const recordShare = trpc.hiking.events.recordInvitationShare.useMutation({ onSuccess: () => shareStats.refetch() });
  const saveTemplate = trpc.hiking.events.createInvitationTemplate.useMutation({
    onSuccess: () => { setTemplateName(""); templates.refetch(); },
  });
  const deleteTemplate = trpc.hiking.events.deleteInvitationTemplate.useMutation({ onSuccess: () => templates.refetch() });
  const withdrawRide = trpc.hiking.marketplace.logistics.withdrawCarpool.useMutation({
    onSuccess: () => { logistics.refetch(); recovery.refetch(); utils.hiking.marketplace.logistics.detail.invalidate({ eventId }); },
  });

  const changes = useMemo(() => briefFields.filter(([key]) => comparison.data?.previous && comparison.data.current?.[key] !== comparison.data.previous?.[key]), [comparison.data]);
  const recommendedOption = useMemo(() => [...(dates.data ?? [])].sort((a, b) => b.availableCount - a.availableCount || new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0], [dates.data]);
  const presetTemplates = builtInInvitationTemplates[locale];
  const copy = locale === "fr" ? {
    title: "Pilotage de la sortie", diff: "Ce qui a changé", noDiff: "Aucune version précédente comparable pour le moment.", decision: "Décision de l’organisation", publish: "Publier la décision", decisionHint: "Information factuelle de coordination, sans évaluation de sécurité.", maintained: "Maintien", adapted: "Adaptation", cancelled: "Annulation annoncée", carpool: "Covoiturage de secours", replacement: "places de remplacement actuellement proposées", withdrawn: "Trajet retiré", withdraw: "Retirer mon trajet", milestones: "Jalons collectifs", milestonesHint: "Repères volontaires et factuels : rendez-vous, transport, checklist, hors connexion et fiche Jour J.", post: "Repères post-sortie", after: "Ces signaux factuels seront disponibles après l’heure de départ.", dates: "Dates possibles", addDate: "Ajouter une date", label: "Libellé facultatif", available: "Je suis disponible", unavailable: "Indisponible", best: "Disponibilité la plus élevée", publishDate: "Publier une nouvelle sortie à cette date", publishedDate: "Nouvelle sortie publiée", publishHint: "Le parcours, la logistique et les repères sont copiés. Aucun participant, trajet réservé ou confirmation n’est déplacé.", inviteDraft: "Brouillon pour les anciens participants", inviteHint: "À relire et partager manuellement : aucun message n’est envoyé automatiquement.", preview: "Aperçu avant partage", closePreview: "Fermer l’aperçu", copyInvite: "Copier le brouillon", shareInvite: "Partager le brouillon", templates: "Mes modèles", presetTemplates: "Modèles prédéfinis", useTemplate: "Appliquer", chooseTemplate: "Choisir un modèle", templateName: "Nom du modèle", saveTemplate: "Enregistrer ce modèle", deleteTemplate: "Supprimer le modèle", templateHint: "Les modèles sont personnels. Ajoutez {{date}} pour insérer la date retenue.", copies: "copies manuelles", shares: "partages manuels", noRecipientTracking: "Aucun destinataire n’est suivi.", participants: "participants confirmés", departures: "départs enregistrés", arrivals: "arrivées enregistrées", reports: "constats terrain", versions: "versions Jour J", decisions: "décisions publiées",
  } : {
    title: "Outing operations", diff: "What changed", noDiff: "No earlier comparable version is available yet.", decision: "Organizer decision", publish: "Publish decision", decisionHint: "Factual coordination information, not a safety assessment.", maintained: "Maintained", adapted: "Adapted", cancelled: "Cancellation announced", carpool: "Carpool recovery", replacement: "replacement seats currently offered", withdrawn: "Ride withdrawn", withdraw: "Withdraw my ride", milestones: "Collective milestones", milestonesHint: "Voluntary, factual markers: meeting, transport, checklist, offline pack and day-of brief.", post: "Post-outing signals", after: "These factual signals are available after the departure time.", dates: "Possible dates", addDate: "Add a date", label: "Optional label", available: "I’m available", unavailable: "Unavailable", best: "Highest availability", publishDate: "Publish a new outing on this date", publishedDate: "New outing published", publishHint: "The route, logistics and landmarks are copied. No participant, reserved ride or confirmation is moved.", inviteDraft: "Draft for previous participants", inviteHint: "Review and share manually: no message is sent automatically.", preview: "Preview before sharing", closePreview: "Close preview", copyInvite: "Copy draft", shareInvite: "Share draft", templates: "My templates", presetTemplates: "Suggested templates", useTemplate: "Apply", chooseTemplate: "Choose a template", templateName: "Template name", saveTemplate: "Save this template", deleteTemplate: "Delete template", templateHint: "Templates are personal. Add {{date}} to insert the chosen date.", copies: "manual copies", shares: "manual shares", noRecipientTracking: "No recipient is tracked.", participants: "confirmed participants", departures: "departure check-ins", arrivals: "arrival check-ins", reports: "field reports", versions: "day-of versions", decisions: "published decisions",
  };
  const outcomeLabel = { maintained: copy.maintained, adapted: copy.adapted, cancelled: copy.cancelled };
  const formatDate = (value: Date | string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const readinessCount = (key: "meetingAcknowledged" | "transportConfirmed" | "checklistCompleted" | "offlineReady") => readiness.data?.filter(participant => participant[key]).length ?? 0;
  const confirmedCount = readiness.data?.length ?? briefRead.data?.confirmedParticipants ?? 0;
  const applyTemplate = (content: string) => setInvitationDraft(content.replaceAll("{{date}}", invitationDate));
  const copyDraft = async () => {
    if (!publishedEventId || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(invitationDraft);
    recordShare.mutate({ eventId: publishedEventId, action: "copy" });
  };
  const shareDraft = async () => {
    if (!publishedEventId) return;
    if (navigator.share) {
      await navigator.share({ text: invitationDraft });
      recordShare.mutate({ eventId: publishedEventId, action: "share" });
      return;
    }
    await copyDraft();
  };

  return <section className="mt-7 overflow-hidden rounded-[1.55rem] border border-[#d9e7d5] bg-white shadow-[0_8px_24px_rgba(31,65,49,.05)]">
    <header className="flex items-center gap-3 border-b border-[#e4eee1] bg-[#f7fbf4] px-4 py-3.5"><span className="grid size-9 place-items-center rounded-xl bg-[#e4f2de] text-[#397157]"><ListChecks size={18} /></span><div><h3 className="text-sm font-extrabold text-[#264a39]">{copy.title}</h3><p className="text-[11px] font-semibold text-[#748d80]">{copy.milestonesHint}</p></div></header>
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <Panel icon={<GitCompareArrows size={16} />} title={copy.diff}><p className="text-xs text-[#718b7b]">{comparison.data?.previous ? `${changes.length} ${locale === "fr" ? "élément(s) différent(s) de la version précédente" : "item(s) differ from the previous version"}.` : copy.noDiff}</p>{changes.length > 0 && <ul className="mt-3 space-y-2">{changes.map(([, fr, en]) => <li key={fr} className="rounded-xl bg-[#eef6ea] px-3 py-2 text-xs font-bold text-[#416c55]"><span className="mr-1.5 inline-block rounded bg-[#d5ead0] px-1.5 py-0.5 text-[9px] uppercase tracking-wide">{locale === "fr" ? "modifié" : "changed"}</span>{locale === "fr" ? fr : en}</li>)}</ul>}</Panel>
      <Panel icon={<ShieldCheck size={16} />} title={copy.decision}><p className="text-xs leading-relaxed text-[#718b7b]">{copy.decisionHint}</p>{canManage && <div className="mt-3 space-y-2"><select value={decisionOutcome} onChange={event => setDecisionOutcome(event.target.value as typeof decisionOutcome)} aria-label={copy.decision} className="min-h-11 w-full rounded-xl border border-[#d8e7d4] bg-white px-3 text-xs font-bold text-[#365c49]"><option value="maintained">{copy.maintained}</option><option value="adapted">{copy.adapted}</option><option value="cancelled">{copy.cancelled}</option></select><textarea value={decisionNote} onChange={event => setDecisionNote(event.target.value)} placeholder={locale === "fr" ? "Note factuelle de coordination (10 caractères minimum)" : "Factual coordination note (10 characters minimum)"} className="min-h-20 w-full rounded-xl border border-[#d8e7d4] p-3 text-xs font-medium text-[#365c49] outline-none" /><button disabled={decisionNote.trim().length < 10 || publishDecision.isPending} onClick={() => publishDecision.mutate({ eventId, outcome: decisionOutcome, note: decisionNote.trim() })} className="min-h-11 w-full rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white disabled:opacity-50">{copy.publish}</button></div>}{decisions.data?.[0] && <div className="mt-3 rounded-xl bg-[#f7faf5] p-3 text-xs"><p className="font-extrabold text-[#3d7255]">{outcomeLabel[decisions.data[0].outcome]} · {formatDate(decisions.data[0].createdAt)}</p><p className="mt-1 leading-relaxed text-[#607c6c]">{decisions.data[0].note}</p></div>}</Panel>
      <Panel icon={<CarFront size={16} />} title={copy.carpool}><p className="text-xs text-[#718b7b]"><strong className="text-[#3e7155]">{recovery.data?.replacementSeats ?? 0}</strong> {copy.replacement}</p>{recovery.data?.withdrawnOffers?.map(ride => <div key={ride.id} className="mt-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs"><p className="font-extrabold text-amber-800">{copy.withdrawn} · {ride.departureLocation}</p>{ride.withdrawalNote && <p className="mt-1 text-amber-700">{ride.withdrawalNote}</p>}</div>)}{logistics.data?.carpool?.filter(ride => ride.status === "active" && ride.driverId === currentUserId).map(ride => <button key={ride.id} onClick={() => withdrawRide.mutate({ offerId: ride.id })} className="mt-2 min-h-11 rounded-xl border border-amber-200 px-3 text-xs font-extrabold text-amber-800">{copy.withdraw}</button>)}</Panel>
      <Panel icon={<ClipboardCheck size={16} />} title={copy.milestones}><div className="grid grid-cols-2 gap-2 text-xs">{[["Rendez-vous", "Meeting", readinessCount("meetingAcknowledged")], ["Transport", "Transport", readinessCount("transportConfirmed")], ["Checklist", "Checklist", readinessCount("checklistCompleted")], ["Hors connexion", "Offline", readinessCount("offlineReady")], ["Fiche Jour J", "Day-of brief", briefRead.data?.acknowledgedParticipants ?? 0]].map(([fr, en, count]) => <span key={String(fr)} className="rounded-xl bg-[#f2f7ef] px-3 py-2 font-bold text-[#527161]"><CheckCircle2 className="mr-1 inline text-[#5a956b]" size={13} />{locale === "fr" ? fr : en} <b className="float-right text-[#3d7255]">{count}/{confirmedCount}</b></span>)}</div></Panel>
      <Panel icon={<CalendarDays size={16} />} title={copy.dates} className="lg:col-span-2">
        {canManage && <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label={copy.addDate} type="datetime-local" value={dateValue} onChange={event => setDateValue(event.target.value)} className="min-h-11 rounded-xl border border-[#d8e7d4] px-3 text-xs" /><input aria-label={copy.label} value={dateLabel} onChange={event => setDateLabel(event.target.value)} placeholder={copy.label} className="min-h-11 rounded-xl border border-[#d8e7d4] px-3 text-xs" /><button disabled={!dateValue || addDate.isPending} onClick={() => addDate.mutate({ eventId, startsAt: new Date(dateValue), label: dateLabel || undefined })} className="min-h-11 rounded-xl bg-[#244d3d] px-4 text-xs font-extrabold text-white disabled:opacity-50">{copy.addDate}</button></div>}
        {dates.data?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{dates.data.map(option => <div key={option.id} className={`rounded-xl p-3 text-xs ${recommendedOption?.id === option.id ? "bg-[#e8f4e3] ring-1 ring-[#b9dbad]" : "bg-[#f7faf5]"}`}><div className="flex gap-2"><div className="min-w-0 flex-1"><p className="font-extrabold text-[#3b6a50]">{option.label || formatDate(option.startsAt)}</p><p className="mt-1 text-[#718b7b]">{option.availableCount} · {copy.available}</p></div>{recommendedOption?.id === option.id && <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#48805b]">{copy.best}</span>}</div><button onClick={() => setAvailability.mutate({ optionId: option.id, available: option.myAvailability !== true })} className="mt-2 min-h-10 rounded-lg bg-white px-3 text-[10px] font-extrabold text-[#3d7054] ring-1 ring-[#d5e7d0]">{option.myAvailability === true ? copy.unavailable : copy.available}</button>{canManage && recommendedOption?.id === option.id && <div className="mt-2 border-t border-[#cfe2c8] pt-2"><p className="mb-2 text-[10px] leading-relaxed text-[#66826f]">{copy.publishHint}</p>{option.publishedEventId || publishedEventId ? <p className="font-extrabold text-[#3f7653]">{copy.publishedDate}</p> : <button onClick={() => publishDateOption.mutate({ optionId: option.id })} disabled={publishDateOption.isPending} className="min-h-11 w-full rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white disabled:opacity-50">{copy.publishDate}</button>}</div>}</div>)}</div> : <p className="mt-3 text-xs text-[#718b7b]">{locale === "fr" ? "Aucune autre date proposée pour le moment." : "No alternate date has been proposed yet."}</p>}
        {publishedEventId && invitationDraft && <InvitationDraftTools copy={copy} draft={invitationDraft} setDraft={setInvitationDraft} previewOpen={previewOpen} setPreviewOpen={setPreviewOpen} presets={presetTemplates} templates={templates.data ?? []} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} templateName={templateName} setTemplateName={setTemplateName} onApplyTemplate={applyTemplate} onSaveTemplate={() => saveTemplate.mutate({ name: templateName.trim(), content: invitationDraft.trim() })} onDeleteTemplate={templateId => deleteTemplate.mutate({ templateId })} onCopy={copyDraft} onShare={shareDraft} stats={shareStats.data} savingTemplate={saveTemplate.isPending} />}
      </Panel>
      <Panel icon={<UsersRound size={16} />} title={copy.post} className="lg:col-span-2">{signals.data?.available ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">{[[signals.data.confirmedParticipants, copy.participants], [signals.data.departureCheckIns, copy.departures], [signals.data.arrivalCheckIns, copy.arrivals], [signals.data.conditionReports, copy.reports], [signals.data.briefVersions, copy.versions], [signals.data.organizerDecisions, copy.decisions]].map(([value, label]) => <div key={String(label)} className="rounded-xl bg-[#f2f7ef] p-3 text-center"><p className="text-lg font-black text-[#397155]">{value}</p><p className="text-[10px] font-bold leading-tight text-[#6d8878]">{label}</p></div>)}</div> : <p className="text-xs text-[#718b7b]">{copy.after}</p>}</Panel>
    </div>
  </section>;
}

function InvitationDraftTools({ copy, draft, setDraft, previewOpen, setPreviewOpen, presets, templates, selectedTemplate, setSelectedTemplate, templateName, setTemplateName, onApplyTemplate, onSaveTemplate, onDeleteTemplate, onCopy, onShare, stats, savingTemplate }: { copy: Record<string, string>; draft: string; setDraft: (value: string) => void; previewOpen: boolean; setPreviewOpen: (value: boolean) => void; presets: ReadonlyArray<{ id: string; name: string; content: string }>; templates: Array<{ id: number; name: string; content: string }>; selectedTemplate: string; setSelectedTemplate: (value: string) => void; templateName: string; setTemplateName: (value: string) => void; onApplyTemplate: (content: string) => void; onSaveTemplate: () => void; onDeleteTemplate: (id: number) => void; onCopy: () => void; onShare: () => void; stats?: { copies: number; shares: number; total: number }; savingTemplate: boolean }) {
  return <div className="mt-4 rounded-2xl border border-[#cfe2c8] bg-[#f6fbf3] p-3">
    <p className="text-xs font-black text-[#3d7054]">{copy.inviteDraft}</p>
    <textarea aria-label={copy.inviteDraft} value={draft} onChange={event => setDraft(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-[#d8e7d4] bg-white p-3 text-xs leading-relaxed text-[#456758]" />
    <p className="mt-1 text-[10px] leading-relaxed text-[#66826f]">{copy.inviteHint}</p>
    <div className="mt-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#557566]">{copy.presetTemplates}</p><div className="mt-2 flex flex-wrap gap-2">{presets.map(template => <button key={template.id} onClick={() => onApplyTemplate(template.content)} aria-label={`${copy.useTemplate}: ${template.name}`} className="min-h-10 rounded-full border border-[#b9d8af] bg-white px-3 text-[10px] font-extrabold text-[#3d7054]">{template.name}</button>)}</div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><select aria-label={copy.templates} value={selectedTemplate} onChange={event => { const value = event.target.value; setSelectedTemplate(value); const template = templates.find(item => String(item.id) === value); if (template) onApplyTemplate(template.content); }} className="min-h-11 rounded-xl border border-[#d8e7d4] bg-white px-3 text-xs font-bold text-[#456758]"><option value="select-template">{copy.chooseTemplate}</option>{templates.map(template => <option key={template.id} value={String(template.id)}>{template.name}</option>)}</select><button onClick={() => setPreviewOpen(!previewOpen)} className="min-h-11 rounded-xl border border-[#b9d8af] bg-white px-3 text-xs font-extrabold text-[#3d7054]"><Eye className="mr-1 inline" size={14} />{copy.preview}</button></div>
    <p className="mt-2 text-[10px] leading-relaxed text-[#66826f]">{copy.templateHint}</p>
    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]"><input aria-label={copy.templateName} value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder={copy.templateName} className="min-h-11 rounded-xl border border-[#d8e7d4] bg-white px-3 text-xs" /><button disabled={templateName.trim().length < 2 || draft.trim().length < 20 || savingTemplate} onClick={onSaveTemplate} className="min-h-11 rounded-xl bg-[#e4f2de] px-3 text-xs font-extrabold text-[#356248] disabled:opacity-50"><Save className="mr-1 inline" size={14} />{copy.saveTemplate}</button></div>
    {templates.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{templates.map(template => <button key={template.id} onClick={() => onDeleteTemplate(template.id)} aria-label={`${copy.deleteTemplate}: ${template.name}`} className="min-h-9 rounded-full border border-[#d8e7d4] bg-white px-3 text-[10px] font-bold text-[#587565]"><Trash2 className="mr-1 inline" size={12} />{template.name}</button>)}</div>}
    <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-bold text-[#557566]"><span><b className="text-[#2e6245]">{stats?.copies ?? 0}</b> {copy.copies}</span><span><b className="text-[#2e6245]">{stats?.shares ?? 0}</b> {copy.shares}</span><span>{copy.noRecipientTracking}</span></div>
    {previewOpen && <section role="dialog" aria-modal="false" aria-label={copy.preview} className="mt-3 rounded-xl border border-[#b9d8af] bg-white p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black text-[#3d7054]">{copy.preview}</p><button onClick={() => setPreviewOpen(false)} className="min-h-9 rounded-lg px-2 text-[10px] font-bold text-[#557566]">{copy.closePreview}</button></div><p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#f6fbf3] p-3 text-xs leading-relaxed text-[#456758]">{draft}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={onCopy} className="min-h-11 rounded-xl bg-[#eef6ea] px-3 text-xs font-extrabold text-[#3d7054]"><Copy className="mr-1 inline" size={14} />{copy.copyInvite}</button><button onClick={onShare} className="min-h-11 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white"><Share2 className="mr-1 inline" size={14} />{copy.shareInvite}</button></div></section>}
  </div>;
}

function Panel({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[1.3rem] border border-[#e0ebdd] bg-white p-4 ${className}`}><h4 className="flex items-center gap-2 text-sm font-extrabold text-[#315844]"><span className="text-[#568967]">{icon}</span>{title}</h4><div className="mt-3">{children}</div></section>;
}
