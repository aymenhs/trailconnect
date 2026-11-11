// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MessagingPanel from "./MessagingPanel";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/lib/trpc", () => {
  const query = () => ({ data: [], refetch: vi.fn(), isError: false });
  return { trpc: {
  useUtils: () => ({ hiking: { social: { groups: { list: { invalidate: vi.fn() } } } } }),
  hiking: {
    messaging: { inbox: { useQuery: query }, preferences: { useQuery: () => ({ data: undefined, refetch: vi.fn() }) }, blocked: { useQuery: query }, thread: { useQuery: () => ({ data: { messages: [] }, refetch: vi.fn(), isError: false }) }, group: { list: { useQuery: query }, send: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, moderate: { useMutation: () => ({ mutate: vi.fn() }) } }, updatePreferences: { useMutation: () => ({ mutate: vi.fn() }) }, send: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, block: { useMutation: () => ({ mutate: vi.fn() }) }, unblock: { useMutation: () => ({ mutate: vi.fn() }) } },
    social: { friendships: { list: { useQuery: query } }, groups: { list: { useQuery: query }, invitations: { useQuery: query }, detail: { useQuery: query }, respondToInvite: { useMutation: () => ({ mutate: vi.fn() }) } } },
    reports: { create: { useMutation: () => ({ mutate: vi.fn() }) } },
  },
} };
});

afterEach(cleanup);

describe("MessagingPanel accessibility", () => {
  it("keeps a single friends surface and retains an announced, keyboard-accessible member contact action", async () => {
    const user = userEvent.setup();
    render(<MessagingPanel />);
    const panel = screen.getByRole("region", { name: "Messages" });
    expect(panel).toBeTruthy();
    expect(panel.hasAttribute("data-messaging-panel")).toBe(true);
    expect(panel.className).toContain("min-w-0");
    expect(screen.getByRole("combobox", { name: "Qui peut vous écrire ?" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Aucune conversation");
    expect(screen.getAllByText("Amis")).toHaveLength(1);
    const memberId = screen.getByPlaceholderText("Identifiant du membre");
    const contact = screen.getByRole("button", { name: "Contacter un membre" });
    expect(contact).toBeTruthy();
    expect(contact.hasAttribute("data-touch-target")).toBe(true);
    expect(contact.className).toContain("min-h-11");
    await user.click(memberId);
    await user.type(memberId, "73");
    await user.tab();
    expect(document.activeElement).toBe(contact);
    await user.keyboard("{Enter}");
    expect(screen.getByPlaceholderText("Écrivez un message…")).toBeTruthy();
    const send = screen.getByRole("button", { name: "Envoyer" });
    const block = screen.getByRole("button", { name: "Bloquer" });
    expect(send.hasAttribute("data-touch-target")).toBe(true);
    expect(block.hasAttribute("data-touch-target")).toBe(true);
    expect(send.className).toContain("size-11");
    expect(block.className).toContain("size-11");
    expect(panel.querySelectorAll("aside.min-w-0")).toHaveLength(1);
  });

  it("opens a direct-message composer when a public profile provides a recipient", () => {
    render(<MessagingPanel initialRecipientId={73} />);
    expect(screen.getByPlaceholderText("Écrivez un message…")).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Qui peut vous écrire ?" }) as HTMLSelectElement).value).toBe("everyone");
  });
});
