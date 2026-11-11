import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("./pages/Home.tsx", import.meta.url), "utf8");

describe("global keyboard focus styling", () => {
  it("keeps a high-contrast visible focus indicator for interactive account controls", () => {
    expect(css).toContain("[role=\"tab\"]");
    expect(css).toContain("[role=\"switch\"]");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 3px solid");
    expect(css).toContain("outline-offset: 3px");
    expect(css).toContain("button, [role=\"button\"], input[type=\"checkbox\"], input[type=\"radio\"] { min-height: 2.75rem; }");
  });
});

describe("mobile layout containment", () => {
  it("prevents document-level horizontal overflow while preserving component-level scrolling", () => {
    expect(css).toContain("html {");
    expect(css).toContain("overflow-x: clip;");
    expect(css).toContain("body {");
    expect(css).toContain("overflow-x: hidden;");
    expect(css).toContain("#root { min-width: 0; max-width: 100%; overflow-x: clip; }");
    expect(homeSource).toContain("w-full max-w-full overflow-x-clip");
    expect(homeSource).toContain("min-w-0 w-full max-w-full flex-1");
    expect(homeSource).toContain("flex flex-col items-start gap-2 sm:flex-row");
    expect(homeSource).toContain("w-full min-w-0 max-w-full break-words line-clamp-2");
    expect(homeSource).toContain("w-full min-w-0 sm:w-auto sm:flex-1");
    expect(homeSource).toContain("overflow-x-auto");
    expect(css).toContain("[data-messaging-panel] > *");
    expect(css).toContain(".fixed.inset-0");
    expect(css).toContain(".fixed.inset-0 > .mx-auto { width: 100%; min-width: 0; max-width: 100%; }");
  });
});
