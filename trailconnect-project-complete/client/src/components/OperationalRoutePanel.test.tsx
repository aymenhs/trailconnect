// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { update, uploadImage } = vi.hoisted(() => ({ update: vi.fn(), uploadImage: vi.fn() }));
const routeState = vi.hoisted(() => ({ data: { logistics: { operationalRoute: "Boucle du lac puis retour par le sentier Est.", backupPlan: "Raccourcir vers le belvédère.", routeImageUrl: "/manus-storage/users/7/social/route.webp" } }, refetch: vi.fn() }));
const historyState = vi.hoisted(() => ({ data: [{ id: 4, operationalRoute: "Boucle initiale", backupPlan: "Retour direct", routeImageUrl: null, createdAt: "2026-09-05T17:00:00.000Z", authorName: "Camille" }], refetch: vi.fn() }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { events: { routePlanHistory: { useQuery: () => historyState } }, media: { uploadImage: { useMutation: () => ({ mutate: uploadImage, isPending: false }) } }, marketplace: { logistics: { detail: { useQuery: () => routeState }, update: { useMutation: () => ({ mutate: update, isPending: false }) } } } } } }));
import { OperationalRoutePanel } from "./OperationalRoutePanel";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("OperationalRoutePanel", () => {
  it("shows indicative route cues and lets the organizing team save a route and plan B", async () => {
    const user = userEvent.setup();
    render(<OperationalRoutePanel eventId={18} canManage />);
    expect(screen.getByText("Boucle du lac puis retour par le sentier Est.")).toBeTruthy();
    expect(screen.getByText("Raccourcir vers le belvédère.")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Schéma indicatif de l’itinéraire" }).getAttribute("src")).toContain("route.webp");
    expect(screen.getByText("Boucle initiale")).toBeTruthy();
    expect(screen.getAllByText(/restent indicatifs/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Configurer" }));
    await user.clear(screen.getByLabelText("Itinéraire prévu"));
    await user.type(screen.getByLabelText("Itinéraire prévu"), "Départ par le sentier du lac.");
    await user.clear(screen.getByLabelText("Option de plan B"));
    await user.type(screen.getByLabelText("Option de plan B"), "Reporter si l’accès change.");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(update).toHaveBeenCalledWith({ eventId: 18, operationalRoute: "Départ par le sentier du lac.", backupPlan: "Reporter si l’accès change.", routeImageUrl: "/manus-storage/users/7/social/route.webp" });
  });
});
