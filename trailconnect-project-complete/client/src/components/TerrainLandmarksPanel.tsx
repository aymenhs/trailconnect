import { CheckCircle2, Droplets, ExternalLink, House, Info, Link2, MapPin, ParkingCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";

type LandmarkType = "water" | "shelter" | "parking";
type LandmarkStatus = "reported" | "limited" | "unavailable" | "unknown";

export function parseCoordinatesFromMapLink(value: string) {
  const decoded = decodeURIComponent(value.trim());
  if (!decoded) return null;
  const patterns = [/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/, /[?&](?:q|query|ll|destination|coordinate)=(-?\d{1,2}(?:\.\d+)?)[,%20\s]+(-?\d{1,3}(?:\.\d+)?)/i, /(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/];
  const match = patterns.map(pattern => decoded.match(pattern)).find(Boolean);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 ? { latitude, longitude } : null;
}

export function TerrainLandmarksPanel({ eventId, canManage }: { eventId: number; canManage: boolean }) {
  const { locale } = useLocale();
  const landmarks = trpc.hiking.events.terrainLandmarks.useQuery({ eventId });
  const utils = trpc.useUtils();
  const [type, setType] = useState<LandmarkType>("water");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<LandmarkStatus>("unknown");
  const [verifiedAt, setVerifiedAt] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importError, setImportError] = useState(false);
  const clearForm = () => { setType("water"); setLabel(""); setNote(""); setStatus("unknown"); setVerifiedAt(""); setLatitude(""); setLongitude(""); setMapLink(""); setEditingId(null); setImportError(false); };
  const create = trpc.hiking.events.createTerrainLandmark.useMutation({ onSuccess: () => { clearForm(); utils.hiking.events.terrainLandmarks.invalidate({ eventId }); } });
  const update = trpc.hiking.events.updateTerrainLandmark.useMutation({ onSuccess: () => { clearForm(); utils.hiking.events.terrainLandmarks.invalidate({ eventId }); } });
  const remove = trpc.hiking.events.deleteTerrainLandmark.useMutation({ onSuccess: () => utils.hiking.events.terrainLandmarks.invalidate({ eventId }) });
  const copy = locale === "fr"
    ? { title: "Repères terrain", subtitle: "Eau, abris et stationnement signalés dans le dossier de sortie.", add: "Ajouter un repère", edit: "Modifier le repère", save: "Enregistrer les modifications", cancel: "Annuler", label: "Nom ou emplacement", note: "Détail factuel facultatif", status: "État signalé", verifiedAt: "Dernière vérification", verifiedDisplay: "Dernière vérification indiquée", latitude: "Latitude GPS facultative", longitude: "Longitude GPS facultative", coordinates: "Coordonnées indicatives", coordinatesError: "Saisissez les deux coordonnées valides, ou laissez les deux champs vides.", mapLink: "Lien Google Maps ou Apple Plans", import: "Importer les coordonnées", importHint: "Collez un lien qui contient la latitude et la longitude. Les liens raccourcis sans coordonnées ne peuvent pas être lus ici.", importError: "Ce lien ne contient pas de coordonnées GPS valides et lisibles.", imported: "Coordonnées importées", openMap: "Ouvrir la position", empty: "Aucun repère terrain n’est encore renseigné.", type: { water: "Point d’eau", shelter: "Abri", parking: "Stationnement" }, state: { reported: "Signalé", limited: "Limité", unavailable: "Indisponible", unknown: "À vérifier" }, disclaimer: "Ces informations et coordonnées sont indicatives et peuvent changer. Elles ne confirment ni l’accès, ni la disponibilité, ni la sécurité sur le terrain.", remove: "Retirer" }
    : { title: "Terrain landmarks", subtitle: "Water, shelters and parking recorded in the outing dossier.", add: "Add landmark", edit: "Edit landmark", save: "Save changes", cancel: "Cancel", label: "Name or location", note: "Optional factual detail", status: "Reported state", verifiedAt: "Last verification", verifiedDisplay: "Last verification recorded", latitude: "Optional GPS latitude", longitude: "Optional GPS longitude", coordinates: "Indicative coordinates", coordinatesError: "Provide two valid coordinates, or leave both fields empty.", mapLink: "Google Maps or Apple Maps link", import: "Import coordinates", importHint: "Paste a link containing latitude and longitude. Short links without coordinates cannot be read here.", importError: "This link does not contain valid readable GPS coordinates.", imported: "Coordinates imported", openMap: "Open location", empty: "No terrain landmark has been recorded yet.", type: { water: "Water point", shelter: "Shelter", parking: "Parking" }, state: { reported: "Reported", limited: "Limited", unavailable: "Unavailable", unknown: "To verify" }, disclaimer: "This information and these coordinates are indicative and can change. They do not confirm access, availability or safety in the field.", remove: "Remove" };
  const icon = (kind: LandmarkType) => kind === "water" ? <Droplets size={16} /> : kind === "shelter" ? <House size={16} /> : <ParkingCircle size={16} />;
  const tone = (kind: LandmarkType) => kind === "water" ? "bg-[#e7f3fb] text-[#397198]" : kind === "shelter" ? "bg-[#f5efe5] text-[#866640]" : "bg-[#edf4e8] text-[#487355]";
  const latitudeNumber = latitude.trim() ? Number(latitude) : undefined;
  const longitudeNumber = longitude.trim() ? Number(longitude) : undefined;
  const hasOneCoordinate = Boolean(latitude.trim()) !== Boolean(longitude.trim());
  const coordinatesOutOfRange = (latitudeNumber !== undefined && (!Number.isFinite(latitudeNumber) || latitudeNumber < -90 || latitudeNumber > 90)) || (longitudeNumber !== undefined && (!Number.isFinite(longitudeNumber) || longitudeNumber < -180 || longitudeNumber > 180));
  const coordinatesInvalid = hasOneCoordinate || coordinatesOutOfRange;
  const isSaving = create.isPending || update.isPending;
  const importCoordinates = () => {
    const coordinates = parseCoordinatesFromMapLink(mapLink);
    if (!coordinates) { setImportError(true); return; }
    setLatitude(String(coordinates.latitude));
    setLongitude(String(coordinates.longitude));
    setImportError(false);
  };
  const startEditing = (landmark: NonNullable<typeof landmarks.data>[number]) => {
    setEditingId(landmark.id);
    setType(landmark.type);
    setLabel(landmark.label);
    setNote(landmark.note || "");
    setStatus(landmark.status);
    setVerifiedAt(landmark.verifiedAt ? new Date(landmark.verifiedAt).toISOString().slice(0, 10) : "");
    setLatitude(landmark.latitude === null || landmark.latitude === undefined ? "" : String(landmark.latitude));
    setLongitude(landmark.longitude === null || landmark.longitude === undefined ? "" : String(landmark.longitude));
    setMapLink("");
    setImportError(false);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (label.trim().length < 3 || coordinatesInvalid) return;
    const payload = { eventId, type, label: label.trim(), note: note.trim() || undefined, status, latitude: latitudeNumber, longitude: longitudeNumber, verifiedAt: verifiedAt ? new Date(`${verifiedAt}T12:00:00`) : undefined };
    if (editingId) update.mutate({ ...payload, landmarkId: editingId }); else create.mutate(payload);
  };

  return <section id="tc-terrain-landmarks" className="mt-5 overflow-hidden rounded-[1.55rem] border border-[#d8e6d6] bg-white shadow-[0_8px_22px_rgba(34,76,56,.05)]">
    <div className="flex items-start gap-3 bg-[#f5faf3] px-4 py-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e1efe0] text-[#47775a]"><MapPin size={19} /></span><div className="min-w-0"><h3 className="text-base font-extrabold tracking-[-.035em] text-[#365c47]">{copy.title}</h3><p className="mt-1 text-xs leading-relaxed font-semibold text-[#728a7b]">{copy.subtitle}</p></div></div>
    <div className="divide-y divide-[#e8f0e6]">
      {landmarks.data?.length ? landmarks.data.map(landmark => {
        const hasCoordinates = landmark.latitude !== null && landmark.latitude !== undefined && landmark.longitude !== null && landmark.longitude !== undefined;
        const coordinatePair = hasCoordinates ? { latitude: landmark.latitude as number, longitude: landmark.longitude as number } : null;
        const mapUrl = coordinatePair ? `https://www.google.com/maps/search/?api=1&query=${coordinatePair.latitude},${coordinatePair.longitude}` : null;
        return <article key={landmark.id} className="flex gap-3 px-4 py-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone(landmark.type)}`}>{icon(landmark.type)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-extrabold text-[#426652]">{landmark.label}</p><span className="rounded-full bg-[#f2f6f0] px-2 py-0.5 text-[9px] font-extrabold text-[#607b69]">{copy.type[landmark.type]}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${landmark.status === "unavailable" ? "bg-[#fff0e9] text-[#a35b3d]" : landmark.status === "limited" ? "bg-[#fff5df] text-[#967027]" : "bg-[#edf5ea] text-[#4c7659]"}`}>{copy.state[landmark.status]}</span></div>{landmark.note && <p className="mt-1 text-xs leading-relaxed font-semibold text-[#71897b]">{landmark.note}</p>}{landmark.verifiedAt && <p className="mt-1 text-[10px] font-semibold text-[#6d8877]">{copy.verifiedDisplay} : {new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(new Date(landmark.verifiedAt))}</p>}{coordinatePair && <><p className="mt-1 text-[10px] font-semibold text-[#71897b]">{copy.coordinates} : {coordinatePair.latitude.toFixed(5)}, {coordinatePair.longitude.toFixed(5)}</p><a href={mapUrl!} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#edf5ea] px-3 text-xs font-extrabold text-[#3e7456]"><MapPin size={14} />{copy.openMap}<ExternalLink size={13} /></a></>}</div>{canManage && <div className="flex shrink-0 flex-col gap-1"><button type="button" aria-label={`${copy.edit} ${landmark.label}`} onClick={() => startEditing(landmark)} className="grid size-11 place-items-center rounded-xl text-[#497a5a] hover:bg-[#eef6eb]"><Pencil size={16} /></button><button type="button" aria-label={`${copy.remove} ${landmark.label}`} onClick={() => remove.mutate({ eventId, landmarkId: landmark.id })} className="grid size-11 place-items-center rounded-xl text-[#a15c45] hover:bg-[#fff1ea]"><Trash2 size={16} /></button></div>}</article>;
      }) : <p role="status" className="px-4 py-4 text-xs font-semibold text-[#7d9385]">{copy.empty}</p>}
    </div>
    {canManage && <form onSubmit={submit} className="border-t border-[#e4eee2] bg-[#fbfdf9] p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold text-[#4c7059]">{editingId ? copy.edit : copy.add}</p>{editingId && <button type="button" onClick={clearForm} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-[#6d8375]"><X size={15} />{copy.cancel}</button>}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><select aria-label={copy.type.water} value={type} onChange={event => setType(event.target.value as LandmarkType)} className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-extrabold text-[#496d58]"><option value="water">{copy.type.water}</option><option value="shelter">{copy.type.shelter}</option><option value="parking">{copy.type.parking}</option></select><select aria-label={copy.status} value={status} onChange={event => setStatus(event.target.value as LandmarkStatus)} className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-extrabold text-[#496d58]"><option value="reported">{copy.state.reported}</option><option value="limited">{copy.state.limited}</option><option value="unavailable">{copy.state.unavailable}</option><option value="unknown">{copy.state.unknown}</option></select><input aria-label={copy.label} value={label} onChange={event => setLabel(event.target.value)} placeholder={copy.label} className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold text-[#496d58] sm:col-span-2" /><textarea aria-label={copy.note} value={note} onChange={event => setNote(event.target.value)} placeholder={copy.note} rows={2} className="rounded-xl border border-[#d9e7d5] bg-white px-3 py-2 text-xs font-semibold text-[#496d58] sm:col-span-2" /><label className="grid gap-1 text-[10px] font-extrabold uppercase tracking-[.07em] text-[#6a8373] sm:col-span-2">{copy.verifiedAt}<input aria-label={copy.verifiedAt} type="date" value={verifiedAt} onChange={event => setVerifiedAt(event.target.value)} className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold normal-case tracking-normal text-[#496d58]" /></label><label className="grid gap-1 text-[10px] font-extrabold uppercase tracking-[.07em] text-[#6a8373]">{copy.latitude}<input aria-label={copy.latitude} inputMode="decimal" value={latitude} onChange={event => setLatitude(event.target.value)} placeholder="45.53560" className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold normal-case tracking-normal text-[#496d58]" /></label><label className="grid gap-1 text-[10px] font-extrabold uppercase tracking-[.07em] text-[#6a8373]">{copy.longitude}<input aria-label={copy.longitude} inputMode="decimal" value={longitude} onChange={event => setLongitude(event.target.value)} placeholder="-73.15290" className="min-h-11 rounded-xl border border-[#d9e7d5] bg-white px-3 text-xs font-semibold normal-case tracking-normal text-[#496d58]" /></label></div><div className="mt-3 rounded-xl border border-[#dceadb] bg-white p-3"><label className="grid gap-1 text-[10px] font-extrabold uppercase tracking-[.07em] text-[#587362]">{copy.mapLink}<input aria-label={copy.mapLink} inputMode="url" value={mapLink} onChange={event => { setMapLink(event.target.value); setImportError(false); }} placeholder="https://maps.google.com/?q=45.5356,-73.1529" className="min-h-11 rounded-lg border border-[#d9e7d5] bg-white px-3 text-xs font-semibold normal-case tracking-normal text-[#496d58]" /></label><p className="mt-1 text-[10px] leading-relaxed font-semibold text-[#708878]">{copy.importHint}</p><button type="button" onClick={importCoordinates} disabled={!mapLink.trim()} className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#eef5eb] px-3 text-xs font-extrabold text-[#3e7456] disabled:opacity-50"><Link2 size={15} />{copy.import}</button>{importError && <p role="alert" className="mt-2 text-xs font-semibold text-[#a35b3d]">{copy.importError}</p>}{!importError && latitude && longitude && mapLink && <p role="status" className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#4d7759]"><CheckCircle2 size={14} />{copy.imported}</p>}</div>{coordinatesInvalid && <p role="alert" className="mt-2 text-xs font-semibold text-[#a35b3d]">{copy.coordinatesError}</p>}<button type="submit" disabled={isSaving || label.trim().length < 3 || coordinatesInvalid} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2e684d] px-3 text-xs font-extrabold text-white disabled:opacity-50">{editingId ? <Save size={15} /> : <Plus size={15} />}{editingId ? copy.save : copy.add}</button></form>}
    <p className="flex gap-1.5 border-t border-[#e8f0e6] bg-[#f8fbf7] px-4 py-3 text-[10px] leading-relaxed font-semibold text-[#7b9282]"><Info className="mt-0.5 shrink-0" size={14} />{copy.disclaimer}</p>
  </section>;
}
