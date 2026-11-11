import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { Clock3, MapPinned, Radio, RefreshCw, ShieldCheck, Square } from "lucide-react";
import { toast } from "sonner";

type DurationMinutes = 15 | 30 | 60;

export function formatLocationExpiry(expiresAt: Date | string | null | undefined, locale: "fr" | "en") {
  if (!expiresAt) return "";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(expiresAt));
}

export default function LocationSharingControls({ eventId }: { eventId: number }) {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(30);
  const [expiresAt, setExpiresAt] = useState<Date | string | null>(null);
  const [now, setNow] = useState(Date.now());
  const watcher = useRef<number | null>(null);
  const consent = trpc.hiking.safety.consent.useQuery(undefined, { enabled: isAuthenticated });
  const ownShare = trpc.hiking.safety.myLocationShare.useQuery({ eventId }, { enabled: isAuthenticated });
  const saveConsent = trpc.hiking.safety.saveConsent.useMutation({ onSuccess: () => consent.refetch() });
  const share = trpc.hiking.safety.shareLocation.useMutation({ onSuccess: result => { setExpiresAt(result.expiresAt); ownShare.refetch(); if (result.started) toast.success(locale === "fr" ? "Position partagée pour la durée choisie." : "Location shared for the selected duration."); }, onError: () => toast.error(locale === "fr" ? "Le partage est réservé aux participants confirmés ayant donné leur accord." : "Sharing is for confirmed participants who have consented.") });
  const stop = trpc.hiking.safety.stopLocation.useMutation({ onSuccess: () => { if (watcher.current !== null) navigator.geolocation?.clearWatch(watcher.current); watcher.current = null; setExpiresAt(null); ownShare.refetch(); toast.success(locale === "fr" ? "Partage de position arrêté immédiatement." : "Location sharing stopped immediately."); } });
  const activeExpiry = expiresAt ?? (ownShare.data?.isActive ? ownShare.data.expiresAt : null);
  const isActive = Boolean(activeExpiry && new Date(activeExpiry).getTime() > now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (activeExpiry && new Date(activeExpiry).getTime() <= now && watcher.current !== null) { navigator.geolocation?.clearWatch(watcher.current); watcher.current = null; } }, [activeExpiry, now]);
  useEffect(() => () => { if (watcher.current !== null) navigator.geolocation?.clearWatch(watcher.current); }, []);
  const requestPosition = (continuous: boolean) => {
    if (!navigator.geolocation) return toast.error(locale === "fr" ? "La géolocalisation n’est pas disponible dans ce navigateur." : "Geolocation is unavailable in this browser.");
    const send = (position: GeolocationPosition) => share.mutate({ eventId, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, durationMinutes });
    const denied = () => toast.error(locale === "fr" ? "Autorisez la localisation pour partager votre position." : "Allow location access to share your position.");
    if (!continuous) return navigator.geolocation.getCurrentPosition(send, denied, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
    if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current);
    watcher.current = navigator.geolocation.watchPosition(send, denied, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  };
  if (!isAuthenticated) return null;
  const copy = locale === "fr" ? { title: "Partage de position volontaire", enable: "Autoriser ce partage", start: "Démarrer le partage", update: "Mettre à jour ma position", stop: "Arrêter maintenant", duration: "Durée maximale", active: "Partage actif jusqu’à", note: "Pour les participants confirmés : vous choisissez une fenêtre de 15, 30 ou 60 minutes. Seul l’organisateur voit la position transmise. Le partage ne démarre jamais seul et il ne remplace ni un dispositif de secours ni un appel au 911.", consent: "J’accepte d’activer l’option de partage volontaire de position. Je pourrai l’arrêter à tout moment." } : { title: "Voluntary location sharing", enable: "Allow this sharing", start: "Start sharing", update: "Update my location", stop: "Stop now", duration: "Maximum duration", active: "Sharing active until", note: "For confirmed participants: choose a 15, 30, or 60 minute window. Only the organizer sees a shared location. Sharing never starts on its own and is not a rescue service or substitute for calling 911.", consent: "I agree to enable voluntary location sharing. I can stop it at any time." };
  return <section className="mt-4 rounded-[1.35rem] border border-[#dce9d8] bg-white p-4"><div className="flex items-center gap-2 text-[#365d4a]"><MapPinned size={17} /><h3 className="text-sm font-extrabold">{copy.title}</h3></div><p className="mt-2 text-[11px] leading-relaxed text-[#748b7e]">{copy.note}</p>{!consent.data?.locationSharingEnabled ? <div className="mt-3 rounded-xl bg-[#f5f8f3] p-3"><p className="flex gap-2 text-[11px] font-semibold leading-relaxed text-[#627c6e]"><ShieldCheck className="mt-0.5 shrink-0 text-[#5b8568]" size={15} />{copy.consent}</p><button onClick={() => saveConsent.mutate({ locationSharingEnabled: true, emergencyContactEnabled: Boolean(consent.data?.emergencyContactEnabled) })} className="mt-3 min-h-11 rounded-xl bg-[#eef5e9] px-3 text-xs font-extrabold text-[#47775d]"><Radio className="mr-1 inline size-3.5" />{copy.enable}</button></div> : <div className="mt-3 rounded-xl bg-[#f5f8f3] p-3">{isActive ? <><p role="status" className="flex items-center gap-1.5 text-xs font-extrabold text-[#3f7054]"><Clock3 size={15} />{copy.active} {formatLocationExpiry(activeExpiry, locale)}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => requestPosition(false)} disabled={share.isPending} className="min-h-11 rounded-xl bg-white px-3 text-xs font-extrabold text-[#416d53] ring-1 ring-[#cce0c9] disabled:opacity-60"><RefreshCw className="mr-1 inline size-3.5" />{copy.update}</button><button onClick={() => stop.mutate({ eventId })} disabled={stop.isPending} className="min-h-11 rounded-xl bg-[#fff1ee] px-3 text-xs font-extrabold text-[#98594e] disabled:opacity-60"><Square className="mr-1 inline size-3.5" />{copy.stop}</button></div></> : <><label className="block text-[11px] font-extrabold text-[#5d7868]">{copy.duration}<select aria-label={copy.duration} value={durationMinutes} onChange={event => setDurationMinutes(Number(event.target.value) as DurationMinutes)} className="mt-1 min-h-11 w-full rounded-xl border border-[#d4e4d0] bg-white px-3 text-xs font-bold text-[#365b49]"><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>60 min</option></select></label><button onClick={() => requestPosition(true)} disabled={share.isPending} className="mt-3 min-h-11 rounded-xl bg-[#244d3d] px-3 text-xs font-extrabold text-white disabled:opacity-60"><Radio className="mr-1 inline size-3.5" />{copy.start}</button></>}</div>}</section>;
}
