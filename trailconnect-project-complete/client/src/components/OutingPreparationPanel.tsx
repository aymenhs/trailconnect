import { useAuth } from "@/_core/hooks/useAuth";
import { getWeatherChecklistHints, type WeatherAlertInput } from "@/components/WeatherOutlook";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { Car, Check, ClipboardCheck, CloudRain, CloudSun, MapPin, ShieldCheck, Sun, ThermometerSnowflake, WifiOff, Wind } from "lucide-react";
import React from "react";

type PreparationKey = "meetingAcknowledged" | "transportConfirmed" | "checklistCompleted" | "offlineReady";
export type PersonalChecklistItem = {
  key: string;
  label: string;
  category: "essential" | "safety" | "comfort" | "food";
  detail?: string;
  weatherCue?: "rain" | "wind" | "cold" | "heat" | "uv";
};

export function getPersonalWeatherSuggestions(weather: WeatherAlertInput | null | undefined, locale: "fr" | "en"): PersonalChecklistItem[] {
  if (!weather) return [];
  return getWeatherChecklistHints(weather, locale).map(hint => ({
    key: `weather:${hint.id}`,
    label: hint.label,
    detail: hint.detail,
    category: hint.id === "cold" || hint.id === "heat" ? "comfort" : "safety",
    weatherCue: hint.id === "wind" ? "wind" : hint.id === "cold" ? "cold" : hint.id === "heat" ? "heat" : hint.id === "uv" ? "uv" : "rain",
  }));
}

export default function OutingPreparationPanel({ eventId, joined, isPreview, hasMeetingPoint, carpoolAvailable, offlineReady, onSaveOffline, onOpenSection, packingItems = [], weatherContext }: { eventId: number; joined: boolean; isPreview: boolean; hasMeetingPoint: boolean; carpoolAvailable: boolean; offlineReady: boolean; onSaveOffline: () => void; onOpenSection?: (sectionId: string) => void; packingItems?: PersonalChecklistItem[]; weatherContext?: WeatherAlertInput | null }) {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const state = trpc.hiking.events.preparation.detail.useQuery({ eventId }, { enabled: isAuthenticated && joined && !isPreview });
  const update = trpc.hiking.events.preparation.update.useMutation({ onSuccess: () => state.refetch() });
  const copy = locale === "fr"
    ? { title: "Dossier de préparation", subtitle: "Confirmez ce qui est prêt avant le départ.", locked: "Inscrivez-vous pour activer votre dossier personnel.", meeting: "J’ai lu le rendez-vous", transport: "Mon transport est confirmé", checklist: "Ma préparation globale est prête", offline: "J’ai enregistré les infos hors ligne", saveOffline: "Enregistrer hors ligne", waiting: "L’organisateur complètera ce point." }
    : { title: "Preparation hub", subtitle: "Confirm what is ready before departure.", locked: "Join the outing to activate your personal preparation hub.", meeting: "I have read the meeting details", transport: "My transport is confirmed", checklist: "My overall preparation is ready", offline: "I saved the details offline", saveOffline: "Save offline", waiting: "The organizer will complete this item." };
  const items: Array<{ key: PreparationKey; label: string; icon: React.ReactNode; available: boolean; ready: boolean }> = [
    { key: "meetingAcknowledged", label: copy.meeting, icon: <MapPin size={16} />, available: hasMeetingPoint, ready: Boolean(state.data?.meetingAcknowledged) },
    { key: "transportConfirmed", label: copy.transport, icon: <Car size={16} />, available: carpoolAvailable, ready: Boolean(state.data?.transportConfirmed) },
    { key: "checklistCompleted", label: copy.checklist, icon: <ClipboardCheck size={16} />, available: true, ready: Boolean(state.data?.checklistCompleted) },
    { key: "offlineReady", label: copy.offline, icon: <WifiOff size={16} />, available: true, ready: Boolean(state.data?.offlineReady) || offlineReady },
  ];
  const toggle = (item: typeof items[number]) => {
    if (item.key === "offlineReady" && !offlineReady) onSaveOffline();
    if (!isPreview) update.mutate({ eventId, [item.key]: !item.ready });
  };
  const activateItem = (item: typeof items[number]) => {
    if (!item.available && item.key === "transportConfirmed") return onOpenSection?.(carpoolAvailable ? "tc-carpool" : "tc-logistics");
    if (!item.available && item.key === "meetingAcknowledged") return onOpenSection?.("tc-logistics");
    toggle(item);
  };
  const completeCount = items.filter(item => item.ready).length;
  const weatherItems = getPersonalWeatherSuggestions(weatherContext, locale);

  return <section className={`mt-7 overflow-hidden rounded-[1.5rem] border ${joined ? "border-[#cfe3c9] bg-[#edf7e9]" : "border-[#dce9d8] bg-[#f8fbf5]"}`}>
    <div className="flex items-center gap-3 border-b border-[#dbead6] px-4 py-3.5">
      <div className="grid size-10 place-items-center rounded-2xl bg-[#1d493a] text-white"><ClipboardCheck size={18} /></div>
      <div className="min-w-0 flex-1"><h3 className="text-base font-extrabold text-[#254839]">{copy.title}</h3><p className="mt-0.5 text-xs font-semibold text-[#6b8677]">{joined ? copy.subtitle : copy.locked}</p></div>
      {joined && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-[#397057]">{completeCount}/4</span>}
    </div>
    {joined ? <>
      <div className="grid divide-y divide-[#deebda] bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {items.map(item => <button key={item.key} type="button" aria-pressed={item.ready} disabled={update.isPending} onClick={() => activateItem(item)} className="flex min-h-16 items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f8fcf6] focus-visible:bg-[#f8fcf6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d9f7a] disabled:cursor-wait">
          <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${item.ready ? "bg-[#e7f4e4] text-[#3e7b59]" : item.available ? "bg-[#edf3eb] text-[#759384]" : "bg-[#f2f4f1] text-[#a5b4aa]"}`}>{item.ready ? <Check size={16} /> : item.icon}</span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-[#496957]">{item.label}</span>{!item.available && <span className="mt-0.5 block text-[10px] font-semibold text-[#789185]">{copy.waiting} · {locale === "fr" ? "Voir le détail" : "View details"}</span>}</span>
          {item.key === "offlineReady" && !offlineReady && <span className="text-[10px] font-extrabold text-[#3e7358]">{copy.saveOffline}</span>}
        </button>)}
      </div>
      <PersonalPackingChecklist eventId={eventId} isPreview={isPreview} items={packingItems} weatherItems={weatherItems} weatherAvailable={Boolean(weatherContext)} />
    </> : <div className="grid grid-cols-2 gap-px bg-[#dce9d8] sm:grid-cols-4">
      {items.map(item => <div key={item.key} className="bg-white px-3 py-3 text-center"><span className="mx-auto grid size-7 place-items-center rounded-full bg-[#f1f4ef] text-[#96aa9d]">{item.icon}</span><p className="mt-1.5 text-[10px] font-extrabold text-[#6f887a]">{item.label}</p></div>)}
    </div>}
  </section>;
}

function PersonalPackingChecklist({ eventId, isPreview, items, weatherItems, weatherAvailable }: { eventId: number; isPreview: boolean; items: PersonalChecklistItem[]; weatherItems: PersonalChecklistItem[]; weatherAvailable: boolean }) {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const progress = trpc.hiking.events.preparation.checklistProgress.useQuery({ eventId }, { enabled: isAuthenticated && !isPreview });
  const update = trpc.hiking.events.preparation.updateChecklistItem.useMutation({ onSuccess: () => progress.refetch() });
  const copy = locale === "fr"
    ? { title: "Ma liste de préparation", hint: "Suggestions indicatives : votre suivi est personnel et volontaire.", weatherTitle: "Repères météo personnels", weatherHint: "Suggestions automatiques fondées sur les prévisions indicatives de la sortie. Elles peuvent être utiles selon vos besoins ; vérifiez les conditions et les sources officielles avant le départ.", weatherBadge: "Météo indicative", none: "Aucun élément n’est encore proposé pour cette sortie.", categories: { essential: "Essentiels", safety: "Prudence", comfort: "Confort", food: "Alimentation" } }
    : { title: "My preparation list", hint: "Indicative suggestions: your tracking is personal and voluntary.", weatherTitle: "Personal weather cues", weatherHint: "Automatic suggestions based on the outing’s indicative forecast. They may be useful for your needs; check conditions and official sources before departure.", weatherBadge: "Indicative weather", none: "No items have been suggested for this outing yet.", categories: { essential: "Essentials", safety: "Awareness", comfort: "Comfort", food: "Food" } };
  const wearCopy = locale === "fr"
    ? { title: "Quoi porter aujourd’hui", hint: "Synthèse personnelle fondée sur la météo indicative de cette sortie. Vérifiez les conditions avant le départ.", clear: "Aucun repère vestimentaire automatisé pour les conditions indicatives disponibles.", unavailable: "La météo indicative n’est pas encore disponible pour générer une synthèse." }
    : { title: "What to wear today", hint: "Personal summary based on this outing’s indicative weather. Check conditions before departure.", clear: "No automatic clothing cue for the available indicative conditions.", unavailable: "Indicative weather is not available yet to generate a summary." };
  const checked = new Set((progress.data ?? []).filter(item => item.checked).map(item => item.itemKey));
  const groups = items.reduce<Record<PersonalChecklistItem["category"], PersonalChecklistItem[]>>((result, item) => { result[item.category].push(item); return result; }, { essential: [], safety: [], comfort: [], food: [] });
  const weatherIcon = (item: PersonalChecklistItem) => item.weatherCue === "wind" ? <Wind size={15} /> : item.weatherCue === "cold" ? <ThermometerSnowflake size={15} /> : item.weatherCue === "heat" || item.weatherCue === "uv" ? <Sun size={15} /> : <CloudRain size={15} />;
  const checklistButton = (item: PersonalChecklistItem, weather = false) => {
    const isChecked = checked.has(item.key);
    return <button key={item.key} type="button" aria-pressed={isChecked} disabled={update.isPending || isPreview} onClick={() => update.mutate({ eventId, itemKey: item.key, checked: !isChecked })} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${isChecked ? "border-[#bcd9bc] bg-[#eaf5e7] text-[#356a4b]" : weather ? "border-[#e8d7aa] bg-white text-[#6e5928] hover:border-[#d3b866]" : "border-[#d8e6d5] bg-white text-[#527062] hover:border-[#a8c9ab]"}`}>
      <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${isChecked ? "border-[#4f9364] bg-[#4f9364] text-white" : weather ? "border-[#d9c078] bg-[#fff8e8] text-[#806626]" : "border-[#adc8b0] text-transparent"}`}>{isChecked ? <Check size={13} /> : weather ? weatherIcon(item) : <Check size={13} />}</span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{item.label}</span>{item.detail && <span className="mt-0.5 block text-[10px] font-semibold leading-relaxed opacity-80">{item.detail}</span>}</span>
      {weather && <span className="shrink-0 rounded-full bg-[#fff4d5] px-1.5 py-0.5 text-[9px] font-extrabold text-[#83651d]">{copy.weatherBadge}</span>}
    </button>;
  };

  return <div className="border-t border-[#dbead6] bg-[#f8fcf6] p-4">
    <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 shrink-0 text-[#4a7c5d]" size={17} /><div><h4 className="text-sm font-extrabold text-[#315b48]">{copy.title}</h4><p className="mt-0.5 text-xs leading-relaxed text-[#6c8878]">{copy.hint}</p></div></div>
    <section aria-label={wearCopy.title} className="mt-3 rounded-2xl border border-[#e8d9a8] bg-[linear-gradient(135deg,#fff9e7_0%,#fffdf4_100%)] p-3">
      <div className="flex items-start gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#fff0c8] text-[#956d18]"><Sun size={16} /></span><div><h5 className="text-sm font-extrabold text-[#6f561d]">{wearCopy.title}</h5><p className="mt-0.5 text-[11px] leading-relaxed font-semibold text-[#806f48]">{wearCopy.hint}</p></div></div>
      {weatherItems.length ? <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">{weatherItems.map(item => <li key={`wear:${item.key}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#f0dfb2] bg-white/80 px-2.5 py-2 text-xs font-extrabold text-[#6e5928]"><span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff5d8] text-[#87671d]">{weatherIcon(item)}</span><span className="min-w-0">{item.label}</span></li>)}</ul> : <p className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-xs font-semibold leading-relaxed text-[#806f48]">{weatherAvailable ? wearCopy.clear : wearCopy.unavailable}</p>}
    </section>
    {weatherItems.length > 0 && <section role="status" aria-live="polite" aria-label={copy.weatherTitle} className="mt-3 rounded-2xl border border-[#f0deb1] bg-[#fff8e8] p-3"><div className="flex items-start gap-2"><CloudSun className="mt-0.5 shrink-0 text-[#9b7722]" size={17} /><div><h5 className="text-xs font-extrabold text-[#765a1e]">{copy.weatherTitle}</h5><p className="mt-0.5 text-[11px] leading-relaxed font-semibold text-[#806f48]">{copy.weatherHint}</p></div></div><div className="mt-2 grid gap-1.5 sm:grid-cols-2">{weatherItems.map(item => checklistButton(item, true))}</div></section>}
    {items.length ? <div className="mt-3 space-y-3">{(Object.keys(groups) as PersonalChecklistItem["category"][]).map(category => groups[category].length ? <div key={category}><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.09em] text-[#6e8c79]">{copy.categories[category]}</p><div className="grid gap-1.5 sm:grid-cols-2">{groups[category].map(item => checklistButton(item))}</div></div> : null)}</div> : !weatherItems.length ? <p className="mt-3 rounded-xl bg-white px-3 py-3 text-xs font-semibold text-[#769084]">{copy.none}</p> : null}
  </div>;
}
