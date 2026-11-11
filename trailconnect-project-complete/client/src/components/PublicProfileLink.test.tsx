// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));

import { PublicProfileLink } from "./PublicProfileLink";

afterEach(cleanup);

describe("PublicProfileLink", () => {
  it("opens the public profile and exposes a desktop hover preview", async () => {
    const user = userEvent.setup();
    render(<PublicProfileLink profile={{ publicSlug: "nora-marche", homeLocation: "Montréal", bio: "Randonnées douces et sommets." }} name="Nora">Nora</PublicProfileLink>);
    expect(screen.getByRole("link", { name: "Voir le profil public de Nora" }).getAttribute("href")).toBe("/u/nora-marche");
    await user.hover(screen.getByRole("link", { name: "Voir le profil public de Nora" }));
    expect(await screen.findByText("@nora-marche")).toBeTruthy();
    expect(screen.getByText("Randonnées douces et sommets.")).toBeTruthy();
  });

  it("keeps a name static when no public profile reference is available", () => {
    render(<PublicProfileLink name="Alex">Alex</PublicProfileLink>);
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
