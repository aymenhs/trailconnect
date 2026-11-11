export type SafetyNoticeInput = {
  locale: "fr" | "en";
  hasWeatherSource: boolean;
  hasEmergencyPlan: boolean;
  hasOfflinePack: boolean;
};

export function buildSafetyNotice(input: SafetyNoticeInput) {
  const missing = [
    !input.hasWeatherSource && "weather",
    !input.hasEmergencyPlan && "emergency_plan",
    !input.hasOfflinePack && "offline_pack",
  ].filter(Boolean) as Array<"weather" | "emergency_plan" | "offline_pack">;
  const fr = {
    heading: "Préparez votre sortie en autonomie",
    body: "Les informations de TrailConnect sont indicatives. Vérifiez les conditions locales, votre matériel, votre niveau et les consignes de l’organisateur avant le départ.",
  };
  const en = {
    heading: "Prepare your outing independently",
    body: "TrailConnect information is indicative. Check local conditions, your equipment, your level and the organizer’s instructions before departure.",
  };
  return { ...((input.locale === "fr" ? fr : en)), missing, complete: missing.length === 0 };
}

import { getDifficultyRecommendation } from "@shared/difficulty";

export function normalizedDifficulty(distanceKm: number, elevationGain: number, durationMinutes: number) {
  return getDifficultyRecommendation({ distanceKm, elevationGain, durationMinutes }).level;
}
