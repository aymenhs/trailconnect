// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const markerListeners: Array<() => void> = [];

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr", copy: { explore: { search: "Rechercher", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé", list: "Liste", map: "Carte" } } }) }));
vi.mock("@/components/Map", () => ({ MapView: ({ onMapReady }: { onMapReady?: (map: any) => void }) => { useEffect(() => { onMapReady?.({}); }, [onMapReady]); return <div><button aria-label="Déclencher le premier repère" onClick={() => markerListeners[0]?.()}>Premier repère</button><button aria-label="Déclencher le deuxième repère" onClick={() => markerListeners[1]?.()}>Deuxième repère</button></div>; } }));

import EnhancedExplorePage, { type AdvancedFilters } from "./EnhancedExplorePage";

const filters: AdvancedFilters = { date: "", maxDistanceKm: "", maxElevationGain: "", maxDurationMinutes: "", minCapacity: "", carpoolOnly: false, outingType: "all", bookingMode: "all", period: "upcoming" };
const events = [{ id: 44, title: "Sortie publiée depuis la base", locationName: "Montréal · Québec", startsAt: new Date("2026-09-20T12:00:00.000Z"), difficulty: "intermediate" as const, distanceKm: 10, elevationGain: 450, durationMinutes: 300, capacity: 12, carpoolEnabled: true, preview: false }, { id: -2, title: "Sentiers boisés du Mont-Saint-Hilaire", locationName: "Montérégie · Québec", startsAt: new Date("2026-09-07T08:15:00.000Z"), difficulty: "beginner" as const, distanceKm: 7, elevationGain: 260, durationMinutes: 210, capacity: 10, carpoolEnabled: true, preview: true }];

function Harness({ onOpen, onFilters, eventsToRender = events }: { onOpen: (event: any) => void; onFilters?: (value: AdvancedFilters) => void; eventsToRender?: typeof events }) { const [currentFilters, setCurrentFilters] = useState(filters); const [mapMode, setMapMode] = useState(false); const setFilters = (value: AdvancedFilters) => { setCurrentFilters(value); onFilters?.(value); }; return <EnhancedExplorePage events={eventsToRender} query="" setQuery={vi.fn()} activeLevel="all" setActiveLevel={vi.fn()} filters={currentFilters} setFilters={setFilters} mapMode={mapMode} setMapMode={setMapMode} onOpen={onOpen} />; }

beforeEach(() => {
  markerListeners.splice(0, markerListeners.length);
  (globalThis as any).google = { maps: { Marker: class { addListener(_event: string, listener: () => void) { markerListeners.push(listener); } }, SymbolPath: { CIRCLE: "circle" } } };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("EnhancedExplorePage", () => {
  it("sets the requested period and opens an outing from the list", async () => {
    const onOpen = vi.fn(); const onFilters = vi.fn(); const user = userEvent.setup();
    render(<Harness onOpen={onOpen} onFilters={onFilters} />);
    await user.click(screen.getByRole("button", { name: "Passées" }));
    expect(onFilters).toHaveBeenCalledWith(expect.objectContaining({ period: "past" }));
    await user.click(screen.getByText("Sortie publiée depuis la base"));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 44, preview: false }));
  });

  it("opens a published database outing and a demonstration outing from map markers", async () => {
    const onOpen = vi.fn(); const user = userEvent.setup();
    render(<Harness onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "Passées" }));
    await user.click(screen.getByRole("button", { name: /^Carte$/ }));
    await user.click(screen.getByRole("button", { name: "Déclencher le premier repère" }));
    expect(screen.getByText("Sortie publiée depuis la base")).toBeTruthy();
    expect(screen.getByText("Voir les détails")).toBeTruthy();
    await user.click(screen.getByText("Voir les détails"));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 44, preview: false }));
    await user.click(screen.getByRole("button", { name: "Déclencher le deuxième repère" }));
    expect(screen.getByText("Sentiers boisés du Mont-Saint-Hilaire")).toBeTruthy();
    await user.click(screen.getByText("Voir les détails"));
    expect(onOpen).toHaveBeenLastCalledWith(expect.objectContaining({ id: -2, preview: true }));
  });

  it("announces an empty result state and lets hikers reset their filters", async () => {
    const onOpen = vi.fn(); const onFilters = vi.fn(); const user = userEvent.setup();
    render(<Harness onOpen={onOpen} onFilters={onFilters} eventsToRender={[]} />);

    expect(screen.getByRole("status").textContent).toContain("Aucune sortie ne correspond");
    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(onFilters).toHaveBeenCalledWith(expect.objectContaining({ period: "upcoming" }));
  });
});
