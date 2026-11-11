import { describe, expect, it } from "vitest";
import { classifyOrganizerDifficulty, getDifficultyRecommendation, synchronizeDifficultySelection } from "../shared/difficulty";
import { createHikingEvent } from "./db";

describe("difficulty recommendation", () => {
  it("uses distance, ascent and duration to produce conservative planning bands", () => {
    expect(getDifficultyRecommendation({ distanceKm: 4, elevationGain: 120, durationMinutes: 100 }).level).toBe("beginner");
    expect(getDifficultyRecommendation({ distanceKm: 1, elevationGain: 1, durationMinutes: 210 }).level).toBe("beginner");
    expect(getDifficultyRecommendation({ distanceKm: 1, elevationGain: 1, durationMinutes: 90, technicality: "high" }).level).toBe("intermediate");
    expect(getDifficultyRecommendation({ distanceKm: 1, elevationGain: 1, durationMinutes: 90, terrainType: "scramble", technicality: "moderate", exposureLevel: "high", navigationLevel: "advanced", routeCondition: "winter_or_icy" }).level).toBe("advanced");
    expect(getDifficultyRecommendation({ distanceKm: 10, elevationGain: 450, durationMinutes: 240 }).level).toBe("intermediate");
    expect(getDifficultyRecommendation({ distanceKm: 19, elevationGain: 1050, durationMinutes: 420 }).level).toBe("advanced");
    expect(getDifficultyRecommendation({ distanceKm: 30, elevationGain: 1600, durationMinutes: 600 }).level).toBe("expert");
  });

  it("keeps a different organizer level valid without requiring an explanation", () => {
    const withoutReason = classifyOrganizerDifficulty({ distanceKm: 4, elevationGain: 120, durationMinutes: 100, selectedDifficulty: "advanced" });
    const withReason = classifyOrganizerDifficulty({ distanceKm: 4, elevationGain: 120, durationMinutes: 100, selectedDifficulty: "advanced", overrideReason: "Terrain rocheux et passages techniques continus." });
    expect(withoutReason).toMatchObject({ isValid: true, isOverride: true, level: "beginner", selectedDifficulty: "advanced", overrideReason: null });
    expect(withReason).toMatchObject({ isValid: true, isOverride: true, level: "beginner", selectedDifficulty: "advanced", version: "trailconnect-2" });
  });

  it("synchronizes the selected form level in automatic mode but preserves a manual organizer choice", () => {
    expect(synchronizeDifficultySelection("auto", "intermediate", getDifficultyRecommendation({ distanceKm: 1, elevationGain: 1, durationMinutes: 210 }).level)).toEqual({ difficulty: "beginner", shouldClearOverrideReason: true });
    expect(synchronizeDifficultySelection("manual", "advanced", getDifficultyRecommendation({ distanceKm: 1, elevationGain: 1, durationMinutes: 210, technicality: "high" }).level)).toEqual({ difficulty: "advanced", shouldClearOverrideReason: false });
  });

  it("persists the final organizer choice alongside the calculated recommendation and reason", async () => {
    let saved: Record<string, unknown> | undefined;
    const eventId = await createHikingEvent(27, {
      title: "Crête technique du Mont Tremblant",
      description: "Une sortie de groupe sur une crête rocheuse avec des passages techniques.",
      locationName: "Mont-Tremblant, QC",
      startsAt: new Date("2026-09-12T14:00:00Z"),
      difficulty: "advanced",
      difficultyOverrideReason: "Terrain rocheux et passages techniques continus.",
      terrainType: "rocky",
      technicality: "moderate",
      exposureLevel: "moderate",
      navigationLevel: "basic",
      routeCondition: "wet_or_muddy",
      distanceKm: 4,
      elevationGain: 120,
      durationMinutes: 100,
      capacity: 10,
    }, async values => { saved = values; return 91; });
    expect(eventId).toBe(91);
    expect(saved).toMatchObject({
      hostId: 27,
      difficulty: "advanced",
      difficultySuggested: "beginner",
      difficultyCalculatorVersion: "trailconnect-2",
      difficultyOverrideReason: "Terrain rocheux et passages techniques continus.",
      terrainType: "rocky",
      technicality: "moderate",
      exposureLevel: "moderate",
      navigationLevel: "basic",
      routeCondition: "wet_or_muddy",
    });
  });
});
