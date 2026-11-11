// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
import { VoluntaryPreparationReminder } from "./VoluntaryPreparationReminder";

afterEach(() => { cleanup(); window.localStorage.clear(); });

describe("VoluntaryPreparationReminder", () => {
  it("keeps preparation reminders opt-in and local to the device", async () => {
    const user = userEvent.setup();
    render(<VoluntaryPreparationReminder eventId={18} incompleteLabels={["Point de rendez-vous", "Statut de préparation"]} />);
    expect(screen.queryByText(/Point de rendez-vous/)).toBeNull();
    await user.click(screen.getByRole("switch", { name: "Afficher mes rappels" }));
    expect(screen.getByText("Point de rendez-vous")).toBeTruthy();
    expect(window.localStorage.getItem("trailconnect-preparation-reminder-18")).toBe("enabled");
    expect(screen.getByText(/ne déclenche aucun message externe/i)).toBeTruthy();
  });
});
