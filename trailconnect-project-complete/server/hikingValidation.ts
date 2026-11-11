import { z } from "zod";

/**
 * Uploads live under `/uploads/`. Rows written while the app ran on Manus still
 * hold the old `/manus-storage/` prefix and stay readable, so both are accepted
 * here — otherwise editing an existing outing would fail validation on a cover
 * image it never changed.
 */
const UPLOAD_PREFIXES = ["/uploads/", "/manus-storage/"] as const;

export const isUploadedAssetUrl = (url: string): boolean =>
  UPLOAD_PREFIXES.some(prefix => url.startsWith(prefix));

export const difficultyValues = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export const levelAdmissionPolicyValues = [
  "declarative",
  "confirmation",
  "organizer_review",
] as const;
export const visibilityValues = ["public", "private", "invite"] as const;
export const facilityStatusValues = [
  "available",
  "limited",
  "unavailable",
  "unknown",
] as const;
export const packingCategoryValues = [
  "essential",
  "safety",
  "comfort",
  "food",
] as const;
const packingItemInputSchema = z.object({
  label: z.string().trim().min(2).max(180),
  category: z.enum(packingCategoryValues).default("essential"),
  isRequired: z.boolean().default(false),
});
const initialLogisticsInputSchema = z
  .object({
    meetingPoint: z.string().trim().max(240).optional(),
    meetingInstructions: z.string().trim().max(2000).optional(),
  })
  .refine(
    value => Boolean(value.meetingPoint) || Boolean(value.meetingInstructions),
    "Add a meeting point or an instruction"
  );
const manualRoutePointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
const manualRouteAttentionZoneSchema = z.object({
  type: z.enum(["attention", "hazard", "access", "navigation"]),
  note: z.string().trim().min(3).max(280),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
const initialTerrainLandmarkInputSchema = z
  .object({
    type: z.enum(["water", "shelter", "parking"]),
    label: z.string().trim().min(3).max(180),
    note: z.string().trim().max(1200).optional(),
    status: z
      .enum(["reported", "limited", "unavailable", "unknown"])
      .default("unknown"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    verifiedAt: z.coerce.date().optional(),
  })
  .refine(
    value => (value.latitude === undefined) === (value.longitude === undefined),
    "Provide both landmark coordinates or neither"
  );

export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(4).max(120),
    description: z.string().trim().min(20).max(2000),
    locationName: z.string().trim().min(3).max(180),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    startsAt: z.coerce.date(),
    visibility: z.enum(visibilityValues).default("public"),
    difficulty: z.enum(difficultyValues),
    difficultyOverrideReason: z.string().trim().min(10).max(600).optional(),
    levelAdmissionPolicy: z
      .enum(levelAdmissionPolicyValues)
      .default("declarative"),
    levelRequirementNote: z.string().trim().min(10).max(600).optional(),
    terrainType: z
      .enum(["maintained", "natural", "rocky", "scramble", "mixed"])
      .default("maintained"),
    technicality: z.enum(["none", "low", "moderate", "high"]).default("none"),
    exposureLevel: z.enum(["low", "moderate", "high"]).default("low"),
    navigationLevel: z.enum(["marked", "basic", "advanced"]).default("marked"),
    routeCondition: z
      .enum(["normal", "variable", "wet_or_muddy", "winter_or_icy"])
      .default("normal"),
    distanceKm: z.number().min(0.5).max(500),
    elevationGain: z.number().int().min(0).max(15000),
    durationMinutes: z.number().int().min(15).max(4320),
    capacity: z.number().int().min(2).max(500),
    requiresApproval: z.boolean().default(false),
    carpoolEnabled: z.boolean().default(false),
    outingType: z
      .enum(["group_hike", "guided_hike", "training", "private_group"])
      .default("group_hike"),
    bookingMode: z.enum(["instant", "request"]).default("instant"),
    /**
     * Paid outings are refused until a payment flow exists.
     *
     * `stripe` is a dependency and the keys are configured, but not one line of
     * payment code is implemented anywhere in the project. An organizer could
     * therefore publish a $45 outing, take registrations and never be able to
     * collect — a dead end for both sides, and a commercial and legal exposure.
     * Lift this bound in the same change that ships checkout.
     */
    priceCents: z
      .number()
      .int()
      .min(0)
      .max(0, "Paid outings are not available yet")
      .default(0),
    toiletsStatus: z.enum(facilityStatusValues).default("unknown"),
    waterStatus: z.enum(facilityStatusValues).default("unknown"),
    parkingStatus: z.enum(facilityStatusValues).default("unknown"),
    receptionStatus: z.enum(facilityStatusValues).default("unknown"),
    cellReceptionStatus: z.enum(facilityStatusValues).default("unknown"),
    accessibilityNotes: z.string().trim().max(1200).optional(),
    facilitiesNotes: z.string().trim().max(2000).optional(),
    facilitiesVerifiedAt: z.coerce.date().optional(),
    gpxUrl: z
      .string()
      .min(1)
      .max(1024)
      .refine(
        url => isUploadedAssetUrl(url) || url.startsWith("https://"),
        "Invalid track URL"
      )
      .optional(),
    allTrailsUrl: z
      .string()
      .trim()
      .url()
      .max(1024)
      .refine(url => {
        const host = new URL(url).hostname.toLowerCase();
        return (
          host === "alltrails.com" ||
          host.endsWith(".alltrails.com") ||
          host === "alltrails.io"
        );
      }, "Use a valid AllTrails link")
      .optional(),
    localWeatherSourceLabel: z.string().trim().min(3).max(120).optional(),
    localWeatherSourceUrl: z
      .string()
      .trim()
      .url()
      .max(1024)
      .refine(
        url => url.startsWith("https://"),
        "Use a secure HTTPS weather source URL"
      )
      .optional(),
    participantGuidance: z.string().trim().max(2000).optional(),
    cancellationPolicy: z.string().trim().max(1200).optional(),
    initialLogistics: initialLogisticsInputSchema.optional(),
    manualRoutePoints: z.array(manualRoutePointSchema).max(300).default([]),
    manualRouteRoundTrip: z.boolean().default(false),
    manualRouteAttentionZones: z
      .array(manualRouteAttentionZoneSchema)
      .max(32)
      .default([]),
    initialTerrainLandmarks: z
      .array(initialTerrainLandmarkInputSchema)
      .max(24)
      .default([]),
    packingItems: z.array(packingItemInputSchema).max(24).default([]),
    coverImageUrl: z
      .string()
      .min(1)
      .max(1024)
      .refine(
        url => isUploadedAssetUrl(url) || url.startsWith("https://"),
        "Invalid cover image URL"
      )
      .optional(),
    coverImageFocalX: z.number().min(0).max(100).nullable().optional(),
    coverImageFocalY: z.number().min(0).max(100).nullable().optional(),
  })
  .refine(
    value =>
      (value.coverImageFocalX === undefined ||
        value.coverImageFocalX === null) ===
      (value.coverImageFocalY === undefined || value.coverImageFocalY === null),
    "Provide both focal coordinates or neither"
  );
export const eventUpdateSchema = eventCreateSchema.safeExtend({
  eventId: z.number().int().positive(),
});
export const eventCoverFocalPointSchema = z
  .object({
    eventId: z.number().int().positive(),
    focalX: z.number().min(0).max(100).nullable(),
    focalY: z.number().min(0).max(100).nullable(),
  })
  .refine(
    value => (value.focalX === null) === (value.focalY === null),
    "Provide both focal coordinates or clear both"
  );
export const eventManualRouteUpdateSchema = z.object({
  eventId: z.number().int().positive(),
  points: z.array(manualRoutePointSchema).max(300),
  roundTrip: z.boolean().default(false),
  attentionZones: z.array(manualRouteAttentionZoneSchema).max(32).default([]),
});
export const localWeatherSourceSchema = z
  .object({
    eventId: z.number().int().positive(),
    label: z.string().trim().min(3).max(120).optional(),
    url: z
      .string()
      .trim()
      .url()
      .max(1024)
      .refine(
        url => url.startsWith("https://"),
        "Use a secure HTTPS weather source URL"
      )
      .optional(),
  })
  .refine(
    value => Boolean(value.label) === Boolean(value.url),
    "Provide both a label and secure URL, or clear both fields"
  );
export const weatherUpdateSchema = z.object({
  eventId: z.number().int().positive(),
  note: z.string().trim().min(10).max(600),
});
export const weatherUpdateAcknowledgementSchema = z.object({
  eventId: z.number().int().positive(),
  weatherUpdateId: z.number().int().positive(),
});
export const eventMessagePinSchema = z.object({
  eventId: z.number().int().positive(),
  messageId: z.number().int().positive(),
  isPinned: z.boolean(),
});
export const eventConditionReportSchema = z.object({
  eventId: z.number().int().positive(),
  category: z.enum([
    "trail_surface",
    "precipitation",
    "snow_ice",
    "access",
    "water",
    "parking",
    "cellular",
  ]),
  note: z.string().trim().min(10).max(600),
});
export const eventActionAssignmentSchema = z.object({
  eventId: z.number().int().positive(),
  action: z.enum(["meeting", "weather", "transport", "readiness", "day_of"]),
  assigneeId: z.number().int().positive().nullable(),
});
export const eventTerrainLandmarkSchema = z
  .object({
    eventId: z.number().int().positive(),
    type: z.enum(["water", "shelter", "parking"]),
    label: z.string().trim().min(3).max(120),
    note: z.string().trim().max(600).optional(),
    status: z
      .enum(["reported", "limited", "unavailable", "unknown"])
      .default("unknown"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    verifiedAt: z.coerce.date().optional(),
  })
  .refine(
    value => (value.latitude === undefined) === (value.longitude === undefined),
    "Provide both coordinates or neither"
  );
export const eventTerrainLandmarkUpdateSchema =
  eventTerrainLandmarkSchema.safeExtend({
    landmarkId: z.number().int().positive(),
  });
export const eventTerrainLandmarkDeleteSchema = z.object({
  eventId: z.number().int().positive(),
  landmarkId: z.number().int().positive(),
});

export const routeWeatherSchema = z.object({
  startsAt: z.coerce.date(),
  points: z
    .array(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        elevationMeters: z.number().min(-500).max(10000).optional(),
        label: z.string().trim().max(40).optional(),
      })
    )
    .min(1)
    .max(4),
});

export const guideProfileSchema = z.object({
  headline: z.string().trim().max(180).optional(),
  bio: z.string().trim().max(2000).optional(),
  languages: z.string().trim().max(180).optional(),
  serviceRegions: z.string().trim().max(360).optional(),
  certifications: z.string().trim().max(1024).optional(),
  submitForReview: z.boolean().optional(),
});
export const hikerPreferencesSchema = z.object({
  preferredDifficulties: z.string().trim().max(180).optional(),
  interests: z.string().trim().max(360).optional(),
  preferredLanguages: z.string().trim().max(180).optional(),
  availabilityDays: z.string().trim().max(120).optional(),
  maxDistanceKm: z.number().int().min(0).max(500).optional(),
  maxHikeDistanceKm: z.number().min(1).max(100).optional(),
  maxElevationGain: z.number().int().min(0).max(10000).optional(),
  carpoolPreference: z.enum(["any", "offer", "need", "none"]).optional(),
});
export const bookingRequestSchema = z.object({
  eventId: z.number().int().positive(),
  note: z.string().trim().max(600).optional(),
  levelAcknowledged: z.boolean().default(false),
  levelExceptionNote: z.string().trim().min(10).max(600).optional(),
});
export const bookingDecisionSchema = z.object({
  requestId: z.number().int().positive(),
  status: z.enum(["accepted", "declined"]),
  levelExceptionDecisionNote: z.string().trim().min(10).max(600).optional(),
});
export const eventLogisticsSchema = z
  .object({
    eventId: z.number().int().positive(),
    meetingPoint: z.string().trim().max(240).optional(),
    meetingInstructions: z.string().trim().max(2000).optional(),
    emergencyPlan: z.string().trim().max(2000).optional(),
    operationalRoute: z.string().trim().max(2000).optional(),
    backupPlan: z.string().trim().max(2000).optional(),
    routeImageUrl: z
      .string()
      .min(1)
      .max(1024)
      .refine(url => isUploadedAssetUrl(url), "Use an uploaded route image")
      .nullable()
      .optional(),
    terrainStatus: z
      .enum(["unknown", "open", "caution", "restricted", "closed"])
      .optional(),
    accessStatus: z
      .enum(["unknown", "open", "caution", "restricted", "closed"])
      .optional(),
    terrainAccessNote: z.string().trim().max(1200).optional(),
    terrainSourceLabel: z.string().trim().min(3).max(120).optional(),
    terrainSourceUrl: z
      .string()
      .trim()
      .url()
      .max(1024)
      .refine(
        url => url.startsWith("https://"),
        "Use a secure HTTPS source URL"
      )
      .optional(),
    terrainCheckedAt: z.coerce.date().optional(),
    equipmentNotes: z.string().trim().max(2000).optional(),
    weatherPolicy: z.string().trim().max(600).optional(),
  })
  .refine(
    value =>
      Boolean(value.terrainSourceLabel) === Boolean(value.terrainSourceUrl),
    "Provide both a source name and a secure URL, or clear both"
  );
export const dayOfBriefAcknowledgeSchema = z.object({
  eventId: z.number().int().positive(),
});
export const carpoolOfferSchema = z
  .object({
    eventId: z.number().int().positive(),
    hubId: z.number().int().positive().nullable().optional(),
    departureLocation: z.string().trim().min(3).max(180),
    departureAt: z.coerce.date().optional(),
    seatsTotal: z.number().int().min(1).max(8),
    seatsAvailable: z.number().int().min(0).max(8),
    note: z.string().trim().max(600).optional(),
  })
  .refine(
    value => value.seatsAvailable <= value.seatsTotal,
    "Available seats cannot exceed total seats"
  );
export const carpoolUpdateSchema = carpoolOfferSchema.safeExtend({
  offerId: z.number().int().positive(),
});
export const carpoolSeatReservationSchema = z.object({
  offerId: z.number().int().positive(),
  seatsRequested: z.number().int().min(1).max(4).default(1),
  note: z.string().trim().max(600).optional(),
});
export const carpoolSeatDecisionSchema = z.object({
  reservationId: z.number().int().positive(),
  status: z.enum(["accepted", "declined"]),
});
export const carpoolSeatRemovalSchema = z.object({
  reservationId: z.number().int().positive(),
  note: z.string().trim().max(600).optional(),
});
export const carpoolWithdrawalSchema = z.object({
  offerId: z.number().int().positive(),
  note: z.string().trim().min(5).max(600).optional(),
});
export const eventCarpoolHubSchema = z
  .object({
    eventId: z.number().int().positive(),
    label: z.string().trim().min(3).max(120),
    instructions: z.string().trim().max(600).optional(),
    fallbackNote: z.string().trim().max(600).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine(
    value => (value.latitude === undefined) === (value.longitude === undefined),
    "Provide both hub coordinates or neither"
  );
export const eventCarpoolHubDeleteSchema = z.object({
  eventId: z.number().int().positive(),
  hubId: z.number().int().positive(),
});
export const eventAccessRadarEntrySchema = z.object({
  eventId: z.number().int().positive(),
  category: z.enum(["trail", "access", "parking", "permit", "closure"]),
  status: z.enum(["unknown", "open", "caution", "restricted", "closed"]),
  label: z.string().trim().min(3).max(140),
  note: z.string().trim().max(600).optional(),
  sourceLabel: z.string().trim().min(3).max(120),
  sourceUrl: z
    .string()
    .trim()
    .url()
    .max(1024)
    .refine(
      url => url.startsWith("https://"),
      "Use a secure HTTPS official source URL"
    ),
  checkedAt: z.coerce.date(),
});
export const eventAccessRadarEntryDeleteSchema = z.object({
  eventId: z.number().int().positive(),
  entryId: z.number().int().positive(),
});
export const eventOperationalDecisionSchema = z
  .object({
    eventId: z.number().int().positive(),
    outcome: z.enum(["maintained", "adapted", "cancelled"]),
    note: z.string().trim().min(10).max(600),
    effectiveFrom: z.coerce.date().optional(),
    effectiveUntil: z.coerce.date().optional(),
    planBActivated: z.boolean().default(false),
    acknowledgementRequired: z.boolean().default(false),
  })
  .refine(
    value =>
      !value.effectiveFrom ||
      !value.effectiveUntil ||
      value.effectiveUntil > value.effectiveFrom,
    "The decision window must end after it starts"
  );
export const eventOperationalDecisionAcknowledgementSchema = z.object({
  eventId: z.number().int().positive(),
  decisionId: z.number().int().positive(),
});
export const eventPaceGroupSchema = z.object({
  eventId: z.number().int().positive(),
  label: z.string().trim().min(3).max(100),
  paceDescription: z.string().trim().min(8).max(400),
  rallyPoints: z.string().trim().max(1200).optional(),
  leaderId: z.number().int().positive().nullable().optional(),
});
export const eventPaceGroupDeleteSchema = z.object({
  eventId: z.number().int().positive(),
  groupId: z.number().int().positive(),
});
export const eventPaceGroupAssignmentSchema = z.object({
  eventId: z.number().int().positive(),
  groupId: z.number().int().positive().nullable(),
});
export const preparationPassportEntrySchema = z.object({
  eventId: z.number().int().positive(),
  terrainReflection: z.string().trim().max(600).optional(),
  paceReflection: z
    .enum(["comfortable", "steady", "challenging", "not_recorded"])
    .default("not_recorded"),
  conditionsReflection: z.string().trim().max(600).optional(),
  equipmentReflection: z.string().trim().max(600).optional(),
  personalNote: z.string().trim().max(1200).optional(),
});
export const eventDateOptionSchema = z.object({
  eventId: z.number().int().positive(),
  startsAt: z.coerce.date(),
  label: z.string().trim().max(120).optional(),
});
export const eventDateAvailabilitySchema = z.object({
  optionId: z.number().int().positive(),
  available: z.boolean(),
});
export const eventDateOptionPublishSchema = z.object({
  optionId: z.number().int().positive(),
});
export const eventSeriesCreateSchema = z.object({
  sourceEventId: z.number().int().positive(),
  name: z.string().trim().min(3).max(120),
  cadence: z.enum(["weekly", "biweekly", "monthly"]),
});
export const eventSeriesIdSchema = z.object({
  seriesId: z.number().int().positive(),
});
export const eventSeriesRelaunchSchema = z.object({
  eventId: z.number().int().positive(),
  participantIds: z.array(z.number().int().positive()).min(1).max(100),
  message: z.string().trim().min(10).max(600),
});
export const invitationTemplateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  content: z.string().trim().min(20).max(2000),
});
export const invitationTemplateDeleteSchema = z.object({
  templateId: z.number().int().positive(),
});
export const eventInvitationShareSchema = z.object({
  eventId: z.number().int().positive(),
  action: z.enum(["copy", "share"]),
});
export const safetyConsentSchema = z.object({
  locationSharingEnabled: z.boolean(),
  emergencyContactEnabled: z.boolean(),
});
export const outdoorServiceConsentSchema = z.object({
  provider: z.enum([
    "strava",
    "garmin",
    "apple_health",
    "health_connect",
    "inreach",
    "zoleo",
    "spot",
  ]),
  purpose: z.enum(["route_exchange", "activity_import", "check_in"]),
  enabled: z.boolean(),
});
export const safetyCheckInSchema = z.object({
  eventId: z.number().int().positive(),
  kind: z.enum(["departure", "arrival", "manual_ok"]),
  note: z.string().trim().max(280).optional(),
});
export const liveLocationShareSchema = z.object({
  eventId: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(10000).optional(),
  durationMinutes: z
    .union([z.literal(15), z.literal(30), z.literal(60)])
    .default(30),
});
export const liveLocationStopSchema = z.object({
  eventId: z.number().int().positive(),
});

export const eventJoinSchema = z.object({
  eventId: z.number().int().positive(),
  levelAcknowledged: z.boolean().default(false),
  levelExceptionNote: z.string().trim().min(10).max(600).optional(),
});
export const eventIdSchema = z.object({ eventId: z.number().int().positive() });
export const eventPreparationUpdateSchema = z
  .object({
    eventId: z.number().int().positive(),
    meetingAcknowledged: z.boolean().optional(),
    transportConfirmed: z.boolean().optional(),
    checklistCompleted: z.boolean().optional(),
    offlineReady: z.boolean().optional(),
  })
  .refine(
    value =>
      value.meetingAcknowledged !== undefined ||
      value.transportConfirmed !== undefined ||
      value.checklistCompleted !== undefined ||
      value.offlineReady !== undefined,
    "Choose at least one preparation status to update"
  );
export const participantPackingItemSchema = z.object({
  eventId: z.number().int().positive(),
  itemKey: z
    .string()
    .trim()
    .regex(
      /^(packing:\d+|dynamic:[a-z0-9_-]{1,140})$/,
      "Invalid checklist item"
    ),
  checked: z.boolean(),
});
export const eventPackingItemCreateSchema = z.object({
  eventId: z.number().int().positive(),
  label: z.string().trim().min(2).max(180),
  category: z.enum(packingCategoryValues).default("essential"),
});
export const eventPackingItemUpdateSchema =
  eventPackingItemCreateSchema.safeExtend({
    itemId: z.number().int().positive(),
  });
export const eventPackingItemDeleteSchema = z.object({
  eventId: z.number().int().positive(),
  itemId: z.number().int().positive(),
});
export const participantCheckInSchema = z.object({
  eventId: z.number().int().positive(),
  participantId: z.number().int().positive(),
});
export const participantReadinessSchema = z.object({
  eventId: z.number().int().positive(),
  isReady: z.boolean(),
});
export const organizerParticipantActionSchema = z.object({
  eventId: z.number().int().positive(),
  participantId: z.number().int().positive(),
  action: z.enum(["remove", "move_to_waitlist", "restore_to_going"]),
});
export const waitlistPromotionSchema = z.object({
  eventId: z.number().int().positive(),
  participantId: z.number().int().positive(),
});
export const waitlistOfferSchema = waitlistPromotionSchema.extend({
  responseWindowHours: z.number().int().min(1).max(72).default(6),
});
export const waitlistOfferResponseSchema = z.object({
  eventId: z.number().int().positive(),
});

export const eventSearchSchema = z.object({
  query: z.string().trim().max(120).optional(),
  difficulty: z.enum(difficultyValues).optional(),
  startsAfter: z.coerce.date().optional(),
  startsBefore: z.coerce.date().optional(),
  minDistanceKm: z.number().min(0).max(500).optional(),
  maxDistanceKm: z.number().min(0).max(500).optional(),
  minElevationGain: z.number().int().min(0).max(15000).optional(),
  maxElevationGain: z.number().int().min(0).max(15000).optional(),
  carpoolOnly: z.boolean().optional(),
  maxDurationMinutes: z.number().int().min(15).max(2880).optional(),
  minCapacity: z.number().int().min(1).max(500).optional(),
  outingType: z
    .enum(["group_hike", "guided_hike", "training", "private_group"])
    .optional(),
  bookingMode: z.enum(["instant", "request"]).optional(),
  // Pagination: discovery was capped and gave no way to reach the rest.
  offset: z.number().int().min(0).max(10000).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const eventListSchema = z.object({
  offset: z.number().int().min(0).max(10000).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const profileUpdateSchema = z.object({
  bio: z.string().trim().max(600).optional(),
  avatarUrl: z.string().max(1024).optional(),
  coverImageUrl: z.string().max(1024).optional(),
  publicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,64}$/)
    .optional(),
  homeLocation: z.string().trim().max(180).optional(),
  experienceLevel: z.enum(difficultyValues).optional(),
  language: z.enum(["fr", "en"]).optional(),
  timezone: z
    .enum([
      "America/Vancouver",
      "America/Edmonton",
      "America/Winnipeg",
      "America/Toronto",
      "America/Halifax",
      "America/St_Johns",
    ])
    .optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  profileVisibility: z.enum(["public", "friends", "private"]).optional(),
});

export const trackUploadSchema = z.object({
  filename: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.-]+\.(gpx|kml)$/i, "A GPX or KML file is required")
    .max(180),
  mimeType: z.enum([
    "application/gpx+xml",
    "application/vnd.google-earth.kml+xml",
    "application/xml",
    "text/xml",
  ]),
  contentBase64: z.string().min(1).max(4_000_000),
});

export const imageUploadSchema = z.object({
  filename: z
    .string()
    .trim()
    .regex(
      /^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i,
      "A JPG, PNG or WebP image is required"
    )
    .max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentBase64: z.string().min(1).max(8_000_000),
});

export const postCreateSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  eventId: z.number().int().positive().optional(),
  postType: z.enum(["update", "outing_recap", "achievement"]).default("update"),
  title: z.string().trim().max(180).optional(),
  summary: z.string().trim().max(360).optional(),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
  locationName: z.string().trim().max(180).optional(),
  distanceKm: z.number().min(0).max(500).optional(),
  elevationGain: z.number().int().min(0).max(15000).optional(),
  durationMinutes: z.number().int().min(0).max(4320).optional(),
  images: z
    .array(z.string().min(1).max(1024))
    .max(5, "A post may contain at most five photos")
    .default([]),
});

export const socialUserIdSchema = z.object({
  userId: z.number().int().positive(),
});
export const socialPostReactionSchema = z.object({
  postId: z.number().int().positive(),
  reaction: z.enum(["trail", "summit", "inspire"]),
});
export const friendRequestSchema = z.object({
  userId: z.number().int().positive(),
  note: z.string().trim().max(280).optional(),
});
export const publicSlugSchema = z.object({
  publicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,64}$/),
});
export const friendRequestBySlugSchema = z.object({
  publicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,64}$/),
  note: z.string().trim().max(280).optional(),
});
export const memberSearchSchema = z.object({
  query: z.string().trim().max(64),
});
export const friendshipActionSchema = z.object({
  friendshipId: z.number().int().positive(),
  action: z.enum(["accepted", "declined", "blocked"]),
});
export const friendshipRemoveSchema = z.object({
  friendshipId: z.number().int().positive(),
});
export const friendshipDeferSchema = z.object({
  friendshipId: z.number().int().positive(),
  remindAt: z.coerce
    .date()
    .refine(
      value => value.getTime() > Date.now(),
      "Reminder date must be in the future"
    )
    .refine(
      value => value.getTime() <= Date.now() + 1000 * 60 * 60 * 24 * 90,
      "Reminder date must be within 90 days"
    ),
});
export const coOrganizerInviteSchema = z.object({
  eventId: z.number().int().positive(),
  publicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,64}$/),
});
export const coOrganizerInviteResponseSchema = z.object({
  invitationId: z.number().int().positive(),
  accept: z.boolean(),
});
export const coOrganizerInviteRevokeSchema = z.object({
  invitationId: z.number().int().positive(),
});
export const circleCreateSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(360).optional(),
  visibility: z.enum(["private", "invite"]).default("private"),
});
export const circleMemberSchema = z.object({
  circleId: z.number().int().positive(),
  userId: z.number().int().positive(),
});
export const groupNameSchema = z.object({
  name: z.string().trim().min(3).max(120),
});
export const groupCreateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  locationName: z.string().trim().max(180).optional(),
  coverImageUrl: z.string().max(1024).optional(),
  websiteUrl: z
    .string()
    .url()
    .max(1024)
    .refine(url => url.startsWith("https://"), "Use a secure HTTPS link")
    .optional(),
  visibility: z.enum(["public", "private", "invite"]).default("public"),
});
export const groupIdSchema = z.object({ groupId: z.number().int().positive() });
export const groupInviteSchema = z.object({
  groupId: z.number().int().positive(),
  userId: z.number().int().positive(),
  message: z.string().trim().max(500).optional(),
});
export const groupTemplateCreateSchema = z.object({
  label: z.string().trim().min(3).max(120),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  visibility: z.enum(["public", "private", "invite"]).default("public"),
  coverImageUrl: z.string().max(1024).optional(),
});
export const groupTemplateDeleteSchema = z.object({
  templateId: z.number().int().positive(),
});
export const groupCoAdminInviteSchema = z.object({
  groupId: z.number().int().positive(),
  publicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,64}$/),
});
export const groupCoAdminInviteResponseSchema = z.object({
  invitationId: z.number().int().positive(),
  accept: z.boolean(),
});
export const groupCoAdminInviteRevokeSchema = z.object({
  invitationId: z.number().int().positive(),
});
export const groupUpdateSchema = z.object({
  groupId: z.number().int().positive(),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  locationName: z.string().trim().max(180).optional(),
  coverImageUrl: z.string().max(1024).optional(),
  websiteUrl: z
    .string()
    .url()
    .max(1024)
    .refine(url => url.startsWith("https://"), "Use a secure HTTPS link")
    .optional(),
  visibility: z.enum(["public", "private", "invite"]),
});
export const groupMemberRoleSchema = z.object({
  groupId: z.number().int().positive(),
  userId: z.number().int().positive(),
  role: z.enum(["moderator", "member"]),
});
export const groupInviteResponseSchema = z.object({
  groupId: z.number().int().positive(),
  accept: z.boolean(),
});
export const groupPostCreateSchema = z.object({
  groupId: z.number().int().positive(),
  body: z.string().trim().min(1).max(2000),
  imageUrl: z.string().max(1024).optional(),
  linkUrl: z
    .string()
    .url()
    .max(1024)
    .refine(url => url.startsWith("https://"), "Use a secure HTTPS link")
    .optional(),
});
export const groupPostDeleteSchema = z.object({
  groupId: z.number().int().positive(),
  postId: z.number().int().positive(),
});
export const groupMessageSchema = z.object({
  groupId: z.number().int().positive(),
  body: z.string().trim().min(1).max(2000),
});
export const groupMessageModerationSchema = z.object({
  groupId: z.number().int().positive(),
  messageId: z.number().int().positive(),
  moderationStatus: z.enum(["visible", "hidden"]),
});
export const directMessageSchema = z.object({
  recipientId: z.number().int().positive(),
  body: z.string().trim().min(1).max(2000),
});
export const directThreadSchema = z.object({
  userId: z.number().int().positive(),
});
export const messagingPreferencesSchema = z.object({
  directMessagePolicy: z.enum(["friends", "everyone", "none"]),
});
export const userBlockSchema = z.object({
  userId: z.number().int().positive(),
});
export const socialInviteCreateSchema = z.object({
  channel: z.enum(["email", "sms", "link", "social"]),
  destination: z.string().trim().min(3).max(320),
});
/** Tokens are nanoid(32): URL-safe characters only. */
export const socialInviteTokenSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{16,96}$/, "Invalid invitation"),
});
export const socialLinkSchema = z.object({
  provider: z.enum([
    "instagram",
    "facebook",
    "strava",
    "garmin",
    "alltrails",
    "gaia",
  ]),
  profileUrl: z
    .string()
    .url()
    .max(1024)
    .refine(url => url.startsWith("https://"), "Use a secure HTTPS link"),
});

export const messageCreateSchema = z.object({
  eventId: z.number().int().positive(),
  content: z.string().trim().min(1).max(1000),
});

export const notificationIdSchema = z.object({
  notificationId: z.number().int().positive(),
});

export const notificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  eventUpdates: z.boolean().optional(),
  dayOfBriefUpdates: z.boolean().optional(),
  groupMessages: z.boolean().optional(),
  departureReminders: z.boolean().optional(),
  safetyAlerts: z.boolean().optional(),
});

export const accountStatusValues = ["active", "suspended", "banned"] as const;
export const reportTargetValues = ["user", "event", "post", "message"] as const;
export const reportCategoryValues = [
  "safety",
  "harassment",
  "fraud",
  "inappropriate_content",
  "other",
] as const;
export const reportStatusValues = [
  "open",
  "in_review",
  "resolved",
  "rejected",
] as const;

export const adminUserStatusSchema = z.object({
  userId: z.number().int().positive(),
  accountStatus: z.enum(accountStatusValues),
  note: z.string().trim().max(1000).optional(),
});

export const adminGuideReviewSchema = z.object({
  userId: z.number().int().positive(),
  status: z.enum(["approved", "suspended", "draft"]),
  insuranceConfirmed: z.boolean(),
});

export const createReportSchema = z.object({
  targetType: z.enum(reportTargetValues),
  targetId: z.number().int().positive(),
  messageChannel: z.enum(["direct", "group"]).optional(),
  category: z.enum(reportCategoryValues),
  description: z.string().trim().min(10).max(2000),
});

export const adminReportStatusSchema = z.object({
  reportId: z.number().int().positive(),
  status: z.enum(reportStatusValues),
  resolutionNote: z.string().trim().max(2000).optional(),
});

export const adminContentModerationSchema = z
  .object({
    targetType: z.enum(["event", "post", "message"]),
    targetId: z.number().int().positive(),
    messageChannel: z.enum(["direct", "group"]).optional(),
    moderationStatus: z.enum(["visible", "under_review", "hidden"]),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (value.targetType === "message" && !value.messageChannel)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["messageChannel"],
        message: "A message channel is required",
      });
  });

export const adminSiteSettingsSchema = z.object({
  defaultLocale: z.enum(["fr", "en"]).optional(),
  defaultTimezone: z.string().min(1).max(64).optional(),
  defaultUnits: z.enum(["metric", "imperial"]).optional(),
  requireEventApproval: z.boolean().optional(),
  communityPostingEnabled: z.boolean().optional(),
  externalAlertsEnabled: z.boolean().optional(),
  eventRemindersEnabled: z.boolean().optional(),
  allTrailsEnabled: z.boolean().optional(),
  gaiaEnabled: z.boolean().optional(),
  stravaEnabled: z.boolean().optional(),
  garminEnabled: z.boolean().optional(),
});
