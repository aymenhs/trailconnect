import {
  boolean,
  datetime,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table. `externalId` is the identity provider's subject, namespaced
 * per provider (`google:<sub>`) so a future provider cannot collide with it. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  accountStatus: mysqlEnum("accountStatus", ["active", "suspended", "banned"])
    .default("active")
    .notNull(),
  moderationNote: text("moderationNote"),
  suspendedAt: datetime("suspendedAt"),
  bannedAt: datetime("bannedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  bio: text("bio"),
  avatarUrl: varchar("avatarUrl", { length: 1024 }),
  coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
  publicSlug: varchar("publicSlug", { length: 64 }).unique(),
  homeLocation: varchar("homeLocation", { length: 180 }),
  experienceLevel: mysqlEnum("experienceLevel", [
    "beginner",
    "intermediate",
    "advanced",
    "expert",
  ])
    .default("beginner")
    .notNull(),
  totalOutings: int("totalOutings").default(0).notNull(),
  totalDistanceKm: double("totalDistanceKm").default(0).notNull(),
  totalElevationGain: int("totalElevationGain").default(0).notNull(),
  language: mysqlEnum("language", ["fr", "en"]).default("fr").notNull(),
  timezone: varchar("timezone", { length: 64 })
    .default("America/Toronto")
    .notNull(),
  units: mysqlEnum("units", ["metric", "imperial"]).default("metric").notNull(),
  profileVisibility: mysqlEnum("profileVisibility", [
    "public",
    "friends",
    "private",
  ])
    // Law 25, s. 9.1: the most protective setting by default. A member
    // chooses to become public; nobody is public without having chosen it.
    .default("private")
    .notNull(),
  phoneVerificationStatus: mysqlEnum("phoneVerificationStatus", [
    "unverified",
    "pending",
    "verified",
  ])
    .default("unverified")
    .notNull(),
  phoneVerifiedAt: datetime("phoneVerifiedAt"),
  deletionRequestedAt: datetime("deletionRequestedAt"),
  deletionScheduledAt: datetime("deletionScheduledAt"),
  deletedAt: datetime("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userNotificationPreferences = mysqlTable(
  "userNotificationPreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
    emailEnabled: boolean("emailEnabled").default(false).notNull(),
    pushEnabled: boolean("pushEnabled").default(false).notNull(),
    eventUpdates: boolean("eventUpdates").default(true).notNull(),
    dayOfBriefUpdates: boolean("dayOfBriefUpdates").default(true).notNull(),
    groupMessages: boolean("groupMessages").default(true).notNull(),
    departureReminders: boolean("departureReminders").default(true).notNull(),
    safetyAlerts: boolean("safetyAlerts").default(true).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export const userNotifications = mysqlTable(
  "userNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    type: mysqlEnum("type", [
      "registration",
      "event_update",
      "group_message",
      "departure_reminder",
      "safety",
      "account",
    ]).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    actionPath: varchar("actionPath", { length: 512 }),
    isRead: boolean("isRead").default(false).notNull(),
    readAt: datetime("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("userNotifications_user_read_created_idx").on(
      table.userId,
      table.isRead,
      table.createdAt
    ),
  ]
);

export const userInvitationTemplates = mysqlTable(
  "userInvitationTemplates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("userInvitationTemplates_user_updated_idx").on(
      table.userId,
      table.updatedAt
    ),
  ]
);

export const eventInvitationShareEvents = mysqlTable(
  "eventInvitationShareEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    actorId: int("actorId").notNull(),
    action: mysqlEnum("action", ["copy", "share"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("eventInvitationShareEvents_event_created_idx").on(
      table.eventId,
      table.createdAt
    ),
  ]
);

export const eventReminders = mysqlTable(
  "eventReminders",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    userId: int("userId").notNull(),
    channel: mysqlEnum("channel", ["email", "push", "in_app"]).notNull(),
    kind: mysqlEnum("kind", ["day_before", "two_hours", "safety"]).notNull(),
    scheduledFor: datetime("scheduledFor").notNull(),
    status: mysqlEnum("status", ["pending", "scheduled", "sent", "cancelled"])
      .default("pending")
      .notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventReminders_event_user_channel_kind_unique").on(
      table.eventId,
      table.userId,
      table.channel,
      table.kind
    ),
    index("eventReminders_scheduleCronTaskUid_idx").on(
      table.scheduleCronTaskUid
    ),
  ]
);

export const events = mysqlTable(
  "events",
  {
    id: int("id").autoincrement().primaryKey(),
    hostId: int("hostId").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    locationName: varchar("locationName", { length: 180 }).notNull(),
    latitude: double("latitude"),
    longitude: double("longitude"),
    toiletsStatus: varchar("toiletsStatus", { length: 20 })
      .default("unknown")
      .notNull(),
    waterStatus: varchar("waterStatus", { length: 20 })
      .default("unknown")
      .notNull(),
    parkingStatus: varchar("parkingStatus", { length: 20 })
      .default("unknown")
      .notNull(),
    receptionStatus: varchar("receptionStatus", { length: 20 })
      .default("unknown")
      .notNull(),
    cellReceptionStatus: varchar("cellReceptionStatus", { length: 20 })
      .default("unknown")
      .notNull(),
    accessibilityNotes: text("accessibilityNotes"),
    facilitiesNotes: text("facilitiesNotes"),
    facilitiesVerifiedAt: datetime("facilitiesVerifiedAt"),
    startsAt: datetime("startsAt").notNull(),
    visibility: mysqlEnum("visibility", ["public", "private", "invite"])
      .default("public")
      .notNull(),
    status: mysqlEnum("status", [
      "draft",
      "published",
      "cancelled",
      "completed",
    ])
      .default("published")
      .notNull(),
    difficulty: mysqlEnum("difficulty", [
      "beginner",
      "intermediate",
      "advanced",
      "expert",
    ]).notNull(),
    difficultySuggested: mysqlEnum("difficultySuggested", [
      "beginner",
      "intermediate",
      "advanced",
      "expert",
    ]),
    difficultyCalculatorVersion: varchar("difficultyCalculatorVersion", {
      length: 40,
    }),
    difficultyOverrideReason: varchar("difficultyOverrideReason", {
      length: 600,
    }),
    levelAdmissionPolicy: mysqlEnum("levelAdmissionPolicy", [
      "declarative",
      "confirmation",
      "organizer_review",
    ])
      .default("declarative")
      .notNull(),
    levelRequirementNote: varchar("levelRequirementNote", { length: 600 }),
    terrainType: mysqlEnum("terrainType", [
      "maintained",
      "natural",
      "rocky",
      "scramble",
      "mixed",
    ])
      .default("maintained")
      .notNull(),
    technicality: mysqlEnum("technicality", ["none", "low", "moderate", "high"])
      .default("none")
      .notNull(),
    exposureLevel: mysqlEnum("exposureLevel", ["low", "moderate", "high"])
      .default("low")
      .notNull(),
    navigationLevel: mysqlEnum("navigationLevel", [
      "marked",
      "basic",
      "advanced",
    ])
      .default("marked")
      .notNull(),
    routeCondition: mysqlEnum("routeCondition", [
      "normal",
      "variable",
      "wet_or_muddy",
      "winter_or_icy",
    ])
      .default("normal")
      .notNull(),
    distanceKm: double("distanceKm").notNull(),
    elevationGain: int("elevationGain").notNull(),
    durationMinutes: int("durationMinutes").notNull(),
    capacity: int("capacity").notNull(),
    requiresApproval: boolean("requiresApproval").default(false).notNull(),
    carpoolEnabled: boolean("carpoolEnabled").default(false).notNull(),
    outingType: mysqlEnum("outingType", [
      "group_hike",
      "guided_hike",
      "training",
      "private_group",
    ])
      .default("group_hike")
      .notNull(),
    bookingMode: mysqlEnum("bookingMode", ["instant", "request"])
      .default("instant")
      .notNull(),
    priceCents: int("priceCents").default(0).notNull(),
    currency: mysqlEnum("currency", ["CAD"]).default("CAD").notNull(),
    gpxUrl: varchar("gpxUrl", { length: 1024 }),
    allTrailsUrl: varchar("allTrailsUrl", { length: 1024 }),
    manualRouteJson: text("manualRouteJson"),
    localWeatherSourceLabel: varchar("localWeatherSourceLabel", {
      length: 120,
    }),
    localWeatherSourceUrl: varchar("localWeatherSourceUrl", { length: 1024 }),
    weatherUpdateNote: varchar("weatherUpdateNote", { length: 600 }),
    weatherUpdatedAt: datetime("weatherUpdatedAt"),
    participantGuidance: text("participantGuidance"),
    cancellationPolicy: varchar("cancellationPolicy", { length: 1200 }),
    coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
    coverImageFocalX: double("coverImageFocalX"),
    coverImageFocalY: double("coverImageFocalY"),
    moderationStatus: mysqlEnum("moderationStatus", [
      "visible",
      "under_review",
      "hidden",
    ])
      .default("visible")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("events_startsAt_idx").on(table.startsAt),
    index("events_hostId_idx").on(table.hostId),
    index("events_status_idx").on(table.status),
  ]
);

export const guideProfiles = mysqlTable("guideProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  status: mysqlEnum("status", [
    "draft",
    "pending_review",
    "approved",
    "suspended",
  ])
    .default("draft")
    .notNull(),
  headline: varchar("headline", { length: 180 }),
  bio: text("bio"),
  languages: varchar("languages", { length: 180 }),
  serviceRegions: varchar("serviceRegions", { length: 360 }),
  certifications: varchar("certifications", { length: 1024 }),
  insuranceConfirmedAt: datetime("insuranceConfirmedAt"),
  reviewedAt: datetime("reviewedAt"),
  reviewedBy: int("reviewedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const hikerPreferences = mysqlTable("hikerPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  preferredDifficulties: varchar("preferredDifficulties", { length: 180 }),
  interests: varchar("interests", { length: 360 }),
  preferredLanguages: varchar("preferredLanguages", { length: 180 }),
  availabilityDays: varchar("availabilityDays", { length: 120 }),
  maxDistanceKm: int("maxDistanceKm").default(50).notNull(),
  maxHikeDistanceKm: double("maxHikeDistanceKm").default(15).notNull(),
  maxElevationGain: int("maxElevationGain").default(1000).notNull(),
  carpoolPreference: mysqlEnum("carpoolPreference", [
    "any",
    "offer",
    "need",
    "none",
  ])
    .default("any")
    .notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const eventBookingRequests = mysqlTable(
  "eventBookingRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    hikerId: int("hikerId").notNull(),
    note: varchar("note", { length: 600 }),
    levelAcknowledgedAt: datetime("levelAcknowledgedAt"),
    levelExceptionNote: varchar("levelExceptionNote", { length: 600 }),
    status: mysqlEnum("status", [
      "pending",
      "accepted",
      "declined",
      "cancelled",
    ])
      .default("pending")
      .notNull(),
    processedAt: datetime("processedAt"),
    processedBy: int("processedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventBookingRequests_event_hiker_unique").on(
      table.eventId,
      table.hikerId
    ),
    index("eventBookingRequests_event_status_idx").on(
      table.eventId,
      table.status
    ),
  ]
);

export const eventLogistics = mysqlTable("eventLogistics", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull().unique(),
  meetingPoint: varchar("meetingPoint", { length: 240 }),
  meetingInstructions: text("meetingInstructions"),
  emergencyPlan: text("emergencyPlan"),
  operationalRoute: text("operationalRoute"),
  backupPlan: text("backupPlan"),
  routeImageUrl: varchar("routeImageUrl", { length: 1024 }),
  terrainStatus: mysqlEnum("terrainStatus", [
    "unknown",
    "open",
    "caution",
    "restricted",
    "closed",
  ])
    .default("unknown")
    .notNull(),
  accessStatus: mysqlEnum("accessStatus", [
    "unknown",
    "open",
    "caution",
    "restricted",
    "closed",
  ])
    .default("unknown")
    .notNull(),
  terrainAccessNote: text("terrainAccessNote"),
  terrainSourceLabel: varchar("terrainSourceLabel", { length: 120 }),
  terrainSourceUrl: varchar("terrainSourceUrl", { length: 1024 }),
  terrainCheckedAt: datetime("terrainCheckedAt"),
  equipmentNotes: text("equipmentNotes"),
  weatherPolicy: varchar("weatherPolicy", { length: 600 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const carpoolOffers = mysqlTable(
  "carpoolOffers",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    driverId: int("driverId").notNull(),
    hubId: int("hubId"),
    departureLocation: varchar("departureLocation", { length: 180 }).notNull(),
    departureAt: datetime("departureAt"),
    seatsTotal: int("seatsTotal").notNull(),
    seatsAvailable: int("seatsAvailable").notNull(),
    note: varchar("note", { length: 600 }),
    status: mysqlEnum("status", ["active", "withdrawn"])
      .default("active")
      .notNull(),
    withdrawalNote: varchar("withdrawalNote", { length: 600 }),
    withdrawnAt: datetime("withdrawnAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("carpoolOffers_eventId_idx").on(table.eventId)]
);

export const eventCarpoolHubs = mysqlTable(
  "eventCarpoolHubs",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    createdBy: int("createdBy").notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    instructions: varchar("instructions", { length: 600 }),
    fallbackNote: varchar("fallbackNote", { length: 600 }),
    latitude: double("latitude"),
    longitude: double("longitude"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("eventCarpoolHubs_event_idx").on(table.eventId)]
);

export const carpoolSeatReservations = mysqlTable(
  "carpoolSeatReservations",
  {
    id: int("id").autoincrement().primaryKey(),
    offerId: int("offerId").notNull(),
    passengerId: int("passengerId").notNull(),
    seatsRequested: int("seatsRequested").default(1).notNull(),
    note: varchar("note", { length: 600 }),
    status: mysqlEnum("status", [
      "pending",
      "accepted",
      "declined",
      "cancelled",
    ])
      .default("pending")
      .notNull(),
    processedAt: datetime("processedAt"),
    processedBy: int("processedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("carpoolSeatReservations_offer_passenger_unique").on(
      table.offerId,
      table.passengerId
    ),
    index("carpoolSeatReservations_offer_status_idx").on(
      table.offerId,
      table.status
    ),
  ]
);

export const emergencyContacts = mysqlTable(
  "emergencyContacts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    contactName: varchar("contactName", { length: 160 }).notNull(),
    relationship: varchar("relationship", { length: 120 }),
    phoneHash: varchar("phoneHash", { length: 128 }).notNull(),
    consentConfirmedAt: datetime("consentConfirmedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("emergencyContacts_userId_idx").on(table.userId)]
);

export const userSafetyConsents = mysqlTable("userSafetyConsents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  termsVersion: varchar("termsVersion", { length: 32 }).notNull(),
  acceptedAt: datetime("acceptedAt").notNull(),
  locationSharingEnabled: boolean("locationSharingEnabled")
    .default(false)
    .notNull(),
  emergencyContactEnabled: boolean("emergencyContactEnabled")
    .default(false)
    .notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const eventSafetyCheckIns = mysqlTable(
  "eventSafetyCheckIns",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    userId: int("userId").notNull(),
    kind: mysqlEnum("kind", ["departure", "arrival", "manual_ok"]).notNull(),
    note: varchar("note", { length: 280 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("eventSafetyCheckIns_event_user_idx").on(table.eventId, table.userId),
  ]
);

export const liveLocationShares = mysqlTable(
  "liveLocationShares",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    userId: int("userId").notNull(),
    isActive: boolean("isActive").default(false).notNull(),
    latitude: double("latitude"),
    longitude: double("longitude"),
    accuracyMeters: double("accuracyMeters"),
    expiresAt: datetime("expiresAt").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("liveLocationShares_event_user_unique").on(
      table.eventId,
      table.userId
    ),
    index("liveLocationShares_event_active_idx").on(
      table.eventId,
      table.isActive
    ),
  ]
);

export const eventParticipants = mysqlTable(
  "eventParticipants",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    userId: int("userId").notNull(),
    status: mysqlEnum("status", ["pending", "going", "waitlist", "cancelled"])
      .default("going")
      .notNull(),
    levelAcknowledgedAt: datetime("levelAcknowledgedAt"),
    levelExceptionNote: varchar("levelExceptionNote", { length: 600 }),
    levelExceptionStatus: mysqlEnum("levelExceptionStatus", [
      "none",
      "pending",
      "approved",
      "declined",
    ])
      .default("none")
      .notNull(),
    levelExceptionDecidedAt: datetime("levelExceptionDecidedAt"),
    levelExceptionDecidedBy: int("levelExceptionDecidedBy"),
    levelExceptionDecisionNote: varchar("levelExceptionDecisionNote", {
      length: 600,
    }),
    preparationReadyAt: datetime("preparationReadyAt"),
    checkedInAt: datetime("checkedInAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventParticipants_event_user_unique").on(
      table.eventId,
      table.userId
    ),
    index("eventParticipants_eventId_idx").on(table.eventId),
  ]
);

export const eventWaitlistOffers = mysqlTable(
  "eventWaitlistOffers",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    participantId: int("participantId").notNull(),
    offeredBy: int("offeredBy").notNull(),
    expiresAt: datetime("expiresAt").notNull(),
    status: mysqlEnum("status", [
      "pending",
      "accepted",
      "declined",
      "expired",
      "withdrawn",
    ])
      .default("pending")
      .notNull(),
    respondedAt: datetime("respondedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventWaitlistOffers_event_participant_unique").on(
      table.eventId,
      table.participantId
    ),
    index("eventWaitlistOffers_event_status_expiry_idx").on(
      table.eventId,
      table.status,
      table.expiresAt
    ),
  ]
);

export const eventWeatherUpdates = mysqlTable(
  "eventWeatherUpdates",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    authorId: int("authorId").notNull(),
    note: varchar("note", { length: 600 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("eventWeatherUpdates_event_created_idx").on(
      table.eventId,
      table.createdAt
    ),
  ]
);

export const eventWeatherUpdateAcknowledgements = mysqlTable(
  "eventWeatherUpdateAcknowledgements",
  {
    id: int("id").autoincrement().primaryKey(),
    weatherUpdateId: int("weatherUpdateId").notNull(),
    userId: int("userId").notNull(),
    readAt: datetime("readAt").notNull(),
  },
  table => [
    uniqueIndex("eventWeatherUpdateAcknowledgements_update_user_unique").on(
      table.weatherUpdateId,
      table.userId
    ),
    index("eventWeatherUpdateAcknowledgements_user_idx").on(table.userId),
  ]
);

export const eventRoutePlanHistory = mysqlTable(
  "eventRoutePlanHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    authorId: int("authorId").notNull(),
    operationalRoute: text("operationalRoute"),
    backupPlan: text("backupPlan"),
    routeImageUrl: varchar("routeImageUrl", { length: 1024 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("eventRoutePlanHistory_event_created_idx").on(
      table.eventId,
      table.createdAt
    ),
  ]
);

export const eventDayOfBriefAcknowledgements = mysqlTable(
  "eventDayOfBriefAcknowledgements",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    userId: int("userId").notNull(),
    briefUpdatedAt: datetime("briefUpdatedAt").notNull(),
    acknowledgedAt: datetime("acknowledgedAt").notNull(),
  },
  table => [
    uniqueIndex("eventDayOfBriefAcknowledgements_event_user_unique").on(
      table.eventId,
      table.userId
    ),
    index("eventDayOfBriefAcknowledgements_event_version_idx").on(
      table.eventId,
      table.briefUpdatedAt
    ),
  ]
);

export const eventDayOfBriefVersions = mysqlTable(
  "eventDayOfBriefVersions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    authorId: int("authorId").notNull(),
    meetingPoint: varchar("meetingPoint", { length: 300 }),
    meetingInstructions: text("meetingInstructions"),
    emergencyPlan: text("emergencyPlan"),
    operationalRoute: text("operationalRoute"),
    backupPlan: text("backupPlan"),
    routeImageUrl: varchar("routeImageUrl", { length: 1024 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("eventDayOfBriefVersions_event_created_idx").on(
      table.eventId,
      table.createdAt
    ),
  ]
);

export const eventOperationalDecisions = mysqlTable(
  "eventOperationalDecisions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    authorId: int("authorId").notNull(),
    outcome: mysqlEnum("outcome", [
      "maintained",
      "adapted",
      "cancelled",
    ]).notNull(),
    note: varchar("note", { length: 600 }).notNull(),
    effectiveFrom: datetime("effectiveFrom"),
    effectiveUntil: datetime("effectiveUntil"),
    planBActivated: boolean("planBActivated").default(false).notNull(),
    acknowledgementRequired: boolean("acknowledgementRequired")
      .default(false)
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("eventOperationalDecisions_event_created_idx").on(
      table.eventId,
      table.createdAt
    ),
  ]
);

export const eventOperationalDecisionAcknowledgements = mysqlTable(
  "eventOperationalDecisionAcknowledgements",
  {
    id: int("id").autoincrement().primaryKey(),
    decisionId: int("decisionId").notNull(),
    userId: int("userId").notNull(),
    acknowledgedAt: datetime("acknowledgedAt").notNull(),
  },
  table => [
    uniqueIndex(
      "eventOperationalDecisionAcknowledgements_decision_user_unique"
    ).on(table.decisionId, table.userId),
    index("eventOperationalDecisionAcknowledgements_user_idx").on(table.userId),
  ]
);

export const eventAccessRadarEntries = mysqlTable(
  "eventAccessRadarEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    authorId: int("authorId").notNull(),
    category: mysqlEnum("category", [
      "trail",
      "access",
      "parking",
      "permit",
      "closure",
    ]).notNull(),
    status: mysqlEnum("status", [
      "unknown",
      "open",
      "caution",
      "restricted",
      "closed",
    ])
      .default("unknown")
      .notNull(),
    label: varchar("label", { length: 140 }).notNull(),
    note: varchar("note", { length: 600 }),
    sourceLabel: varchar("sourceLabel", { length: 120 }).notNull(),
    sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
    checkedAt: datetime("checkedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("eventAccessRadarEntries_event_checked_idx").on(
      table.eventId,
      table.checkedAt
    ),
  ]
);

export const eventPaceGroups = mysqlTable(
  "eventPaceGroups",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    createdBy: int("createdBy").notNull(),
    leaderId: int("leaderId"),
    label: varchar("label", { length: 100 }).notNull(),
    paceDescription: varchar("paceDescription", { length: 400 }).notNull(),
    rallyPoints: varchar("rallyPoints", { length: 1200 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("eventPaceGroups_event_idx").on(table.eventId)]
);

export const eventPaceGroupAssignments = mysqlTable(
  "eventPaceGroupAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    groupId: int("groupId").notNull(),
    userId: int("userId").notNull(),
    assignedBy: int("assignedBy"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventPaceGroupAssignments_event_user_unique").on(
      table.eventId,
      table.userId
    ),
    index("eventPaceGroupAssignments_group_idx").on(table.groupId),
  ]
);

export const userPreparationPassportEntries = mysqlTable(
  "userPreparationPassportEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    eventId: int("eventId").notNull(),
    terrainReflection: varchar("terrainReflection", { length: 600 }),
    paceReflection: mysqlEnum("paceReflection", [
      "comfortable",
      "steady",
      "challenging",
      "not_recorded",
    ])
      .default("not_recorded")
      .notNull(),
    conditionsReflection: varchar("conditionsReflection", { length: 600 }),
    equipmentReflection: varchar("equipmentReflection", { length: 600 }),
    personalNote: varchar("personalNote", { length: 1200 }),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("userPreparationPassportEntries_user_event_unique").on(
      table.userId,
      table.eventId
    ),
    index("userPreparationPassportEntries_user_updated_idx").on(
      table.userId,
      table.updatedAt
    ),
  ]
);

export const eventDateOptions = mysqlTable(
  "eventDateOptions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    createdBy: int("createdBy").notNull(),
    startsAt: datetime("startsAt").notNull(),
    label: varchar("label", { length: 120 }),
    publishedEventId: int("publishedEventId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("eventDateOptions_event_startsAt_unique").on(
      table.eventId,
      table.startsAt
    ),
    index("eventDateOptions_event_idx").on(table.eventId),
  ]
);

export const eventDateOptionAvailabilities = mysqlTable(
  "eventDateOptionAvailabilities",
  {
    id: int("id").autoincrement().primaryKey(),
    optionId: int("optionId").notNull(),
    userId: int("userId").notNull(),
    available: boolean("available").default(true).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventDateOptionAvailabilities_option_user_unique").on(
      table.optionId,
      table.userId
    ),
    index("eventDateOptionAvailabilities_user_idx").on(table.userId),
  ]
);

export const eventSeries = mysqlTable(
  "eventSeries",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    sourceEventId: int("sourceEventId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    cadence: mysqlEnum("cadence", ["weekly", "biweekly", "monthly"]).notNull(),
    status: mysqlEnum("status", ["active", "paused"])
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventSeries_owner_source_unique").on(
      table.ownerId,
      table.sourceEventId
    ),
    index("eventSeries_owner_status_idx").on(table.ownerId, table.status),
  ]
);

export const eventSeriesInterests = mysqlTable(
  "eventSeriesInterests",
  {
    id: int("id").autoincrement().primaryKey(),
    seriesId: int("seriesId").notNull(),
    userId: int("userId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("eventSeriesInterests_series_user_unique").on(
      table.seriesId,
      table.userId
    ),
    index("eventSeriesInterests_user_idx").on(table.userId),
  ]
);

export const eventConditionReports = mysqlTable(
  "eventConditionReports",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    authorId: int("authorId").notNull(),
    category: mysqlEnum("category", [
      "trail_surface",
      "precipitation",
      "snow_ice",
      "access",
      "water",
      "parking",
      "cellular",
    ]).notNull(),
    note: varchar("note", { length: 600 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("eventConditionReports_event_created_idx").on(
      table.eventId,
      table.createdAt
    ),
  ]
);

export const eventActionAssignments = mysqlTable(
  "eventActionAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    action: mysqlEnum("action", [
      "meeting",
      "weather",
      "transport",
      "readiness",
      "day_of",
    ]).notNull(),
    assigneeId: int("assigneeId").notNull(),
    assignedBy: int("assignedBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventActionAssignments_event_action_unique").on(
      table.eventId,
      table.action
    ),
    index("eventActionAssignments_assignee_idx").on(table.assigneeId),
  ]
);

export const eventTerrainLandmarks = mysqlTable(
  "eventTerrainLandmarks",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    createdBy: int("createdBy").notNull(),
    type: mysqlEnum("type", ["water", "shelter", "parking"]).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    note: varchar("note", { length: 600 }),
    status: mysqlEnum("status", [
      "reported",
      "limited",
      "unavailable",
      "unknown",
    ])
      .default("unknown")
      .notNull(),
    latitude: double("latitude"),
    longitude: double("longitude"),
    verifiedAt: datetime("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("eventTerrainLandmarks_event_type_idx").on(table.eventId, table.type),
  ]
);

export const eventCoOrganizers = mysqlTable(
  "eventCoOrganizers",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["co_organizer"]).default("co_organizer").notNull(),
    acceptedAt: datetime("acceptedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("eventCoOrganizers_event_user_unique").on(
      table.eventId,
      table.userId
    ),
    index("eventCoOrganizers_user_idx").on(table.userId),
  ]
);

export const eventCoOrganizerInvitations = mysqlTable(
  "eventCoOrganizerInvitations",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    inviterId: int("inviterId").notNull(),
    inviteeId: int("inviteeId").notNull(),
    status: mysqlEnum("status", [
      "pending",
      "accepted",
      "declined",
      "revoked",
      "invalid",
    ])
      .default("pending")
      .notNull(),
    expiresAt: datetime("expiresAt").notNull(),
    respondedAt: datetime("respondedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventCoOrganizerInvitations_event_invitee_unique").on(
      table.eventId,
      table.inviteeId
    ),
    index("eventCoOrganizerInvitations_invitee_status_idx").on(
      table.inviteeId,
      table.status
    ),
  ]
);

export const communityGroupCoAdminInvitations = mysqlTable(
  "communityGroupCoAdminInvitations",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    inviterId: int("inviterId").notNull(),
    inviteeId: int("inviteeId").notNull(),
    status: mysqlEnum("status", [
      "pending",
      "accepted",
      "declined",
      "revoked",
      "invalid",
    ])
      .default("pending")
      .notNull(),
    expiresAt: datetime("expiresAt").notNull(),
    respondedAt: datetime("respondedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("communityGroupCoAdminInvitations_group_invitee_unique").on(
      table.groupId,
      table.inviteeId
    ),
    index("communityGroupCoAdminInvitations_invitee_status_idx").on(
      table.inviteeId,
      table.status
    ),
  ]
);

export const eventPreparationStates = mysqlTable(
  "eventPreparationStates",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    userId: int("userId").notNull(),
    meetingAcknowledged: boolean("meetingAcknowledged")
      .default(false)
      .notNull(),
    transportConfirmed: boolean("transportConfirmed").default(false).notNull(),
    checklistCompleted: boolean("checklistCompleted").default(false).notNull(),
    offlineReady: boolean("offlineReady").default(false).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("eventPreparationStates_event_user_unique").on(
      table.eventId,
      table.userId
    ),
    index("eventPreparationStates_eventId_idx").on(table.eventId),
  ]
);

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    authorId: int("authorId").notNull(),
    eventId: int("eventId"),
    postType: mysqlEnum("postType", ["update", "outing_recap", "achievement"])
      .default("update")
      .notNull(),
    title: varchar("title", { length: 180 }),
    summary: varchar("summary", { length: 360 }),
    visibility: mysqlEnum("visibility", ["public", "friends", "private"])
      .default("public")
      .notNull(),
    locationName: varchar("locationName", { length: 180 }),
    distanceKm: double("distanceKm"),
    elevationGain: int("elevationGain"),
    durationMinutes: int("durationMinutes"),
    body: text("body").notNull(),
    imageUrl: varchar("imageUrl", { length: 1024 }),
    moderationStatus: mysqlEnum("moderationStatus", [
      "visible",
      "under_review",
      "hidden",
    ])
      .default("visible")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("posts_createdAt_idx").on(table.createdAt),
    index("posts_authorId_idx").on(table.authorId),
  ]
);

export const postMedia = mysqlTable(
  "postMedia",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId").notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    sortOrder: int("sortOrder").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("postMedia_post_sort_unique").on(table.postId, table.sortOrder),
    index("postMedia_postId_idx").on(table.postId),
  ]
);

export const postReactions = mysqlTable(
  "postReactions",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId").notNull(),
    userId: int("userId").notNull(),
    reaction: mysqlEnum("reaction", ["trail", "summit", "inspire"])
      .default("trail")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("postReactions_post_user_unique").on(
      table.postId,
      table.userId
    ),
    index("postReactions_userId_idx").on(table.userId),
  ]
);

export const follows = mysqlTable(
  "follows",
  {
    id: int("id").autoincrement().primaryKey(),
    followerId: int("followerId").notNull(),
    followingId: int("followingId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("follows_follower_following_unique").on(
      table.followerId,
      table.followingId
    ),
    index("follows_followingId_idx").on(table.followingId),
  ]
);

export const friendships = mysqlTable(
  "friendships",
  {
    id: int("id").autoincrement().primaryKey(),
    requesterId: int("requesterId").notNull(),
    addresseeId: int("addresseeId").notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "declined", "blocked"])
      .default("pending")
      .notNull(),
    requestNote: varchar("requestNote", { length: 280 }),
    remindAt: datetime("remindAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("friendships_requester_addressee_unique").on(
      table.requesterId,
      table.addresseeId
    ),
    index("friendships_addressee_status_idx").on(
      table.addresseeId,
      table.status
    ),
    index("friendships_addressee_remindAt_idx").on(
      table.addresseeId,
      table.remindAt
    ),
  ]
);

export const activityCircles = mysqlTable(
  "activityCircles",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 360 }),
    visibility: mysqlEnum("visibility", ["private", "invite"])
      .default("private")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("activityCircles_ownerId_idx").on(table.ownerId)]
);

export const circleMembers = mysqlTable(
  "circleMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    circleId: int("circleId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "member"]).default("member").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("circleMembers_circle_user_unique").on(
      table.circleId,
      table.userId
    ),
    index("circleMembers_userId_idx").on(table.userId),
  ]
);

export const communityGroups = mysqlTable(
  "communityGroups",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    locationName: varchar("locationName", { length: 180 }),
    coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
    websiteUrl: varchar("websiteUrl", { length: 1024 }),
    visibility: mysqlEnum("visibility", ["public", "private", "invite"])
      .default("public")
      .notNull(),
    moderationStatus: mysqlEnum("moderationStatus", [
      "visible",
      "under_review",
      "hidden",
    ])
      .default("visible")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("communityGroups_name_unique").on(table.name),
    index("communityGroups_ownerId_idx").on(table.ownerId),
    index("communityGroups_moderation_idx").on(table.moderationStatus),
  ]
);

export const communityGroupMembers = mysqlTable(
  "communityGroupMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "moderator", "member"])
      .default("member")
      .notNull(),
    status: mysqlEnum("status", ["pending", "active", "left", "banned"])
      .default("active")
      .notNull(),
    inviteMessage: text("inviteMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("communityGroupMembers_group_user_unique").on(
      table.groupId,
      table.userId
    ),
    index("communityGroupMembers_userId_idx").on(table.userId),
  ]
);

export const userCommunityGroupTemplates = mysqlTable(
  "userCommunityGroupTemplates",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    visibility: mysqlEnum("visibility", ["public", "private", "invite"])
      .default("public")
      .notNull(),
    coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("userCommunityGroupTemplates_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt
    ),
  ]
);

export const communityGroupPosts = mysqlTable(
  "communityGroupPosts",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    authorId: int("authorId").notNull(),
    body: text("body").notNull(),
    imageUrl: varchar("imageUrl", { length: 1024 }),
    linkUrl: varchar("linkUrl", { length: 1024 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("communityGroupPosts_group_created_idx").on(
      table.groupId,
      table.createdAt
    ),
    index("communityGroupPosts_author_idx").on(table.authorId),
  ]
);

export const communityGroupMessages = mysqlTable(
  "communityGroupMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    senderId: int("senderId").notNull(),
    body: text("body").notNull(),
    moderationStatus: mysqlEnum("moderationStatus", [
      "visible",
      "under_review",
      "hidden",
    ])
      .default("visible")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("communityGroupMessages_group_created_idx").on(
      table.groupId,
      table.createdAt
    ),
    index("communityGroupMessages_sender_idx").on(table.senderId),
  ]
);

export const userMessagingPreferences = mysqlTable("userMessagingPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  directMessagePolicy: mysqlEnum("directMessagePolicy", [
    "friends",
    "everyone",
    "none",
  ])
    // Friends and outing companions by default, like profiles (Law 25).
    .default("friends")
    .notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userBlocks = mysqlTable(
  "userBlocks",
  {
    id: int("id").autoincrement().primaryKey(),
    blockerId: int("blockerId").notNull(),
    blockedId: int("blockedId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("userBlocks_blocker_blocked_unique").on(
      table.blockerId,
      table.blockedId
    ),
    index("userBlocks_blocked_idx").on(table.blockedId),
  ]
);

export const directConversations = mysqlTable(
  "directConversations",
  {
    id: int("id").autoincrement().primaryKey(),
    userOneId: int("userOneId").notNull(),
    userTwoId: int("userTwoId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("directConversations_participants_unique").on(
      table.userOneId,
      table.userTwoId
    ),
    index("directConversations_userOne_idx").on(table.userOneId),
    index("directConversations_userTwo_idx").on(table.userTwoId),
  ]
);

export const directMessages = mysqlTable(
  "directMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull(),
    senderId: int("senderId").notNull(),
    body: text("body").notNull(),
    moderationStatus: mysqlEnum("moderationStatus", [
      "visible",
      "under_review",
      "hidden",
    ])
      .default("visible")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("directMessages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt
    ),
    index("directMessages_sender_idx").on(table.senderId),
  ]
);

export const socialInvitations = mysqlTable(
  "socialInvitations",
  {
    id: int("id").autoincrement().primaryKey(),
    senderId: int("senderId").notNull(),
    destinationHash: varchar("destinationHash", { length: 128 }).notNull(),
    channel: mysqlEnum("channel", ["email", "sms", "link", "social"]).notNull(),
    token: varchar("token", { length: 96 }).notNull().unique(),
    status: mysqlEnum("status", ["pending", "accepted", "expired", "cancelled"])
      .default("pending")
      .notNull(),
    expiresAt: datetime("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("socialInvitations_sender_status_idx").on(
      table.senderId,
      table.status
    ),
  ]
);

export const linkedSocialAccounts = mysqlTable(
  "linkedSocialAccounts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    provider: mysqlEnum("provider", [
      "instagram",
      "facebook",
      "strava",
      "garmin",
      "alltrails",
      "gaia",
    ]).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 180 }),
    profileUrl: varchar("profileUrl", { length: 1024 }),
    consentedAt: datetime("consentedAt").notNull(),
    revokedAt: datetime("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("linkedSocialAccounts_user_provider_unique").on(
      table.userId,
      table.provider
    ),
  ]
);

export const outdoorServiceConsents = mysqlTable(
  "outdoorServiceConsents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    provider: mysqlEnum("provider", [
      "strava",
      "garmin",
      "apple_health",
      "health_connect",
      "inreach",
      "zoleo",
      "spot",
    ]).notNull(),
    purpose: mysqlEnum("purpose", [
      "route_exchange",
      "activity_import",
      "check_in",
    ]).notNull(),
    status: mysqlEnum("status", ["prepared", "revoked"])
      .default("prepared")
      .notNull(),
    consentedAt: datetime("consentedAt").notNull(),
    revokedAt: datetime("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("outdoorServiceConsents_user_provider_purpose_unique").on(
      table.userId,
      table.provider,
      table.purpose
    ),
    index("outdoorServiceConsents_user_status_idx").on(
      table.userId,
      table.status
    ),
  ]
);

export const userAchievements = mysqlTable(
  "userAchievements",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    kind: mysqlEnum("kind", [
      "first_outing",
      "summit",
      "distance",
      "elevation",
      "community",
    ]).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: varchar("description", { length: 360 }),
    earnedAt: datetime("earnedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("userAchievements_user_earned_idx").on(table.userId, table.earnedAt),
  ]
);

export const phoneVerificationChallenges = mysqlTable(
  "phoneVerificationChallenges",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    phoneHash: varchar("phoneHash", { length: 128 }).notNull(),
    codeHash: varchar("codeHash", { length: 128 }).notNull(),
    attempts: int("attempts").default(0).notNull(),
    expiresAt: datetime("expiresAt").notNull(),
    verifiedAt: datetime("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("phoneVerificationChallenges_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  ]
);

export const eventMessages = mysqlTable(
  "eventMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    senderId: int("senderId").notNull(),
    content: text("content").notNull(),
    imageUrl: varchar("imageUrl", { length: 1024 }),
    ephemeralUntil: datetime("ephemeralUntil"),
    isPinned: boolean("isPinned").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("eventMessages_eventId_createdAt_idx").on(
      table.eventId,
      table.createdAt
    ),
  ]
);

export const packingItems = mysqlTable(
  "packingItems",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    label: varchar("label", { length: 180 }).notNull(),
    category: mysqlEnum("category", ["essential", "safety", "comfort", "food"])
      .default("essential")
      .notNull(),
    isRequired: boolean("isRequired").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("packingItems_eventId_idx").on(table.eventId)]
);

export const participantPackingItems = mysqlTable(
  "participantPackingItems",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    participantId: int("participantId").notNull(),
    itemKey: varchar("itemKey", { length: 220 }).notNull(),
    checked: boolean("checked").default(false).notNull(),
    checkedAt: datetime("checkedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("participantPackingItems_event_participant_item_unique").on(
      table.eventId,
      table.participantId,
      table.itemKey
    ),
    index("participantPackingItems_event_participant_idx").on(
      table.eventId,
      table.participantId
    ),
  ]
);

export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    reporterId: int("reporterId").notNull(),
    targetType: mysqlEnum("targetType", [
      "user",
      "event",
      "post",
      "message",
    ]).notNull(),
    targetId: int("targetId").notNull(),
    messageChannel: mysqlEnum("messageChannel", ["direct", "group"]),
    category: mysqlEnum("category", [
      "safety",
      "harassment",
      "fraud",
      "inappropriate_content",
      "other",
    ]).notNull(),
    description: text("description").notNull(),
    status: mysqlEnum("status", ["open", "in_review", "resolved", "rejected"])
      .default("open")
      .notNull(),
    reviewerId: int("reviewerId"),
    resolutionNote: text("resolutionNote"),
    resolvedAt: datetime("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("reports_status_createdAt_idx").on(table.status, table.createdAt),
    index("reports_target_idx").on(table.targetType, table.targetId),
  ]
);

export const moderationActions = mysqlTable(
  "moderationActions",
  {
    id: int("id").autoincrement().primaryKey(),
    adminId: int("adminId").notNull(),
    targetType: mysqlEnum("targetType", [
      "user",
      "event",
      "post",
      "message",
    ]).notNull(),
    targetId: int("targetId").notNull(),
    action: mysqlEnum("action", [
      "suspend",
      "ban",
      "restore",
      "hide",
      "review",
      "resolve_report",
    ]).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("moderationActions_target_createdAt_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt
    ),
  ]
);

export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").autoincrement().primaryKey(),
  defaultLocale: mysqlEnum("defaultLocale", ["fr", "en"])
    .default("fr")
    .notNull(),
  defaultTimezone: varchar("defaultTimezone", { length: 64 })
    .default("America/Toronto")
    .notNull(),
  defaultUnits: mysqlEnum("defaultUnits", ["metric", "imperial"])
    .default("metric")
    .notNull(),
  requireEventApproval: boolean("requireEventApproval")
    .default(false)
    .notNull(),
  communityPostingEnabled: boolean("communityPostingEnabled")
    .default(true)
    .notNull(),
  externalAlertsEnabled: boolean("externalAlertsEnabled")
    .default(false)
    .notNull(),
  eventRemindersEnabled: boolean("eventRemindersEnabled")
    .default(false)
    .notNull(),
  allTrailsEnabled: boolean("allTrailsEnabled").default(false).notNull(),
  gaiaEnabled: boolean("gaiaEnabled").default(false).notNull(),
  stravaEnabled: boolean("stravaEnabled").default(false).notNull(),
  garminEnabled: boolean("garminEnabled").default(false).notNull(),
  accountDeletionCronTaskUid: varchar("accountDeletionCronTaskUid", {
    length: 65,
  }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
