// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorialCommunityPreview, EditorialGroupPreviews, EmptyState, GroupComposer, GroupCoverLibrary, MemberSearch, PostCreateGroupInvites } from "./SocialCommunityPage";

const mocks = vi.hoisted(() => ({ requestFriend: vi.fn(), refetchFriends: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    hiking: {
      social: { groups: { nameAvailable: { useQuery: () => ({ data: undefined, isFetching: false }) } }, members: { search: { useQuery: (input: { query: string }) => ({ data: "nora".includes(input.query.toLowerCase()) ? [{ userId: 19, name: "Nora", publicSlug: "nora-marche", homeLocation: "Montréal" }] : [], isFetching: false }) } }, friendships: { list: { useQuery: () => ({ data: [], refetch: mocks.refetchFriends }) }, requestBySlug: { useMutation: () => ({ mutate: mocks.requestFriend, isPending: false }) } } },
      media: { uploadImage: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    },
  },
}));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 42 } }) }));

afterEach(cleanup);

describe("Community empty state accessibility", () => {
  it("announces an empty community surface without exposing its decorative icon", () => {
    render(<EmptyState text="Votre fil s’animera bientôt." icon={<span>Décoratif</span>} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain("Votre fil s’animera bientôt.");
    expect(screen.queryByText("Décoratif")).toBeTruthy();
  });

  it("labels group-creation fields and keeps its primary action tactile", () => {
    render(<GroupComposer label="Créer un groupe" nameLabel="Nom du groupe" descriptionLabel="Description" onCreate={() => undefined} />);
    const name = screen.getByRole("textbox", { name: "Nom du groupe" });
    name.focus();
    expect(document.activeElement).toBe(name);
    expect(screen.getByRole("textbox", { name: "Description" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Créer un groupe" }).className).toContain("min-h-11");
  });

  it("accepts a focus ref for direct navigation to the group creator", () => {
    const inputRef = createRef<HTMLInputElement>();
    render(<GroupComposer label="Créer un groupe" nameLabel="Nom du groupe" descriptionLabel="Description" inputRef={inputRef} onCreate={() => undefined} />);
    inputRef.current?.focus();
    expect(document.activeElement).toBe(inputRef.current);
  });

  it("renders an accessible optional invitation step and transmits its personal message", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<PostCreateGroupInvites groupId={17} friends={[{ userId: 9, name: "Nora" }]} isPending={false} title="Inviter des amis maintenant" hint="Les invitations restent volontaires." messageLabel="Message d’invitation (facultatif)" messageHint="Visible avec l’invitation." messagePlaceholder="Votre message" noFriends="Aucun ami" inviteSelected="Inviter la sélection" skip="Continuer sans invitation" onInvite={onInvite} onClose={() => undefined} />);
    expect(screen.getByRole("dialog", { name: "Inviter des amis maintenant" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Nora/ }));
    await user.type(screen.getByRole("textbox", { name: "Message d’invitation (facultatif)" }), "On se retrouve sur les sentiers ?");
    await user.click(screen.getByRole("button", { name: /Inviter la sélection/ }));
    expect(onInvite).toHaveBeenCalledWith(9, "On se retrouve sur les sentiers ?");
    expect(screen.getByRole("button", { name: "Continuer sans invitation" })).toBeTruthy();
  });

  it("shows a saved personal template and its cover-ready fields in the group creator", () => {
    render(<GroupComposer label="Créer un groupe" nameLabel="Nom du groupe" descriptionLabel="Description" personalTemplates={[{ id: 4, label: "Mes sorties amies", description: "", name: "Sorties amies", groupDescription: "Des randonnées entre amis.", visibility: "invite", coverImageUrl: "https://example.test/cover.jpg" }]} personalTemplatesTitle="Mes modèles" saveTemplateLabel="Enregistrer comme modèle" onCreate={() => undefined} onSaveTemplate={() => undefined} />);
    expect(screen.getByRole("region", { name: "Mes modèles" }).textContent).toContain("Mes sorties amies");
    expect(screen.getByLabelText("Image de couverture")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Nom du modèle" })).toBeTruthy();
  });

  it("offers an accessible free-cover library and returns the selected image URL", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<GroupCoverLibrary selectedUrl="" onSelect={onSelect} />);
    const library = screen.getByRole("region", { name: "Bibliothèque de couvertures" });
    expect(library.textContent).toContain("Unsplash");
    await user.click(screen.getByRole("button", { name: /Rivière de montagne/i }));
    expect(onSelect).toHaveBeenCalledWith("/media/mountain-river.webp");
  });

  it("labels editorial inspiration clearly instead of presenting it as member content", () => {
    render(<><EditorialCommunityPreview locale="fr" /><EditorialGroupPreviews locale="fr" /></>);
    expect(screen.getByTestId("editorial-community-preview").textContent).toContain("ne sont pas publiés par des membres");
    expect(screen.getAllByText("Aperçu non rejoignable")).toHaveLength(2);
  });

  it("lists public members immediately and filters from the first character", async () => {
    const user = userEvent.setup();
    render(<MemberSearch />);
    expect(screen.getByRole("status").textContent).toContain("Profils publics disponibles");
    expect(screen.getByRole("link", { name: "Voir le profil public de Nora" }).getAttribute("href")).toBe("/u/nora-marche");
    await user.type(screen.getByRole("textbox", { name: "Trouver un membre" }), "@N");
    expect(screen.getByRole("link", { name: "Voir le profil public de Nora" }).getAttribute("href")).toBe("/u/nora-marche");
    expect(screen.getByRole("list", { name: "Résultats de membres" }).textContent).toContain("Montréal");
    await user.click(screen.getByRole("button", { name: "Ajouter à mes amis Nora" }));
    await user.type(screen.getByLabelText("Note facultative"), "Bonjour Nora !");
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(mocks.requestFriend).toHaveBeenCalledWith({ publicSlug: "nora-marche", note: "Bonjour Nora !" });
  });
});
