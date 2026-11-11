// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { getCoverObjectPosition, ResponsiveCoverImage } from "./ResponsiveCoverImage";

describe("ResponsiveCoverImage", () => {
  it("uses mobile and desktop variants for a TrailConnect cover", () => {
    const { container } = render(<ResponsiveCoverImage src="/media/trailconnect-hero.webp" alt="Randonnée" sizes="100vw" />);

    const sources = Array.from(container.querySelectorAll("source"));
    expect(sources).toHaveLength(2);
    expect(sources[0]?.getAttribute("srcset")).toContain("trailconnect-hero-mobile");
    expect(sources[1]?.getAttribute("srcset")).toContain("trailconnect-hero-desktop");
    expect(screen.getByRole("img", { name: "Randonnée" }).getAttribute("src")).toContain("trailconnect-hero-desktop");
  });

  it("keeps an unknown user cover as its own safe fallback", () => {
    const userCover = "/manus-storage/users/7/social/route.webp";
    const { container } = render(<ResponsiveCoverImage src={userCover} alt="Sortie personnelle" />);

    expect(container.querySelectorAll("source")).toHaveLength(0);
    expect(screen.getByRole("img", { name: "Sortie personnelle" }).getAttribute("src")).toBe(userCover);
  });

  it("uses a centered fallback and applies an optional focal position", () => {
    expect(getCoverObjectPosition()).toBe("50% 50%");
    expect(getCoverObjectPosition(72, 18)).toBe("72% 18%");
  });
});
