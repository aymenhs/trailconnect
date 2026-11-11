// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateEventPage, { uploadRouteFile } from "./CreateEventPage";

const localeState = vi.hoisted(() => ({ locale: "fr" as "fr" | "en" }));
vi.mock("@/components/RouteWeatherPreview", () => ({ default: () => null }));
vi.mock("@/components/Map", () => ({ MapView: () => <div data-testid="meeting-map" /> }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: localeState.locale }) }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { tracks: { upload: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } }, media: { uploadImage: { useMutation: () => ({ mutate: vi.fn() }) } }, events: { create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } } }));

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); localeState.locale = "fr"; });

describe("CreateEventPage difficulty synchronization", () => {
  it("selects beginner after entering 1 km and 1 m in automatic mode", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Parcours et niveau/i }));
    expect(screen.getByText("Essentiels")).toBeTruthy();
    expect(screen.getByText("Parcours et niveau")).toBeTruthy();
    expect(screen.getByText("Logistique")).toBeTruthy();
    expect(screen.getByText("Révision")).toBeTruthy();
    const [distance, elevation] = screen.getAllByRole("textbox").filter(input => (input as HTMLInputElement).value === "8" || (input as HTMLInputElement).value === "350");
    await user.clear(distance); await user.type(distance, "1");
    await user.clear(elevation); await user.type(elevation, "1");
    expect(screen.getByText("Niveau indicatif").parentElement?.textContent).toContain("Débutant");
    expect(screen.getByRole("radio", { name: /Débutant/i }).getAttribute("aria-checked")).toBe("true");
  });

  it("raises the suggested level for high technicality and preserves a subsequent manual selection", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Parcours et niveau/i }));
    await user.click(screen.getByText("Terrain et conditions avancés"));
    await user.click(within(screen.getByRole("radiogroup", { name: "Technicité" })).getByRole("radio", { name: "Élevée" }));
    expect(screen.getByText("Niveau indicatif").parentElement?.textContent).toContain("Intermédiaire");
    await user.click(screen.getByRole("radio", { name: /Expert/i }));
    await user.click(within(screen.getByRole("radiogroup", { name: "Surface" })).getByRole("radio", { name: "Rocheux" }));
    expect(screen.getByRole("radio", { name: /Expert/i }).getAttribute("aria-checked")).toBe("true");
  });

  it("reveals only the selected creation step", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    expect(screen.getByLabelText("Étapes de création")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Essentiels/i }).getAttribute("aria-current")).toBe("step");
    expect(screen.getByLabelText("Titre")).toBeTruthy();
    expect(screen.queryByLabelText("Distance (km)")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Parcours et niveau/i }));
    expect(screen.getByLabelText("Distance (km)")).toBeTruthy();
    expect(screen.queryByLabelText("Titre")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Logistique/i }));
    expect(screen.getByLabelText("Sanitaires")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Révision/i }));
    expect(screen.getByLabelText("Type")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Révision/i }).getAttribute("aria-current")).toBe("step");
    await user.click(screen.getByRole("button", { name: /Logistique/i }));
    const approval = screen.getByRole("switch", { name: "Valider les participants" });
    expect(approval.getAttribute("aria-checked")).toBe("false");
    await user.click(approval);
    expect(approval.getAttribute("aria-checked")).toBe("true");
  });

  it("renders the English step, action, and field labels without falling back to French", async () => {
    const user = userEvent.setup();
    localeState.locale = "en";
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    expect(screen.getByLabelText("Creation steps")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Essentials/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Route and level/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Route and level/i }));
    expect(screen.getByLabelText("Distance (km)")).toBeTruthy();
    expect(screen.getByText("GPX or KML route — optional")).toBeTruthy();
    expect(screen.queryByText("Trace GPX ou KML — facultative")).toBeNull();
  });

  it("offers an AllTrails source link while keeping GPX or KML as the technical route import", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Parcours et niveau/i }));
    const source = screen.getByLabelText("Lien source AllTrails — facultatif");
    await user.type(source, "https://www.alltrails.com/trail/canada/quebec/boucle-du-parc-du-mont-royal");
    expect((source as HTMLInputElement).value).toContain("alltrails.com");
    expect(screen.getByText(/Ses données ne sont pas importées automatiquement/)).toBeTruthy();
    expect(screen.getByText("Trace GPX ou KML — facultative")).toBeTruthy();
  });

  it("adds an indicative packing suggestion and exposes the actionable review", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Logistique/i }));
    expect(screen.getByText("Suggestions de préparation")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Eau adaptée à la sortie/i }));
    expect(screen.getByRole("button", { name: "Retirer Eau adaptée à la sortie" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Révision/i }));
    expect(screen.getByText("Révision avant publication")).toBeTruthy();
    expect(screen.getByText("Quelques éléments demandent votre attention")).toBeTruthy();
  });

  it("supports keyboard activation for visual option choices", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Parcours et niveau/i }));
    const advanced = within(screen.getByRole("radiogroup", { name: "Niveau requis" })).getByRole("radio", { name: /Avancé/i });
    advanced.focus();
    await user.keyboard("{Enter}");
    expect(advanced.getAttribute("aria-checked")).toBe("true");
  });

  it("offers visible previous and next controls that validate the essentials before moving forward", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Précédent" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByLabelText("Titre")).toBeTruthy();
    await user.type(screen.getByLabelText("Titre"), "Sentier du Mont-Royal");
    await user.type(screen.getByLabelText("Lieu de rendez-vous"), "Montréal");
    await user.type(screen.getByLabelText("Date et heure"), "2026-09-12T09:00");
    await user.type(screen.getByLabelText("Description"), "Une sortie conviviale avec une préparation simple et un rythme collectif.");
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByLabelText("Distance (km)")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Précédent" }) as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByRole("button", { name: "Précédent" }));
    expect(screen.getByLabelText("Titre")).toBeTruthy();
  });

  it("keeps the GPX or KML track optional when moving beyond the route step", async () => {
    const user = userEvent.setup();
    render(<CreateEventPage onBack={vi.fn()} onPublished={vi.fn()} />);
    await user.type(screen.getByLabelText("Titre"), "Sentier du Mont-Royal");
    await user.type(screen.getByLabelText("Lieu de rendez-vous"), "Montréal");
    await user.type(screen.getByLabelText("Date et heure"), "2026-09-12T09:00");
    await user.type(screen.getByLabelText("Description"), "Une sortie conviviale avec une préparation simple et un rythme collectif.");
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByText("Trace GPX ou KML — facultative")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByLabelText("Sanitaires")).toBeTruthy();
  });

  it("uploads a GPX file as binary data instead of putting its base64 content in a tRPC payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: "/manus-storage/users/7/tracks/route.gpx", key: "users/7/tracks/route.gpx" }) });
    vi.stubGlobal("fetch", fetchMock);
    const route = new File(["<gpx><trk/></gpx>"], "route.gpx", { type: "application/gpx+xml" });
    await expect(uploadRouteFile(route)).resolves.toEqual({ url: "/manus-storage/users/7/tracks/route.gpx", key: "users/7/tracks/route.gpx" });
    expect(fetchMock).toHaveBeenCalledWith("/api/tracks/upload?filename=route.gpx", expect.objectContaining({ method: "POST", body: route, credentials: "same-origin" }));
  });
});
