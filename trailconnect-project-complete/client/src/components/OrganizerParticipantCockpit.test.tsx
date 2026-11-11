// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ decide: vi.fn(), manage: vi.fn(), checkIn: vi.fn(), offer: vi.fn(), refetch: vi.fn() }));

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { marketplace: { bookings: {
  list: { useQuery: () => ({ data: [{ id: 14, hikerName: "Camille", status: "pending", levelExceptionNote: null, note: "Je souhaite participer.", levelAcknowledgedAt: null }], refetch: mocks.refetch }) },
  decide: { useMutation: () => ({ mutate: mocks.decide, isPending: false }) },
} }, events: {
  participants: { useQuery: () => ({ data: [{ id: 31, userId: 73, name: "Alex", status: "going", checkedInAt: null, preparationReadyAt: null }, { id: 32, userId: 74, name: "Morgan", status: "waitlist", waitlistPosition: 1, waitlistOffer: null }], refetch: mocks.refetch }) },
  manageParticipant: { useMutation: () => ({ mutate: mocks.manage, isPending: false }) },
  checkIn: { useMutation: () => ({ mutate: mocks.checkIn, isPending: false }) },
  offerWaitlistPlace: { useMutation: () => ({ mutate: mocks.offer, isPending: false }) },
} } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import OrganizerParticipantCockpit from "./OrganizerParticipantCockpit";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Organizer participant cockpit", () => {
  it("keeps a pending request at the top and sends an organizer decision", async () => {
    const user = userEvent.setup({ document: globalThis.document });
    render(<OrganizerParticipantCockpit eventId={17} capacity={8} />);
    expect(screen.getByText("Cockpit organisateur")).toBeTruthy();
    expect(screen.getByText("Camille")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Accepter/i }));
    expect(mocks.decide).toHaveBeenCalledWith({ requestId: 14, status: "accepted", levelExceptionDecisionNote: undefined });
  });

  it("lets the organizer adjust a confirmed participant and confirms before removal", async () => {
    const user = userEvent.setup({ document: globalThis.document });
    render(<OrganizerParticipantCockpit eventId={17} capacity={8} />);
    await user.click(screen.getByRole("button", { name: /Confirmés/i }));
    expect(screen.getByText("Alex")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Présent$/i }));
    expect(mocks.checkIn).toHaveBeenCalledWith({ eventId: 17, participantId: 73 });
    await user.click(screen.getByRole("button", { name: /Mettre en attente/i }));
    expect(mocks.manage).toHaveBeenCalledWith({ eventId: 17, participantId: 73, action: "move_to_waitlist" });
    await user.click(screen.getByRole("button", { name: /^Retirer$/i }));
    expect(screen.getByText(/Le participant sera retiré/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Confirmer le retrait/i }));
    expect(mocks.manage).toHaveBeenCalledWith({ eventId: 17, participantId: 73, action: "remove" });
  });

  it("offers a waitlisted participant a place without confirming them implicitly", async () => {
    const user = userEvent.setup({ document: globalThis.document });
    render(<OrganizerParticipantCockpit eventId={17} capacity={8} />);
    await user.click(screen.getByRole("button", { name: /Attente/i }));
    await user.click(screen.getByRole("button", { name: /Proposer une place/i }));
    expect(mocks.offer).toHaveBeenCalledWith({ eventId: 17, participantId: 74, responseWindowHours: 6 });
  });
});
