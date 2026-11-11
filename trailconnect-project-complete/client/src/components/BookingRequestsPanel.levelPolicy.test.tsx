// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ decide: vi.fn(), refetch: vi.fn() }));

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { marketplace: { bookings: {
  list: { useQuery: () => ({ data: [{ id: 14, hikerName: "Camille", status: "pending", levelExceptionNote: "Je randonne avec un accompagnateur expérimenté.", levelAcknowledgedAt: null }], isLoading: false, refetch: mocks.refetch }) },
  decide: { useMutation: () => ({ mutate: mocks.decide, isPending: false }) },
} } } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import BookingRequestsPanel from "./BookingRequestsPanel";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Organizer UI workflow — booking requests", () => {
  it("shows a pending request and requires a documented organizer decision for a level exception", async () => {
    const user = userEvent.setup({ document: globalThis.document });
    render(<BookingRequestsPanel eventId={17} />);

    expect(screen.getByText("Demandes de participation")).toBeTruthy();
    expect(screen.getByText("1 en attente")).toBeTruthy();
    expect(screen.getByText("Camille")).toBeTruthy();
    expect(screen.getByText("Exception de niveau à examiner:")).toBeTruthy();
    const accept = screen.getByRole("button", { name: "Accepter" });
    expect((accept as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText("Décision documentée de l’organisateur"), "Contexte discuté avec le participant et itinéraire adapté.");
    await user.click(accept);
    expect(mocks.decide).toHaveBeenCalledWith({ requestId: 14, status: "accepted", levelExceptionDecisionNote: "Contexte discuté avec le participant et itinéraire adapté." });
  });

  it("sends the documented organizer note when declining a level exception", async () => {
    const user = userEvent.setup({ document: globalThis.document });
    render(<BookingRequestsPanel eventId={17} />);

    await user.type(screen.getByLabelText("Décision documentée de l’organisateur"), "Les prérequis annoncés restent nécessaires pour cette sortie.");
    await user.click(screen.getByRole("button", { name: "Refuser" }));
    expect(mocks.decide).toHaveBeenCalledWith({ requestId: 14, status: "declined", levelExceptionDecisionNote: "Les prérequis annoncés restent nécessaires pour cette sortie." });
  });
});
