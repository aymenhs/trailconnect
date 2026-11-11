// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { AccessibilityProvider, useAccessibility } from "./AccessibilityContext";

function TextSizeControl() {
  const { textSize, setTextSize } = useAccessibility();
  return <><output data-testid="current-size">{textSize}</output><button onClick={() => setTextSize("extra-large")}>Très grand</button></>;
}

describe("AccessibilityProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-text-size");
  });

  it("applies and persists a user-selected larger text size", async () => {
    const user = userEvent.setup();
    render(<AccessibilityProvider><TextSizeControl /></AccessibilityProvider>);

    expect(screen.getByTestId("current-size").textContent).toBe("standard");
    await user.click(screen.getByRole("button", { name: "Très grand" }));

    expect(document.documentElement.dataset.textSize).toBe("extra-large");
    expect(window.localStorage.getItem("trailconnect-text-size")).toBe("extra-large");
  });
});
