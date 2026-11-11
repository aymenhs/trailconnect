/**
 * Analytics was loaded unconditionally from `index.html`, before the visitor
 * had said anything. Under Quebec's Law 25 (and PIPEDA) that measurement needs
 * a free, informed, prior consent, and it must be as easy to withdraw as to
 * give. So the script is no longer in the document: it is injected here, and
 * only after an explicit yes.
 */

const STORAGE_KEY = "trailconnect-analytics-consent";

export type ConsentChoice = "granted" | "denied";

export function readConsent(): ConsentChoice | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "granted" || stored === "denied" ? stored : null;
  } catch {
    // Private browsing or blocked storage: treat as "not decided yet" rather
    // than assuming consent.
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // The choice still applies to this page view even if it cannot persist.
  }
}

const SCRIPT_ID = "trailconnect-analytics";

export function isAnalyticsConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_ANALYTICS_ENDPOINT &&
      import.meta.env.VITE_ANALYTICS_WEBSITE_ID
  );
}

/** Injects the measurement script. Safe to call more than once. */
export function loadAnalytics(): void {
  if (!isAnalyticsConfigured()) return;
  if (document.getElementById(SCRIPT_ID)) return;

  const endpoint = String(import.meta.env.VITE_ANALYTICS_ENDPOINT).replace(
    /\/+$/,
    ""
  );
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.defer = true;
  script.src = `${endpoint}/umami`;
  script.dataset.websiteId = String(import.meta.env.VITE_ANALYTICS_WEBSITE_ID);
  document.head.appendChild(script);
}

/**
 * Withdrawing consent has to actually stop the measurement, not just record a
 * preference — hence removing the script and clearing what it stored.
 */
export function unloadAnalytics(): void {
  document.getElementById(SCRIPT_ID)?.remove();
  try {
    Object.keys(window.localStorage)
      .filter(key => key.startsWith("umami."))
      .forEach(key => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export function applyConsent(choice: ConsentChoice): void {
  writeConsent(choice);
  if (choice === "granted") loadAnalytics();
  else unloadAnalytics();
}

/** Applies a previously recorded choice at startup. */
export function initAnalyticsConsent(): void {
  if (readConsent() === "granted") loadAnalytics();
}
