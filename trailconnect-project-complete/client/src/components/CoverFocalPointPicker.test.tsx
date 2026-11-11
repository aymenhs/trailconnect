// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoverFocalPointPicker } from "./CoverFocalPointPicker";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
afterEach(() => document.body.replaceChildren());

function ControlledPicker({ onReset = vi.fn() }: { onReset?: () => void }) {
  const [focus, setFocus] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  return <CoverFocalPointPicker src="/manus-storage/users/7/social/route.webp" focalX={focus.x} focalY={focus.y} onChange={(x, y) => setFocus({ x, y })} onReset={() => { setFocus({ x: null, y: null }); onReset(); }} />;
}

describe("CoverFocalPointPicker", () => {
  it("chooses a bounded focal point by tapping the visual selector", () => {
    render(<ControlledPicker />);
    const selector = screen.getByRole("button", { name: "Choisir le point d’intérêt de la photo" });
    Object.defineProperty(selector, "getBoundingClientRect", { value: () => ({ left: 10, top: 20, width: 200, height: 100 }) });

    fireEvent.click(selector, { clientX: 160, clientY: 70 });

    expect(screen.getByText("Point focal défini · 75% / 50%")).toBeTruthy();
  });

  it("supports keyboard adjustment and an explicit return to automatic center", () => {
    const onReset = vi.fn();
    render(<ControlledPicker onReset={onReset} />);
    const selector = screen.getByRole("button", { name: "Choisir le point d’intérêt de la photo" });

    fireEvent.keyDown(selector, { key: "ArrowRight" });
    expect(screen.getByText("Point focal défini · 55% / 50%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recentrer automatiquement" }));

    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.getByText("Recadrage centré")).toBeTruthy();
  });
});
