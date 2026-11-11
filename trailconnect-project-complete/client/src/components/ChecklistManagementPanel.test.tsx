// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChecklistManagementPanel from "./ChecklistManagementPanel";

const summary = vi.fn();
const add = vi.fn();
const update = vi.fn();
const remove = vi.fn();

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { events: { preparation: { packingSummary: { useQuery: (...args: unknown[]) => summary(...args) }, addPackingItem: { useMutation: () => ({ mutate: add, isPending: false }) }, updatePackingItem: { useMutation: () => ({ mutate: update, isPending: false }) }, deletePackingItem: { useMutation: () => ({ mutate: remove, isPending: false }) } } } } } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("ChecklistManagementPanel", () => {
  it("lets organizers add a suggestion and shows only anonymous aggregate progress", async () => {
    summary.mockReturnValue({ data: { confirmedParticipants: 3, items: [{ id: 9, label: "Eau adaptée", category: "essential", checkedParticipants: 2 }] }, refetch: vi.fn() });
    render(<ChecklistManagementPanel eventId={12} items={[{ id: 9, label: "Eau adaptée", category: "essential" }]} onChanged={vi.fn()} />);
    expect(screen.getByText("Progression agrégée")).toBeTruthy();
    expect(screen.getByText("2/3")).toBeTruthy();
    expect(screen.getByText("Les totaux ne révèlent ni nom ni statut individuel.")).toBeTruthy();
    await userEvent.setup().type(screen.getByLabelText("Nouvelle suggestion"), "Lampe frontale");
    await userEvent.setup().click(screen.getByRole("button", { name: /Ajouter un élément/i }));
    expect(add).toHaveBeenCalledWith({ eventId: 12, label: "Lampe frontale", category: "essential" });
  });
});
