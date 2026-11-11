import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, ExternalLink, Info, LockKeyhole, Mountain, Pencil, Route, XCircle } from "lucide-react";
import React from "react";
import { toast } from "sonner";

export type TerrainAccessStatus = "unknown" | "open" | "caution" | "restricted" | "closed";

type TerrainAccessData = {
  terrainStatus?: TerrainAccessStatus | null;
  accessStatus?: TerrainAccessStatus | null;
  terrainAccessNote?: string | null;
  terrainSourceLabel?: string | null;
  terrainSourceUrl?: string | null;
  terrainCheckedAt?: Date | string | null;
};

const tones: Record<TerrainAccessStatus, { tone: string; icon: typeof CheckCircle2 }> = {
  unknown: { tone: "bg-slate-100 text-slate-650 ring-slate-200", icon: Info },
  open: { tone: "bg-emerald-50 text-emerald-750 ring-emerald-200", icon: CheckCircle2 },
  caution: { tone: "bg-amber-50 text-amber-800 ring-amber-200", icon: AlertTriangle },
  restricted: { tone: "bg-orange-50 text-orange-800 ring-orange-200", icon: LockKeyhole },
  closed: { tone: "bg-rose-50 text-rose-800 ring-rose-200", icon: XCircle },
};

export function terrainAccessLabel(status: TerrainAccessStatus, locale: "fr" | "en") {
  const labels = locale === "fr"
    ? { unknown: "Non précisé", open: "Ouvert", caution: "À vérifier", restricted: "Accès limité", closed: "Fermé" }
    : { unknown: "Not stated", open: "Open", caution: "Check conditions", restricted: "Restricted", closed: "Closed" };
  return labels[status];
}

export function terrainAccessTone(status: TerrainAccessStatus) {
  return tones[status].tone;
}

function StatusPill({ status, label, locale }: { status: TerrainAccessStatus; label: string; locale: "fr" | "en" }) {
  const Icon = tones[status].icon;
  return <div className={`min-w-0 rounded-xl p-3 ring-1 ${terrainAccessTone(status)}`}><div className="flex items-center gap-1.5"><Icon size={15} /><p className="text-[10px] font-extrabold uppercase tracking-[.08em] opacity-80">{label}</p></div><p className="mt-1 text-xs font-extrabold">{terrainAccessLabel(status, locale)}</p></div>;
}

export function TerrainAccessPanel({ eventId, canManage, data }: { eventId: number; canManage: boolean; data?: TerrainAccessData | null }) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState<TerrainAccessData>(data ?? {});
  React.useEffect(() => setValue(data ?? {}), [data]);
  const update = trpc.hiking.marketplace.logistics.update.useMutation({
    onSuccess: result => { setValue(result); setEditing(false); toast.success(fr ? "État terrain enregistré." : "Terrain status saved."); },
    onError: error => toast.error(error.message),
  });
  const terrainStatus = value.terrainStatus ?? "unknown";
  const accessStatus = value.accessStatus ?? "unknown";
  const checkedAt = value.terrainCheckedAt ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value.terrainCheckedAt)) : null;
  const copy = fr
    ? { title: "État terrain & accès", subtitle: "Information factuelle déclarée par l’organisation", terrain: "Sentier", access: "Accès", source: "Source indiquée", checked: "Vérifié le", edit: "Mettre à jour", save: "Enregistrer l’état", cancel: "Annuler", note: "Note pratique", label: "Nom de la source", url: "Lien HTTPS de la source", date: "Date de vérification", disclaimer: "Cet état est un repère de préparation, non une autorisation ni une garantie de conditions ou de sécurité. Consultez la source officielle et évaluez la situation sur place." }
    : { title: "Terrain & access status", subtitle: "Factual information stated by the organizing team", terrain: "Trail", access: "Access", source: "Listed source", checked: "Checked", edit: "Update", save: "Save status", cancel: "Cancel", note: "Practical note", label: "Source name", url: "Secure source URL", date: "Verification date", disclaimer: "This status is a planning cue, not clearance or a guarantee of conditions or safety. Check the official source and assess the situation on site." };
  const canSaveSource = Boolean(value.terrainSourceLabel?.trim()) === Boolean(value.terrainSourceUrl?.trim());
  const save = () => update.mutate({
    eventId,
    terrainStatus,
    accessStatus,
    terrainAccessNote: value.terrainAccessNote?.trim() || undefined,
    terrainSourceLabel: value.terrainSourceLabel?.trim() || undefined,
    terrainSourceUrl: value.terrainSourceUrl?.trim() || undefined,
    terrainCheckedAt: value.terrainCheckedAt ? new Date(value.terrainCheckedAt) : undefined,
  });
  return <section className="mt-7 overflow-hidden rounded-[1.45rem] border border-[#d7e6d8] bg-white"><div className="flex items-center gap-3 border-b border-[#e7eee3] px-4 py-3"><div className="grid size-9 place-items-center rounded-xl bg-[#ebf4e7] text-[#3b745d]"><Mountain size={18} /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-[#244738]">{copy.title}</h3><p className="text-[10px] font-semibold text-[#779083]">{copy.subtitle}</p></div>{canManage && <button onClick={() => setEditing(item => !item)} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#eef6eb] px-3 text-[11px] font-extrabold text-[#35664d]"><Pencil size={13} />{copy.edit}</button>}</div><div className="grid grid-cols-2 gap-2 p-4"><StatusPill status={terrainStatus} label={copy.terrain} locale={locale} /><StatusPill status={accessStatus} label={copy.access} locale={locale} /></div>{value.terrainAccessNote && <p className="mx-4 mb-4 rounded-xl bg-[#f5f8f3] px-3 py-2.5 text-xs font-semibold leading-relaxed text-[#597267]">{value.terrainAccessNote}</p>}{checkedAt && <p className="px-4 pb-3 text-[10px] font-bold text-[#789085]">{copy.checked} {checkedAt}</p>}{value.terrainSourceUrl && <a href={value.terrainSourceUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 border-t border-[#dce9d8] bg-[#f0f6ec] px-4 py-3 text-xs font-extrabold text-[#37654c] hover:bg-[#e4f0df]"><ExternalLink size={15} className="shrink-0" />{copy.source}: {value.terrainSourceLabel}</a>}{editing && <div className="grid gap-3 border-t border-[#dce9d8] bg-[#fbfdf9] p-4"><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-extrabold text-[#587265]">{copy.terrain}<select aria-label={copy.terrain} value={terrainStatus} onChange={event => setValue(current => ({ ...current, terrainStatus: event.target.value as TerrainAccessStatus }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#d4e4d0] bg-white px-2 text-xs font-bold text-[#365b49]"><option value="unknown">{terrainAccessLabel("unknown", locale)}</option><option value="open">{terrainAccessLabel("open", locale)}</option><option value="caution">{terrainAccessLabel("caution", locale)}</option><option value="restricted">{terrainAccessLabel("restricted", locale)}</option><option value="closed">{terrainAccessLabel("closed", locale)}</option></select></label><label className="text-[11px] font-extrabold text-[#587265]">{copy.access}<select aria-label={copy.access} value={accessStatus} onChange={event => setValue(current => ({ ...current, accessStatus: event.target.value as TerrainAccessStatus }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#d4e4d0] bg-white px-2 text-xs font-bold text-[#365b49]"><option value="unknown">{terrainAccessLabel("unknown", locale)}</option><option value="open">{terrainAccessLabel("open", locale)}</option><option value="caution">{terrainAccessLabel("caution", locale)}</option><option value="restricted">{terrainAccessLabel("restricted", locale)}</option><option value="closed">{terrainAccessLabel("closed", locale)}</option></select></label></div><textarea aria-label={copy.note} rows={3} value={value.terrainAccessNote ?? ""} onChange={event => setValue(current => ({ ...current, terrainAccessNote: event.target.value }))} placeholder={fr ? "Ex. barrière d’accès, boue, sentier partiellement dégagé…" : "E.g. access gate, mud, partially cleared trail…"} className="w-full resize-none rounded-xl border border-[#d4e4d0] bg-white px-3 py-2 text-xs font-semibold text-[#365b49]" /><input aria-label={copy.label} value={value.terrainSourceLabel ?? ""} onChange={event => setValue(current => ({ ...current, terrainSourceLabel: event.target.value }))} placeholder={fr ? "Ex. Sépaq — avis du parc" : "E.g. park service notice"} className="min-h-11 rounded-xl border border-[#d4e4d0] bg-white px-3 text-xs font-semibold text-[#365b49]" /><input aria-label={copy.url} inputMode="url" value={value.terrainSourceUrl ?? ""} onChange={event => setValue(current => ({ ...current, terrainSourceUrl: event.target.value }))} placeholder="https://…" className="min-h-11 rounded-xl border border-[#d4e4d0] bg-white px-3 text-xs font-semibold text-[#365b49]" /><label className="text-[11px] font-extrabold text-[#587265]">{copy.date}<input aria-label={copy.date} type="date" value={value.terrainCheckedAt ? new Date(value.terrainCheckedAt).toISOString().slice(0, 10) : ""} onChange={event => setValue(current => ({ ...current, terrainCheckedAt: event.target.value || undefined }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#d4e4d0] bg-white px-3 text-xs font-semibold text-[#365b49]" /></label><div className="flex flex-wrap gap-2"><button onClick={save} disabled={update.isPending || !canSaveSource} className="min-h-11 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white disabled:opacity-50">{copy.save}</button><button onClick={() => { setValue(data ?? {}); setEditing(false); }} className="min-h-11 rounded-xl bg-[#eef3ec] px-3 text-xs font-extrabold text-[#536d60]">{copy.cancel}</button></div></div>}<p className="flex gap-1.5 border-t border-[#e7eee3] bg-[#fbfdf9] px-4 py-3 text-[10px] font-semibold leading-relaxed text-[#6c8578]"><Route className="mt-0.5 size-3.5 shrink-0 text-[#7d9d88]" />{copy.disclaimer}</p></section>;
}
