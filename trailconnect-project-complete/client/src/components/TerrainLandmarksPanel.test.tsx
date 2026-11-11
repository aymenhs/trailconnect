// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const createLandmark = vi.fn();
const updateLandmark = vi.fn();
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { events: { terrainLandmarks: { useQuery: () => ({ data: [{ id: 8, type: "parking", label: "Stationnement du lac", note: "Accès signalé depuis le chemin principal.", status: "reported", latitude: 45.5356, longitude: -73.1529 }] }) }, createTerrainLandmark: { useMutation: () => ({ mutate: createLandmark, isPending: false }) }, updateTerrainLandmark: { useMutation: () => ({ mutate: updateLandmark, isPending: false }) }, deleteTerrainLandmark: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } }, useUtils: () => ({ hiking: { events: { terrainLandmarks: { invalidate: vi.fn() } } } }) } }));
import { parseCoordinatesFromMapLink, TerrainLandmarksPanel } from "./TerrainLandmarksPanel";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("TerrainLandmarksPanel", () => {
  it("displays factual terrain landmarks and lets the organizer add a water point", async () => {
    const user = userEvent.setup();
    render(<TerrainLandmarksPanel eventId={18} canManage />);
    expect(screen.getByText("Stationnement du lac")).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: "Point d’eau" }), "water");
    await user.type(screen.getByRole("textbox", { name: "Nom ou emplacement" }), "Source du refuge");
    await user.type(screen.getByLabelText("Dernière vérification"), "2026-09-05");
    await user.type(screen.getByLabelText("Latitude GPS facultative"), "45.53560");
    await user.type(screen.getByLabelText("Longitude GPS facultative"), "-73.15290");
    await user.click(screen.getByRole("button", { name: "Ajouter un repère" }));
    expect(createLandmark).toHaveBeenCalledWith(expect.objectContaining({ eventId: 18, type: "water", label: "Source du refuge", latitude: 45.5356, longitude: -73.1529, verifiedAt: expect.any(Date) }));
    expect(screen.getByText("Coordonnées indicatives : 45.53560, -73.15290")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ouvrir la position" }).getAttribute("href")).toContain("45.5356,-73.1529");
  });

  it("imports readable Google Maps and Apple Maps coordinates, then edits an existing landmark", async () => {
    const user = userEvent.setup();
    expect(parseCoordinatesFromMapLink("https://www.google.com/maps/@45.5356,-73.1529,15z")).toEqual({ latitude: 45.5356, longitude: -73.1529 });
    expect(parseCoordinatesFromMapLink("https://maps.apple.com/?q=45.5000,-73.5800")).toEqual({ latitude: 45.5, longitude: -73.58 });
    render(<TerrainLandmarksPanel eventId={18} canManage />);
    await user.type(screen.getByLabelText("Lien Google Maps ou Apple Plans"), "https://maps.google.com/?q=45.5000,-73.5800");
    await user.click(screen.getByRole("button", { name: "Importer les coordonnées" }));
    expect((screen.getByLabelText("Latitude GPS facultative") as HTMLInputElement).value).toBe("45.5");
    expect((screen.getByLabelText("Longitude GPS facultative") as HTMLInputElement).value).toBe("-73.58");
    await user.click(screen.getByRole("button", { name: "Modifier le repère Stationnement du lac" }));
    await user.clear(screen.getByLabelText("Nom ou emplacement"));
    await user.type(screen.getByLabelText("Nom ou emplacement"), "Stationnement du lac principal");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));
    expect(updateLandmark).toHaveBeenCalledWith(expect.objectContaining({ eventId: 18, landmarkId: 8, label: "Stationnement du lac principal" }));
  });
});
