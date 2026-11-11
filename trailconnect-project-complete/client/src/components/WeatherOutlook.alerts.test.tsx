// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockData = vi.hoisted(() => ({ current: { available: true, source: "Open-Meteo", temperatureMinC: -3, temperatureMaxC: 6, precipitationProbability: 82, windSpeedKmh: 32, windGustKmh: 58, humidexMax: null as number | null, uvIndexMax: null as number | null, weatherCode: 95, note: "Indicatif" }, setLocal: vi.fn(), publishUpdate: vi.fn() }));

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { weather: { outlook: { useQuery: () => ({ data: mockData.current, isLoading: false }) } }, events: { setLocalWeatherSource: { useMutation: () => ({ mutate: mockData.setLocal, isPending: false }) }, publishWeatherUpdate: { useMutation: () => ({ mutate: mockData.publishUpdate, isPending: false }) } } } } }));

import WeatherOutlook, { getHumidexEstimate, getOfficialRadarLink, getOfficialRegionalWeatherLink, getWeatherAlerts, getWeatherChecklistHints, getWindChillEstimate } from "./WeatherOutlook";

afterEach(() => cleanup());

describe("Weather alerts on outing pages", () => {
  it("identifies indicative high-wind, precipitation, cold and thunderstorm conditions", () => {
    expect(getWeatherAlerts(mockData.current, "fr").map(alert => alert.id)).toEqual(["thunder", "wind", "rain", "cold"]);
    expect(getWeatherChecklistHints(mockData.current, "fr").map(hint => hint.label)).toEqual(["Protection contre les précipitations", "Couche coupe-vent", "Couche chaude, gants et couvre-chef"]);
    expect(getOfficialRegionalWeatherLink("Laurentides · Québec", "fr")).toBe("https://meteo.gc.ca/forecast/canada/index_f.html?id=QC");
    expect(getOfficialRegionalWeatherLink("Toronto · Ontario", "en")).toBe("https://weather.gc.ca/forecast/canada/index_e.html?id=ON");
    expect(getOfficialRadarLink("fr")).toBe("https://meteo.gc.ca/index_f.html?layers=,radar");
  });

  it("estimates Canadian wind chill only within the cold-weather range", () => {
    expect(getWindChillEstimate({ temperatureMinC: -10, windSpeedKmh: 20 })).toEqual({ temperatureC: -18, deltaC: 8 });
    expect(getWindChillEstimate({ temperatureMinC: 2, windSpeedKmh: 35 })).toBeNull();
    expect(getWindChillEstimate({ temperatureMinC: -10, windSpeedKmh: 4 })).toBeNull();
  });

  it("calculates humidex only when forecast heat can make the estimate meaningful", () => {
    expect(getHumidexEstimate({ temperatureC: 30, dewPointC: 20 })).toBe(38);
    expect(getHumidexEstimate({ temperatureC: 24, dewPointC: 20 })).toBeNull();
    expect(getHumidexEstimate({ temperatureC: 30, dewPointC: undefined })).toBeNull();
  });

  it("refines the clothing cue when wind chill reaches a colder indicative range", () => {
    const data = { temperatureMinC: -10, windSpeedKmh: 20 };
    expect(getWeatherChecklistHints(data, "fr").map(hint => hint.label)).toContain("Couche chaude, gants et couvre-chef");
    expect(getWeatherChecklistHints(data, "en").map(hint => hint.label)).toContain("Warm layer, gloves and head covering");
  });

  it("adds bilingual breathable-clothing cues for indicative humidex ranges", () => {
    expect(getWeatherChecklistHints({ humidexMax: 34 }, "fr").map(hint => hint.label)).toContain("Vêtements légers et respirants");
    expect(getWeatherChecklistHints({ humidexMax: 41 }, "en").map(hint => hint.label)).toContain("Light, breathable clothing");
    expect(getWeatherChecklistHints({ humidexMax: 29 }, "fr").map(hint => hint.id)).not.toContain("heat");
  });

  it("adds bilingual sunscreen and sunglasses cues at the official UV protection range", () => {
    expect(getWeatherChecklistHints({ uvIndexMax: 3 }, "fr").map(hint => hint.label)).toContain("Crème solaire et lunettes de soleil");
    expect(getWeatherChecklistHints({ uvIndexMax: 8 }, "en").map(hint => hint.label)).toContain("Sunscreen, sunglasses and stronger sun protection");
    expect(getWeatherChecklistHints({ uvIndexMax: 2 }, "fr").map(hint => hint.id)).not.toContain("uv");
  });

  it("shows participant-facing conditions to monitor with the non-official warning limit", () => {
    render(<WeatherOutlook eventId={42} locationName="Montréal, Québec" />);
    expect(screen.getByRole("status").textContent).toContain("Conditions à surveiller");
    expect(screen.getByText("Orage possible.")).toBeTruthy();
    expect(screen.getByText("Rafales élevées prévues.")).toBeTruthy();
    expect(screen.getByText(/ne constituent ni une alerte officielle/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Prévisions officielles régionales détaillées" }).getAttribute("href")).toBe("https://meteo.gc.ca/forecast/canada/index_f.html?id=QC");
    expect(screen.getByRole("link", { name: "Carte radar officielle" }).getAttribute("href")).toBe("https://meteo.gc.ca/index_f.html?layers=,radar");
  });

  it("shows the wind-chill estimate and its field-condition limitation when forecast wind speed is available", () => {
    const initial = mockData.current;
    mockData.current = { ...initial, temperatureMinC: -10, windSpeedKmh: 20 };
    render(<WeatherOutlook eventId={42} locationName="Montréal, Québec" />);
    expect(screen.getByText("Ressenti au vent")).toBeTruthy();
    expect(screen.getByText("-18 °C")).toBeTruthy();
    expect(screen.getByText(/Elle ne remplace pas une mesure sur le terrain/i)).toBeTruthy();
    mockData.current = initial;
  });

  it("shows the forecast humidex and its explanatory limit when hot-weather data is available", () => {
    const initial = mockData.current;
    mockData.current = { ...initial, temperatureMinC: 21, temperatureMaxC: 30, windSpeedKmh: 12, humidexMax: 38 };
    render(<WeatherOutlook eventId={42} locationName="Montréal, Québec" />);
    expect(screen.getByText("Humidex prévu")).toBeTruthy();
    expect(screen.getByText("38")).toBeTruthy();
    expect(screen.getByText(/L’ensoleillement, l’ombre, l’effort/i)).toBeTruthy();
    mockData.current = initial;
  });

  it("shows the maximum UV index and its forecast limitation when the data is available", () => {
    const initial = mockData.current;
    mockData.current = { ...initial, uvIndexMax: 6 };
    render(<WeatherOutlook eventId={42} locationName="Montréal, Québec" />);
    expect(screen.getByText("Indice UV maximal")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText(/Maximum indicatif prévu pour la journée/i)).toBeTruthy();
    mockData.current = initial;
  });

  it("lets an organizer pin a labeled HTTPS local weather source", async () => {
    const user = userEvent.setup();
    render(<WeatherOutlook eventId={42} locationName="Montréal, Québec" isOrganizer />);
    await user.click(screen.getByRole("button", { name: "Épingler une source locale" }));
    await user.type(screen.getByLabelText("Nom de la source"), "Parc national — bulletin local");
    await user.type(screen.getByLabelText("Lien HTTPS de la source"), "https://example.org/meteo");
    await user.click(screen.getByRole("button", { name: "Enregistrer la source" }));
    expect(mockData.setLocal).toHaveBeenCalledWith({ eventId: 42, label: "Parc national — bulletin local", url: "https://example.org/meteo" });
  });

  it("shows a dated important weather update and lets the organizer publish one", async () => {
    const user = userEvent.setup();
    render(<WeatherOutlook eventId={42} locationName="Montréal, Québec" isOrganizer weatherUpdateNote="Des rafales plus fortes sont désormais signalées près du départ." weatherUpdatedAt="2026-08-15T10:30:00.000Z" />);
    expect(screen.getByText("Mise à jour importante")).toBeTruthy();
    expect(screen.getByText(/rafales plus fortes/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Modifier" }));
    const textarea = screen.getByLabelText("Information météo importante");
    await user.clear(textarea);
    await user.type(textarea, "Des précipitations et du vent sont maintenant signalés au départ.");
    await user.click(screen.getByRole("button", { name: "Publier pour les participants" }));
    expect(mockData.publishUpdate).toHaveBeenCalledWith({ eventId: 42, note: "Des précipitations et du vent sont maintenant signalés au départ." });
  });
});
