import { MapView } from "@/components/Map";
import { ExternalLink, MapPin } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export default function MeetingPointMapPreview({ locale, meetingPoint, locationName }: { locale: "fr" | "en"; meetingPoint: string; locationName: string }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [status, setStatus] = useState<"idle" | "located" | "unavailable">("idle");
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const query = [meetingPoint.trim(), locationName.trim()].filter(Boolean).join(", ");
  const copy = locale === "fr" ? { title: "Aperçu du rendez-vous", empty: "Saisissez un point de rendez-vous ou une zone de départ pour obtenir un aperçu cartographique indicatif.", hint: "Repère indicatif : vérifiez l’accès réel, le stationnement et le point exact avant le départ.", open: "Ouvrir dans Plans", unavailable: "La localisation n’a pas pu être précisée. Vous pouvez tout de même ouvrir la recherche cartographique." } : { title: "Meeting point preview", empty: "Enter a meeting point or starting area to see an indicative map preview.", hint: "Indicative cue: verify actual access, parking, and the exact point before departure.", open: "Open in Maps", unavailable: "The location could not be pinpointed. You can still open the map search." };
  useEffect(() => {
    if (!map || query.length < 3 || !window.google?.maps) return;
    let active = true;
    setStatus("idle");
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, resultStatus) => {
      if (!active) return;
      const result = results?.[0];
      if (resultStatus !== "OK" || !result) { setStatus("unavailable"); return; }
      const position = result.geometry.location;
      map.setCenter(position);
      map.setZoom(15);
      if (marker.current) marker.current.map = null;
      marker.current = new window.google.maps.marker.AdvancedMarkerElement({ map, position, title: query });
      setStatus("located");
    });
    return () => { active = false; };
  }, [map, query]);
  if (query.length < 3) return <div className="mt-4 rounded-2xl border border-dashed border-[#cbdcc7] bg-[#f8fbf6] px-4 py-3 text-xs leading-relaxed font-semibold text-[#6e8879]"><MapPin className="mr-1.5 inline text-[#4f8060]" size={15} />{copy.empty}</div>;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return <div className="mt-4 overflow-hidden rounded-2xl border border-[#cfe0ca] bg-[#f8fcf6]"><div className="flex items-start gap-2 px-4 py-3"><MapPin className="mt-0.5 shrink-0 text-[#4b805d]" size={17} /><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-[#315b48]">{copy.title}</h3><p className="mt-0.5 text-xs leading-relaxed text-[#6e8879]">{copy.hint}</p></div><a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-white px-2.5 text-xs font-extrabold text-[#3f7053] ring-1 ring-[#cfe0ca]"><ExternalLink size={14} />{copy.open}</a></div><MapView initialCenter={{ lat: 45.5017, lng: -73.5673 }} initialZoom={11} onMapReady={setMap} className="h-48 w-full" />{status === "unavailable" && <p className="border-t border-[#e1ebde] px-4 py-2.5 text-xs font-semibold text-[#8b6d42]">{copy.unavailable}</p>}</div>;
}
