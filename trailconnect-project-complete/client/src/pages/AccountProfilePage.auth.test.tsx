// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ startLogin: vi.fn(), profileQuery: vi.fn(), notificationListQuery: vi.fn(), notificationPreferencesQuery: vi.fn(), deletionStatusQuery: vi.fn(), friendshipsQuery: vi.fn(), coAdminInvitesQuery: vi.fn(), groupsQuery: vi.fn(), outdoorConsentsQuery: vi.fn(), updateProfile: vi.fn(), updatePreferences: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), requestDeletion: vi.fn(), cancelDeletion: vi.fn(), respondFriendship: vi.fn(), deferFriendship: vi.fn(), removeFriendship: vi.fn(), blockFriend: vi.fn(), respondCoAdminInvite: vi.fn(), inviteCoAdmin: vi.fn(), setOutdoorConsent: vi.fn() }));
vi.mock("@/const", () => ({ startLogin: mocks.startLogin }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 7, role: "user" } }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr", setLocale: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({ hiking: { profile: { mine: { invalidate: vi.fn() } }, notifications: { preferences: { invalidate: vi.fn() }, list: { invalidate: vi.fn() } } } }),
  hiking: {
    profile: { mine: { useQuery: (...args: unknown[]) => mocks.profileQuery(...args) }, deletionStatus: { useQuery: (...args: unknown[]) => mocks.deletionStatusQuery(...args) }, update: { useMutation: () => ({ mutate: mocks.updateProfile, isPending: false }) }, requestDeletion: { useMutation: () => ({ mutate: mocks.requestDeletion, isPending: false }) }, cancelDeletion: { useMutation: () => ({ mutate: mocks.cancelDeletion, isPending: false }) } },
    notifications: { list: { useQuery: (...args: unknown[]) => mocks.notificationListQuery(...args) }, preferences: { useQuery: (...args: unknown[]) => mocks.notificationPreferencesQuery(...args) }, updatePreferences: { useMutation: () => ({ mutate: mocks.updatePreferences, isPending: false }) }, markRead: { useMutation: () => ({ mutate: mocks.markRead, isPending: false }) }, markAllRead: { useMutation: (options?: { onSuccess?: () => void }) => ({ mutate: (...args: unknown[]) => { mocks.markAllRead(...args); options?.onSuccess?.(); }, isPending: false }) } },
    social: { friendships: { list: { useQuery: (...args: unknown[]) => mocks.friendshipsQuery(...args) }, respond: { useMutation: () => ({ mutate: mocks.respondFriendship, isPending: false }) }, defer: { useMutation: () => ({ mutate: mocks.deferFriendship, isPending: false }) }, remove: { useMutation: () => ({ mutate: mocks.removeFriendship, isPending: false }) } }, groups: { list: { useQuery: (...args: unknown[]) => mocks.groupsQuery(...args) }, coAdmins: { pending: { useQuery: (...args: unknown[]) => mocks.coAdminInvitesQuery(...args) }, respond: { useMutation: () => ({ mutate: mocks.respondCoAdminInvite, isPending: false }) }, invite: { useMutation: () => ({ mutate: mocks.inviteCoAdmin, isPending: false }) } } } },
    integrations: { myConsents: { useQuery: (...args: unknown[]) => mocks.outdoorConsentsQuery(...args) }, setConsent: { useMutation: () => ({ mutate: mocks.setOutdoorConsent, isPending: false }) } },
    messaging: { block: { useMutation: () => ({ mutate: mocks.blockFriend, isPending: false }) } },
  },
} }));

import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import AccountProfilePage, { NotificationActionPanel, PreferenceGroup, SignInPrompt, TextSizeSettings } from "./AccountProfilePage";

beforeEach(() => {
  mocks.profileQuery.mockReturnValue({ data: { bio: "Randonnée tranquille", homeLocation: "Montréal, QC", experienceLevel: "beginner", timezone: "America/Toronto", units: "metric" } });
  mocks.notificationListQuery.mockReturnValue({ data: [{ id: 14, isRead: false, type: "event", title: "Départ imminent", body: "Retrouvez le groupe au stationnement.", actionPath: "/?view=my-outings" }] });
  mocks.notificationPreferencesQuery.mockReturnValue({ data: { inAppEnabled: true, eventUpdates: true, dayOfBriefUpdates: true, groupMessages: true } });
  mocks.deletionStatusQuery.mockReturnValue({ data: { deletionScheduledAt: null }, refetch: vi.fn() });
  mocks.friendshipsQuery.mockReturnValue({ data: [] });
  mocks.coAdminInvitesQuery.mockReturnValue({ data: [] });
  mocks.groupsQuery.mockReturnValue({ data: [] });
  mocks.outdoorConsentsQuery.mockReturnValue({ data: [], refetch: vi.fn() });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("SignInPrompt", () => {
  it("starts the delegated secure access flow from the create or recover action", async () => {
    const user = userEvent.setup();
    render(<SignInPrompt title="Accès sécurisé" body="La récupération est gérée par votre fournisseur d’identité." action="Créer ou récupérer l’accès" />);
    await user.click(screen.getByRole("button", { name: "Créer ou récupérer l’accès" }));
    expect(mocks.startLogin).toHaveBeenCalledTimes(1);
  });
});

describe("account settings surfaces", () => {
  it("offers an actionable notification link in the notification center", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const notification = { id: 42, title: "Invitation à gérer", actionPath: "/?view=account" };
    render(<NotificationActionPanel locale="fr" notifications={[notification]} onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(onAction).toHaveBeenCalledWith(notification);
  });

  it("changes an in-app notification preference from its accessible switch", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PreferenceGroup title="Préférences" rows={[{ label: "Dans l’application", key: "inAppEnabled" }]} preferences={{ inAppEnabled: true }} onChange={onChange} />);

    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Dans l’application" }));
    expect(onChange).toHaveBeenCalledWith("inAppEnabled", false);
  });

  it("offers the extra-large text-size selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextSizeSettings locale="fr" textSize="standard" onChange={onChange} copy={{ display: "Affichage et accessibilité", textSize: "Taille du texte", textSizeHelp: "Choisissez l’affichage le plus confortable.", standard: "Standard", large: "Grand", extraLarge: "Très grand", sample: "Exemple de texte lisible", savedOnDevice: "Enregistré sur cet appareil." }} />);

    const extraLarge = screen.getByRole("radio", { name: "Très grand" });
    expect(extraLarge.className).toContain("min-h-12");
    await user.click(extraLarge);
    expect(onChange).toHaveBeenCalledWith("extra-large");
  });

  it("lets an authenticated hiker edit a profile and manage unread notifications across tabs", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);

    const profileTab = screen.getByRole("tab", { name: "Profil" });
    expect(profileTab.className).toContain("min-h-11");
    profileTab.focus();
    expect(document.activeElement).toBe(profileTab);

    const location = await screen.findByDisplayValue("Montréal, QC");
    await user.clear(location);
    await user.type(location, "Laval, QC");
    const save = screen.getByRole("button", { name: "Enregistrer" });
    expect(save.className).toContain("h-13");
    await user.click(save);
    expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ homeLocation: "Laval, QC", bio: "Randonnée tranquille" }));

    await user.click(screen.getByRole("tab", { name: /Alertes/ }));
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Canaux externes non activés");
    expect(screen.getAllByText("Départ imminent").length).toBeGreaterThan(0);
    const notificationButton = screen.getByRole("button", { name: /Départ imminent/ });
    expect(notificationButton.className).not.toContain("opacity-60");
    await user.click(notificationButton);
    expect(mocks.markRead).toHaveBeenCalledWith({ notificationId: 14 });
    await user.click(screen.getByRole("button", { name: "Tout marquer comme lu" }));
    expect(mocks.markAllRead).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("status").some(status => status.textContent?.includes("Toutes les notifications sont lues"))).toBe(true);

    mocks.notificationListQuery.mockReturnValue({ data: [{ id: 14, isRead: true, type: "event", title: "Départ imminent", body: "Retrouvez le groupe au stationnement.", actionPath: "/?view=my-outings" }] });
    rerender(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);
    expect(screen.queryByText("1")).toBeNull();
    expect(screen.getByRole("button", { name: /Départ imminent/ }).className).toContain("opacity-60");

    await user.click(screen.getByRole("tab", { name: "Compte" }));
    expect(screen.getByText("Accès sécurisé")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gérer mon accès" }).className).toContain("h-11");
    const deletion = screen.getByRole("button", { name: "Planifier la suppression" });
    deletion.focus();
    expect(document.activeElement).toBe(deletion);
    expect(screen.getAllByRole("status").some(status => status.textContent?.includes("Aucune invitation de coadministration"))).toBe(true);
    const relationshipSummary = screen.getByText("Relations et administration de communauté");
    expect(relationshipSummary.closest("summary")?.className).toContain("min-h-13");
    const relationshipDetails = relationshipSummary.closest("details");
    expect(relationshipDetails?.hasAttribute("open")).toBe(false);
    await user.click(relationshipSummary);
    expect(relationshipDetails?.hasAttribute("open")).toBe(true);
    expect(screen.getAllByRole("status").some(status => status.textContent?.includes("Aucune relation à gérer"))).toBe(true);
  });

  it("filters the notification list to unread alerts and restores all alerts", async () => {
    const user = userEvent.setup();
    mocks.notificationListQuery.mockReturnValue({ data: [
      { id: 31, isRead: false, type: "event", title: "Nouveau rendez-vous", body: "Point de rencontre mis à jour.", actionPath: null },
      { id: 32, isRead: true, type: "event", title: "Ancienne alerte", body: "Information déjà lue.", actionPath: null },
    ] });
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);

    await user.click(screen.getByRole("tab", { name: /Alertes/ }));
    expect(screen.getByText("Nouveau rendez-vous")).toBeTruthy();
    expect(screen.getByText("Ancienne alerte")).toBeTruthy();
    const unreadOnly = screen.getByRole("button", { name: "Non lues" });
    await user.click(unreadOnly);
    expect(unreadOnly.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Nouveau rendez-vous")).toBeTruthy();
    expect(screen.queryByText("Ancienne alerte")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Toutes" }));
    expect(screen.getByText("Ancienne alerte")).toBeTruthy();
  });

  it("shows a dedicated loading state while the authenticated profile is loading", () => {
    mocks.profileQuery.mockReturnValue({ isLoading: true, data: undefined });
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);
    expect(screen.getByRole("status").textContent).toContain("Chargement de votre espace");
  });

  it("shows a targeted in-app waitlist notification from a collective outing action", async () => {
    const user = userEvent.setup();
    mocks.notificationListQuery.mockReturnValue({ data: [{ id: 72, isRead: false, type: "registration", title: "Liste d’attente", body: "Mont Orford · vous serez informé si une place se libère.", actionPath: "/?view=my-outings" }] });
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);
    await user.click(screen.getByRole("tab", { name: /Alertes/ }));
    expect(screen.getByRole("button", { name: /Liste d’attente/ })).toBeTruthy();
    expect(screen.getByText("Mont Orford · vous serez informé si une place se libère.")).toBeTruthy();
  });

  it("shows the targeted in-app notification for a newly published day-of brief version", async () => {
    const user = userEvent.setup();
    mocks.notificationListQuery.mockReturnValue({ data: [{ id: 74, isRead: false, type: "event_update", title: "Nouvelle version de la fiche Jour J", body: "Mont Saint-Hilaire · La coordination a été mise à jour. Consultez la fiche Jour J avant le départ.", actionPath: "/?view=my-outings&focus=day-of" }] });
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);
    await user.click(screen.getByRole("tab", { name: /Alertes/ }));
    expect(screen.getByRole("button", { name: /Nouvelle version de la fiche Jour J/ })).toBeTruthy();
    expect(screen.getByText(/La coordination a été mise à jour/)).toBeTruthy();
  });

  it("opens the targeted outing and lets the user opt out of day-of brief update alerts", async () => {
    const user = userEvent.setup();
    const onOpenEvent = vi.fn();
    mocks.notificationListQuery.mockReturnValue({ data: [{ id: 75, isRead: false, type: "event_update", title: "Nouvelle version de la fiche Jour J", body: "Mont Saint-Hilaire · Mise à jour : itinéraire.", actionPath: "/?view=my-outings&eventId=31&focus=day-of" }] });
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" onOpenEvent={onOpenEvent} /></AccessibilityProvider>);
    await user.click(screen.getByRole("tab", { name: /Alertes/ }));
    await user.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(onOpenEvent).toHaveBeenCalledWith(31);
    await user.click(screen.getByText("Mises à jour Jour J"));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ dayOfBriefUpdates: false });
  });

  it("announces the empty notification state", async () => {
    const user = userEvent.setup();
    mocks.notificationListQuery.mockReturnValue({ data: [] });
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);
    await user.click(screen.getByRole("tab", { name: /Alertes/ }));
    expect(screen.getAllByRole("status").some(status => status.textContent?.includes("Aucune notification"))).toBe(true);
  });

  it("shows incoming friend requests in alerts and sends the acceptance decision", async () => {
    const user = userEvent.setup();
    mocks.friendshipsQuery.mockReturnValue({ data: [{ id: 41, userId: 18, status: "pending", isIncoming: true, createdAt: new Date("2026-08-12T12:00:00Z"), mutualFriendCount: 2, person: { name: "Nora", profile: { avatarUrl: null, publicSlug: "nora-marche", profileVisibility: "public" } } }], refetch: vi.fn() });
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);
    await user.click(screen.getByRole("tab", { name: /Alertes/ }));
    expect(screen.getByRole("region", { name: "Demandes d’amis reçues" }).textContent).toContain("Nora");
    expect(screen.getByRole("link", { name: "Voir le profil public de Nora" }).getAttribute("href")).toBe("/u/nora-marche");
    expect(screen.getByRole("link", { name: "Voir le profil Nora" }).getAttribute("href")).toBe("/u/nora-marche");
    expect(screen.getByText("2 amis communs")).toBeTruthy();
    expect(screen.getByText(/Envoyée le/)).toBeTruthy();
    await user.click(screen.getByText("Me le rappeler plus tard"));
    await user.click(screen.getByRole("button", { name: "Dans 3 jours" }));
    expect(mocks.deferFriendship).toHaveBeenCalledWith({ friendshipId: 41, remindAt: expect.any(Date) });
    await user.click(screen.getByRole("button", { name: "Accepter" }));
    expect(mocks.respondFriendship).toHaveBeenCalledWith({ friendshipId: 41, action: "accepted" });
  });

  it("shows the private history of accepted and declined friend requests", async () => {
    const user = userEvent.setup();
    mocks.friendshipsQuery.mockReturnValue({ data: [{ id: 58, userId: 18, status: "accepted", isIncoming: false, createdAt: new Date("2026-08-09T12:00:00Z"), updatedAt: new Date("2026-08-10T12:00:00Z"), requestNote: "Ravi de garder le contact après la sortie.", person: { name: "Nora" } }], refetch: vi.fn() });
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" /></AccessibilityProvider>);
    await user.click(screen.getByRole("tab", { name: "Historique" }));
    expect(screen.getByRole("heading", { name: "Historique des demandes" })).toBeTruthy();
    expect(screen.getByText("Votre demande a été acceptée")).toBeTruthy();
    expect(screen.getByText("Votre note")).toBeTruthy();
    expect(screen.getByText("Ravi de garder le contact après la sortie.")).toBeTruthy();
  });
});
