import { useLocale } from "@/contexts/LocaleContext";
import { CloudOff, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Two honest signals the application owed its users and did not have.
 *
 * Offline: the app now starts without network, but what it shows is the last
 * data it saw. On a hiking product that matters — weather and access statuses
 * go stale, and letting someone believe otherwise at a trailhead is the failure
 * mode worth avoiding. So the state is stated plainly rather than hidden.
 *
 * Update: a service worker keeps serving the old build until the new one is
 * activated, so the user is offered the reload instead of being stuck on a
 * stale version.
 */
export function OfflineStatusBar() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: error =>
      console.error("[PWA] Service worker registration failed", error),
  });

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!online) {
    return (
      <div
        role="status"
        className="sticky top-0 z-50 flex items-center gap-2 bg-[#8b6a27] px-4 py-2 text-[11px] font-extrabold text-white"
      >
        <CloudOff size={14} aria-hidden="true" />
        <span>
          {fr
            ? "Hors ligne — informations enregistrées lors de votre dernière connexion. Météo et accès non actualisés."
            : "Offline — showing what was saved on your last connection. Weather and access status are not up to date."}
        </span>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <div
        role="status"
        className="sticky top-0 z-50 flex flex-wrap items-center gap-2 bg-[#1d493a] px-4 py-2 text-[11px] font-extrabold text-white"
      >
        <RefreshCw size={14} aria-hidden="true" />
        <span>
          {fr
            ? "Une nouvelle version est disponible."
            : "A new version is available."}
        </span>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="min-h-8 rounded-lg bg-white/15 px-2.5 py-1 font-extrabold"
        >
          {fr ? "Actualiser" : "Reload"}
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-8 rounded-lg px-2 py-1 font-bold text-white/70"
        >
          {fr ? "Plus tard" : "Later"}
        </button>
      </div>
    );
  }

  return null;
}
