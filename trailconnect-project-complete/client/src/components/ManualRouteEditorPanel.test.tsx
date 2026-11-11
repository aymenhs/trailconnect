// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const updateManualRoute = vi.fn();
vi.mock("@/components/Map", () => ({ MapView: () => <div data-testid="route-map" /> }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { events: { updateManualRoute: { useMutation: () => ({ mutate: updateManualRoute, isPending: false }) } } } } }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));

import { ManualRouteEditorPanel } from "./ManualRouteEditorPanel";

describe("manual route editor review", () => {
  it("requires a visual comparison step before confirming a published route update", async () => {
    const user = userEvent.setup();
    render(<ManualRouteEditorPanel eventId={44} locationName="Montréal" manualRouteJson={JSON.stringify({ points: [{ latitude: 45.5, longitude: -73.5 }, { latitude: 45.51, longitude: -73.51 }], attentionZones: [{ type: "access", note: "Accès à vérifier", latitude: 45.505, longitude: -73.505 }] })} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /modifier le tracé/i }));
    expect(screen.getByText(/zones d’attention/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /comparer avant d’enregistrer/i }));
    expect(screen.getAllByText(/gris : version publiée/i).length).toBeGreaterThan(0);
    expect(updateManualRoute).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /confirmer la mise à jour/i }));
    expect(updateManualRoute).toHaveBeenCalledWith(expect.objectContaining({ eventId: 44, attentionZones: [expect.objectContaining({ type: "access" })] }));
  });
});
