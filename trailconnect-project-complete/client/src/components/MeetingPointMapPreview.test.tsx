// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MeetingPointMapPreview from "./MeetingPointMapPreview";

vi.mock("@/components/Map", () => ({ MapView: () => <div data-testid="meeting-map" /> }));

afterEach(cleanup);

describe("MeetingPointMapPreview", () => {
  it("keeps the map dormant without a place and exposes an indicative map link once provided", () => {
    const { rerender } = render(<MeetingPointMapPreview locale="fr" meetingPoint="" locationName="" />);
    expect(screen.getByText("Saisissez un point de rendez-vous ou une zone de départ pour obtenir un aperçu cartographique indicatif.")).toBeTruthy();
    rerender(<MeetingPointMapPreview locale="fr" meetingPoint="Pavillon d’accueil" locationName="Parc du Mont-Royal, Montréal" />);
    expect(screen.getByText("Aperçu du rendez-vous")).toBeTruthy();
    expect(screen.getByTestId("meeting-map")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ouvrir dans Plans/i }).getAttribute("href")).toContain("Pavillon%20d%E2%80%99accueil");
    expect(screen.getByText(/Repère indicatif/i)).toBeTruthy();
  });
});
