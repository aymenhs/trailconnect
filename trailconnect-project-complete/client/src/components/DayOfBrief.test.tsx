// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));

import { DayOfBrief } from "./DayOfBrief";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("DayOfBrief", () => {
  it("shows confirmed operational details and exposes offline and PDF actions", async () => {
    const user = userEvent.setup();
    const onSaveOffline = vi.fn();
    const onAcknowledgeBrief = vi.fn();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<DayOfBrief event={{ title: "Boucle du Mont Saint-Hilaire", locationName: "Montérégie · Québec", startsAt: "2026-09-06T08:00:00.000Z", distanceKm: 8, elevationGain: 320, durationMinutes: 240 }} checklist={["Eau", "Couche coupe-vent"]} logistics={{ meetingPoint: "Stationnement principal", meetingInstructions: "Arrivez 15 min avant le départ.", emergencyPlan: "Téléphone chargé et contacts accessibles.", operationalRoute: "Boucle du lac puis retour par le sentier Est.", backupPlan: "Raccourcir vers le belvédère ou reporter le départ.", routeImageUrl: "/manus-storage/users/7/social/route.webp" }} carpool={[{ departureLocation: "Métro Longueuil", seatsAvailable: 2, driverName: "Camille" }]} weatherUpdateNote="Des rafales sont signalées près du départ." weatherUpdatedAt="2026-09-05T18:00:00.000Z" localWeatherSource={{ label: "Bulletin parc", url: "https://example.org/meteo" }} pinnedMessage={{ content: "Le groupe se retrouve près du panneau d’accueil.", senderName: "Camille" }} landmarks={[{ type: "water", label: "Fontaine du départ", status: "reported", latitude: 45.5356, longitude: -73.1529, verifiedAt: "2026-09-05T12:00:00.000Z" }, { type: "shelter", label: "Abri du belvédère", status: "limited" }]} savedOffline={false} onSaveOffline={onSaveOffline} briefReadStatus={{ versionUpdatedAt: "2026-09-05T18:00:00.000Z", isParticipant: true, canManage: false, acknowledgedAt: null, confirmedParticipants: 5, acknowledgedParticipants: 2 }} onAcknowledgeBrief={onAcknowledgeBrief} />);
    expect(screen.getByText("Fiche Jour J")).toBeTruthy();
    expect(screen.getByText("Stationnement principal")).toBeTruthy();
    expect(screen.getByText(/rafales sont signalées/i)).toBeTruthy();
    expect(screen.getByText(/panneau d’accueil/i)).toBeTruthy();
    expect(screen.getByText("Boucle du lac puis retour par le sentier Est.")).toBeTruthy();
    expect(screen.getByText("Raccourcir vers le belvédère ou reporter le départ.")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Schéma indicatif de l’itinéraire" }).getAttribute("src")).toContain("route.webp");
    expect(screen.getByText("Fontaine du départ")).toBeTruthy();
    expect(screen.getByText("Abri du belvédère")).toBeTruthy();
    expect(screen.getByText(/Dernière vérification indiquée/i)).toBeTruthy();
    expect(screen.getByText("Coordonnées indicatives : 45.53560, -73.15290")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ouvrir" }).getAttribute("href")).toContain("45.5356,-73.1529");
    expect(screen.getByText("QR code Jour J")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "J’ai lu cette fiche" }));
    expect(onAcknowledgeBrief).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Enregistrer hors ligne" }));
    expect(onSaveOffline).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Partager la fiche" }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "Fiche Jour J · Boucle du Mont Saint-Hilaire", text: expect.stringContaining("Boucle du lac puis retour par le sentier Est."), url: window.location.href }));
    await user.click(screen.getByRole("button", { name: "Imprimer / Enregistrer en PDF" }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Urgence 911" }).getAttribute("href")).toBe("tel:911");
  });
});
