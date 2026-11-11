import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleOff, House, Link2, MapPin, Minus, ParkingCircle, PencilLine, Plus, Repeat2, Route, Undo2, Waves } from "lucide-react";
import { MapView } from "@/components/Map";

export type ManualRoutePoint = { latitude: number; longitude: number };
export type ManualLandmarkDraft = { type: "water" | "shelter" | "parking"; label: string; note: string; status: "reported" | "limited" | "unavailable" | "unknown"; latitude: string; longitude: string; verifiedAt: string };

export function getDisplayedRoutePoints(points: ManualRoutePoint[], roundTrip: boolean) {
  return roundTrip && points.length > 1 ? [...points, ...points.slice(0, -1).reverse()] : points;
}

const numeric = (value: string | null) => {
  if (!value) return undefined;
  const match = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
};

const coordinatePair = (value: string) => {
  const match = value.match(/@?(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 ? { latitude, longitude } : null;
};

export function parseCompatibleRouteLink(value: string) {
  const decoded = decodeURIComponent(value.trim());
  if (!decoded) return { points: [] as ManualRoutePoint[], metrics: {} as { distanceKm?: number; durationMinutes?: number; elevationGain?: number } };
  let url: URL | null = null;
  try { url = new URL(decoded); } catch { /* A raw coordinate pair remains supported. */ }
  const embeddedPairs = decoded.match(/-?\d{1,2}(?:\.\d+)?,-?\d{1,3}(?:\.\d+)?/g) ?? [];
  const candidates = [decoded.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/)?.slice(1).join(","), ...embeddedPairs, ...(url ? [url.searchParams.get("origin"), url.searchParams.get("destination"), url.searchParams.get("saddr"), url.searchParams.get("daddr"), url.searchParams.get("q"), url.searchParams.get("query"), url.searchParams.get("ll"), url.searchParams.get("center")] : [])].filter(Boolean) as string[];
  const points = candidates.map(coordinatePair).filter((point): point is ManualRoutePoint => Boolean(point)).filter((point, index, array) => array.findIndex(other => other.latitude === point.latitude && other.longitude === point.longitude) === index);
  const metrics = {
    distanceKm: numeric(url?.searchParams.get("distanceKm") || url?.searchParams.get("distance" ) || null),
    durationMinutes: numeric(url?.searchParams.get("durationMinutes") || url?.searchParams.get("duration") || null),
    elevationGain: numeric(url?.searchParams.get("elevationGain") || url?.searchParams.get("elevation") || null),
  };
  return { points, metrics };
}

function routeDistanceKm(points: ManualRoutePoint[]) {
  if (points.length < 2 || !window.google?.maps?.geometry) return null;
  const line = points.map(point => new window.google!.maps.LatLng(point.latitude, point.longitude));
  return Math.round((window.google.maps.geometry.spherical.computeLength(line) / 1000) * 10) / 10;
}

export function ManualRoutePlanner({ locale, locationName, latitude, longitude, routePoints, roundTrip, onRoundTripChange, onRoutePointsChange, landmarks, onLandmarksChange, onMetrics }: { locale: "fr" | "en"; locationName: string; latitude?: number; longitude?: number; routePoints: ManualRoutePoint[]; roundTrip: boolean; onRoundTripChange: (roundTrip: boolean) => void; onRoutePointsChange: (points: ManualRoutePoint[]) => void; landmarks: ManualLandmarkDraft[]; onLandmarksChange: (landmarks: ManualLandmarkDraft[]) => void; onMetrics: (metrics: { distanceKm?: number; durationMinutes?: number; elevationGain?: number }) => void }) {
  const fr = locale === "fr";
  const copy = fr ? { title: "Parcours et repères sans GPX", subtitle: "Tracez des points sur la carte ou ajoutez des repères. Tout reste indicatif et ne remplace pas la navigation terrain.", link: "Lien d’itinéraire compatible", import: "Lire le lien", linkHint: "Google Maps / Apple Plans avec coordonnées. Les métriques sont lues seulement si le lien contient distanceKm, durationMinutes ou elevationGain.", draw: "Touchez la carte pour ajouter des points", undo: "Annuler le dernier point", clear: "Effacer le tracé", returnTrip: "Mode aller-retour", returnTripHint: "Le retour reprend automatiquement votre branche sortante. Vous pouvez le désactiver à tout moment.", points: "points", estimated: "Distance dessinée indicative", landmark: "Ajouter un repère", landmarkName: "Nom du repère", note: "Note factuelle facultative", verified: "Dernière vérification facultative", add: "Ajouter", remove: "Retirer", type: { water: "Eau", shelter: "Abri", parking: "Stationnement" }, status: { reported: "Signalé", limited: "Limité", unavailable: "Indisponible", unknown: "À vérifier" }, imported: "Lien lu : vérifiez les valeurs avant publication.", applyMetrics: "Appliquer ces métriques", invalid: "Ce lien ne contient pas de coordonnées ou métriques lisibles.", disclaimer: "Le dessin, les repères et les données importées sont des aides de préparation indicatives. Vérifiez le terrain, les accès, la météo et les informations officielles." } : { title: "Route and landmarks without GPX", subtitle: "Draw points on the map or add landmarks. Everything remains indicative and does not replace on-the-ground navigation.", link: "Compatible route link", import: "Read link", linkHint: "Google Maps / Apple Maps with coordinates. Metrics are read only when the link includes distanceKm, durationMinutes or elevationGain.", draw: "Tap the map to add points", undo: "Undo last point", clear: "Clear route", returnTrip: "Out-and-back mode", returnTripHint: "The return automatically follows your outgoing branch. You can disable it at any time.", points: "points", estimated: "Indicative drawn distance", landmark: "Add a landmark", landmarkName: "Landmark name", note: "Optional factual note", verified: "Optional last verification", add: "Add", remove: "Remove", type: { water: "Water", shelter: "Shelter", parking: "Parking" }, status: { reported: "Reported", limited: "Limited", unavailable: "Unavailable", unknown: "To verify" }, imported: "Link read: verify values before publishing.", applyMetrics: "Apply these metrics", invalid: "This link has no readable coordinates or metrics.", disclaimer: "The drawing, landmarks and imported data are indicative preparation aids. Verify terrain, access, weather and official information." };
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [routeLink, setRouteLink] = useState("");
  const [routeLinkIssue, setRouteLinkIssue] = useState(false);
  const [routeLinkRead, setRouteLinkRead] = useState(false);
  const [pendingMetrics, setPendingMetrics] = useState<{ distanceKm?: number; durationMinutes?: number; elevationGain?: number } | null>(null);
  const [draft, setDraft] = useState<ManualLandmarkDraft>({ type: "water", label: "", note: "", status: "unknown", latitude: "", longitude: "", verifiedAt: "" });
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRefs = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const routePointsRef = useRef(routePoints);
  routePointsRef.current = routePoints;
  const initialCenter = { lat: latitude ?? 45.5017, lng: longitude ?? -73.5673 };
  const displayRoutePoints = useMemo(() => getDisplayedRoutePoints(routePoints, roundTrip), [routePoints, roundTrip]);

  useEffect(() => {
    if (!map || !window.google) return;
    polylineRef.current?.setMap(null);
    markerRefs.current.forEach(marker => marker.map = null);
    markerRefs.current = [];
    if (displayRoutePoints.length) {
      polylineRef.current = new window.google.maps.Polyline({ map, path: displayRoutePoints.map(point => ({ lat: point.latitude, lng: point.longitude })), strokeColor: "#2e684d", strokeOpacity: 0.9, strokeWeight: 4 });
      routePoints.forEach((point, index) => markerRefs.current.push(new window.google.maps.marker.AdvancedMarkerElement({ map, position: { lat: point.latitude, lng: point.longitude }, title: `${fr ? "Point" : "Point"} ${index + 1}` })));
      if (routePoints.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        routePoints.forEach(point => bounds.extend({ lat: point.latitude, lng: point.longitude }));
        map.fitBounds(bounds, 48);
      }
    }
  }, [map, routePoints, displayRoutePoints, fr]);

  const addLandmark = () => {
    if (draft.label.trim().length < 3) return;
    const latitudeNumber = draft.latitude.trim() ? Number(draft.latitude) : undefined;
    const longitudeNumber = draft.longitude.trim() ? Number(draft.longitude) : undefined;
    const coordinatesValid = (latitudeNumber === undefined && longitudeNumber === undefined) || (Number.isFinite(latitudeNumber) && Number.isFinite(longitudeNumber) && latitudeNumber! >= -90 && latitudeNumber! <= 90 && longitudeNumber! >= -180 && longitudeNumber! <= 180);
    if (!coordinatesValid) return;
    onLandmarksChange([...landmarks, { ...draft, label: draft.label.trim(), note: draft.note.trim() }]);
    setDraft({ type: "water", label: "", note: "", status: "unknown", latitude: "", longitude: "", verifiedAt: "" });
  };
  const importLink = () => {
    const parsed = parseCompatibleRouteLink(routeLink);
    if (!parsed.points.length && !Object.values(parsed.metrics).some(value => value !== undefined)) { setRouteLinkIssue(true); setRouteLinkRead(false); return; }
    if (parsed.points.length) onRoutePointsChange(parsed.points);
    setPendingMetrics(Object.values(parsed.metrics).some(value => value !== undefined) ? parsed.metrics : null);
    setRouteLinkIssue(false);
    setRouteLinkRead(true);
  };
  const drawnDistance = routeDistanceKm(displayRoutePoints);

  return <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#cfe2ce] bg-white shadow-[0_8px_22px_rgba(34,76,56,.05)]"><header className="flex items-start gap-3 bg-[#f4faf2] px-4 py-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e1efe0] text-[#3e7657]"><PencilLine size={19} /></span><div><h3 className="text-base font-extrabold tracking-[-.035em] text-[#365c47]">{copy.title}</h3><p className="mt-1 text-xs leading-relaxed font-semibold text-[#728a7b]">{copy.subtitle}</p></div></header><div className="space-y-4 p-4"><div className="rounded-2xl border border-[#dceadb] bg-[#fbfdf9] p-3"><label className="grid gap-1 text-[10px] font-extrabold uppercase tracking-[.07em] text-[#587362]">{copy.link}<input aria-label={copy.link} inputMode="url" value={routeLink} onChange={event => { setRouteLink(event.target.value); setRouteLinkIssue(false); setRouteLinkRead(false); setPendingMetrics(null); }} placeholder="https://maps.google.com/?origin=45.50,-73.57&destination=45.51,-73.58&distanceKm=4.2" className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold normal-case tracking-normal text-[#496d58]" /></label><p className="mt-1 text-[10px] leading-relaxed font-semibold text-[#708878]">{copy.linkHint}</p><button type="button" onClick={importLink} disabled={!routeLink.trim()} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#eaf4e8] px-3 text-xs font-extrabold text-[#3e7456] disabled:opacity-50"><Link2 size={15} />{copy.import}</button>{routeLinkIssue && <p role="alert" className="mt-2 text-xs font-semibold text-[#a35b3d]">{copy.invalid}</p>}{routeLinkRead && <div role="status" className="mt-2 text-xs font-semibold text-[#4d7759]"><p className="flex items-center gap-1"><Check size={14} />{copy.imported}</p>{pendingMetrics && <button type="button" onClick={() => { onMetrics(pendingMetrics); setPendingMetrics(null); }} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-[#3e7456] ring-1 ring-[#cfe0ca]"><Check size={15} />{copy.applyMetrics}</button>}</div>}</div><div className="overflow-hidden rounded-2xl border border-[#d6e5d4]"><MapView initialCenter={initialCenter} initialZoom={12} className="h-64" onMapReady={nextMap => { setMap(nextMap); nextMap.addListener("click", (event: google.maps.MapMouseEvent) => { const point = event.latLng?.toJSON(); if (point) onRoutePointsChange([...routePointsRef.current, { latitude: point.lat, longitude: point.lng }]); }); }} /></div><div className="flex flex-wrap items-center gap-2"><span className="mr-auto flex min-h-11 items-center gap-2 text-xs font-extrabold text-[#557563]"><Route size={16} />{routePoints.length} {copy.points}{drawnDistance !== null ? ` · ${copy.estimated} ${drawnDistance} km` : ""}</span><button type="button" aria-pressed={roundTrip} onClick={() => onRoundTripChange(!roundTrip)} disabled={routePoints.length < 2} className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold disabled:opacity-50 ${roundTrip ? "bg-[#dff0dc] text-[#326948]" : "bg-[#f2f6f0] text-[#537260]"}`}><Repeat2 size={15} />{copy.returnTrip}</button><button type="button" onClick={() => onRoutePointsChange(routePoints.slice(0, -1))} disabled={!routePoints.length} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#f2f6f0] px-3 text-xs font-extrabold text-[#537260] disabled:opacity-50"><Undo2 size={15} />{copy.undo}</button><button type="button" onClick={() => { onRoutePointsChange([]); onRoundTripChange(false); }} disabled={!routePoints.length} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#fff1ea] px-3 text-xs font-extrabold text-[#9a5d47] disabled:opacity-50"><CircleOff size={15} />{copy.clear}</button></div><p className="rounded-xl bg-[#f8fbf7] px-3 py-2 text-[10px] font-semibold text-[#718a7b]">{roundTrip ? copy.returnTripHint : copy.draw}</p><div className="border-t border-[#e4eee2] pt-4"><div className="mb-2 flex items-center gap-2"><MapPin size={16} className="text-[#4d7b59]" /><h4 className="text-sm font-extrabold text-[#426652]">{copy.landmark}</h4></div><div role="radiogroup" aria-label={copy.landmark} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{(["water", "shelter", "parking"] as const).map(type => <button key={type} type="button" role="radio" aria-checked={draft.type === type} onClick={() => setDraft(current => ({ ...current, type }))} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold ${draft.type === type ? "bg-[#e4f1e1] text-[#386d4e]" : "bg-[#f5f8f4] text-[#698172] ring-1 ring-[#dce8da]"}`}>{type === "water" ? <Waves size={14} /> : type === "shelter" ? <House size={14} /> : <ParkingCircle size={14} />}{copy.type[type]}</button>)}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><input aria-label={copy.landmarkName} value={draft.label} onChange={event => setDraft(current => ({ ...current, label: event.target.value }))} placeholder={copy.landmarkName} className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold text-[#496d58] sm:col-span-2" /><textarea aria-label={copy.note} value={draft.note} onChange={event => setDraft(current => ({ ...current, note: event.target.value }))} placeholder={copy.note} rows={2} className="rounded-xl border border-[#d9e7d5] bg-white px-3 py-2 text-xs font-semibold text-[#496d58] sm:col-span-2" /><input aria-label="Latitude" inputMode="decimal" value={draft.latitude} onChange={event => setDraft(current => ({ ...current, latitude: event.target.value }))} placeholder="45.53560" className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold text-[#496d58]" /><input aria-label="Longitude" inputMode="decimal" value={draft.longitude} onChange={event => setDraft(current => ({ ...current, longitude: event.target.value }))} placeholder="-73.15290" className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold text-[#496d58]" /><label className="grid gap-1 text-[10px] font-extrabold uppercase tracking-[.07em] text-[#6a8373] sm:col-span-2">{copy.verified}<input aria-label={copy.verified} type="date" value={draft.verifiedAt} onChange={event => setDraft(current => ({ ...current, verifiedAt: event.target.value }))} className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold normal-case tracking-normal text-[#496d58]" /></label></div><button type="button" onClick={addLandmark} disabled={draft.label.trim().length < 3} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2e684d] px-3 text-xs font-extrabold text-white disabled:opacity-50"><Plus size={15} />{copy.add}</button>{landmarks.length > 0 && <div className="mt-3 grid gap-2">{landmarks.map((landmark, index) => <article key={`${landmark.label}-${index}`} className="flex items-start gap-2 rounded-xl bg-[#f7fbf5] p-3 ring-1 ring-[#e1ebdf]"><span className="mt-0.5 text-[#568069]">{landmark.type === "water" ? <Waves size={15} /> : landmark.type === "shelter" ? <House size={15} /> : <ParkingCircle size={15} />}</span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-[#4c7059]">{landmark.label}</p><p className="mt-0.5 text-[10px] font-semibold text-[#738b7d]">{copy.type[landmark.type]}{landmark.verifiedAt ? ` · ${landmark.verifiedAt}` : ""}</p></div><button type="button" aria-label={`${copy.remove} ${landmark.label}`} onClick={() => onLandmarksChange(landmarks.filter((_, current) => current !== index))} className="grid size-10 place-items-center rounded-lg text-[#a15c45] hover:bg-[#fff1ea]"><Minus size={15} /></button></article>)}</div>}</div></div><p className="flex gap-1.5 border-t border-[#e8f0e6] bg-[#f8fbf7] px-4 py-3 text-[10px] leading-relaxed font-semibold text-[#7b9282]"><MapPin className="mt-0.5 shrink-0" size={14} />{copy.disclaimer}</p></section>;
}
