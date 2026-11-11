// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
const detail = { data: undefined as Record<string, any> | undefined, refetch: vi.fn() };

vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { events: { detail: { useQuery: () => detail }, update: { useMutation: () => ({ mutate: update, isPending: false }) } } } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AllTrailsSourcePanel } from "./AllTrailsSourcePanel";

const eventData = { id: 12, title: "Boucle du lac", description: "Une randonnée de groupe au Québec pour découvrir les sentiers locaux.", locationName: "Montréal", startsAt: new Date("2026-09-08T12:00:00.000Z"), visibility: "public", difficulty: "intermediate", distanceKm: 8, elevationGain: 350, durationMinutes: 210, capacity: 12 };

afterEach(() => { cleanup(); vi.clearAllMocks(); detail.data = undefined; });

describe("AllTrailsSourcePanel", () => {
  it("shows the external source link when a route has one", () => {
    render(<AllTrailsSourcePanel eventId={12} eventData={{ ...eventData, allTrailsUrl: "https://www.alltrails.com/trail/canada/quebec/mont-royal" }} canManage={false} />);
    const link = screen.getByRole("link", { name: "Voir l’itinéraire source sur AllTrails, nouvelle fenêtre" });
    expect(link.getAttribute("href")).toContain("alltrails.com");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("lets the organizer edit an existing source link", async () => {
    const user = userEvent.setup();
    render(<AllTrailsSourcePanel eventId={12} eventData={{ ...eventData, allTrailsUrl: "https://www.alltrails.com/trail/canada/quebec/mont-royal" }} canManage />);
    await user.click(screen.getByRole("button", { name: "Modifier le lien" }));
    const source = screen.getByLabelText("Lien source AllTrails") as HTMLInputElement;
    expect(source.value).toContain("alltrails.com");
    await user.clear(source);
    await user.type(source, "https://www.alltrails.com/trail/canada/quebec/mont-saint-hilaire");
    await user.click(screen.getByRole("button", { name: "Enregistrer le lien" }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ allTrailsUrl: "https://www.alltrails.com/trail/canada/quebec/mont-saint-hilaire" }));
  });

  it("states when no source is available to a participant", () => {
    render(<AllTrailsSourcePanel eventId={12} eventData={eventData} canManage={false} />);
    expect(screen.getByText("Aucun lien AllTrails ajouté pour cette sortie.")).toBeTruthy();
  });

  it("lets the organizer add an AllTrails source to an existing outing", async () => {
    const user = userEvent.setup();
    render(<AllTrailsSourcePanel eventId={12} eventData={eventData} canManage />);
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    await user.type(screen.getByLabelText("Lien source AllTrails"), "https://www.alltrails.com/trail/canada/quebec/mont-royal");
    await user.click(screen.getByRole("button", { name: "Enregistrer le lien" }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ eventId: 12, allTrailsUrl: "https://www.alltrails.com/trail/canada/quebec/mont-royal" }));
  });
});
