// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const setAssignment = vi.fn();
const invalidate = vi.fn();
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { events: { actionAssignments: { useQuery: () => ({ data: [{ action: "weather", assigneeId: 14, assigneeName: "Nora" }] }) }, setActionAssignment: { useMutation: () => ({ mutate: setAssignment, isPending: false }) } } }, useUtils: () => ({ hiking: { events: { actionAssignments: { invalidate } } } }) } }));
import { ActionAssignmentsPanel } from "./ActionAssignmentsPanel";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("ActionAssignmentsPanel", () => {
  it("shows recorded owners and lets organizers assign a confirmed participant", async () => {
    const user = userEvent.setup();
    render(<ActionAssignmentsPanel eventId={18} canManage candidates={[{ userId: 7, name: "Camille" }, { userId: 14, name: "Nora" }]} />);
    expect(screen.getAllByText("Nora").length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByRole("combobox", { name: "Choisir un responsable Rendez-vous" }), "14");
    expect(setAssignment).toHaveBeenCalledWith({ eventId: 18, action: "meeting", assigneeId: 14 });
  });
});
