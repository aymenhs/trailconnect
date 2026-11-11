import { startLogin } from "@/const";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Navigation, Plus, Save } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

type EventDetails = Record<string, any> | null | undefined;

export function AllTrailsSourcePanel({ eventId, eventData, canManage }: { eventId: number; eventData: EventDetails; canManage: boolean }) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const detail = trpc.hiking.events.detail.useQuery({ eventId }, { enabled: !eventData });
  const data = eventData ?? detail.data;
  const sourceUrl = data?.allTrailsUrl?.trim() || "";
  useEffect(() => setUrl(sourceUrl), [sourceUrl]);
  const update = trpc.hiking.events.update.useMutation({
    onSuccess: () => {
      detail.refetch();
      setEditing(false);
      toast.success(fr ? "Lien AllTrails enregistré." : "AllTrails link saved.");
    },
    onError: error => toast.error(error.message),
  });
  const save = () => {
    if (!data) return;
    const allTrailsUrl = url.trim();
    if (!allTrailsUrl) return;
    update.mutate({
      eventId,
      title: data.title,
      description: data.description,
      locationName: data.locationName,
      startsAt: new Date(data.startsAt),
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
      capacity: data.capacity,
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
      allTrailsUrl,
      localWeatherSourceLabel: data.localWeatherSourceLabel || undefined,
      localWeatherSourceUrl: data.localWeatherSourceUrl || undefined,
      participantGuidance: data.participantGuidance || undefined,
      cancellationPolicy: data.cancellationPolicy || undefined,
      coverImageUrl: data.coverImageUrl || undefined,
      coverImageFocalX: data.coverImageFocalX ?? undefined,
      coverImageFocalY: data.coverImageFocalY ?? undefined,
      difficultyOverrideReason: data.difficultyOverrideReason || undefined,
    });
  };

  const sourceLink = sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" aria-label={fr ? "Voir l’itinéraire source sur AllTrails, nouvelle fenêtre" : "View the route source on AllTrails, new window"} className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#b9ddbd] bg-[#edf8ea] px-4 py-3 text-sm font-extrabold text-[#245c3d] shadow-sm transition hover:bg-[#e2f4de] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f9d6b]"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#39734e] shadow-sm"><Navigation size={16} /></span><span className="min-w-0 flex-1"><span className="block">{fr ? "Voir l’itinéraire sur AllTrails" : "View route on AllTrails"}</span><span className="block text-[11px] font-semibold text-[#5d8170]">{fr ? "Source externe du parcours" : "External route source"}</span></span><ExternalLink className="shrink-0" size={16} /></a> : null;
  if (sourceLink && (!canManage || !editing)) return <div className="mt-4">{sourceLink}{canManage && <button type="button" onClick={() => setEditing(true)} className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#b9ddbd] bg-white px-3 text-xs font-extrabold text-[#39734e]"><Save size={15} />{fr ? "Modifier le lien" : "Edit link"}</button>}</div>;

  if (!canManage) return <div className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl border border-dashed border-[#d9e5d6] bg-[#f8fbf6] px-4 py-3 text-xs font-semibold text-[#71877a]"><Navigation size={16} className="shrink-0 text-[#85a38d]" /><span>{fr ? "Aucun lien AllTrails ajouté pour cette sortie." : "No AllTrails link has been added for this outing."}</span></div>;

  return <section className="mt-4 overflow-hidden rounded-2xl border border-dashed border-[#b9ddbd] bg-[#f7fbf4]"><div className="flex min-h-12 items-center gap-3 px-4 py-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#39734e] shadow-sm"><Navigation size={16} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-[#245c3d]">{sourceUrl ? (fr ? "Modifier le lien AllTrails" : "Edit AllTrails link") : (fr ? "Lien AllTrails à ajouter" : "Add an AllTrails link")}</span><span className="block text-[11px] font-semibold text-[#6c8b76]">{fr ? "Visible aux participants dès son enregistrement." : "Visible to participants once saved."}</span></span>{!sourceUrl && <button type="button" onClick={() => setEditing(open => !open)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white"><Plus size={15} />{fr ? "Ajouter" : "Add"}</button>}</div>{editing && <div className="border-t border-[#dcebd8] bg-white p-4"><label className="grid gap-1.5 text-xs font-extrabold text-[#3d6650]"><span>{fr ? "Lien source AllTrails" : "AllTrails source link"}</span><input aria-label={fr ? "Lien source AllTrails" : "AllTrails source link"} type="url" inputMode="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.alltrails.com/trail/..." className="min-h-11 rounded-xl border border-[#cfe0cb] bg-[#fbfdf9] px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#79a984]" /></label><p className="mt-2 text-[11px] leading-relaxed font-semibold text-[#758b7c]">{fr ? "Le lien ouvre AllTrails ; TrailConnect ne copie pas automatiquement les données du parcours." : "The link opens AllTrails; TrailConnect does not automatically copy route data."}</p><button type="button" onClick={save} disabled={update.isPending || !url.trim()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white disabled:opacity-50"><Save size={15} />{fr ? "Enregistrer le lien" : "Save link"}</button></div>}</section>;
}
