// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));

import { OutingActionPlan } from "./OutingActionPlan";

afterEach(cleanup);

describe("OutingActionPlan", () => {
  it("turns recorded outing information into linked, non-prescriptive preparation actions", () => {
    render(<OutingActionPlan hasMeetingPoint carpoolEnabled hasWeatherUpdate weatherRead={false} preparationReady={false} hasPinnedMessage offlineReady={false} isOrganizer={false} />);
    expect(screen.getByText("Votre plan d’action")).toBeTruthy();
    expect(screen.getByText("Le point de rendez-vous est renseigné.")).toBeTruthy();
    expect(screen.getByText(/attend votre confirmation de lecture/i)).toBeTruthy();
    expect(screen.getByText(/déclarer votre préparation/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /conditions et mises à jour/i }).getAttribute("href")).toBe("#tc-weather");
    expect(screen.getByText(/repères sont informatifs/i)).toBeTruthy();
  });
});
