import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const surfaces = [
  ["Compte", "./pages/AccountProfilePage.tsx", "./pages/AccountProfilePage.auth.test.tsx"],
  ["Communauté", "./pages/SocialCommunityPage.tsx", "./pages/SocialCommunityPage.accessibility.test.tsx"],
  ["Messagerie", "./components/MessagingPanel.tsx", "./components/MessagingPanel.accessibility.test.tsx"],
  ["Mes sorties", "./pages/MyOutingsPage.tsx", "./pages/MyOutingsPage.test.tsx"],
  ["Administration", "./pages/AdminPage.tsx", "./pages/AdminPage.accessibility.test.tsx"],
  ["Marketplace", "./pages/MarketplacePage.tsx", "./pages/MarketplacePage.trust.test.tsx"],
] as const;

describe("empty state coverage sweep", () => {
  it("keeps every primary surface linked to an announced state and an automated UI scenario", () => {
    for (const [surface, componentPath, testPath] of surfaces) {
      const component = readFileSync(new URL(componentPath, import.meta.url), "utf8");
      const test = readFileSync(new URL(testPath, import.meta.url), "utf8");
      expect(component, `${surface} must expose an announced empty state`).toContain('role="status"');
      expect(test, `${surface} must retain an automated status assertion`).toMatch(/role\(["']status|role="status"/i);
    }
  });
});
