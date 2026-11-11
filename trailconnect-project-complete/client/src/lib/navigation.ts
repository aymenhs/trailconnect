/**
 * Maps each main screen to a real URL.
 *
 * Every screen used to live behind `?view=` written with `history.replaceState`,
 * which overwrites the current history entry instead of adding one. The browser
 * Back button therefore never returned to the previous tab — it left the
 * application entirely, from any screen — and no screen could be linked to,
 * bookmarked or reloaded without landing back on the home tab.
 */
export const VIEWS = [
  "home",
  "explore",
  "my-outings",
  "marketplace",
  "create",
  "community",
  "profile",
  "account",
  "admin",
] as const;

export type View = (typeof VIEWS)[number];

/** Public URL for each screen. French paths: the product ships FR-first. */
export const VIEW_PATHS: Record<View, string> = {
  home: "/",
  explore: "/explorer",
  "my-outings": "/mes-sorties",
  marketplace: "/matching",
  create: "/creer",
  community: "/communaute",
  profile: "/profil",
  account: "/compte",
  admin: "/admin",
};

/**
 * Legal pages. The application collected location, emergency contacts and
 * emergency plans, and published safety guidance, with no terms, no privacy
 * policy and no legal notice anywhere — none of which Law 25 leaves optional.
 */
export const LEGAL_PATHS = {
  terms: "/conditions",
  privacy: "/confidentialite",
  legal: "/mentions-legales",
} as const;

const PATH_TO_VIEW = new Map<string, View>(
  (Object.entries(VIEW_PATHS) as Array<[View, string]>).map(([view, path]) => [
    path,
    view,
  ])
);

export function isView(value: unknown): value is View {
  return typeof value === "string" && VIEWS.includes(value as View);
}

export function viewToPath(view: View): string {
  return VIEW_PATHS[view];
}

/** Resolves a pathname to its screen, falling back to the home screen. */
export function pathToView(pathname: string): View {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return PATH_TO_VIEW.get(normalized) ?? "home";
}

/**
 * Legacy `?view=` links (shared before the screens had their own URLs) still
 * have to land on the right screen. Returns the path to redirect to, or null
 * when there is nothing to migrate.
 */
export function legacyViewRedirect(search: string): string | null {
  const params = new URLSearchParams(search);
  const requested = params.get("view");
  if (!isView(requested)) return null;
  params.delete("view");
  // Notifications name the outing with `eventId`, but the outing sheet opens
  // from `event`: the link used to land on the screen with nothing selected.
  const eventId = params.get("eventId");
  if (eventId && !params.has("event")) {
    params.delete("eventId");
    params.set("event", eventId);
  }
  const rest = params.toString();
  return `${viewToPath(requested)}${rest ? `?${rest}` : ""}`;
}
