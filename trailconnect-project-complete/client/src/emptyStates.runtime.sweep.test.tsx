// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Compass } from "lucide-react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 7, role: "user" } }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr", setLocale: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => {
  const query = () => ({ data: [], refetch: vi.fn(), isError: false });
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return { trpc: {
    useUtils: () => ({ hiking: { profile: { mine: { invalidate: vi.fn() } }, notifications: { preferences: { invalidate: vi.fn() }, list: { invalidate: vi.fn() } }, social: { groups: { list: { invalidate: vi.fn() } } } } }),
    hiking: {
      profile: { mine: { useQuery: () => ({ data: { bio: "", homeLocation: "Montréal", experienceLevel: "beginner", timezone: "America/Toronto", units: "metric" } }) }, deletionStatus: { useQuery: () => ({ data: { deletionScheduledAt: null }, refetch: vi.fn() }) }, update: { useMutation: mutation }, requestDeletion: { useMutation: mutation }, cancelDeletion: { useMutation: mutation } },
      notifications: { list: { useQuery: query }, preferences: { useQuery: () => ({ data: { inAppEnabled: true, eventUpdates: true, groupMessages: true } }) }, updatePreferences: { useMutation: mutation }, markRead: { useMutation: mutation }, markAllRead: { useMutation: mutation } },
      social: { friendships: { list: { useQuery: query }, respond: { useMutation: mutation }, defer: { useMutation: mutation }, remove: { useMutation: mutation } }, groups: { list: { useQuery: query }, invitations: { useQuery: query }, detail: { useQuery: query }, coAdmins: { pending: { useQuery: query }, respond: { useMutation: mutation }, invite: { useMutation: mutation } }, respondToInvite: { useMutation: mutation } } },
      integrations: { myConsents: { useQuery: query }, setConsent: { useMutation: mutation } },
      messaging: { inbox: { useQuery: query }, preferences: { useQuery: () => ({ data: { directMessagePolicy: "friends" } }) }, blocked: { useQuery: query }, thread: { useQuery: () => ({ data: { messages: [] }, refetch: vi.fn(), isError: false }) }, group: { list: { useQuery: query }, send: { useMutation: mutation }, moderate: { useMutation: mutation } }, updatePreferences: { useMutation: mutation }, send: { useMutation: mutation }, block: { useMutation: mutation }, unblock: { useMutation: mutation } },
      reports: { create: { useMutation: mutation } },
    },
  } };
});

import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import MessagingPanel from "@/components/MessagingPanel";
import AccountProfilePage from "./pages/AccountProfilePage";
import { Empty as AdminEmpty } from "./pages/AdminPage";
import { MarketplaceEmptyState } from "./pages/MarketplacePage";
import { EmptyState as MyOutingsEmpty } from "./pages/MyOutingsPage";
import { EmptyState as CommunityEmpty } from "./pages/SocialCommunityPage";

afterEach(cleanup);

describe("runtime empty state sweep", () => {
  it("renders announced empty states for account, community, messaging, outings, administration and marketplace", async () => {
    const user = userEvent.setup();
    render(<AccessibilityProvider><AccountProfilePage userName="Camille" /><MessagingPanel /><CommunityEmpty text="Aucune publication communautaire" icon={<Compass />} /><MyOutingsEmpty text="Aucune sortie à préparer" action="Découvrir les sorties" onAction={vi.fn()} /><AdminEmpty text="Aucune réclamation à traiter" /><MarketplaceEmptyState locale="fr" onRefresh={vi.fn()} /></AccessibilityProvider>);

    await user.click(screen.getByRole("tab", { name: "Compte" }));
    await user.click(screen.getByText("Relations et administration de communauté"));

    const announcements = screen.getAllByRole("status").map(status => status.textContent || "").join(" ");
    expect(announcements).toContain("Aucune relation à gérer");
    expect(announcements).toContain("Aucune publication communautaire");
    expect(announcements).toContain("Aucune conversation");
    expect(announcements).toContain("Aucune sortie à préparer");
    expect(announcements).toContain("Aucune réclamation à traiter");
    expect(announcements).toContain("Aucune sortie correspondante");
  });
});
