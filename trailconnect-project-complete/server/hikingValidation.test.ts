import { describe, expect, it } from "vitest";
import { carpoolUpdateSchema, carpoolWithdrawalSchema, eventAccessRadarEntrySchema, eventCarpoolHubSchema, eventCreateSchema, eventDateAvailabilitySchema, eventDateOptionSchema, eventOperationalDecisionSchema, eventPaceGroupAssignmentSchema, eventPaceGroupSchema, eventSearchSchema, messageCreateSchema, postCreateSchema, preparationPassportEntrySchema, routeWeatherSchema, trackUploadSchema } from "./hikingValidation";

describe("hiking event validation", () => {
  const validEvent = {
    title: "Sunrise trail above the valley",
    description: "A well-paced morning hike for people who enjoy alpine landscapes.",
    locationName: "Col du Grand-Saint-Bernard",
    startsAt: "2026-09-06T06:30:00.000Z",
    difficulty: "intermediate" as const,
    distanceKm: 12.4,
    elevationGain: 890,
    durationMinutes: 300,
    capacity: 14,
  };

  it("accepts a complete public event and supplies safe defaults", () => {
    const event = eventCreateSchema.parse(validEvent);
    expect(event.visibility).toBe("public");
    expect(event.requiresApproval).toBe(false);
    expect(event.carpoolEnabled).toBe(false);
    expect(event.toiletsStatus).toBe("unknown");
    expect(event.waterStatus).toBe("unknown");
    expect(event.startsAt).toBeInstanceOf(Date);
  });

  it("accepts facility statuses and representative route-weather points", () => {
    const event = eventCreateSchema.parse({ ...validEvent, toiletsStatus: "available", waterStatus: "limited", parkingStatus: "unavailable", accessibilityNotes: "Step-free parking entrance." });
    expect(event.toiletsStatus).toBe("available");
    expect(routeWeatherSchema.parse({ startsAt: validEvent.startsAt, points: [{ latitude: 49.28, longitude: -123.12, elevationMeters: 120, label: "high_point" }] }).points).toHaveLength(1);
  });

  it("accepts bounded manual route points and initial landmarks without requiring a GPX file", () => {
    const event = eventCreateSchema.parse({ ...validEvent, manualRoutePoints: [{ latitude: 45.5017, longitude: -73.5673 }, { latitude: 45.512, longitude: -73.584 }], initialTerrainLandmarks: [{ type: "water", label: "Fontaine du lac", status: "reported", latitude: 45.505, longitude: -73.575, verifiedAt: "2026-09-01" }] });
    expect(event.gpxUrl).toBeUndefined();
    expect(event.manualRoutePoints).toHaveLength(2);
    expect(event.initialTerrainLandmarks[0]?.label).toBe("Fontaine du lac");
    expect(() => eventCreateSchema.parse({ ...validEvent, manualRoutePoints: [{ latitude: 45, longitude: -73 }], initialTerrainLandmarks: [{ type: "water", label: "Repère incomplet", latitude: 45 }] })).toThrow();
  });

  it("accepts a stored cover image URL and rejects untrusted image locations", () => {
    expect(eventCreateSchema.parse({ ...validEvent, coverImageUrl: "/manus-storage/users/42/social/outing-cover.webp" }).coverImageUrl).toContain("/manus-storage/");
    expect(() => eventCreateSchema.parse({ ...validEvent, coverImageUrl: "javascript:alert(1)" })).toThrow();
  });

  it("accepts an AllTrails source link and rejects other route-source domains", () => {
    expect(eventCreateSchema.parse({ ...validEvent, allTrailsUrl: "https://www.alltrails.com/trail/canada/quebec/boucle-du-parc-du-mont-royal" }).allTrailsUrl).toContain("alltrails.com");
    expect(() => eventCreateSchema.parse({ ...validEvent, allTrailsUrl: "https://example.org/trail" })).toThrow();
  });

  it("accepts a complete optional cover focal point and rejects partial or out-of-range values", () => {
    const focalized = eventCreateSchema.parse({ ...validEvent, coverImageFocalX: 72, coverImageFocalY: 18 });
    expect(focalized.coverImageFocalX).toBe(72);
    expect(focalized.coverImageFocalY).toBe(18);
    expect(eventCreateSchema.parse({ ...validEvent, coverImageFocalX: null, coverImageFocalY: null }).coverImageFocalX).toBeNull();
    expect(() => eventCreateSchema.parse({ ...validEvent, coverImageFocalX: 20 })).toThrow();
    expect(() => eventCreateSchema.parse({ ...validEvent, coverImageFocalX: 101, coverImageFocalY: 20 })).toThrow();
  });

  it("rejects an event without a meaningful description", () => {
    expect(() => eventCreateSchema.parse({ ...validEvent, description: "Too short" })).toThrow();
  });

  it("rejects an empty group message", () => {
    expect(() => messageCreateSchema.parse({ eventId: 7, content: "   " })).toThrow();
  });

  it("accepts five post photos and rejects a sixth", () => {
    const images = ["/manus-storage/1.webp", "/manus-storage/2.webp", "/manus-storage/3.webp", "/manus-storage/4.webp", "/manus-storage/5.webp"];
    expect(postCreateSchema.parse({ body: "Five moments from a wonderful hike.", images }).images).toHaveLength(5);
    expect(() => postCreateSchema.parse({ body: "Six moments should not be accepted.", images: [...images, "/manus-storage/6.webp"] })).toThrow("A post may contain at most five photos");
  });

  it("accepts a GPX track and rejects a file with another extension", () => {
    expect(trackUploadSchema.parse({ filename: "col-des-cimes.gpx", mimeType: "application/gpx+xml", contentBase64: "PHRyeD4=" }).filename).toBe("col-des-cimes.gpx");
    expect(() => trackUploadSchema.parse({ filename: "route.pdf", mimeType: "application/gpx+xml", contentBase64: "PHRyeD4=" })).toThrow();
  });

  it("accepts advanced public outing filters", () => {
    const filters = eventSearchSchema.parse({ query: "Mauricie", difficulty: "advanced", startsAfter: "2026-09-01", maxDistanceKm: 20, maxElevationGain: 900, maxDurationMinutes: 420, minCapacity: 4, carpoolOnly: true, outingType: "guided_hike", bookingMode: "request" });
    expect(filters.maxDurationMinutes).toBe(420);
    expect(filters.outingType).toBe("guided_hike");
    expect(filters.bookingMode).toBe("request");
  });

  it("validates factual organizer decisions, carpool withdrawals and date availability", () => {
    const decision = eventOperationalDecisionSchema.parse({ eventId: 7, outcome: "adapted", note: "Départ déplacé au stationnement nord.", effectiveFrom: "2026-10-02T07:00:00.000Z", effectiveUntil: "2026-10-02T11:00:00.000Z", planBActivated: true, acknowledgementRequired: true });
    expect(decision.outcome).toBe("adapted");
    expect(decision.planBActivated).toBe(true);
    expect(carpoolWithdrawalSchema.parse({ offerId: 9, note: "Imprévu de dernière minute." }).offerId).toBe(9);
    expect(eventDateOptionSchema.parse({ eventId: 7, startsAt: "2026-10-02T09:00:00.000Z", label: "Option samedi" }).startsAt).toBeInstanceOf(Date);
    expect(eventDateAvailabilitySchema.parse({ optionId: 12, available: false }).available).toBe(false);
    expect(() => eventOperationalDecisionSchema.parse({ eventId: 7, outcome: "maintained", note: "Court" })).toThrow();
    expect(() => eventOperationalDecisionSchema.parse({ eventId: 7, outcome: "maintained", note: "Décision datée valable pour la sortie.", effectiveFrom: "2026-10-02T11:00:00.000Z", effectiveUntil: "2026-10-02T07:00:00.000Z" })).toThrow();
  });

  it("validates a carpool ride update with an offer id and consistent seat counts", () => {
    const update = carpoolUpdateSchema.parse({ offerId: 12, eventId: 7, departureLocation: "Station Montmorency", departureAt: "2026-10-02T07:30:00.000Z", seatsTotal: 4, seatsAvailable: 2, note: "Départ avancé" });
    expect(update.offerId).toBe(12);
    expect(update.departureAt).toBeInstanceOf(Date);
    expect(() => carpoolUpdateSchema.parse({ eventId: 7, departureLocation: "Station Montmorency", seatsTotal: 4, seatsAvailable: 2 })).toThrow();
    expect(() => carpoolUpdateSchema.parse({ offerId: 12, eventId: 7, departureLocation: "Station Montmorency", seatsTotal: 2, seatsAvailable: 3 })).toThrow();
    expect(() => carpoolUpdateSchema.parse({ offerId: 12, eventId: 7, departureLocation: "St", seatsTotal: 4, seatsAvailable: 2 })).toThrow();
  });

  it("validates optional operational modules while requiring factual sources and complete coordinates", () => {
    const access = eventAccessRadarEntrySchema.parse({ eventId: 7, category: "parking", status: "caution", label: "Stationnement nord", sourceLabel: "Parc national", sourceUrl: "https://www.sepaq.com/", checkedAt: "2026-10-01" });
    expect(access.checkedAt).toBeInstanceOf(Date);
    expect(() => eventAccessRadarEntrySchema.parse({ ...access, sourceUrl: "http://unsecured.example" })).toThrow();
    expect(eventCarpoolHubSchema.parse({ eventId: 7, label: "Métro Montmorency", latitude: 45.558, longitude: -73.72 }).label).toBe("Métro Montmorency");
    expect(() => eventCarpoolHubSchema.parse({ eventId: 7, label: "Pôle incomplet", latitude: 45.5 })).toThrow();
    expect(eventPaceGroupSchema.parse({ eventId: 7, label: "Rythme régulier", paceDescription: "Allure confortable avec regroupements annoncés.", leaderId: null }).label).toBe("Rythme régulier");
    expect(eventPaceGroupAssignmentSchema.parse({ eventId: 7, groupId: null }).groupId).toBeNull();
    expect(preparationPassportEntrySchema.parse({ eventId: 7, paceReflection: "comfortable", personalNote: "Repère strictement privé." }).paceReflection).toBe("comfortable");
  });
});
