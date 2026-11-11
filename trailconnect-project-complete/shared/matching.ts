export type MatchingPreferences = { preferredDifficulties?: string | null; preferredLanguages?: string | null; interests?: string | null; availabilityDays?: string | null; maxHikeDistanceKm?: number | null; maxElevationGain?: number | null; carpoolPreference?: "any" | "offer" | "need" | "none" | null };
export type MatchingOuting = { title: string; description?: string | null; locationName: string; startsAt: Date; difficulty: string; distanceKm: number; elevationGain: number; capacity: number; carpoolEnabled: boolean; guideLanguages?: string | null };

const tokens = (value?: string | null) => (value || "").toLocaleLowerCase().split(/[;,]/).map(item => item.trim()).filter(Boolean);

export function calculateHikerMatch(preferences: MatchingPreferences | undefined, outing: MatchingOuting) {
  const maxDistance = preferences?.maxHikeDistanceKm ?? 20; const maxElevation = preferences?.maxElevationGain ?? 1000; const preferredDifficulties = tokens(preferences?.preferredDifficulties); const preferredLanguages = tokens(preferences?.preferredLanguages); const interests = tokens(preferences?.interests); const availabilityDays = tokens(preferences?.availabilityDays); const reasons: string[] = []; let score = 5;
  if (!preferredDifficulties.length || preferredDifficulties.includes(outing.difficulty)) { score += 20; reasons.push("difficulty"); }
  if (outing.distanceKm <= maxDistance) { score += 25; reasons.push("distance"); }
  if (outing.elevationGain <= maxElevation) { score += 25; reasons.push("elevation"); }
  const carpool = preferences?.carpoolPreference ?? "any";
  if (carpool === "any" || ((carpool === "offer" || carpool === "need") && outing.carpoolEnabled) || (carpool === "none" && !outing.carpoolEnabled)) { score += 10; reasons.push("carpool"); }
  if (preferredLanguages.length && preferredLanguages.some(language => (outing.guideLanguages || "").toLocaleLowerCase().includes(language))) { score += 10; reasons.push("language"); }
  if (interests.length && interests.some(interest => `${outing.title} ${outing.description || ""} ${outing.locationName}`.toLocaleLowerCase().includes(interest))) { score += 10; reasons.push("interest"); }
  const availabilityTag = [0, 6].includes(outing.startsAt.getDay()) ? "weekend" : "weekday";
  if (availabilityDays.length && availabilityDays.includes(availabilityTag)) { score += 5; reasons.push("availability"); }
  reasons.push("upcoming"); score += 5;
  if (outing.capacity <= 16) { score += 5; reasons.push("group_size"); }
  return { matchScore: Math.min(100, score), matchReasons: reasons };
}
