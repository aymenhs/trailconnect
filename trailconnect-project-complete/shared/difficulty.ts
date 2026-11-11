export const difficultyLevels = ["beginner", "intermediate", "advanced", "expert"] as const;
export type DifficultyLevel = (typeof difficultyLevels)[number];
export type TerrainType = "maintained" | "natural" | "rocky" | "scramble" | "mixed";
export type Technicality = "none" | "low" | "moderate" | "high";
export type ExposureLevel = "low" | "moderate" | "high";
export type NavigationLevel = "marked" | "basic" | "advanced";
export type RouteCondition = "normal" | "variable" | "wet_or_muddy" | "winter_or_icy";

export type DifficultyInputs = {
  distanceKm: number;
  elevationGain: number;
  durationMinutes: number;
  outingType?: "group_hike" | "guided_hike" | "training" | "private_group";
  terrainType?: TerrainType;
  technicality?: Technicality;
  exposureLevel?: ExposureLevel;
  navigationLevel?: NavigationLevel;
  routeCondition?: RouteCondition;
};

export type DifficultyRecommendation = {
  level: DifficultyLevel;
  version: "trailconnect-1" | "trailconnect-2";
  score: number;
  criteria: Array<"distance" | "elevation" | "duration" | "terrain" | "technicality" | "exposure" | "navigation" | "conditions" | "outing_type">;
};

const finitePositive = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;

/**
 * A transparent, conservative planning aid. It estimates an effort band only;
 * terrain, exposure, navigation, weather and individual capability stay outside
 * the score and must be reviewed by the organizer and each participant.
 */
export function getDifficultyRecommendation(input: DifficultyInputs): DifficultyRecommendation {
  const distanceKm = finitePositive(input.distanceKm);
  const elevationGain = finitePositive(input.elevationGain);
  const durationMinutes = finitePositive(input.durationMinutes);
  const terrainType = input.terrainType ?? "maintained";
  const technicality = input.technicality ?? "none";
  const exposureLevel = input.exposureLevel ?? "low";
  const navigationLevel = input.navigationLevel ?? "marked";
  const routeCondition = input.routeCondition ?? "normal";
  const outingType = input.outingType ?? "group_hike";
  const terrainScore = { maintained: 0, natural: 2, rocky: 5, scramble: 8, mixed: 3 }[terrainType];
  const technicalityScore = { none: 0, low: 2, moderate: 5, high: 9 }[technicality];
  const exposureScore = { low: 0, moderate: 3, high: 6 }[exposureLevel];
  const navigationScore = { marked: 0, basic: 2, advanced: 5 }[navigationLevel];
  const conditionsScore = { normal: 0, variable: 2, wet_or_muddy: 4, winter_or_icy: 7 }[routeCondition];
  const outingScore = { group_hike: 0, guided_hike: 0, training: 1, private_group: 0 }[outingType];
  const score = distanceKm * 1.4 + elevationGain / 85 + durationMinutes / 75 + terrainScore + technicalityScore + exposureScore + navigationScore + conditionsScore + outingScore;
  const criteria: DifficultyRecommendation["criteria"] = [];
  if (distanceKm > 5) criteria.push("distance");
  if (elevationGain > 200) criteria.push("elevation");
  if (durationMinutes > 240) criteria.push("duration");
  if (terrainScore > 0) criteria.push("terrain");
  if (technicalityScore > 0) criteria.push("technicality");
  if (exposureScore > 0) criteria.push("exposure");
  if (navigationScore > 0) criteria.push("navigation");
  if (conditionsScore > 0) criteria.push("conditions");
  if (outingScore > 0) criteria.push("outing_type");

  const requiresBeyondBeginnerSkills = terrainType === "scramble" || technicality === "high" || exposureLevel === "high" || navigationLevel === "advanced" || routeCondition === "winter_or_icy";
  if (distanceKm <= 5 && elevationGain <= 200 && durationMinutes <= 240 && score < 15 && !requiresBeyondBeginnerSkills) return { level: "beginner", version: "trailconnect-2", score, criteria };
  if (distanceKm <= 15 && elevationGain <= 650 && durationMinutes <= 300 && score < 30) return { level: "intermediate", version: "trailconnect-2", score, criteria };
  if (distanceKm <= 25 && elevationGain <= 1400 && durationMinutes <= 540 && score < 58) return { level: "advanced", version: "trailconnect-2", score, criteria };
  return { level: "expert", version: "trailconnect-2", score, criteria };
}

export function classifyOrganizerDifficulty(input: DifficultyInputs & { selectedDifficulty: DifficultyLevel; overrideReason?: string }) {
  const recommendation = getDifficultyRecommendation(input);
  const overrideReason = input.overrideReason?.trim() || null;
  const isOverride = input.selectedDifficulty !== recommendation.level;
  return {
    ...recommendation,
    selectedDifficulty: input.selectedDifficulty,
    isOverride,
    overrideReason: isOverride ? overrideReason : null,
    isValid: true,
  };
}

/** Keeps a form’s selected level aligned with the recommendation until its organizer opts for a manual choice. */
export function synchronizeDifficultySelection(mode: "auto" | "manual", selectedDifficulty: DifficultyLevel, recommendedDifficulty: DifficultyLevel) {
  return mode === "auto"
    ? { difficulty: recommendedDifficulty, shouldClearOverrideReason: true }
    : { difficulty: selectedDifficulty, shouldClearOverrideReason: false };
}
