// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildOfflinePack,
  clearOfflinePacks,
  listOfflinePacks,
  saveOfflinePack,
} from "./offline";

const pack = (id: number, startsAt: string) =>
  buildOfflinePack(
    {
      event: {
        id,
        title: `Sortie ${id}`,
        locationName: "Gaspésie",
        startsAt,
        distanceKm: 10,
        elevationGain: 500,
        durationMinutes: 240,
      },
      checklist: [],
      safetyNote: "",
      dayOfBrief: {
        generatedAt: startsAt,
        emergencyPlan: "Refuge du lac",
        carpool: [{ departureLocation: "Rimouski", seatsAvailable: 1, driverName: "Ana" }],
      },
    },
    startsAt
  );

describe("offline packs in the browser", () => {
  beforeEach(() => window.localStorage.clear());

  it("drops packs two days after their outing", () => {
    const now = Date.parse("2026-10-10T12:00:00.000Z");
    saveOfflinePack(pack(1, "2026-10-11T08:00:00.000Z"));
    saveOfflinePack(pack(2, "2026-10-09T08:00:00.000Z"));
    saveOfflinePack(pack(3, "2026-10-01T08:00:00.000Z"));

    expect(listOfflinePacks(now).map(saved => saved.event.id)).toEqual([1, 2]);
    expect(window.localStorage.getItem("trailconnect-offline-3")).toBeNull();
  });

  it("removes unreadable entries instead of failing", () => {
    window.localStorage.setItem("trailconnect-offline-9", "{not json");

    expect(listOfflinePacks()).toEqual([]);
    expect(window.localStorage.getItem("trailconnect-offline-9")).toBeNull();
  });

  it("clears every pack on sign-out and nothing else", () => {
    saveOfflinePack(pack(1, "2099-01-01T08:00:00.000Z"));
    window.localStorage.setItem("trailconnect-locale", "fr");

    clearOfflinePacks();

    expect(listOfflinePacks()).toEqual([]);
    expect(window.localStorage.getItem("trailconnect-locale")).toBe("fr");
  });
});
