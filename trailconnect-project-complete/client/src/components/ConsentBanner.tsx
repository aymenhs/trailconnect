import { useLocale } from "@/contexts/LocaleContext";
import {
  applyConsent,
  initAnalyticsConsent,
  isAnalyticsConfigured,
  readConsent,
} from "@/lib/analyticsConsent";
import { LEGAL_PATHS } from "@/lib/navigation";
import React, { useEffect, useState } from "react";
import { Link } from "wouter";

/**
 * Prior, explicit consent before any measurement is placed — Law 25 in Quebec,
 * PIPEDA federally. Refusing is one click, exactly like accepting: a banner
 * where the only visible action is "accept" is not a valid consent.
 */
export function ConsentBanner() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    if (!isAnalyticsConfigured()) return;
    initAnalyticsConsent();
    setDecided(readConsent() !== null);
  }, []);

  if (decided) return null;

  const decide = (choice: "granted" | "denied") => {
    applyConsent(choice);
    setDecided(true);
  };

  const copy = fr
    ? {
        title: "Mesure d’audience",
        body: "Nous aimerions mesurer l’usage de TrailConnect pour l’améliorer. Aucune donnée n’est mesurée sans votre accord, et vous pouvez le retirer à tout moment depuis Mon espace.",
        accept: "Accepter",
        refuse: "Refuser",
        privacy: "Politique de confidentialité",
      }
    : {
        title: "Usage measurement",
        body: "We would like to measure how TrailConnect is used so we can improve it. Nothing is measured without your agreement, and you can withdraw it at any time from My space.",
        accept: "Accept",
        refuse: "Decline",
        privacy: "Privacy policy",
      };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={copy.title}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dce8d8] bg-white/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-10px_30px_rgba(25,70,53,.14)] backdrop-blur lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm lg:rounded-2xl lg:border"
    >
      <p className="text-sm font-extrabold text-[#234938]">{copy.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed font-semibold text-[#647f71]">
        {copy.body}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => decide("granted")}
          className="min-h-11 flex-1 rounded-xl bg-[#1d493a] px-4 text-xs font-extrabold text-white"
        >
          {copy.accept}
        </button>
        <button
          type="button"
          onClick={() => decide("denied")}
          className="min-h-11 flex-1 rounded-xl border border-[#cddcc7] bg-white px-4 text-xs font-extrabold text-[#3d6a53]"
        >
          {copy.refuse}
        </button>
      </div>
      <Link
        href={LEGAL_PATHS.privacy}
        className="mt-2.5 inline-block text-[11px] font-bold text-[#5c7f6d] underline underline-offset-4"
      >
        {copy.privacy}
      </Link>
    </div>
  );
}
