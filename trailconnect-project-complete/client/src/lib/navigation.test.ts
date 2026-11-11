import { describe, expect, it } from "vitest";
import {
  VIEWS,
  VIEW_PATHS,
  isView,
  legacyViewRedirect,
  pathToView,
  viewToPath,
} from "./navigation";

describe("screen routing", () => {
  it("gives every screen its own distinct URL", () => {
    const paths = VIEWS.map(viewToPath);
    expect(new Set(paths).size).toBe(VIEWS.length);
    paths.forEach(path => expect(path.startsWith("/")).toBe(true));
  });

  it("round-trips each screen through its path", () => {
    VIEWS.forEach(view => expect(pathToView(viewToPath(view))).toBe(view));
  });

  it("keeps the marketplace reachable — it had no navigation entry at all", () => {
    expect(VIEWS).toContain("marketplace");
    expect(pathToView(VIEW_PATHS.marketplace)).toBe("marketplace");
  });

  it("tolerates a trailing slash and falls back to home on an unknown path", () => {
    expect(pathToView("/explorer/")).toBe("explore");
    expect(pathToView("/nowhere")).toBe("home");
    expect(pathToView("/")).toBe("home");
  });

  it("migrates links shared with the legacy ?view= parameter", () => {
    expect(legacyViewRedirect("?view=explore")).toBe("/explorer");
    expect(legacyViewRedirect("?view=my-outings")).toBe("/mes-sorties");
  });

  it("preserves the other query parameters while migrating", () => {
    expect(legacyViewRedirect("?view=my-outings&event=42")).toBe(
      "/mes-sorties?event=42"
    );
  });

  it("opens the outing named by a notification's legacy eventId", () => {
    // Server notifications still write `eventId=`; the outing sheet reads `event=`.
    expect(
      legacyViewRedirect("?view=my-outings&eventId=31&focus=day-of")
    ).toBe("/mes-sorties?focus=day-of&event=31");
  });

  it("leaves a URL alone when there is nothing to migrate", () => {
    expect(legacyViewRedirect("?event=42")).toBeNull();
    expect(legacyViewRedirect("")).toBeNull();
    expect(legacyViewRedirect("?view=not-a-screen")).toBeNull();
  });

  it("rejects values that are not screens", () => {
    expect(isView("explore")).toBe(true);
    expect(isView("explorer")).toBe(false);
    expect(isView(undefined)).toBe(false);
  });
});
