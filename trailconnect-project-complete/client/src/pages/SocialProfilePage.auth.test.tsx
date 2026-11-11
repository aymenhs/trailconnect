// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const updateProfile = vi.hoisted(() => vi.fn());
const updateGuide = vi.hoisted(() => vi.fn());
const connectLink = vi.hoisted(() => vi.fn());
const profileData = vi.hoisted(() => ({ user: { id: 7, name: "Camille" }, profile: { publicSlug: "camille-rando", bio: "J’aime les sentiers tranquilles.", homeLocation: "Montréal", profileVisibility: "public", avatarUrl: null, coverImageUrl: null }, followers: 3, following: 4, achievements: [], socialLinks: [], posts: [] }));
const guideData = vi.hoisted(() => ({ headline: null, bio: null, serviceRegions: null, languages: null, certifications: null }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 7, name: "Camille", role: "user" } }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("qrcode.react", () => ({ QRCodeSVG: () => <div aria-label="Code QR" /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: {
  social: {
    profile: { useQuery: () => ({ data: profileData, isLoading: false, refetch: vi.fn() }) },
    links: { connect: { useMutation: () => ({ mutate: connectLink }) } },
  },
  profile: { update: { useMutation: () => ({ mutate: updateProfile, isPending: false }) } },
  marketplace: { guide: { mine: { useQuery: () => ({ data: guideData, refetch: vi.fn() }) }, update: { useMutation: () => ({ mutate: updateGuide, isPending: false }) } } },
  media: { uploadImage: { useMutation: () => ({ mutate: vi.fn() }) } },
} } }));

import SocialProfilePage from "./SocialProfilePage";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("SocialProfilePage authenticated access", () => {
  it("renders a connected user profile and saves its personalization fields", async () => {
    const user = userEvent.setup();
    render(<SocialProfilePage onOpenSettings={vi.fn()} onOpenCommunity={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Camille" })).toBeTruthy();
    expect(screen.getByText("J’aime les sentiers tranquilles.")).toBeTruthy();
    const editButton = screen.getByRole("button", { name: "Personnaliser" });
    expect(editButton.className).toContain("min-h-11");
    await user.click(editButton);
    await user.clear(screen.getByRole("textbox", { name: "Identifiant public" }));
    await user.type(screen.getByRole("textbox", { name: "Identifiant public" }), "camille-montreal");
    await user.click(screen.getAllByRole("button", { name: "Enregistrer" }).at(-1)!);
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ publicSlug: "camille-montreal", homeLocation: "Montréal", profileVisibility: "public" }));
  });

  it("saves self-declared organizer information without presenting it as verification", async () => {
    const user = userEvent.setup();
    render(<SocialProfilePage onOpenSettings={vi.fn()} onOpenCommunity={vi.fn()} />);
    expect(screen.getByText(/Ces renseignements restent déclaratifs/)).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "Accroche" }), "Randonnées inclusives dans les Laurentides");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(updateGuide).toHaveBeenCalledWith(expect.objectContaining({ headline: "Randonnées inclusives dans les Laurentides" }));
  });
});
