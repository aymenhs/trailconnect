// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const invalidate = vi.fn();
const group = {
  name: "Collectif randonnée Montréal et Laurentides",
  description: null,
  locationName: "Montréal",
  websiteUrl: null,
  visibility: "public" as const,
  coverImageUrl: null,
  viewerRole: "owner" as const,
  content: [],
  members: [],
};

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ hiking: { social: { groups: { list: { invalidate } } } } }),
    hiking: {
      social: {
        groups: {
          detail: { useQuery: () => ({ data: group, isLoading: false, refetch: vi.fn() }) },
          update: { useMutation: () => ({ mutate: vi.fn() }) },
          delete: { useMutation: () => ({ mutate: vi.fn() }) },
          invite: { useMutation: () => ({ mutate: vi.fn() }) },
          leave: { useMutation: () => ({ mutate: vi.fn() }) },
          setMemberRole: { useMutation: () => ({ mutate: vi.fn() }) },
          createPost: { useMutation: () => ({ mutate: vi.fn() }) },
          deletePost: { useMutation: () => ({ mutate: vi.fn() }) },
        },
        friendships: { list: { useQuery: () => ({ data: [] }) } },
      },
      media: { uploadImage: { useMutation: () => ({ mutate: vi.fn() }) } },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import GroupManagementPanel from "./GroupManagementPanel";

const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

afterEach(cleanup);

describe("Group management overlay mobile containment", () => {
  it("renders the group-management panel inside the fixed-overlay containment rule", () => {
    const { container } = render(<GroupManagementPanel groupId={12} onClose={vi.fn()} />);
    const overlay = container.firstElementChild as HTMLElement;
    const modal = overlay.firstElementChild as HTMLElement;

    expect(screen.getByText("Collectif randonnée Montréal et Laurentides")).toBeTruthy();
    expect(overlay.className).toContain("fixed");
    expect(overlay.className).toContain("inset-0");
    expect(modal.className).toContain("mx-auto");
    expect(css).toContain(".fixed.inset-0 > .mx-auto { width: 100%; min-width: 0; max-width: 100%; }");
  });

  it("closes from the Escape key", () => {
    const onClose = vi.fn();
    render(<GroupManagementPanel groupId={12} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
