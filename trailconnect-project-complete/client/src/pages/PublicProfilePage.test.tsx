// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const requestFriend = vi.fn();
const friendships = { data: [] as Array<{ userId: number; status: string }>, refetch: vi.fn() };
const profileState = { data: { userId: 19, name: "Nora", publicSlug: "nora-marche", phoneVerificationStatus: "verified", canReceiveMessages: true } };

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 7, name: "Camille" } }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { social: { profileBySlug: { useQuery: () => ({ data: profileState.data, isLoading: false }) }, friendships: { list: { useQuery: () => friendships }, requestBySlug: { useMutation: () => ({ mutate: requestFriend, isPending: false }) } } } } } }));
vi.mock("wouter", () => ({ Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <a {...props}>{children}</a>, useRoute: () => [true, { slug: "nora-marche" }] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import PublicProfilePage from "./PublicProfilePage";

afterEach(() => { cleanup(); vi.clearAllMocks(); friendships.data = []; profileState.data = { userId: 19, name: "Nora", publicSlug: "nora-marche", phoneVerificationStatus: "verified", canReceiveMessages: true }; });

describe("PublicProfilePage", () => {
  it("sends a friend request with an optional note from a different public profile", async () => {
    const user = userEvent.setup();
    render(<PublicProfilePage />);
    await user.click(screen.getByRole("button", { name: "Ajouter à mes amis Nora" }));
    await user.type(screen.getByLabelText("Note facultative"), "Bonjour Nora, belle sortie !");
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(requestFriend).toHaveBeenCalledWith({ publicSlug: "nora-marche", note: "Bonjour Nora, belle sortie !" });
  });

  it("shows a non-actionable pending state when a request already exists", () => {
    friendships.data = [{ userId: 19, status: "pending" }];
    render(<PublicProfilePage />);
    expect((screen.getByRole("button", { name: /Demande en attente/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens the existing direct-message route only when a public member accepts contacts", () => {
    render(<PublicProfilePage />);
    expect(screen.getByRole("link", { name: "Écrire un message" }).getAttribute("href")).toBe("/?view=community&tab=messages&recipient=19");
    cleanup();
    profileState.data = { ...profileState.data, canReceiveMessages: false };
    render(<PublicProfilePage />);
    expect(screen.queryByRole("link", { name: "Écrire un message" })).toBeNull();
  });
});
