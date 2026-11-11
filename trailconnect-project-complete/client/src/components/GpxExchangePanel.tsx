import { useLocale } from "@/contexts/LocaleContext";
import { Copy, Download, FileUp, Route } from "lucide-react";
import React from "react";
import { toast } from "sonner";

export function getGpxDownloadName(title: string) {
  const stem = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${stem || "trailconnect-route"}.gpx`;
}

export function GpxExchangePanel({ title, gpxUrl }: { title: string; gpxUrl?: string | null }) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const copy = fr
    ? { title: "Trace GPX", available: "Trace disponible", missing: "Aucune trace GPX n’a été ajoutée par l’organisation.", body: "Téléchargez la trace pour la consulter dans l’application de votre choix. L’import vers Strava, Garmin Connect, AllTrails ou Gaia reste une action manuelle de votre part.", download: "Télécharger le GPX", copy: "Copier le lien", copied: "Lien GPX copié.", note: "La trace est indicative : vérifiez la source, les accès et les conditions locales avant le départ." }
    : { title: "GPX track", available: "Track available", missing: "The organizing team has not added a GPX track.", body: "Download the track for use in the app of your choice. Importing it into Strava, Garmin Connect, AllTrails, or Gaia remains a manual action you control.", download: "Download GPX", copy: "Copy link", copied: "GPX link copied.", note: "The track is indicative: check its source, access, and local conditions before departure." };
  const copyUrl = async () => { if (!gpxUrl) return; try { await navigator.clipboard.writeText(gpxUrl); toast.success(copy.copied); } catch { toast.error(fr ? "Impossible de copier le lien." : "Unable to copy the link."); } };
  return <section className="mt-4 overflow-hidden rounded-[1.35rem] border border-[#d7e5ef] bg-[#fbfdff]"><div className="flex items-center gap-3 border-b border-[#e3edf3] px-4 py-3"><div className="grid size-9 place-items-center rounded-xl bg-[#eaf4f9] text-[#39708d]"><Route size={17} /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-[#294f64]">{copy.title}</h3><p className="text-[10px] font-semibold text-[#708b9a]">{gpxUrl ? copy.available : copy.missing}</p></div></div>{gpxUrl ? <div className="p-4"><p className="text-xs leading-relaxed font-semibold text-[#5c7684]">{copy.body}</p><div className="mt-3 flex flex-wrap gap-2"><a href={gpxUrl} download={getGpxDownloadName(title)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#295f79] px-3 text-xs font-extrabold text-white"><Download size={15} />{copy.download}</a><button onClick={copyUrl} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-[#39677f] ring-1 ring-[#cfe0e9]"><Copy size={14} />{copy.copy}</button></div></div> : <div className="px-4 py-4"><p className="flex items-start gap-2 text-xs leading-relaxed font-semibold text-[#688190]"><FileUp className="mt-0.5 shrink-0" size={15} />{copy.body}</p></div>}<p className="border-t border-[#e3edf3] bg-[#f4f9fc] px-4 py-3 text-[10px] leading-relaxed font-semibold text-[#718d9c]">{copy.note}</p></section>;
}
