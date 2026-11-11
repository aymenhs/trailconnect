import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activityCircles,
  carpoolOffers,
  carpoolSeatReservations,
  circleMembers,
  communityGroupMembers,
  communityGroupMessages,
  communityGroupPosts,
  communityGroups,
  directConversations,
  directMessages,
  eventActionAssignments,
  eventBookingRequests,
  eventConditionReports,
  eventDateOptionAvailabilities,
  eventDateOptions,
  eventDayOfBriefAcknowledgements,
  eventDayOfBriefVersions,
  eventLogistics,
  eventMessages,
  eventOperationalDecisions,
  eventParticipants,
  eventPreparationStates,
  eventRoutePlanHistory,
  eventSafetyCheckIns,
  eventSeries,
  eventSeriesInterests,
  eventTerrainLandmarks,
  eventWeatherUpdateAcknowledgements,
  eventWeatherUpdates,
  events,
  eventReminders,
  follows,
  friendships,
  guideProfiles,
  hikerPreferences,
  linkedSocialAccounts,
  liveLocationShares,
  moderationActions,
  outdoorServiceConsents,
  packingItems,
  participantPackingItems,
  postMedia,
  postReactions,
  posts,
  reports,
  siteSettings,
  socialInvitations,
  userAchievements,
  userBlocks,
  userCommunityGroupTemplates,
  userMessagingPreferences,
  userNotificationPreferences,
  userNotifications,
  userProfiles,
  userSafetyConsents,
  users,
  type InsertUser,
} from "../drizzle/schema";
import {
  communityGroupCoAdminInvitations,
  eventCoOrganizerInvitations,
  eventCoOrganizers,
  eventInvitationShareEvents,
  userInvitationTemplates,
} from "../drizzle/schema";
import {
  eventAccessRadarEntries,
  eventCarpoolHubs,
  eventOperationalDecisionAcknowledgements,
  eventPaceGroupAssignments,
  eventPaceGroups,
  eventWaitlistOffers,
  userPreparationPassportEntries,
} from "../drizzle/schema";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { DomainError } from "./domainError";
import { stripImageMetadata, type UploadImageType } from "./imageMetadata";
import {
  shouldDeliverNotification,
  type NotificationType,
} from "../shared/notificationPolicy";
import { getJoinRefusal } from "./eventJoinPolicy";
import { calculateHikerMatch } from "../shared/matching";
import { classifyOrganizerDifficulty } from "../shared/difficulty";
import type { z } from "zod";
import type {
  bookingRequestSchema,
  carpoolOfferSchema,
  carpoolUpdateSchema,
  carpoolSeatDecisionSchema,
  carpoolSeatRemovalSchema,
  carpoolSeatReservationSchema,
  carpoolWithdrawalSchema,
  circleCreateSchema,
  directMessageSchema,
  eventCreateSchema,
  eventDateAvailabilitySchema,
  eventDateOptionPublishSchema,
  eventDateOptionSchema,
  eventInvitationShareSchema,
  eventLogisticsSchema,
  eventOperationalDecisionSchema,
  eventPackingItemCreateSchema,
  eventPackingItemUpdateSchema,
  eventPreparationUpdateSchema,
  eventSearchSchema,
  eventSeriesCreateSchema,
  eventSeriesRelaunchSchema,
  groupCreateSchema,
  groupMessageSchema,
  groupPostCreateSchema,
  groupTemplateCreateSchema,
  groupUpdateSchema,
  guideProfileSchema,
  hikerPreferencesSchema,
  invitationTemplateDeleteSchema,
  invitationTemplateSchema,
  liveLocationShareSchema,
  messagingPreferencesSchema,
  notificationPreferencesSchema,
  outdoorServiceConsentSchema,
  participantPackingItemSchema,
  postCreateSchema,
  profileUpdateSchema,
  safetyCheckInSchema,
  safetyConsentSchema,
  socialInviteCreateSchema,
  socialLinkSchema,
} from "./hikingValidation";
import type { eventUpdateSchema } from "./hikingValidation";
import type {
  eventAccessRadarEntrySchema,
  eventCarpoolHubSchema,
  eventOperationalDecisionAcknowledgementSchema,
  eventPaceGroupAssignmentSchema,
  eventPaceGroupSchema,
  preparationPassportEntrySchema,
} from "./hikingValidation";
import type { organizerParticipantActionSchema } from "./hikingValidation";

let _db: ReturnType<typeof drizzle> | null = null;

type Database = ReturnType<typeof drizzle>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** A connection or an open transaction: both run the same query builders. */
type Executor = Database | Transaction;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      // Swallowing this used to make every caller fall through to its
      // `if (!db) return []` branch, so a misconfigured connection string
      // reached the user as "no outings available" rather than as a failure.
      console.error("[Database] Failed to initialise connection:", error);
      _db = null;
      throw new DomainError("Database connection is unavailable");
    }
  }
  return _db;
}

/**
 * Round-trips a query so a health probe reflects the database, not just the
 * process. `getDb()` is lazy — building the client never opens a socket — so
 * without an actual statement an outage stays invisible until a user hits it.
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  configured: boolean;
  error?: string;
}> {
  if (!process.env.DATABASE_URL) return { ok: false, configured: false };
  try {
    const db = await getDb();
    if (!db) return { ok: false, configured: true, error: "not-initialised" };
    await db.execute(sql`select 1`);
    return { ok: true, configured: true };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "unknown-error",
    };
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.externalId)
    throw new DomainError("User externalId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { externalId: user.externalId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.externalId === ENV.ownerExternalId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.externalId, externalId))
    .limit(1);
  return result[0];
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0];
}

const eventCardSelection = {
  id: events.id,
  title: events.title,
  locationName: events.locationName,
  startsAt: events.startsAt,
  difficulty: events.difficulty,
  distanceKm: events.distanceKm,
  elevationGain: events.elevationGain,
  durationMinutes: events.durationMinutes,
  capacity: events.capacity,
  carpoolEnabled: events.carpoolEnabled,
  outingType: events.outingType,
  bookingMode: events.bookingMode,
  priceCents: events.priceCents,
  currency: events.currency,
  hostId: events.hostId,
  coverImageUrl: events.coverImageUrl,
  coverImageFocalX: events.coverImageFocalX,
  coverImageFocalY: events.coverImageFocalY,
  weatherUpdateNote: events.weatherUpdateNote,
  weatherUpdatedAt: events.weatherUpdatedAt,
  hostName: users.name,
};

/**
 * Trust signals cost about seven queries per host, and the public listings ask
 * for them on every page load, anonymous visitors included. They change on the
 * scale of outings, not seconds, so a short-lived cache is enough.
 */
const HOST_TRUST_TTL_MS = 60_000;
const HOST_TRUST_CACHE_MAX = 1_000;
const hostTrustCache = new Map<
  number,
  {
    expiresAt: number;
    value: Promise<Awaited<ReturnType<typeof getHostTrustSignals>>>;
  }
>();

function getCachedHostTrustSignals(hostId: number) {
  const cached = hostTrustCache.get(hostId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (hostTrustCache.size >= HOST_TRUST_CACHE_MAX) hostTrustCache.clear();
  const value = getHostTrustSignals(hostId).catch(error => {
    // A failed lookup must not be served from cache for the next minute.
    hostTrustCache.delete(hostId);
    throw error;
  });
  hostTrustCache.set(hostId, {
    expiresAt: Date.now() + HOST_TRUST_TTL_MS,
    value,
  });
  return value;
}

async function attachHostTrust<T extends { hostId: number }>(items: T[]) {
  const hostIds = Array.from(new Set(items.map(item => item.hostId)));
  const trustEntries = await Promise.all(
    hostIds.map(
      async hostId => [hostId, await getCachedHostTrustSignals(hostId)] as const
    )
  );
  const trusts = new Map(trustEntries);
  return items.map(item => ({ ...item, hostTrust: trusts.get(item.hostId) }));
}

/** Page size for the public listings. */
export const EVENT_PAGE_SIZE = 20;

/** Messages returned per conversation: the most recent ones. */
const MESSAGE_PAGE_SIZE = 200;

/**
 * Discovery used to stop at a hard `limit(40)` with no pagination anywhere in
 * the product: past 40 published outings the rest of the catalogue was simply
 * invisible, and nothing told the visitor. One extra row is fetched to know
 * whether a next page exists without a second COUNT query.
 *
 * Only outings still ahead are listed. Sorted oldest first with no date floor,
 * the first pages would have filled up with finished outings as the catalogue
 * aged.
 */
export async function listPublishedEvents(offset = 0, limit = EVENT_PAGE_SIZE) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select(eventCardSelection)
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(
      and(
        eq(events.status, "published"),
        eq(events.moderationStatus, "visible"),
        eq(events.visibility, "public"),
        gte(events.startsAt, new Date())
      )
    )
    .orderBy(asc(events.startsAt))
    .limit(limit + 1)
    .offset(offset);
  const hasMore = rows.length > limit;
  return attachHostTrust(rows.slice(0, limit)).then(items => ({
    items,
    nextOffset: hasMore ? offset + limit : null,
  }));
}

export async function listMyOutings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const organized = await db
    .select(eventCardSelection)
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(eq(events.hostId, userId));
  const participating = await db
    .select({
      ...eventCardSelection,
      participationStatus: eventParticipants.status,
      checkedInAt: eventParticipants.checkedInAt,
    })
    .from(eventParticipants)
    .innerJoin(events, eq(eventParticipants.eventId, events.id))
    .leftJoin(users, eq(events.hostId, users.id))
    .where(eq(eventParticipants.userId, userId));
  const pendingRequests = await db
    .select({
      ...eventCardSelection,
      participationStatus: eventBookingRequests.status,
    })
    .from(eventBookingRequests)
    .innerJoin(events, eq(eventBookingRequests.eventId, events.id))
    .leftJoin(users, eq(events.hostId, users.id))
    .where(
      and(
        eq(eventBookingRequests.hikerId, userId),
        eq(eventBookingRequests.status, "pending")
      )
    );
  const byId = new Map<number, { [key: string]: unknown }>();
  organized.forEach(event =>
    byId.set(event.id, {
      ...event,
      relationship: "organizer",
      participationStatus: "going",
      checkedInAt: null,
    })
  );
  participating.forEach(event =>
    byId.set(event.id, { ...event, relationship: "participant" as const })
  );
  pendingRequests.forEach(event => {
    if (!byId.has(event.id))
      byId.set(event.id, {
        ...event,
        relationship: "participant" as const,
        checkedInAt: null,
      });
  });
  const outings = Array.from(byId.values()).sort(
    (left, right) =>
      new Date(String(left.startsAt)).getTime() -
      new Date(String(right.startsAt)).getTime()
  );
  const eventIds = outings.map(event => Number(event.id));
  if (!eventIds.length) return outings;
  const assignments = await db
    .select({
      eventId: eventActionAssignments.eventId,
      action: eventActionAssignments.action,
      assigneeId: eventActionAssignments.assigneeId,
      assigneeName: users.name,
      updatedAt: eventActionAssignments.updatedAt,
    })
    .from(eventActionAssignments)
    .leftJoin(users, eq(eventActionAssignments.assigneeId, users.id))
    .where(inArray(eventActionAssignments.eventId, eventIds));
  const byEvent = new Map<number, typeof assignments>();
  assignments.forEach(assignment =>
    byEvent.set(assignment.eventId, [
      ...(byEvent.get(assignment.eventId) ?? []),
      assignment,
    ])
  );
  return outings.map(event => ({
    ...event,
    coordinationAssignments: byEvent.get(Number(event.id)) ?? [],
  }));
}

export async function searchPublishedEvents(
  input: z.infer<typeof eventSearchSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [
    eq(events.status, "published"),
    eq(events.moderationStatus, "visible"),
    eq(events.visibility, "public"),
  ];
  if (input.difficulty)
    conditions.push(eq(events.difficulty, input.difficulty));
  // Like the listing, search only offers outings still ahead; an earlier
  // `startsAfter` cannot bring back outings that can no longer be joined.
  const now = new Date();
  conditions.push(
    gte(
      events.startsAt,
      input.startsAfter && input.startsAfter > now ? input.startsAfter : now
    )
  );
  if (input.startsBefore)
    conditions.push(lte(events.startsAt, input.startsBefore));
  if (input.minDistanceKm !== undefined)
    conditions.push(gte(events.distanceKm, input.minDistanceKm));
  if (input.maxDistanceKm !== undefined)
    conditions.push(lte(events.distanceKm, input.maxDistanceKm));
  if (input.minElevationGain !== undefined)
    conditions.push(gte(events.elevationGain, input.minElevationGain));
  if (input.maxElevationGain !== undefined)
    conditions.push(lte(events.elevationGain, input.maxElevationGain));
  if (input.carpoolOnly) conditions.push(eq(events.carpoolEnabled, true));
  if (input.maxDurationMinutes !== undefined)
    conditions.push(lte(events.durationMinutes, input.maxDurationMinutes));
  if (input.minCapacity !== undefined)
    conditions.push(gte(events.capacity, input.minCapacity));
  if (input.outingType)
    conditions.push(eq(events.outingType, input.outingType));
  if (input.bookingMode)
    conditions.push(eq(events.bookingMode, input.bookingMode));

  // The text filter used to run in JS *after* the LIMIT, so a match sitting on
  // page two of the SQL result silently disappeared. Matching in SQL makes the
  // result complete and lets the limit paginate rather than truncate.
  if (input.query) {
    // Escape the LIKE wildcards so a query containing % or _ searches for the
    // characters themselves instead of matching everything.
    const escaped = input.query.replace(
      /[%_\\]/g,
      character => `\\${character}`
    );
    const needle = `%${escaped}%`;
    const textMatch = or(
      like(events.title, needle),
      like(events.locationName, needle)
    );
    if (textMatch) conditions.push(textMatch);
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? EVENT_PAGE_SIZE;
  const result = await db
    .select(eventCardSelection)
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .where(and(...conditions))
    .orderBy(asc(events.startsAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = result.length > limit;
  const items = await attachHostTrust(result.slice(0, limit));
  return { items, nextOffset: hasMore ? offset + limit : null };
}

export async function getEventById(eventId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return result[0];
}

export async function getParticipantCount(eventId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        inArray(eventParticipants.status, ["going", "pending"])
      )
    );
  return Number(rows[0]?.count ?? 0);
}

export async function getEventParticipation(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      status: eventParticipants.status,
      checkedInAt: eventParticipants.checkedInAt,
      preparationReadyAt: eventParticipants.preparationReadyAt,
      levelAcknowledgedAt: eventParticipants.levelAcknowledgedAt,
      levelExceptionStatus: eventParticipants.levelExceptionStatus,
      levelExceptionDecisionNote: eventParticipants.levelExceptionDecisionNote,
    })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      )
    )
    .limit(1);
  return rows[0];
}

export async function getEventPreparationState(
  eventId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(eventPreparationStates)
    .where(
      and(
        eq(eventPreparationStates.eventId, eventId),
        eq(eventPreparationStates.userId, userId)
      )
    )
    .limit(1);
  return rows[0];
}

export async function updateEventPreparationState(
  userId: number,
  input: z.infer<typeof eventPreparationUpdateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const { eventId, ...changes } = input;
  await db
    .insert(eventPreparationStates)
    .values({ eventId, userId, ...changes })
    .onDuplicateKeyUpdate({ set: changes });
  return getEventPreparationState(eventId, userId);
}
export async function listParticipantPackingItems(
  eventId: number,
  participantId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(participantPackingItems)
    .where(
      and(
        eq(participantPackingItems.eventId, eventId),
        eq(participantPackingItems.participantId, participantId)
      )
    );
}
export async function updateParticipantPackingItem(
  participantId: number,
  input: z.infer<typeof participantPackingItemSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const participation = await getEventParticipation(
    input.eventId,
    participantId
  );
  if (participation?.status !== "going")
    throw new DomainError(
      "Only confirmed participants can update their checklist"
    );
  const checkedAt = input.checked ? new Date() : null;
  await db
    .insert(participantPackingItems)
    .values({
      eventId: input.eventId,
      participantId,
      itemKey: input.itemKey,
      checked: input.checked,
      checkedAt,
    })
    .onDuplicateKeyUpdate({ set: { checked: input.checked, checkedAt } });
  return { itemKey: input.itemKey, checked: input.checked, checkedAt };
}
export async function listPackingItems(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(packingItems)
    .where(eq(packingItems.eventId, eventId));
}
export async function createEventPackingItem(
  eventId: number,
  actorId: number,
  input: z.infer<typeof eventPackingItemCreateSchema>
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  const result = await db.insert(packingItems).values({
    eventId,
    label: input.label,
    category: input.category,
    isRequired: false,
  });
  return Number(result[0].insertId);
}
export async function updateEventPackingItem(
  eventId: number,
  actorId: number,
  input: z.infer<typeof eventPackingItemUpdateSchema>
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  await db
    .update(packingItems)
    .set({ label: input.label, category: input.category })
    .where(
      and(eq(packingItems.id, input.itemId), eq(packingItems.eventId, eventId))
    );
  return { itemId: input.itemId };
}
export async function deleteEventPackingItem(
  eventId: number,
  itemId: number,
  actorId: number
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  await db
    .delete(packingItems)
    .where(and(eq(packingItems.id, itemId), eq(packingItems.eventId, eventId)));
}
export async function getEventPackingProgressSummary(
  eventId: number,
  actorId: number
) {
  const { db } = await getEventManagementAccess(eventId, actorId);
  const [items, participants, progress] = await Promise.all([
    db.select().from(packingItems).where(eq(packingItems.eventId, eventId)),
    db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          eq(eventParticipants.status, "going")
        )
      ),
    db
      .select({ itemKey: participantPackingItems.itemKey })
      .from(participantPackingItems)
      .where(
        and(
          eq(participantPackingItems.eventId, eventId),
          eq(participantPackingItems.checked, true)
        )
      ),
  ]);
  const checkedByKey = new Map<string, number>();
  progress.forEach(row =>
    checkedByKey.set(row.itemKey, (checkedByKey.get(row.itemKey) ?? 0) + 1)
  );
  return {
    confirmedParticipants: participants.length,
    items: items.map(item => ({
      id: item.id,
      label: item.label,
      category: item.category,
      checkedParticipants: checkedByKey.get(`packing:${item.id}`) ?? 0,
    })),
  };
}
export async function getEventDetail(eventId: number) {
  const event = await getEventById(eventId);
  if (!event) return undefined;
  const db = await getDb();
  const [participantCount, checklist, logistics, hostTrust, hostProfileRows] =
    await Promise.all([
      getParticipantCount(eventId),
      listPackingItems(eventId),
      getEventLogistics(eventId),
      getHostTrustSignals(event.hostId),
      db
        ? db
            .select({
              publicSlug: userProfiles.publicSlug,
              avatarUrl: userProfiles.avatarUrl,
              bio: userProfiles.bio,
              homeLocation: userProfiles.homeLocation,
              profileVisibility: userProfiles.profileVisibility,
            })
            .from(userProfiles)
            .where(eq(userProfiles.userId, event.hostId))
            .limit(1)
        : Promise.resolve([]),
    ]);
  const hostProfile = hostProfileRows[0];
  const hostPublicProfile =
    hostProfile?.profileVisibility === "public" && hostProfile.publicSlug
      ? {
          publicSlug: hostProfile.publicSlug,
          avatarUrl: hostProfile.avatarUrl,
          bio: hostProfile.bio,
          homeLocation: hostProfile.homeLocation,
        }
      : null;
  return {
    ...event,
    participantCount,
    checklist,
    logistics,
    hostTrust,
    hostPublicProfile,
  };
}

export async function isEventCoOrganizer(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: eventCoOrganizers.id })
    .from(eventCoOrganizers)
    .where(
      and(
        eq(eventCoOrganizers.eventId, eventId),
        eq(eventCoOrganizers.userId, userId)
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function canViewEventCoordination(
  eventId: number,
  userId: number
) {
  const event = await getEventById(eventId);
  if (!event) return false;
  if (event.hostId === userId) return true;
  if (await isEventCoOrganizer(eventId, userId)) return true;
  const participation = await getEventParticipation(eventId, userId);
  return participation?.status === "going";
}

/**
 * Whether `userId` (or an anonymous visitor when undefined) may read the outing
 * sheet and the panels attached to it: route, conditions, landmarks, access
 * radar, weather updates, coordination assignments.
 *
 * A visitor sees an outing only when it is publicly listed — published, visible
 * to moderation and `visibility = "public"`. Anyone attached to the outing
 * (host, co-organizer, participant, waitlisted, pending applicant) keeps access
 * regardless of those flags, so drafts stay visible to their author and
 * participants still reach a cancelled outing they signed up for.
 */
export async function canReadEventSheet(eventId: number, userId?: number) {
  const event = await getEventById(eventId);
  if (!event) return false;
  if (userId) {
    if (event.hostId === userId) return true;
    if (await isEventCoOrganizer(eventId, userId)) return true;
    const participation = await getEventParticipation(eventId, userId);
    if (
      participation?.status === "going" ||
      participation?.status === "waitlist"
    )
      return true;
    const bookingRequest = await getBookingRequestForEvent(eventId, userId);
    if (bookingRequest?.status === "pending") return true;
  }
  return (
    event.visibility === "public" &&
    (event.status === "published" || event.status === "completed") &&
    event.moderationStatus === "visible"
  );
}

/**
 * Completed outings a member led or took part in, with their distance and
 * elevation. `userProfiles.totalOutings` and its siblings were never written,
 * so every profile showed zero; the totals are now derived from the outings.
 */
export async function getOutingTotals(userId: number): Promise<{
  totalOutings: number;
  totalDistanceKm: number;
  totalElevationGain: number;
}> {
  const db = await getDb();
  if (!db)
    return { totalOutings: 0, totalDistanceKm: 0, totalElevationGain: 0 };
  const outings = await db
    .select({
      distanceKm: events.distanceKm,
      elevationGain: events.elevationGain,
    })
    .from(events)
    .where(
      and(
        eq(events.status, "completed"),
        or(
          eq(events.hostId, userId),
          inArray(
            events.id,
            db
              .select({ eventId: eventParticipants.eventId })
              .from(eventParticipants)
              .where(
                and(
                  eq(eventParticipants.userId, userId),
                  eq(eventParticipants.status, "going")
                )
              )
          )
        )
      )
    );
  return {
    totalOutings: outings.length,
    totalDistanceKm:
      Math.round(
        outings.reduce((sum, outing) => sum + (outing.distanceKm ?? 0), 0) * 10
      ) / 10,
    totalElevationGain: outings.reduce(
      (sum, outing) => sum + (outing.elevationGain ?? 0),
      0
    ),
  };
}

export async function getHostTrustSignals(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [
    hostRows,
    guideRows,
    completedOutings,
    safetyCheckIns,
    participantCheckIns,
    weatherUpdates,
    completedPreparation,
    bookingRequests,
    outingTotals,
  ] = await Promise.all([
    db
      .select({
        name: users.name,
        phoneVerificationStatus: userProfiles.phoneVerificationStatus,
        language: userProfiles.language,
      })
      .from(users)
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        status: guideProfiles.status,
        languages: guideProfiles.languages,
        insuranceConfirmedAt: guideProfiles.insuranceConfirmedAt,
      })
      .from(guideProfiles)
      .where(eq(guideProfiles.userId, userId))
      .limit(1),
    db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.hostId, userId), eq(events.status, "completed"))),
    db
      .select({ id: eventSafetyCheckIns.id })
      .from(eventSafetyCheckIns)
      .innerJoin(events, eq(eventSafetyCheckIns.eventId, events.id))
      .where(eq(events.hostId, userId)),
    db
      .select({
        id: eventParticipants.id,
        status: eventParticipants.status,
        checkedInAt: eventParticipants.checkedInAt,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(eventParticipants.eventId, events.id))
      .where(and(eq(events.hostId, userId), eq(events.status, "completed"))),
    db
      .select({ id: eventWeatherUpdates.id })
      .from(eventWeatherUpdates)
      .innerJoin(events, eq(eventWeatherUpdates.eventId, events.id))
      .where(eq(events.hostId, userId)),
    db
      .select({
        participantId: eventParticipants.id,
        checklistCompleted: eventPreparationStates.checklistCompleted,
        transportConfirmed: eventPreparationStates.transportConfirmed,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(eventParticipants.eventId, events.id))
      .leftJoin(
        eventPreparationStates,
        and(
          eq(eventPreparationStates.eventId, eventParticipants.eventId),
          eq(eventPreparationStates.userId, eventParticipants.userId)
        )
      )
      .where(
        and(
          eq(events.hostId, userId),
          eq(events.status, "completed"),
          eq(eventParticipants.status, "going")
        )
      ),
    db
      .select({
        createdAt: eventBookingRequests.createdAt,
        processedAt: eventBookingRequests.processedAt,
      })
      .from(eventBookingRequests)
      .innerJoin(events, eq(eventBookingRequests.eventId, events.id))
      .where(eq(events.hostId, userId)),
    getOutingTotals(userId),
  ]);
  const host = hostRows[0];
  const guide = guideRows[0];
  const completedParticipantRecords = participantCheckIns.filter(
    row => row.status === "going"
  );
  const participantCheckInsRecorded = completedParticipantRecords.filter(row =>
    Boolean(row.checkedInAt)
  ).length;
  const participantCheckInTotal = completedParticipantRecords.length;
  const participantCheckInRate = participantCheckInTotal
    ? Math.round((participantCheckInsRecorded / participantCheckInTotal) * 100)
    : null;
  const completedPreparationCount = completedPreparation.filter(
    row => row.checklistCompleted && row.transportConfirmed
  ).length;
  const departurePreparationRate = completedPreparation.length
    ? Math.round(
        (completedPreparationCount / completedPreparation.length) * 100
      )
    : null;
  const responseEligibleRequests = bookingRequests.filter(
    row =>
      Boolean(row.processedAt) ||
      Date.now() - row.createdAt.getTime() >= 48 * 60 * 60 * 1000
  );
  const timelyResponses = responseEligibleRequests.filter(
    row =>
      row.processedAt &&
      row.processedAt.getTime() - row.createdAt.getTime() <= 48 * 60 * 60 * 1000
  ).length;
  const bookingResponseWithin48hRate = responseEligibleRequests.length
    ? Math.round((timelyResponses / responseEligibleRequests.length) * 100)
    : null;
  return {
    hostName: host?.name ?? null,
    phoneVerified: host?.phoneVerificationStatus === "verified",
    totalOutings: outingTotals.totalOutings,
    completedHostedOutings: completedOutings.length,
    safetyCheckInsRecorded: safetyCheckIns.length,
    participantCheckInsRecorded,
    participantCheckInTotal,
    participantCheckInRate,
    weatherUpdatesPublished: weatherUpdates.length,
    departurePreparationRate,
    bookingResponseWithin48hRate,
    bookingResponseSampleSize: responseEligibleRequests.length,
    primaryLanguage: host?.language ?? null,
    guideStatus: guide?.status ?? null,
    guideLanguages: guide?.languages ?? null,
    insuranceConfirmed: Boolean(guide?.insuranceConfirmedAt),
  };
}

export function buildHikingEventInsertValues(
  hostId: number,
  input: z.infer<typeof eventCreateSchema>
) {
  const classification = classifyOrganizerDifficulty({
    distanceKm: input.distanceKm,
    elevationGain: input.elevationGain,
    durationMinutes: input.durationMinutes,
    selectedDifficulty: input.difficulty,
    overrideReason: input.difficultyOverrideReason,
  });
  const {
    difficultyOverrideReason,
    initialLogistics: _initialLogistics,
    initialTerrainLandmarks: _initialTerrainLandmarks = [],
    manualRoutePoints = [],
    manualRouteRoundTrip = false,
    manualRouteAttentionZones = [],
    packingItems: _packingItems,
    ...eventInput
  } = input;
  return {
    ...eventInput,
    manualRouteJson: manualRoutePoints.length
      ? JSON.stringify({
          points: manualRoutePoints,
          returnTrip: manualRouteRoundTrip,
          attentionZones: manualRouteAttentionZones,
        })
      : null,
    hostId,
    status: "published" as const,
    difficultySuggested: classification.level,
    difficultyCalculatorVersion: classification.version,
    difficultyOverrideReason: classification.overrideReason,
  };
}

export async function createHikingEvent(
  hostId: number,
  input: z.infer<typeof eventCreateSchema>,
  persist?: (
    values: ReturnType<typeof buildHikingEventInsertValues>
  ) => Promise<number>
) {
  const values = buildHikingEventInsertValues(hostId, input);
  if (persist) return persist(values);
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(events).values(values);
  const eventId = Number(result[0].insertId);
  if (input.initialLogistics)
    await db.insert(eventLogistics).values({
      eventId,
      meetingPoint: input.initialLogistics.meetingPoint || null,
      meetingInstructions: input.initialLogistics.meetingInstructions || null,
    });
  if ((input.initialTerrainLandmarks ?? []).length)
    await db.insert(eventTerrainLandmarks).values(
      (input.initialTerrainLandmarks ?? []).map(landmark => ({
        eventId,
        createdBy: hostId,
        ...landmark,
        note: landmark.note || null,
        latitude: landmark.latitude ?? null,
        longitude: landmark.longitude ?? null,
        verifiedAt: landmark.verifiedAt ?? null,
      }))
    );
  if (input.packingItems.length)
    await db
      .insert(packingItems)
      .values(input.packingItems.map(item => ({ eventId, ...item })));
  return eventId;
}

async function getEventManagementAccess(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const event = eventRows[0];
  if (!event) throw new DomainError("This outing no longer exists");
  if (event.hostId === userId) return { db, event, isHost: true };
  const coOrganizer = await db
    .select({ id: eventCoOrganizers.id })
    .from(eventCoOrganizers)
    .where(
      and(
        eq(eventCoOrganizers.eventId, eventId),
        eq(eventCoOrganizers.userId, userId)
      )
    )
    .limit(1);
  if (!coOrganizer[0])
    throw new DomainError(
      "Only the organizer or an accepted co-organizer can manage this outing"
    );
  return { db, event, isHost: false };
}

export async function listEventActionAssignments(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      action: eventActionAssignments.action,
      assigneeId: eventActionAssignments.assigneeId,
      assigneeName: users.name,
      assignedBy: eventActionAssignments.assignedBy,
      updatedAt: eventActionAssignments.updatedAt,
    })
    .from(eventActionAssignments)
    .leftJoin(users, eq(eventActionAssignments.assigneeId, users.id))
    .where(eq(eventActionAssignments.eventId, eventId));
}

export async function setEventActionAssignment(
  eventId: number,
  actorId: number,
  action: "meeting" | "weather" | "transport" | "readiness" | "day_of",
  assigneeId: number | null
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  const existing = await db
    .select({ assigneeId: eventActionAssignments.assigneeId })
    .from(eventActionAssignments)
    .where(
      and(
        eq(eventActionAssignments.eventId, eventId),
        eq(eventActionAssignments.action, action)
      )
    )
    .limit(1);
  if (assigneeId === null) {
    await db
      .delete(eventActionAssignments)
      .where(
        and(
          eq(eventActionAssignments.eventId, eventId),
          eq(eventActionAssignments.action, action)
        )
      );
    return { action, assigneeId: null };
  }
  const [isParticipant, isCoOrganizer] = await Promise.all([
    db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          eq(eventParticipants.userId, assigneeId),
          eq(eventParticipants.status, "going")
        )
      )
      .limit(1),
    db
      .select({ id: eventCoOrganizers.id })
      .from(eventCoOrganizers)
      .where(
        and(
          eq(eventCoOrganizers.eventId, eventId),
          eq(eventCoOrganizers.userId, assigneeId)
        )
      )
      .limit(1),
  ]);
  if (event.hostId !== assigneeId && !isParticipant[0] && !isCoOrganizer[0])
    throw new DomainError(
      "Choose the organizer, a co-organizer, or a confirmed participant"
    );
  await db
    .insert(eventActionAssignments)
    .values({ eventId, action, assigneeId, assignedBy: actorId })
    .onDuplicateKeyUpdate({
      set: { assigneeId, assignedBy: actorId, updatedAt: new Date() },
    });
  if (existing[0]?.assigneeId !== assigneeId && assigneeId !== actorId) {
    const actionLabels = {
      meeting: "rendez-vous",
      weather: "météo",
      transport: "covoiturage",
      readiness: "préparation",
      day_of: "fiche Jour J",
    };
    await createUserNotification(assigneeId, {
      type: "event_update",
      title: "Nouvelle responsabilité",
      body: `${event.title} · vous êtes indiqué comme contact pour ${actionLabels[action]}.`,
      actionPath: "/?view=my-outings&focus=responsibilities",
    });
  }
  return { action, assigneeId };
}

export async function listEventTerrainLandmarks(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(eventTerrainLandmarks)
    .where(eq(eventTerrainLandmarks.eventId, eventId))
    .orderBy(asc(eventTerrainLandmarks.createdAt));
}

export async function createEventTerrainLandmark(
  eventId: number,
  actorId: number,
  input: {
    type: "water" | "shelter" | "parking";
    label: string;
    note?: string;
    status: "reported" | "limited" | "unavailable" | "unknown";
    latitude?: number;
    longitude?: number;
    verifiedAt?: Date;
  }
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  const result = await db.insert(eventTerrainLandmarks).values({
    eventId,
    createdBy: actorId,
    ...input,
    note: input.note || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    verifiedAt: input.verifiedAt ?? null,
  });
  return Number(result[0].insertId);
}

export async function deleteEventTerrainLandmark(
  eventId: number,
  landmarkId: number,
  actorId: number
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  await db
    .delete(eventTerrainLandmarks)
    .where(
      and(
        eq(eventTerrainLandmarks.id, landmarkId),
        eq(eventTerrainLandmarks.eventId, eventId)
      )
    );
}

export async function updateEventTerrainLandmark(
  eventId: number,
  landmarkId: number,
  actorId: number,
  input: {
    type: "water" | "shelter" | "parking";
    label: string;
    note?: string;
    status: "reported" | "limited" | "unavailable" | "unknown";
    latitude?: number;
    longitude?: number;
    verifiedAt?: Date;
  }
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  await db
    .update(eventTerrainLandmarks)
    .set({
      ...input,
      note: input.note || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      verifiedAt: input.verifiedAt ?? null,
    })
    .where(
      and(
        eq(eventTerrainLandmarks.id, landmarkId),
        eq(eventTerrainLandmarks.eventId, eventId)
      )
    );
}

export async function updateHikingEvent(
  eventId: number,
  actorId: number,
  input: z.infer<typeof eventUpdateSchema>
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be edited");
  const {
    eventId: _eventId,
    difficultyOverrideReason,
    initialLogistics: _initialLogistics,
    packingItems: _packingItems,
    ...values
  } = input;
  const classification = classifyOrganizerDifficulty({
    distanceKm: values.distanceKm,
    elevationGain: values.elevationGain,
    durationMinutes: values.durationMinutes,
    selectedDifficulty: values.difficulty,
    overrideReason: difficultyOverrideReason,
  });
  await db
    .update(events)
    .set({
      ...values,
      difficultySuggested: classification.level,
      difficultyCalculatorVersion: classification.version,
      difficultyOverrideReason: classification.overrideReason ?? null,
    })
    .where(eq(events.id, eventId));
}

export async function updateEventManualRoute(
  eventId: number,
  actorId: number,
  input: {
    points: Array<{ latitude: number; longitude: number }>;
    roundTrip: boolean;
    attentionZones: Array<{
      type: "attention" | "hazard" | "access" | "navigation";
      note: string;
      latitude: number;
      longitude: number;
    }>;
  }
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be edited");
  await db
    .update(events)
    .set({
      manualRouteJson: input.points.length
        ? JSON.stringify({
            points: input.points,
            returnTrip: input.roundTrip,
            attentionZones: input.attentionZones,
          })
        : null,
    })
    .where(eq(events.id, eventId));
  return {
    points: input.points,
    roundTrip: input.roundTrip,
    attentionZones: input.attentionZones,
  };
}

export async function updateEventCoverFocalPoint(
  eventId: number,
  actorId: number,
  focalX: number | null,
  focalY: number | null
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be edited");
  if (!event.coverImageUrl)
    throw new DomainError("Add a cover image before choosing its focal point");
  await db
    .update(events)
    .set({ coverImageFocalX: focalX, coverImageFocalY: focalY })
    .where(eq(events.id, eventId));
  return { focalX, focalY };
}

export async function setLocalWeatherSource(
  eventId: number,
  actorId: number,
  input: { label?: string; url?: string }
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be edited");
  await db
    .update(events)
    .set({
      localWeatherSourceLabel: input.label || null,
      localWeatherSourceUrl: input.url || null,
    })
    .where(eq(events.id, eventId));
  return { label: input.label || null, url: input.url || null };
}

export async function publishWeatherUpdate(
  eventId: number,
  actorId: number,
  note: string
) {
  const { db, event } = await getEventManagementAccess(eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be edited");
  const weatherUpdatedAt = new Date();
  await db
    .update(events)
    .set({ weatherUpdateNote: note, weatherUpdatedAt })
    .where(eq(events.id, eventId));
  const inserted = await db
    .insert(eventWeatherUpdates)
    .values({ eventId, authorId: actorId, note });
  const weatherUpdateId = Number(inserted[0].insertId);
  const participantIds = await getEventParticipantUserIds(eventId);
  await Promise.all(
    participantIds
      .filter(userId => userId !== actorId)
      .map(userId =>
        createUserNotification(userId, {
          type: "event_update",
          title: "Mise à jour météo importante",
          body: `${event.title} · ${note.slice(0, 140)}`,
          actionPath: "/?view=my-outings",
        })
      )
  );
  return { note, weatherUpdatedAt, weatherUpdateId };
}

export async function listWeatherUpdates(eventId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const updates = await db
    .select({
      id: eventWeatherUpdates.id,
      note: eventWeatherUpdates.note,
      createdAt: eventWeatherUpdates.createdAt,
      authorName: users.name,
    })
    .from(eventWeatherUpdates)
    .leftJoin(users, eq(eventWeatherUpdates.authorId, users.id))
    .where(eq(eventWeatherUpdates.eventId, eventId))
    .orderBy(desc(eventWeatherUpdates.createdAt));
  if (!userId || !updates.length)
    return updates.map(update => ({ ...update, acknowledgedAt: null }));
  const acknowledgements = await db
    .select({
      weatherUpdateId: eventWeatherUpdateAcknowledgements.weatherUpdateId,
      readAt: eventWeatherUpdateAcknowledgements.readAt,
    })
    .from(eventWeatherUpdateAcknowledgements)
    .where(eq(eventWeatherUpdateAcknowledgements.userId, userId));
  const readByUpdate = new Map(
    acknowledgements.map(item => [item.weatherUpdateId, item.readAt])
  );
  return updates.map(update => ({
    ...update,
    acknowledgedAt: readByUpdate.get(update.id) ?? null,
  }));
}

export async function acknowledgeWeatherUpdate(
  eventId: number,
  weatherUpdateId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const event = await getEventById(eventId);
  const participation = await getEventParticipation(eventId, userId);
  if (!event || (event.hostId !== userId && participation?.status !== "going"))
    throw new DomainError(
      "Only confirmed participants can acknowledge this update"
    );
  const update = await db
    .select({ id: eventWeatherUpdates.id })
    .from(eventWeatherUpdates)
    .where(
      and(
        eq(eventWeatherUpdates.id, weatherUpdateId),
        eq(eventWeatherUpdates.eventId, eventId)
      )
    )
    .limit(1);
  if (!update[0]) throw new DomainError("This weather update is unavailable");
  const readAt = new Date();
  await db
    .insert(eventWeatherUpdateAcknowledgements)
    .values({ weatherUpdateId, userId, readAt })
    .onDuplicateKeyUpdate({ set: { readAt } });
  return { readAt };
}

export async function getDepartureReadiness(eventId: number, actorId: number) {
  const { db } = await getEventManagementAccess(eventId, actorId);
  const participants = await db
    .select({
      userId: eventParticipants.userId,
      name: users.name,
      meetingAcknowledged: eventPreparationStates.meetingAcknowledged,
      transportConfirmed: eventPreparationStates.transportConfirmed,
      checklistCompleted: eventPreparationStates.checklistCompleted,
      offlineReady: eventPreparationStates.offlineReady,
      preparationReadyAt: eventParticipants.preparationReadyAt,
      checkedInAt: eventParticipants.checkedInAt,
    })
    .from(eventParticipants)
    .leftJoin(users, eq(eventParticipants.userId, users.id))
    .leftJoin(
      eventPreparationStates,
      and(
        eq(eventPreparationStates.eventId, eventParticipants.eventId),
        eq(eventPreparationStates.userId, eventParticipants.userId)
      )
    )
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.status, "going")
      )
    )
    .orderBy(asc(eventParticipants.createdAt));
  const latest = await db
    .select({ id: eventWeatherUpdates.id })
    .from(eventWeatherUpdates)
    .where(eq(eventWeatherUpdates.eventId, eventId))
    .orderBy(desc(eventWeatherUpdates.createdAt))
    .limit(1);
  const reads = latest[0]
    ? await db
        .select({ userId: eventWeatherUpdateAcknowledgements.userId })
        .from(eventWeatherUpdateAcknowledgements)
        .where(
          eq(eventWeatherUpdateAcknowledgements.weatherUpdateId, latest[0].id)
        )
    : [];
  const acceptedCarpoolReservations = await db
    .select({ passengerId: carpoolSeatReservations.passengerId })
    .from(carpoolSeatReservations)
    .innerJoin(
      carpoolOffers,
      eq(carpoolSeatReservations.offerId, carpoolOffers.id)
    )
    .where(
      and(
        eq(carpoolOffers.eventId, eventId),
        eq(carpoolSeatReservations.status, "accepted")
      )
    );
  const readSet = new Set(reads.map(row => row.userId));
  const carpoolSet = new Set(
    acceptedCarpoolReservations.map(row => row.passengerId)
  );
  return participants.map(participant => ({
    ...participant,
    latestWeatherUpdateRead: latest[0] ? readSet.has(participant.userId) : null,
    carpoolConfirmed: carpoolSet.has(participant.userId),
  }));
}

export async function createEventConditionReport(
  eventId: number,
  authorId: number,
  category:
    | "trail_surface"
    | "precipitation"
    | "snow_ice"
    | "access"
    | "water"
    | "parking"
    | "cellular",
  note: string
) {
  const db = await getDb();
  if (!db) return undefined;
  const event = await getEventById(eventId);
  const participation = await getEventParticipation(eventId, authorId);
  if (
    !event ||
    event.startsAt > new Date() ||
    (event.hostId !== authorId && participation?.status !== "going")
  )
    throw new DomainError(
      "Condition reports are available to confirmed participants after the outing start time"
    );
  const result = await db
    .insert(eventConditionReports)
    .values({ eventId, authorId, category, note });
  return Number(result[0].insertId);
}

export async function listEventConditionReports(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: eventConditionReports.id,
      category: eventConditionReports.category,
      note: eventConditionReports.note,
      createdAt: eventConditionReports.createdAt,
      authorName: users.name,
    })
    .from(eventConditionReports)
    .leftJoin(users, eq(eventConditionReports.authorId, users.id))
    .where(eq(eventConditionReports.eventId, eventId))
    .orderBy(desc(eventConditionReports.createdAt));
}

/**
 * Cancels an outing in one transaction, and tells only the people who were
 * still on it. Waitlist offers, pending applications and ride offers used to
 * stay open on the cancelled outing, and everyone who had ever left or been
 * declined received the cancellation notice too.
 */
export async function cancelHikingEvent(eventId: number, actorId: number) {
  const { db, event, isHost } = await getEventManagementAccess(
    eventId,
    actorId
  );
  if (!isHost)
    throw new DomainError("Only the primary organizer can cancel this outing");
  if (event.status === "cancelled")
    throw new DomainError("This outing has already been cancelled");
  const now = new Date();
  const recipients = await db.transaction(async tx => {
    await lockEvent(tx, eventId);
    const [participants, applicants, offers] = await Promise.all([
      tx
        .select({ userId: eventParticipants.userId })
        .from(eventParticipants)
        .where(
          and(
            eq(eventParticipants.eventId, eventId),
            inArray(eventParticipants.status, ["going", "waitlist", "pending"])
          )
        ),
      tx
        .select({ userId: eventBookingRequests.hikerId })
        .from(eventBookingRequests)
        .where(
          and(
            eq(eventBookingRequests.eventId, eventId),
            eq(eventBookingRequests.status, "pending")
          )
        ),
      tx
        .select({ id: carpoolOffers.id })
        .from(carpoolOffers)
        .where(
          and(
            eq(carpoolOffers.eventId, eventId),
            eq(carpoolOffers.status, "active")
          )
        ),
    ]);
    await tx
      .update(events)
      .set({ status: "cancelled" })
      .where(eq(events.id, eventId));
    await tx
      .update(eventParticipants)
      .set({ status: "cancelled" })
      .where(eq(eventParticipants.eventId, eventId));
    await tx
      .update(eventBookingRequests)
      .set({ status: "cancelled", processedAt: now, processedBy: actorId })
      .where(
        and(
          eq(eventBookingRequests.eventId, eventId),
          eq(eventBookingRequests.status, "pending")
        )
      );
    await tx
      .update(eventWaitlistOffers)
      .set({ status: "withdrawn", respondedAt: now })
      .where(
        and(
          eq(eventWaitlistOffers.eventId, eventId),
          eq(eventWaitlistOffers.status, "pending")
        )
      );
    await tx
      .update(eventCoOrganizerInvitations)
      .set({ status: "invalid", respondedAt: now })
      .where(
        and(
          eq(eventCoOrganizerInvitations.eventId, eventId),
          eq(eventCoOrganizerInvitations.status, "pending")
        )
      );
    await withdrawCarpoolOffersById(
      tx,
      offers.map(offer => offer.id),
      actorId,
      now,
      "Sortie annulée / Outing cancelled"
    );
    return Array.from(
      new Set([...participants, ...applicants].map(row => row.userId))
    );
  });
  await Promise.all(
    recipients.map(userId =>
      createUserNotification(userId, {
        type: "event_update",
        title: "Outing cancelled",
        body: `“${event.title}” has been cancelled by its organizer. Your participation has been cancelled.`,
        actionPath: "/?view=my-outings",
      })
    )
  );
}

export async function getOrCreateGuideProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select()
    .from(guideProfiles)
    .where(eq(guideProfiles.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(guideProfiles).values({ userId });
  const created = await db
    .select()
    .from(guideProfiles)
    .where(eq(guideProfiles.userId, userId))
    .limit(1);
  return created[0];
}

export async function updateGuideProfile(
  userId: number,
  input: z.infer<typeof guideProfileSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  await getOrCreateGuideProfile(userId);
  const { submitForReview, ...fields } = input;
  await db
    .update(guideProfiles)
    .set({
      ...fields,
      ...(submitForReview ? { status: "pending_review" as const } : {}),
    })
    .where(eq(guideProfiles.userId, userId));
  return getOrCreateGuideProfile(userId);
}

export async function listGuideProfilesForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: guideProfiles.userId,
      status: guideProfiles.status,
      headline: guideProfiles.headline,
      serviceRegions: guideProfiles.serviceRegions,
      certifications: guideProfiles.certifications,
      insuranceConfirmedAt: guideProfiles.insuranceConfirmedAt,
      reviewedAt: guideProfiles.reviewedAt,
      name: users.name,
      email: users.email,
    })
    .from(guideProfiles)
    .leftJoin(users, eq(guideProfiles.userId, users.id))
    .orderBy(desc(guideProfiles.updatedAt));
}

export async function reviewGuideProfile(
  adminId: number,
  userId: number,
  status: "approved" | "suspended" | "draft",
  insuranceConfirmed: boolean
) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  await db
    .update(guideProfiles)
    .set({
      status,
      reviewedAt: now,
      reviewedBy: adminId,
      insuranceConfirmedAt: insuranceConfirmed ? now : null,
    })
    .where(eq(guideProfiles.userId, userId));
  return getOrCreateGuideProfile(userId);
}

export async function getOrCreateHikerPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select()
    .from(hikerPreferences)
    .where(eq(hikerPreferences.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(hikerPreferences).values({ userId });
  const created = await db
    .select()
    .from(hikerPreferences)
    .where(eq(hikerPreferences.userId, userId))
    .limit(1);
  return created[0];
}

export async function updateHikerPreferences(
  userId: number,
  input: z.infer<typeof hikerPreferencesSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  await getOrCreateHikerPreferences(userId);
  await db
    .update(hikerPreferences)
    .set(input)
    .where(eq(hikerPreferences.userId, userId));
  return getOrCreateHikerPreferences(userId);
}

export async function getHikerMatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const preferences = await getOrCreateHikerPreferences(userId);
  const candidates = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      locationName: events.locationName,
      startsAt: events.startsAt,
      difficulty: events.difficulty,
      distanceKm: events.distanceKm,
      elevationGain: events.elevationGain,
      durationMinutes: events.durationMinutes,
      capacity: events.capacity,
      carpoolEnabled: events.carpoolEnabled,
      bookingMode: events.bookingMode,
      priceCents: events.priceCents,
      currency: events.currency,
      outingType: events.outingType,
      hostId: events.hostId,
      hostName: users.name,
      guideLanguages: guideProfiles.languages,
      guideStatus: guideProfiles.status,
      coverImageUrl: events.coverImageUrl,
      coverImageFocalX: events.coverImageFocalX,
      coverImageFocalY: events.coverImageFocalY,
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .leftJoin(guideProfiles, eq(events.hostId, guideProfiles.userId))
    // Matching used to consider every published outing, private and
    // moderated ones included, and showed their title, place and host.
    .where(
      and(
        eq(events.status, "published"),
        eq(events.moderationStatus, "visible"),
        eq(events.visibility, "public"),
        gte(events.startsAt, new Date())
      )
    )
    .orderBy(asc(events.startsAt))
    .limit(40);
  const trustedCandidates = await attachHostTrust(candidates);
  return trustedCandidates
    .map(event => ({ ...event, ...calculateHikerMatch(preferences, event) }))
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        a.startsAt.getTime() - b.startsAt.getTime()
    );
}

export async function createBookingRequest(
  hikerId: number,
  input: z.infer<typeof bookingRequestSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const event = await getEventById(input.eventId);
  // Same admission rule as `events.join`. This endpoint used to take any id,
  // and a pending request is what opens a private outing's sheet: requesting
  // a place was a way around the fix made to `join`.
  if (!event || getJoinRefusal(event, hikerId) !== null) return undefined;
  const level = resolveLevelDeclaration(event, input);
  const [existing] = await db
    .select({
      id: eventBookingRequests.id,
      status: eventBookingRequests.status,
    })
    .from(eventBookingRequests)
    .where(
      and(
        eq(eventBookingRequests.eventId, input.eventId),
        eq(eventBookingRequests.hikerId, hikerId)
      )
    )
    .limit(1);
  // Re-sending used to reset any request to `pending`: a declined applicant
  // could ask again forever, and an accepted one fell back to "awaiting".
  if (existing?.status === "declined")
    throw new DomainError("The organizer has already declined this request");
  if (existing?.status === "accepted") return existing.id;
  if (existing?.status === "pending") {
    await db
      .update(eventBookingRequests)
      .set({ note: input.note, ...level })
      .where(eq(eventBookingRequests.id, existing.id));
    return existing.id;
  }
  // A request withdrawn earlier (`cancelled`) is reopened; otherwise created.
  const requestId = existing
    ? await reopenBookingRequest(db, existing.id, input.note, level)
    : Number(
        (
          await db.insert(eventBookingRequests).values({
            eventId: input.eventId,
            hikerId,
            note: input.note,
            ...level,
          })
        )[0].insertId
      );
  // Nothing told the organizer a request was waiting for them.
  await createUserNotification(event.hostId, {
    type: "registration",
    title: "Nouvelle demande de participation / New participation request",
    body: `${event.title} · Une personne demande à participer. / Someone asked to join.`,
    actionPath: `/?event=${event.id}`,
  });
  return requestId;
}

async function reopenBookingRequest(
  db: Database,
  requestId: number,
  note: string | undefined,
  level: ReturnType<typeof resolveLevelDeclaration>
): Promise<number> {
  await db
    .update(eventBookingRequests)
    .set({
      note,
      ...level,
      status: "pending",
      processedAt: null,
      processedBy: null,
    })
    .where(eq(eventBookingRequests.id, requestId));
  return requestId;
}

export async function listBookingRequests(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: eventBookingRequests.id,
      hikerId: eventBookingRequests.hikerId,
      note: eventBookingRequests.note,
      levelAcknowledgedAt: eventBookingRequests.levelAcknowledgedAt,
      levelExceptionNote: eventBookingRequests.levelExceptionNote,
      status: eventBookingRequests.status,
      createdAt: eventBookingRequests.createdAt,
      hikerName: users.name,
      avatarUrl: userProfiles.avatarUrl,
      phoneStatus: userProfiles.phoneVerificationStatus,
    })
    .from(eventBookingRequests)
    .leftJoin(users, eq(eventBookingRequests.hikerId, users.id))
    .leftJoin(
      userProfiles,
      eq(eventBookingRequests.hikerId, userProfiles.userId)
    )
    .where(eq(eventBookingRequests.eventId, eventId))
    .orderBy(desc(eventBookingRequests.createdAt));
}

export async function getBookingRequestForEvent(
  eventId: number,
  hikerId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ status: eventBookingRequests.status })
    .from(eventBookingRequests)
    .where(
      and(
        eq(eventBookingRequests.eventId, eventId),
        eq(eventBookingRequests.hikerId, hikerId)
      )
    )
    .limit(1);
  return rows[0];
}

export async function decideBookingRequest(
  requestId: number,
  hostId: number,
  status: "accepted" | "declined",
  levelExceptionDecisionNote?: string
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ request: eventBookingRequests, event: events })
    .from(eventBookingRequests)
    .leftJoin(events, eq(eventBookingRequests.eventId, events.id))
    .where(eq(eventBookingRequests.id, requestId))
    .limit(1);
  const row = rows[0];
  // `hostId` is whoever decides: the organizer or an accepted co-organizer,
  // who can already see the requests.
  if (
    !row?.event ||
    (row.event.hostId !== hostId &&
      !(await isEventCoOrganizer(row.event.id, hostId)))
  )
    throw new DomainError(
      "Only the organizing team can decide a booking request"
    );
  // A request the hiker had withdrawn could be accepted anyway, putting back
  // on the outing someone who had just left it.
  if (row.request.status !== "pending")
    throw new DomainError("This request is no longer awaiting a decision");
  const decisionNote = levelExceptionDecisionNote?.trim() || null;
  if (row.request.levelExceptionNote && !decisionNote)
    throw new DomainError(
      "A documented organizer decision is required for a level exception"
    );
  const decidedEvent = row.event;
  const exceptionFields = row.request.levelExceptionNote
    ? {
        levelExceptionNote: row.request.levelExceptionNote,
        levelExceptionStatus:
          status === "accepted" ? ("approved" as const) : ("declined" as const),
        levelExceptionDecidedAt: new Date(),
        levelExceptionDecidedBy: hostId,
        levelExceptionDecisionNote: decisionNote,
      }
    : {
        levelExceptionStatus: "none" as const,
        levelExceptionDecidedAt: null,
        levelExceptionDecidedBy: null,
        levelExceptionDecisionNote: null,
      };
  const participantStatus = status === "accepted" ? "going" : "cancelled";
  await db.transaction(async tx => {
    if (status === "accepted") {
      await lockEvent(tx, decidedEvent.id);
      if (
        (await countConfirmedPlaces(tx, row.request.eventId)) >=
        decidedEvent.capacity
      )
        throw new DomainError("This outing is already at full capacity");
    }
    const decided = await tx
      .update(eventBookingRequests)
      .set({ status, processedAt: new Date(), processedBy: hostId })
      .where(
        and(
          eq(eventBookingRequests.id, requestId),
          eq(eventBookingRequests.status, "pending")
        )
      );
    if (!decided[0].affectedRows)
      throw new DomainError("This request is no longer awaiting a decision");
    await tx
      .insert(eventParticipants)
      .values({
        eventId: row.request.eventId,
        userId: row.request.hikerId,
        status: participantStatus,
        levelAcknowledgedAt: row.request.levelAcknowledgedAt,
        ...exceptionFields,
      })
      .onDuplicateKeyUpdate({
        set: {
          status: participantStatus,
          levelAcknowledgedAt: row.request.levelAcknowledgedAt,
          ...exceptionFields,
        },
      });
  });
  await createUserNotification(row.request.hikerId, {
    type: "registration",
    title:
      status === "accepted"
        ? "Participation confirmée / Participation confirmed"
        : "Candidature non retenue / Request not accepted",
    body:
      status === "accepted"
        ? `${row.event.title} · Votre participation est confirmée. / Your participation is confirmed.`
        : `${row.event.title} · L’organisateur n’a pas retenu votre candidature cette fois-ci. / The organizer did not accept your request this time.`,
    actionPath: `/?view=my-outings&eventId=${row.request.eventId}`,
  });
  return row.request;
}

export async function getEventLogistics(eventId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(eventLogistics)
    .where(eq(eventLogistics.eventId, eventId))
    .limit(1);
  return result[0];
}

export async function updateEventLogistics(
  actorId: number,
  input: z.infer<typeof eventLogisticsSchema>
) {
  const { db, event } = await getEventManagementAccess(input.eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  const { eventId, ...fields } = input;
  const previous = await getEventLogistics(eventId);
  await db
    .insert(eventLogistics)
    .values({ eventId, ...fields })
    .onDuplicateKeyUpdate({ set: fields });
  const hasRoutePlanInput =
    "operationalRoute" in input ||
    "backupPlan" in input ||
    "routeImageUrl" in input;
  const nextPlan = {
    operationalRoute:
      fields.operationalRoute !== undefined
        ? fields.operationalRoute || null
        : (previous?.operationalRoute ?? null),
    backupPlan:
      fields.backupPlan !== undefined
        ? fields.backupPlan || null
        : (previous?.backupPlan ?? null),
    routeImageUrl:
      fields.routeImageUrl !== undefined
        ? fields.routeImageUrl
        : (previous?.routeImageUrl ?? null),
  };
  const routePlanChanged =
    previous?.operationalRoute !== nextPlan.operationalRoute ||
    previous?.backupPlan !== nextPlan.backupPlan ||
    previous?.routeImageUrl !== nextPlan.routeImageUrl;
  if (hasRoutePlanInput && routePlanChanged)
    await db
      .insert(eventRoutePlanHistory)
      .values({ eventId, authorId: actorId, ...nextPlan });
  const nextBrief = {
    meetingPoint:
      fields.meetingPoint !== undefined
        ? fields.meetingPoint || null
        : (previous?.meetingPoint ?? null),
    meetingInstructions:
      fields.meetingInstructions !== undefined
        ? fields.meetingInstructions || null
        : (previous?.meetingInstructions ?? null),
    emergencyPlan:
      fields.emergencyPlan !== undefined
        ? fields.emergencyPlan || null
        : (previous?.emergencyPlan ?? null),
    ...nextPlan,
  };
  const previousBrief = {
    meetingPoint: previous?.meetingPoint ?? null,
    meetingInstructions: previous?.meetingInstructions ?? null,
    emergencyPlan: previous?.emergencyPlan ?? null,
  };
  const hasDayOfBriefInput =
    "meetingPoint" in input ||
    "meetingInstructions" in input ||
    "emergencyPlan" in input ||
    hasRoutePlanInput;
  const briefChanged =
    hasDayOfBriefInput &&
    (previousBrief.meetingPoint !== nextBrief.meetingPoint ||
      previousBrief.meetingInstructions !== nextBrief.meetingInstructions ||
      previousBrief.emergencyPlan !== nextBrief.emergencyPlan ||
      routePlanChanged);
  if (briefChanged) {
    await db
      .insert(eventDayOfBriefVersions)
      .values({ eventId, authorId: actorId, ...nextBrief });
    const participantIds = await getEventParticipantUserIds(eventId);
    const changes = [
      previousBrief.meetingPoint !== nextBrief.meetingPoint
        ? "rendez-vous"
        : null,
      previousBrief.meetingInstructions !== nextBrief.meetingInstructions
        ? "consignes de rendez-vous"
        : null,
      previousBrief.emergencyPlan !== nextBrief.emergencyPlan
        ? "repères d’urgence"
        : null,
      previous?.operationalRoute !== nextPlan.operationalRoute
        ? "itinéraire"
        : null,
      previous?.backupPlan !== nextPlan.backupPlan ? "plan B" : null,
      previous?.routeImageUrl !== nextPlan.routeImageUrl
        ? "visuel d’itinéraire"
        : null,
    ].filter((label): label is string => Boolean(label));
    const recipients = await Promise.all(
      participantIds
        .filter(userId => userId !== actorId)
        .map(async userId => ({
          userId,
          preferences: await getOrCreateNotificationPreferences(userId),
        }))
    );
    const enabledRecipients = recipients
      .filter(
        ({ preferences }) =>
          preferences?.inAppEnabled !== false &&
          preferences?.eventUpdates !== false &&
          preferences?.dayOfBriefUpdates !== false
      )
      .map(({ userId }) => userId);
    const changeSummary = changes.join(", ");
    await Promise.all(
      enabledRecipients.map(userId =>
        createUserNotification(userId, {
          type: "event_update",
          title: "Nouvelle version de la fiche Jour J",
          body: `${event.title} · Mise à jour : ${changeSummary}. Consultez la fiche Jour J avant le départ.`,
          actionPath: `/?view=my-outings&eventId=${eventId}&focus=day-of`,
        })
      )
    );
  }
  return getEventLogistics(eventId);
}

export async function getDayOfBriefComparison(eventId: number, userId: number) {
  const { db } = await getDayOfBriefViewerAccess(eventId, userId);
  const logistics = await getEventLogistics(eventId);
  const versions = await db
    .select({
      meetingPoint: eventDayOfBriefVersions.meetingPoint,
      meetingInstructions: eventDayOfBriefVersions.meetingInstructions,
      emergencyPlan: eventDayOfBriefVersions.emergencyPlan,
      operationalRoute: eventDayOfBriefVersions.operationalRoute,
      backupPlan: eventDayOfBriefVersions.backupPlan,
      routeImageUrl: eventDayOfBriefVersions.routeImageUrl,
      createdAt: eventDayOfBriefVersions.createdAt,
      authorName: users.name,
    })
    .from(eventDayOfBriefVersions)
    .leftJoin(users, eq(eventDayOfBriefVersions.authorId, users.id))
    .where(eq(eventDayOfBriefVersions.eventId, eventId))
    .orderBy(desc(eventDayOfBriefVersions.createdAt))
    .limit(2);
  if (!logistics?.updatedAt || !versions.length)
    return { current: null, previous: null };
  return {
    current: {
      meetingPoint: logistics.meetingPoint,
      meetingInstructions: logistics.meetingInstructions,
      emergencyPlan: logistics.emergencyPlan,
      operationalRoute: logistics.operationalRoute,
      backupPlan: logistics.backupPlan,
      routeImageUrl: logistics.routeImageUrl,
      createdAt: logistics.updatedAt,
    },
    previous: versions[1] ?? null,
  };
}

export async function publishOperationalDecision(
  actorId: number,
  input: z.infer<typeof eventOperationalDecisionSchema>
) {
  const { db, event } = await getEventManagementAccess(input.eventId, actorId);
  if (event.status === "completed")
    throw new DomainError("This outing is already completed");
  if (event.startsAt.getTime() - Date.now() > 48 * 60 * 60 * 1000)
    throw new DomainError(
      "The day-of decision board opens within 48 hours of departure"
    );
  const result = await db.insert(eventOperationalDecisions).values({
    eventId: input.eventId,
    authorId: actorId,
    outcome: input.outcome,
    note: input.note,
    effectiveFrom: input.effectiveFrom ?? new Date(),
    effectiveUntil: input.effectiveUntil ?? null,
    planBActivated: input.planBActivated,
    acknowledgementRequired: input.acknowledgementRequired,
  });
  const participantIds = await getEventParticipantUserIds(input.eventId);
  const label =
    input.outcome === "maintained"
      ? "Sortie maintenue"
      : input.outcome === "adapted"
        ? "Sortie adaptée"
        : "Annulation annoncée";
  await Promise.all(
    participantIds
      .filter(userId => userId !== actorId)
      .map(userId =>
        createUserNotification(userId, {
          type: "event_update",
          title: "Décision d’organisation publiée",
          body: `${event.title} · ${label} : ${input.note}`,
          actionPath: `/?view=my-outings&eventId=${input.eventId}&focus=decision`,
        })
      )
  );
  return Number(result[0].insertId);
}

export async function listOperationalDecisions(
  eventId: number,
  userId: number
) {
  const { db } = await getDayOfBriefViewerAccess(eventId, userId);
  const [decisions, acknowledgements] = await Promise.all([
    db
      .select({
        id: eventOperationalDecisions.id,
        outcome: eventOperationalDecisions.outcome,
        note: eventOperationalDecisions.note,
        effectiveFrom: eventOperationalDecisions.effectiveFrom,
        effectiveUntil: eventOperationalDecisions.effectiveUntil,
        planBActivated: eventOperationalDecisions.planBActivated,
        acknowledgementRequired:
          eventOperationalDecisions.acknowledgementRequired,
        createdAt: eventOperationalDecisions.createdAt,
        authorName: users.name,
      })
      .from(eventOperationalDecisions)
      .leftJoin(users, eq(eventOperationalDecisions.authorId, users.id))
      .where(eq(eventOperationalDecisions.eventId, eventId))
      .orderBy(desc(eventOperationalDecisions.createdAt))
      .limit(20),
    db
      .select({
        decisionId: eventOperationalDecisionAcknowledgements.decisionId,
        userId: eventOperationalDecisionAcknowledgements.userId,
      })
      .from(eventOperationalDecisionAcknowledgements)
      .innerJoin(
        eventOperationalDecisions,
        eq(
          eventOperationalDecisionAcknowledgements.decisionId,
          eventOperationalDecisions.id
        )
      )
      .where(eq(eventOperationalDecisions.eventId, eventId)),
  ]);
  return decisions.map(decision => ({
    ...decision,
    acknowledgedByMe: acknowledgements.some(
      item => item.decisionId === decision.id && item.userId === userId
    ),
    acknowledgementCount: acknowledgements.filter(
      item => item.decisionId === decision.id
    ).length,
  }));
}

export async function acknowledgeOperationalDecision(
  userId: number,
  input: z.infer<typeof eventOperationalDecisionAcknowledgementSchema>
) {
  const { db, isParticipant } = await getDayOfBriefViewerAccess(
    input.eventId,
    userId
  );
  if (!isParticipant)
    throw new DomainError(
      "Only confirmed participants can acknowledge an operational decision"
    );
  const rows = await db
    .select({
      acknowledgementRequired:
        eventOperationalDecisions.acknowledgementRequired,
    })
    .from(eventOperationalDecisions)
    .where(
      and(
        eq(eventOperationalDecisions.id, input.decisionId),
        eq(eventOperationalDecisions.eventId, input.eventId)
      )
    )
    .limit(1);
  if (!rows[0])
    throw new DomainError("This operational decision is unavailable");
  if (!rows[0].acknowledgementRequired)
    throw new DomainError("This decision does not require acknowledgement");
  const now = new Date();
  await db
    .insert(eventOperationalDecisionAcknowledgements)
    .values({ decisionId: input.decisionId, userId, acknowledgedAt: now })
    .onDuplicateKeyUpdate({ set: { acknowledgedAt: now } });
  return { acknowledgedAt: now };
}

async function getDayOfBriefViewerAccess(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const event = eventRows[0];
  if (!event) throw new DomainError("This outing no longer exists");
  if (event.hostId === userId)
    return { db, event, canManage: true, isParticipant: false };
  const [coOrganizer, participant] = await Promise.all([
    db
      .select({ id: eventCoOrganizers.id })
      .from(eventCoOrganizers)
      .where(
        and(
          eq(eventCoOrganizers.eventId, eventId),
          eq(eventCoOrganizers.userId, userId)
        )
      )
      .limit(1),
    db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          eq(eventParticipants.userId, userId),
          eq(eventParticipants.status, "going")
        )
      )
      .limit(1),
  ]);
  if (coOrganizer[0])
    return { db, event, canManage: true, isParticipant: false };
  if (participant[0])
    return { db, event, canManage: false, isParticipant: true };
  throw new DomainError(
    "Only confirmed participants and the organizing team can access this day-of brief"
  );
}

export async function listEventRoutePlanHistory(
  eventId: number,
  userId: number
) {
  const { db } = await getDayOfBriefViewerAccess(eventId, userId);
  return db
    .select({
      id: eventRoutePlanHistory.id,
      operationalRoute: eventRoutePlanHistory.operationalRoute,
      backupPlan: eventRoutePlanHistory.backupPlan,
      routeImageUrl: eventRoutePlanHistory.routeImageUrl,
      createdAt: eventRoutePlanHistory.createdAt,
      authorName: users.name,
    })
    .from(eventRoutePlanHistory)
    .leftJoin(users, eq(eventRoutePlanHistory.authorId, users.id))
    .where(eq(eventRoutePlanHistory.eventId, eventId))
    .orderBy(desc(eventRoutePlanHistory.createdAt))
    .limit(20);
}

export async function getDayOfBriefAcknowledgementStatus(
  eventId: number,
  userId: number
) {
  const { db, canManage, isParticipant } = await getDayOfBriefViewerAccess(
    eventId,
    userId
  );
  const logistics = await getEventLogistics(eventId);
  const versionUpdatedAt = logistics?.updatedAt ?? null;
  if (!versionUpdatedAt)
    return {
      versionUpdatedAt: null,
      isParticipant,
      canManage,
      acknowledgedAt: null,
      confirmedParticipants: 0,
      acknowledgedParticipants: 0,
    };
  const [participants, acknowledgements] = await Promise.all([
    db
      .select({ userId: eventParticipants.userId })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          eq(eventParticipants.status, "going")
        )
      ),
    db
      .select({
        userId: eventDayOfBriefAcknowledgements.userId,
        acknowledgedAt: eventDayOfBriefAcknowledgements.acknowledgedAt,
      })
      .from(eventDayOfBriefAcknowledgements)
      .where(
        and(
          eq(eventDayOfBriefAcknowledgements.eventId, eventId),
          eq(eventDayOfBriefAcknowledgements.briefUpdatedAt, versionUpdatedAt)
        )
      ),
  ]);
  const acknowledgedAt =
    acknowledgements.find(item => item.userId === userId)?.acknowledgedAt ??
    null;
  return {
    versionUpdatedAt,
    isParticipant,
    canManage,
    acknowledgedAt,
    confirmedParticipants: participants.length,
    acknowledgedParticipants: acknowledgements.length,
  };
}

export async function acknowledgeDayOfBrief(eventId: number, userId: number) {
  const { db, isParticipant } = await getDayOfBriefViewerAccess(
    eventId,
    userId
  );
  if (!isParticipant)
    throw new DomainError(
      "Only confirmed participants can acknowledge the day-of brief"
    );
  const logistics = await getEventLogistics(eventId);
  if (!logistics?.updatedAt)
    throw new DomainError("The day-of brief is not ready yet");
  const now = new Date();
  await db
    .insert(eventDayOfBriefAcknowledgements)
    .values({
      eventId,
      userId,
      briefUpdatedAt: logistics.updatedAt,
      acknowledgedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: { briefUpdatedAt: logistics.updatedAt, acknowledgedAt: now },
    });
  return { acknowledgedAt: now, versionUpdatedAt: logistics.updatedAt };
}

export async function listCarpoolOffers(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: carpoolOffers.id,
      driverId: carpoolOffers.driverId,
      hubId: carpoolOffers.hubId,
      hubLabel: eventCarpoolHubs.label,
      departureLocation: carpoolOffers.departureLocation,
      departureAt: carpoolOffers.departureAt,
      seatsTotal: carpoolOffers.seatsTotal,
      seatsAvailable: carpoolOffers.seatsAvailable,
      note: carpoolOffers.note,
      status: carpoolOffers.status,
      withdrawalNote: carpoolOffers.withdrawalNote,
      withdrawnAt: carpoolOffers.withdrawnAt,
      driverName: users.name,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(carpoolOffers)
    .leftJoin(users, eq(carpoolOffers.driverId, users.id))
    .leftJoin(userProfiles, eq(carpoolOffers.driverId, userProfiles.userId))
    .leftJoin(eventCarpoolHubs, eq(carpoolOffers.hubId, eventCarpoolHubs.id))
    .where(eq(carpoolOffers.eventId, eventId));
}

/**
 * Offers used to be accepted from any signed-in account on any outing, private
 * ones included: the outing did not even have to exist. A ride can now only be
 * offered by someone who is part of the outing.
 */
export async function createCarpoolOffer(
  driverId: number,
  input: z.infer<typeof carpoolOfferSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const event = await getEventById(input.eventId);
  if (!event || event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing is not open for carpooling");
  if (!(await canViewEventCoordination(input.eventId, driverId)))
    throw new DomainError(
      "Only confirmed participants and the organizing team can offer a ride"
    );
  if (input.hubId) {
    const hub = await db
      .select({ id: eventCarpoolHubs.id })
      .from(eventCarpoolHubs)
      .where(
        and(
          eq(eventCarpoolHubs.id, input.hubId),
          eq(eventCarpoolHubs.eventId, input.eventId)
        )
      )
      .limit(1);
    if (!hub[0])
      throw new DomainError("This meeting hub is unavailable for the outing");
  }
  const result = await db.insert(carpoolOffers).values({ ...input, driverId });
  return Number(result[0].insertId);
}

export async function updateCarpoolOffer(
  driverId: number,
  input: z.infer<typeof carpoolUpdateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const {
    offerId,
    eventId: _eventId,
    seatsAvailable: _clientSeatsAvailable,
    ...changes
  } = input;
  const rows = await db
    .select({ offer: carpoolOffers, event: events })
    .from(carpoolOffers)
    .leftJoin(events, eq(carpoolOffers.eventId, events.id))
    .where(eq(carpoolOffers.id, offerId))
    .limit(1);
  const offer = rows[0]?.offer;
  const event = rows[0]?.event;
  if (
    !offer ||
    !event ||
    offer.driverId !== driverId ||
    offer.status !== "active"
  )
    throw new DomainError("Only the active offer driver can update this ride");
  const confirmed = await db
    .select({
      passengerId: carpoolSeatReservations.passengerId,
      seatsRequested: carpoolSeatReservations.seatsRequested,
    })
    .from(carpoolSeatReservations)
    .where(
      and(
        eq(carpoolSeatReservations.offerId, offerId),
        eq(carpoolSeatReservations.status, "accepted")
      )
    );
  // Seats, not reservations: one passenger may hold several places, and
  // counting rows let the driver resell them.
  const confirmedSeats = confirmed.reduce(
    (total, reservation) => total + reservation.seatsRequested,
    0
  );
  if (changes.seatsTotal < confirmedSeats)
    throw new DomainError(
      `Cannot reduce seats below confirmed count (${confirmedSeats})`
    );
  const seatsAvailable = changes.seatsTotal - confirmedSeats;
  await db
    .update(carpoolOffers)
    .set({ ...changes, seatsAvailable })
    .where(eq(carpoolOffers.id, offerId));
  await Promise.all(
    confirmed.map(({ passengerId }) =>
      createUserNotification(passengerId, {
        type: "event_update",
        title: "Trajet covoiturage mis à jour",
        body: `${event.title} · Le conducteur a modifié le trajet au départ de ${changes.departureLocation}. Vérifiez le lieu, l’horaire et les places avant le départ.`,
        actionPath: `/?view=my-outings&eventId=${event.id}&focus=carpool`,
      })
    )
  );
  return { offerId, notifiedPassengers: confirmed.length };
}

export async function listEventCarpoolHubs(eventId: number, userId: number) {
  const { db } = await getDayOfBriefViewerAccess(eventId, userId);
  return db
    .select()
    .from(eventCarpoolHubs)
    .where(eq(eventCarpoolHubs.eventId, eventId))
    .orderBy(asc(eventCarpoolHubs.createdAt));
}

export async function createEventCarpoolHub(
  actorId: number,
  input: z.infer<typeof eventCarpoolHubSchema>
) {
  const { db, event } = await getEventManagementAccess(input.eventId, actorId);
  if (!event.carpoolEnabled)
    throw new DomainError(
      "Enable carpool for this outing before adding a meeting hub"
    );
  const result = await db.insert(eventCarpoolHubs).values({
    ...input,
    createdBy: actorId,
    instructions: input.instructions || null,
    fallbackNote: input.fallbackNote || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  });
  return Number(result[0].insertId);
}

export async function deleteEventCarpoolHub(
  actorId: number,
  eventId: number,
  hubId: number
) {
  const { db } = await getEventManagementAccess(eventId, actorId);
  await db
    .update(carpoolOffers)
    .set({ hubId: null })
    .where(
      and(eq(carpoolOffers.eventId, eventId), eq(carpoolOffers.hubId, hubId))
    );
  await db
    .delete(eventCarpoolHubs)
    .where(
      and(eq(eventCarpoolHubs.id, hubId), eq(eventCarpoolHubs.eventId, eventId))
    );
}

export async function listEventAccessRadar(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: eventAccessRadarEntries.id,
      category: eventAccessRadarEntries.category,
      status: eventAccessRadarEntries.status,
      label: eventAccessRadarEntries.label,
      note: eventAccessRadarEntries.note,
      sourceLabel: eventAccessRadarEntries.sourceLabel,
      sourceUrl: eventAccessRadarEntries.sourceUrl,
      checkedAt: eventAccessRadarEntries.checkedAt,
      authorName: users.name,
    })
    .from(eventAccessRadarEntries)
    .leftJoin(users, eq(eventAccessRadarEntries.authorId, users.id))
    .where(eq(eventAccessRadarEntries.eventId, eventId))
    .orderBy(desc(eventAccessRadarEntries.checkedAt));
}

export async function createEventAccessRadarEntry(
  actorId: number,
  input: z.infer<typeof eventAccessRadarEntrySchema>
) {
  const { db, event } = await getEventManagementAccess(input.eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  const result = await db
    .insert(eventAccessRadarEntries)
    .values({ ...input, authorId: actorId, note: input.note || null });
  return Number(result[0].insertId);
}

export async function deleteEventAccessRadarEntry(
  actorId: number,
  eventId: number,
  entryId: number
) {
  const { db } = await getEventManagementAccess(eventId, actorId);
  await db
    .delete(eventAccessRadarEntries)
    .where(
      and(
        eq(eventAccessRadarEntries.id, entryId),
        eq(eventAccessRadarEntries.eventId, eventId)
      )
    );
}

export async function listMyPreparationPassportEntries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: userPreparationPassportEntries.id,
      eventId: userPreparationPassportEntries.eventId,
      terrainReflection: userPreparationPassportEntries.terrainReflection,
      paceReflection: userPreparationPassportEntries.paceReflection,
      conditionsReflection: userPreparationPassportEntries.conditionsReflection,
      equipmentReflection: userPreparationPassportEntries.equipmentReflection,
      personalNote: userPreparationPassportEntries.personalNote,
      updatedAt: userPreparationPassportEntries.updatedAt,
      title: events.title,
      locationName: events.locationName,
      startsAt: events.startsAt,
    })
    .from(userPreparationPassportEntries)
    .leftJoin(events, eq(userPreparationPassportEntries.eventId, events.id))
    .where(eq(userPreparationPassportEntries.userId, userId))
    .orderBy(desc(userPreparationPassportEntries.updatedAt));
}

export async function savePreparationPassportEntry(
  userId: number,
  input: z.infer<typeof preparationPassportEntrySchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const eventRows = await db
    .select({ startsAt: events.startsAt })
    .from(events)
    .where(eq(events.id, input.eventId))
    .limit(1);
  const participation = await getEventParticipation(input.eventId, userId);
  if (
    !eventRows[0] ||
    eventRows[0].startsAt > new Date() ||
    participation?.status !== "going"
  )
    throw new DomainError(
      "A passport reflection is available only after a confirmed outing"
    );
  await db
    .insert(userPreparationPassportEntries)
    .values({
      userId,
      ...input,
      terrainReflection: input.terrainReflection || null,
      conditionsReflection: input.conditionsReflection || null,
      equipmentReflection: input.equipmentReflection || null,
      personalNote: input.personalNote || null,
    })
    .onDuplicateKeyUpdate({
      set: {
        terrainReflection: input.terrainReflection || null,
        paceReflection: input.paceReflection,
        conditionsReflection: input.conditionsReflection || null,
        equipmentReflection: input.equipmentReflection || null,
        personalNote: input.personalNote || null,
      },
    });
  return { eventId: input.eventId };
}

export async function listEventPaceGroups(eventId: number, userId: number) {
  const { db } = await getDayOfBriefViewerAccess(eventId, userId);
  const [groups, assignments] = await Promise.all([
    db
      .select({
        id: eventPaceGroups.id,
        label: eventPaceGroups.label,
        paceDescription: eventPaceGroups.paceDescription,
        rallyPoints: eventPaceGroups.rallyPoints,
        leaderId: eventPaceGroups.leaderId,
        leaderName: users.name,
      })
      .from(eventPaceGroups)
      .leftJoin(users, eq(eventPaceGroups.leaderId, users.id))
      .where(eq(eventPaceGroups.eventId, eventId))
      .orderBy(asc(eventPaceGroups.createdAt)),
    db
      .select({
        groupId: eventPaceGroupAssignments.groupId,
        userId: eventPaceGroupAssignments.userId,
      })
      .from(eventPaceGroupAssignments)
      .where(eq(eventPaceGroupAssignments.eventId, eventId)),
  ]);
  return groups.map(group => ({
    ...group,
    participantCount: assignments.filter(item => item.groupId === group.id)
      .length,
    selectedByMe: assignments.some(
      item => item.groupId === group.id && item.userId === userId
    ),
  }));
}

export async function createEventPaceGroup(
  actorId: number,
  input: z.infer<typeof eventPaceGroupSchema>
) {
  const { db } = await getEventManagementAccess(input.eventId, actorId);
  if (input.leaderId) {
    const participant = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, input.eventId),
          eq(eventParticipants.userId, input.leaderId),
          eq(eventParticipants.status, "going")
        )
      )
      .limit(1);
    if (!participant[0])
      throw new DomainError(
        "A pace-group lead must be a confirmed participant"
      );
  }
  const result = await db.insert(eventPaceGroups).values({
    ...input,
    createdBy: actorId,
    leaderId: input.leaderId ?? null,
    rallyPoints: input.rallyPoints || null,
  });
  return Number(result[0].insertId);
}

export async function deleteEventPaceGroup(
  actorId: number,
  eventId: number,
  groupId: number
) {
  const { db } = await getEventManagementAccess(eventId, actorId);
  await db
    .delete(eventPaceGroupAssignments)
    .where(
      and(
        eq(eventPaceGroupAssignments.eventId, eventId),
        eq(eventPaceGroupAssignments.groupId, groupId)
      )
    );
  await db
    .delete(eventPaceGroups)
    .where(
      and(eq(eventPaceGroups.eventId, eventId), eq(eventPaceGroups.id, groupId))
    );
}

export async function selectEventPaceGroup(
  userId: number,
  input: z.infer<typeof eventPaceGroupAssignmentSchema>
) {
  const { db, isParticipant } = await getDayOfBriefViewerAccess(
    input.eventId,
    userId
  );
  if (!isParticipant)
    throw new DomainError(
      "Only confirmed participants can select a pace group"
    );
  if (input.groupId === null) {
    await db
      .delete(eventPaceGroupAssignments)
      .where(
        and(
          eq(eventPaceGroupAssignments.eventId, input.eventId),
          eq(eventPaceGroupAssignments.userId, userId)
        )
      );
    return { groupId: null };
  }
  const group = await db
    .select({ id: eventPaceGroups.id })
    .from(eventPaceGroups)
    .where(
      and(
        eq(eventPaceGroups.id, input.groupId),
        eq(eventPaceGroups.eventId, input.eventId)
      )
    )
    .limit(1);
  if (!group[0]) throw new DomainError("This pace group is unavailable");
  await db
    .insert(eventPaceGroupAssignments)
    .values({
      eventId: input.eventId,
      groupId: input.groupId,
      userId,
      assignedBy: null,
    })
    .onDuplicateKeyUpdate({
      set: { groupId: input.groupId, assignedBy: null },
    });
  return { groupId: input.groupId };
}

export async function withdrawCarpoolOffer(
  driverId: number,
  input: z.infer<typeof carpoolWithdrawalSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ offer: carpoolOffers, event: events })
    .from(carpoolOffers)
    .leftJoin(events, eq(carpoolOffers.eventId, events.id))
    .where(eq(carpoolOffers.id, input.offerId))
    .limit(1);
  const row = rows[0];
  const event = row?.event;
  if (
    !event ||
    row.offer.driverId !== driverId ||
    row.offer.status !== "active"
  )
    throw new DomainError(
      "Only the active offer driver can withdraw this ride"
    );
  // Pending requests used to stay pending on a ride that no longer existed.
  const passengers = await db.transaction(tx =>
    withdrawCarpoolOffersById(
      tx,
      [input.offerId],
      driverId,
      new Date(),
      input.note ?? null
    )
  );
  await notifyCarpoolWithdrawn(passengers, event);
  return { affectedParticipants: passengers.length };
}

export async function getCarpoolRecovery(eventId: number, userId: number) {
  const { db } = await getDayOfBriefViewerAccess(eventId, userId);
  const [activeOffers, withdrawnOffers] = await Promise.all([
    db
      .select({
        id: carpoolOffers.id,
        seatsAvailable: carpoolOffers.seatsAvailable,
      })
      .from(carpoolOffers)
      .where(
        and(
          eq(carpoolOffers.eventId, eventId),
          eq(carpoolOffers.status, "active")
        )
      ),
    db
      .select({
        id: carpoolOffers.id,
        departureLocation: carpoolOffers.departureLocation,
        withdrawalNote: carpoolOffers.withdrawalNote,
        withdrawnAt: carpoolOffers.withdrawnAt,
        driverName: users.name,
      })
      .from(carpoolOffers)
      .leftJoin(users, eq(carpoolOffers.driverId, users.id))
      .where(
        and(
          eq(carpoolOffers.eventId, eventId),
          eq(carpoolOffers.status, "withdrawn")
        )
      )
      .orderBy(desc(carpoolOffers.withdrawnAt)),
  ]);
  return {
    replacementSeats: activeOffers.reduce(
      (total, offer) => total + offer.seatsAvailable,
      0
    ),
    withdrawnOffers,
  };
}

export async function createEventDateOption(
  actorId: number,
  input: z.infer<typeof eventDateOptionSchema>
) {
  const { db } = await getEventManagementAccess(input.eventId, actorId);
  const result = await db
    .insert(eventDateOptions)
    .values({ ...input, createdBy: actorId });
  return Number(result[0].insertId);
}

export async function publishEventFromDateOption(
  actorId: number,
  input: z.infer<typeof eventDateOptionPublishSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const optionRows = await db
    .select()
    .from(eventDateOptions)
    .where(eq(eventDateOptions.id, input.optionId))
    .limit(1);
  const option = optionRows[0];
  if (!option) throw new DomainError("This date option no longer exists");
  if (option.publishedEventId)
    return {
      eventId: option.publishedEventId,
      alreadyPublished: true,
      copied: { landmarks: 0, checklistItems: 0, coOrganizers: 0 },
    };
  const { event: source } = await getEventManagementAccess(
    option.eventId,
    actorId
  );
  if (source.status === "cancelled" || source.status === "completed")
    throw new DomainError("This outing can no longer create a new date");
  const allOptions = await db
    .select()
    .from(eventDateOptions)
    .where(eq(eventDateOptions.eventId, source.id));
  const availabilityRows = allOptions.length
    ? await db
        .select()
        .from(eventDateOptionAvailabilities)
        .where(
          or(
            ...allOptions.map(item =>
              eq(eventDateOptionAvailabilities.optionId, item.id)
            )
          )
        )
    : [];
  const ranked = [...allOptions].sort((a, b) => {
    const countA = availabilityRows.filter(
      row => row.optionId === a.id && row.available
    ).length;
    const countB = availabilityRows.filter(
      row => row.optionId === b.id && row.available
    ).length;
    return countB - countA || a.startsAt.getTime() - b.startsAt.getTime();
  });
  if (ranked[0]?.id !== option.id)
    throw new DomainError(
      "Choose the date option with the highest recorded availability"
    );
  const facilityStatus = (
    value: string
  ): "unknown" | "available" | "limited" | "unavailable" =>
    value === "available" || value === "limited" || value === "unavailable"
      ? value
      : "unknown";
  let manualRoutePoints: Array<{ latitude: number; longitude: number }> = [];
  let manualRouteRoundTrip = false;
  let manualRouteAttentionZones: Array<{
    type: "attention" | "hazard" | "access" | "navigation";
    note: string;
    latitude: number;
    longitude: number;
  }> = [];
  try {
    const parsed = source.manualRouteJson
      ? JSON.parse(source.manualRouteJson)
      : [];
    if (Array.isArray(parsed)) manualRoutePoints = parsed;
    else if (Array.isArray(parsed?.points)) {
      manualRoutePoints = parsed.points;
      manualRouteRoundTrip = Boolean(parsed.returnTrip);
      manualRouteAttentionZones = Array.isArray(parsed.attentionZones)
        ? parsed.attentionZones
        : [];
    }
  } catch {
    /* An older malformed route is not copied. */
  }
  const cloneInput: z.infer<typeof eventCreateSchema> = {
    title: source.title,
    description: source.description,
    locationName: source.locationName,
    latitude: source.latitude ?? undefined,
    longitude: source.longitude ?? undefined,
    startsAt: option.startsAt,
    visibility: source.visibility,
    difficulty: source.difficulty,
    difficultyOverrideReason: source.difficultyOverrideReason ?? undefined,
    levelAdmissionPolicy: source.levelAdmissionPolicy,
    levelRequirementNote: source.levelRequirementNote ?? undefined,
    terrainType: source.terrainType,
    technicality: source.technicality,
    exposureLevel: source.exposureLevel,
    navigationLevel: source.navigationLevel,
    routeCondition: source.routeCondition,
    distanceKm: source.distanceKm,
    elevationGain: source.elevationGain,
    durationMinutes: source.durationMinutes,
    capacity: source.capacity,
    requiresApproval: source.requiresApproval,
    carpoolEnabled: source.carpoolEnabled,
    outingType: source.outingType,
    bookingMode: source.bookingMode,
    priceCents: source.priceCents,
    toiletsStatus: facilityStatus(source.toiletsStatus),
    waterStatus: facilityStatus(source.waterStatus),
    parkingStatus: facilityStatus(source.parkingStatus),
    receptionStatus: facilityStatus(source.receptionStatus),
    cellReceptionStatus: facilityStatus(source.cellReceptionStatus),
    accessibilityNotes: source.accessibilityNotes ?? undefined,
    facilitiesNotes: source.facilitiesNotes ?? undefined,
    facilitiesVerifiedAt: source.facilitiesVerifiedAt ?? undefined,
    gpxUrl: source.gpxUrl ?? undefined,
    allTrailsUrl: source.allTrailsUrl ?? undefined,
    localWeatherSourceLabel: source.localWeatherSourceLabel ?? undefined,
    localWeatherSourceUrl: source.localWeatherSourceUrl ?? undefined,
    participantGuidance: source.participantGuidance ?? undefined,
    cancellationPolicy: source.cancellationPolicy ?? undefined,
    manualRoutePoints,
    manualRouteRoundTrip,
    manualRouteAttentionZones,
    initialTerrainLandmarks: [],
    packingItems: [],
    coverImageUrl: source.coverImageUrl ?? undefined,
    coverImageFocalX: source.coverImageFocalX ?? undefined,
    coverImageFocalY: source.coverImageFocalY ?? undefined,
  };
  const eventResult = await db
    .insert(events)
    .values(buildHikingEventInsertValues(source.hostId, cloneInput));
  const eventId = Number(eventResult[0].insertId);
  const [logistics, landmarks, coOrganizers, checklistItems] =
    await Promise.all([
      db
        .select()
        .from(eventLogistics)
        .where(eq(eventLogistics.eventId, source.id))
        .limit(1),
      db
        .select()
        .from(eventTerrainLandmarks)
        .where(eq(eventTerrainLandmarks.eventId, source.id)),
      db
        .select()
        .from(eventCoOrganizers)
        .where(eq(eventCoOrganizers.eventId, source.id)),
      db.select().from(packingItems).where(eq(packingItems.eventId, source.id)),
    ]);
  await Promise.all([
    logistics[0]
      ? db.insert(eventLogistics).values({
          eventId,
          meetingPoint: logistics[0].meetingPoint,
          meetingInstructions: logistics[0].meetingInstructions,
          emergencyPlan: logistics[0].emergencyPlan,
          operationalRoute: logistics[0].operationalRoute,
          backupPlan: logistics[0].backupPlan,
          routeImageUrl: logistics[0].routeImageUrl,
          terrainStatus: logistics[0].terrainStatus,
          accessStatus: logistics[0].accessStatus,
          terrainAccessNote: logistics[0].terrainAccessNote,
          terrainSourceLabel: logistics[0].terrainSourceLabel,
          terrainSourceUrl: logistics[0].terrainSourceUrl,
          terrainCheckedAt: logistics[0].terrainCheckedAt,
          equipmentNotes: logistics[0].equipmentNotes,
          weatherPolicy: logistics[0].weatherPolicy,
        })
      : Promise.resolve(),
    landmarks.length
      ? db.insert(eventTerrainLandmarks).values(
          landmarks.map(landmark => ({
            eventId,
            createdBy: actorId,
            type: landmark.type,
            label: landmark.label,
            note: landmark.note,
            status: landmark.status,
            latitude: landmark.latitude,
            longitude: landmark.longitude,
            verifiedAt: landmark.verifiedAt,
          }))
        )
      : Promise.resolve(),
    coOrganizers.length
      ? db.insert(eventCoOrganizers).values(
          coOrganizers.map(coOrganizer => ({
            eventId,
            userId: coOrganizer.userId,
            role: coOrganizer.role,
            acceptedAt: coOrganizer.acceptedAt,
          }))
        )
      : Promise.resolve(),
    checklistItems.length
      ? db.insert(packingItems).values(
          checklistItems.map(item => ({
            eventId,
            label: item.label,
            category: item.category,
            isRequired: item.isRequired,
          }))
        )
      : Promise.resolve(),
  ]);
  await db
    .update(eventDateOptions)
    .set({ publishedEventId: eventId })
    .where(eq(eventDateOptions.id, option.id));
  return {
    eventId,
    alreadyPublished: false,
    copied: {
      landmarks: landmarks.length,
      checklistItems: checklistItems.length,
      coOrganizers: coOrganizers.length,
    },
  };
}

export async function updateEventDateAvailability(
  userId: number,
  input: z.infer<typeof eventDateAvailabilitySchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ eventId: eventDateOptions.eventId })
    .from(eventDateOptions)
    .where(eq(eventDateOptions.id, input.optionId))
    .limit(1);
  const option = rows[0];
  if (!option) throw new DomainError("This date option no longer exists");
  await getDayOfBriefViewerAccess(option.eventId, userId);
  await db
    .insert(eventDateOptionAvailabilities)
    .values({ ...input, userId })
    .onDuplicateKeyUpdate({ set: { available: input.available } });
  return { optionId: input.optionId, available: input.available };
}

export async function createEventSeries(
  ownerId: number,
  input: z.infer<typeof eventSeriesCreateSchema>
) {
  const { db, event } = await getEventManagementAccess(
    input.sourceEventId,
    ownerId
  );
  if (event.status === "cancelled")
    throw new DomainError("A cancelled outing cannot start a series");
  const result = await db
    .insert(eventSeries)
    .values({
      ownerId,
      sourceEventId: input.sourceEventId,
      name: input.name,
      cadence: input.cadence,
    })
    .onDuplicateKeyUpdate({
      set: { name: input.name, cadence: input.cadence, status: "active" },
    });
  return Number(result[0].insertId);
}

export async function listMyEventSeries(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const series = await db
    .select({
      id: eventSeries.id,
      sourceEventId: eventSeries.sourceEventId,
      name: eventSeries.name,
      cadence: eventSeries.cadence,
      status: eventSeries.status,
      updatedAt: eventSeries.updatedAt,
      title: events.title,
      locationName: events.locationName,
    })
    .from(eventSeries)
    .innerJoin(events, eq(events.id, eventSeries.sourceEventId))
    .where(eq(eventSeries.ownerId, ownerId))
    .orderBy(desc(eventSeries.updatedAt));
  if (!series.length) return [];
  const interests = await db
    .select({
      seriesId: eventSeriesInterests.seriesId,
      userId: eventSeriesInterests.userId,
    })
    .from(eventSeriesInterests)
    .where(
      or(...series.map(item => eq(eventSeriesInterests.seriesId, item.id)))
    );
  return series.map(item => ({
    ...item,
    interestCount: interests.filter(interest => interest.seriesId === item.id)
      .length,
  }));
}

export async function toggleEventSeriesInterest(
  userId: number,
  seriesId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const series = await db
    .select({
      id: eventSeries.id,
      ownerId: eventSeries.ownerId,
      sourceEventId: eventSeries.sourceEventId,
      status: eventSeries.status,
      visibility: events.visibility,
      moderationStatus: events.moderationStatus,
    })
    .from(eventSeries)
    .innerJoin(events, eq(events.id, eventSeries.sourceEventId))
    .where(eq(eventSeries.id, seriesId))
    .limit(1);
  if (
    !series[0] ||
    series[0].status !== "active" ||
    series[0].visibility !== "public" ||
    series[0].moderationStatus !== "visible"
  )
    throw new DomainError("This series is unavailable");
  const existing = await db
    .select({ id: eventSeriesInterests.id })
    .from(eventSeriesInterests)
    .where(
      and(
        eq(eventSeriesInterests.seriesId, seriesId),
        eq(eventSeriesInterests.userId, userId)
      )
    )
    .limit(1);
  if (existing[0]) {
    await db
      .delete(eventSeriesInterests)
      .where(eq(eventSeriesInterests.id, existing[0].id));
    return { interested: false };
  }
  await db.insert(eventSeriesInterests).values({ seriesId, userId });
  return { interested: true };
}

export async function getEventSeriesForEvent(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  await getDayOfBriefViewerAccess(eventId, userId);
  const series = await db
    .select()
    .from(eventSeries)
    .where(
      and(
        eq(eventSeries.sourceEventId, eventId),
        eq(eventSeries.status, "active")
      )
    )
    .limit(1);
  if (!series[0]) return undefined;
  const interests = await db
    .select({ userId: eventSeriesInterests.userId })
    .from(eventSeriesInterests)
    .where(eq(eventSeriesInterests.seriesId, series[0].id));
  return {
    ...series[0],
    interestCount: interests.length,
    myInterested: interests.some(item => item.userId === userId),
  };
}

export async function listRelaunchCandidates(eventId: number, ownerId: number) {
  const { db } = await getEventManagementAccess(eventId, ownerId);
  const [historical, alreadyInvited] = await Promise.all([
    db
      .select({
        userId: eventParticipants.userId,
        name: users.name,
        eventTitle: events.title,
        completedAt: events.startsAt,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(events.id, eventParticipants.eventId))
      .leftJoin(users, eq(users.id, eventParticipants.userId))
      .where(
        and(
          eq(events.hostId, ownerId),
          eq(events.status, "completed"),
          eq(eventParticipants.status, "going")
        )
      )
      .orderBy(desc(events.startsAt)),
    db
      .select({ userId: eventParticipants.userId })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          or(
            eq(eventParticipants.status, "going"),
            eq(eventParticipants.status, "pending"),
            eq(eventParticipants.status, "waitlist")
          )
        )
      ),
  ]);
  const excluded = new Set(alreadyInvited.map(item => item.userId));
  const unique = new Map<number, (typeof historical)[number]>();
  historical.forEach(item => {
    if (!excluded.has(item.userId) && !unique.has(item.userId))
      unique.set(item.userId, item);
  });
  return Array.from(unique.values()).slice(0, 60);
}

export async function sendEventRelaunchInvites(
  ownerId: number,
  input: z.infer<typeof eventSeriesRelaunchSchema>
) {
  const { db, event } = await getEventManagementAccess(input.eventId, ownerId);
  if (event.status !== "published")
    throw new DomainError("Only a published outing can be shared");
  const candidates = await listRelaunchCandidates(input.eventId, ownerId);
  const allowed = new Set(candidates.map(candidate => candidate.userId));
  const recipients = Array.from(new Set(input.participantIds)).filter(userId =>
    allowed.has(userId)
  );
  if (!recipients.length)
    throw new DomainError("Choose former participants who are still eligible");
  await Promise.all(
    recipients.map(userId =>
      createUserNotification(userId, {
        type: "registration",
        title: `Nouvelle sortie : ${event.title}`,
        body: input.message,
        actionPath: `/?event=${event.id}`,
      })
    )
  );
  return { sent: recipients.length };
}

export async function listInvitationTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userInvitationTemplates)
    .where(eq(userInvitationTemplates.userId, userId))
    .orderBy(desc(userInvitationTemplates.updatedAt));
}

export async function createInvitationTemplate(
  userId: number,
  input: z.infer<typeof invitationTemplateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select({ id: userInvitationTemplates.id })
    .from(userInvitationTemplates)
    .where(eq(userInvitationTemplates.userId, userId));
  if (existing.length >= 12)
    throw new DomainError("Keep up to 12 invitation templates");
  const result = await db
    .insert(userInvitationTemplates)
    .values({ userId, ...input });
  return Number(result[0].insertId);
}

export async function deleteInvitationTemplate(
  userId: number,
  input: z.infer<typeof invitationTemplateDeleteSchema>
) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .delete(userInvitationTemplates)
    .where(
      and(
        eq(userInvitationTemplates.id, input.templateId),
        eq(userInvitationTemplates.userId, userId)
      )
    );
  return (result[0].affectedRows ?? 0) > 0;
}

export async function recordEventInvitationShare(
  actorId: number,
  input: z.infer<typeof eventInvitationShareSchema>
) {
  const { db } = await getEventManagementAccess(input.eventId, actorId);
  await db
    .insert(eventInvitationShareEvents)
    .values({ eventId: input.eventId, actorId, action: input.action });
  return getEventInvitationShareStats(input.eventId, actorId);
}

export async function getEventInvitationShareStats(
  eventId: number,
  actorId: number
) {
  const { db } = await getEventManagementAccess(eventId, actorId);
  const rows = await db
    .select({ action: eventInvitationShareEvents.action })
    .from(eventInvitationShareEvents)
    .where(eq(eventInvitationShareEvents.eventId, eventId));
  return {
    copies: rows.filter(row => row.action === "copy").length,
    shares: rows.filter(row => row.action === "share").length,
    total: rows.length,
  };
}

export async function listEventDateOptions(eventId: number, userId: number) {
  const { db } = await getDayOfBriefViewerAccess(eventId, userId);
  const options = await db
    .select()
    .from(eventDateOptions)
    .where(eq(eventDateOptions.eventId, eventId))
    .orderBy(asc(eventDateOptions.startsAt));
  const availabilities = options.length
    ? await db
        .select()
        .from(eventDateOptionAvailabilities)
        .where(
          or(
            ...options.map(option =>
              eq(eventDateOptionAvailabilities.optionId, option.id)
            )
          )
        )
    : [];
  return options.map(option => {
    const rows = availabilities.filter(row => row.optionId === option.id);
    return {
      ...option,
      availableCount: rows.filter(row => row.available).length,
      myAvailability:
        rows.find(row => row.userId === userId)?.available ?? null,
    };
  });
}

export async function getPostOutingSignals(eventId: number, userId: number) {
  const { db, event } = await getDayOfBriefViewerAccess(eventId, userId);
  const [participants, checkIns, reports, decisions, versions] =
    await Promise.all([
      db
        .select({ id: eventParticipants.id })
        .from(eventParticipants)
        .where(
          and(
            eq(eventParticipants.eventId, eventId),
            eq(eventParticipants.status, "going")
          )
        ),
      db
        .select({ kind: eventSafetyCheckIns.kind })
        .from(eventSafetyCheckIns)
        .where(eq(eventSafetyCheckIns.eventId, eventId)),
      db
        .select({ id: eventConditionReports.id })
        .from(eventConditionReports)
        .where(eq(eventConditionReports.eventId, eventId)),
      db
        .select({ id: eventOperationalDecisions.id })
        .from(eventOperationalDecisions)
        .where(eq(eventOperationalDecisions.eventId, eventId)),
      db
        .select({ id: eventDayOfBriefVersions.id })
        .from(eventDayOfBriefVersions)
        .where(eq(eventDayOfBriefVersions.eventId, eventId)),
    ]);
  return {
    available: event.startsAt <= new Date(),
    confirmedParticipants: participants.length,
    departureCheckIns: checkIns.filter(item => item.kind === "departure")
      .length,
    arrivalCheckIns: checkIns.filter(item => item.kind === "arrival").length,
    conditionReports: reports.length,
    organizerDecisions: decisions.length,
    briefVersions: versions.length,
  };
}

export async function listCarpoolSeatReservations(
  eventId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return [];
  const event = await getEventById(eventId);
  const canViewAll = event?.hostId === userId;
  return db
    .select({
      id: carpoolSeatReservations.id,
      offerId: carpoolSeatReservations.offerId,
      passengerId: carpoolSeatReservations.passengerId,
      seatsRequested: carpoolSeatReservations.seatsRequested,
      note: carpoolSeatReservations.note,
      status: carpoolSeatReservations.status,
      departureLocation: carpoolOffers.departureLocation,
      driverId: carpoolOffers.driverId,
      passengerName: users.name,
    })
    .from(carpoolSeatReservations)
    .leftJoin(
      carpoolOffers,
      eq(carpoolSeatReservations.offerId, carpoolOffers.id)
    )
    .leftJoin(users, eq(carpoolSeatReservations.passengerId, users.id))
    .where(
      and(
        eq(carpoolOffers.eventId, eventId),
        canViewAll
          ? undefined
          : or(
              eq(carpoolSeatReservations.passengerId, userId),
              eq(carpoolOffers.driverId, userId)
            )
      )
    );
}

export async function requestCarpoolSeat(
  passengerId: number,
  input: z.infer<typeof carpoolSeatReservationSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const offerRows = await db
    .select()
    .from(carpoolOffers)
    .where(eq(carpoolOffers.id, input.offerId))
    .limit(1);
  const offer = offerRows[0];
  if (!offer || offer.driverId === passengerId || offer.status !== "active")
    throw new DomainError("This carpool offer is unavailable");
  const participation = await getEventParticipation(offer.eventId, passengerId);
  if (participation?.status !== "going")
    throw new DomainError(
      "Only confirmed participants can request a carpool seat"
    );
  const existing = await db
    .select({ status: carpoolSeatReservations.status })
    .from(carpoolSeatReservations)
    .where(
      and(
        eq(carpoolSeatReservations.offerId, offer.id),
        eq(carpoolSeatReservations.passengerId, passengerId)
      )
    )
    .limit(1);
  // Re-requesting reset an accepted seat to pending while its places stayed
  // taken on the offer — a second acceptance then took them twice.
  if (existing[0]?.status === "accepted")
    throw new DomainError("You already have a confirmed seat on this ride");
  if (offer.seatsAvailable < input.seatsRequested)
    throw new DomainError("Not enough seats remain available");
  const result = await db
    .insert(carpoolSeatReservations)
    .values({
      offerId: offer.id,
      passengerId,
      seatsRequested: input.seatsRequested,
      note: input.note,
    })
    .onDuplicateKeyUpdate({
      set: {
        seatsRequested: input.seatsRequested,
        note: input.note,
        status: "pending",
        processedAt: null,
        processedBy: null,
      },
    });
  return Number(result[0].insertId);
}

export async function decideCarpoolSeatReservation(
  driverId: number,
  input: z.infer<typeof carpoolSeatDecisionSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      reservation: carpoolSeatReservations,
      offer: carpoolOffers,
      event: events,
    })
    .from(carpoolSeatReservations)
    .leftJoin(
      carpoolOffers,
      eq(carpoolSeatReservations.offerId, carpoolOffers.id)
    )
    .leftJoin(events, eq(carpoolOffers.eventId, events.id))
    .where(eq(carpoolSeatReservations.id, input.reservationId))
    .limit(1);
  const row = rows[0];
  if (!row?.offer || !row.event || row.offer.driverId !== driverId)
    throw new DomainError("Only the driver can decide this seat request");
  if (row.reservation.status !== "pending")
    throw new DomainError("This seat request has already been decided");
  const { offer, reservation } = row;
  // Both writes are conditional and share a transaction. The seat count used
  // to be computed from the value read above and written back as an absolute
  // number, so two acceptances at the same moment could both succeed.
  await db.transaction(async tx => {
    const decided = await tx
      .update(carpoolSeatReservations)
      .set({
        status: input.status,
        processedAt: new Date(),
        processedBy: driverId,
      })
      .where(
        and(
          eq(carpoolSeatReservations.id, reservation.id),
          eq(carpoolSeatReservations.status, "pending")
        )
      );
    if (!decided[0].affectedRows)
      throw new DomainError("This seat request has already been decided");
    if (input.status !== "accepted") return;
    const taken = await tx
      .update(carpoolOffers)
      .set({
        seatsAvailable: sql`${carpoolOffers.seatsAvailable} - ${reservation.seatsRequested}`,
      })
      .where(
        and(
          eq(carpoolOffers.id, offer.id),
          eq(carpoolOffers.status, "active"),
          gte(carpoolOffers.seatsAvailable, reservation.seatsRequested)
        )
      );
    if (!taken[0].affectedRows)
      throw new DomainError("Not enough seats remain available");
  });
  await createUserNotification(reservation.passengerId, {
    type: "event_update",
    title:
      input.status === "accepted"
        ? "Covoiturage confirmé"
        : "Demande de covoiturage refusée",
    body: `${row.event.title} · ${offer.departureLocation}`,
    actionPath: "/?view=my-outings",
  });
  return { status: input.status };
}

export async function removeCarpoolPassenger(
  driverId: number,
  input: z.infer<typeof carpoolSeatRemovalSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      reservation: carpoolSeatReservations,
      offer: carpoolOffers,
      event: events,
    })
    .from(carpoolSeatReservations)
    .leftJoin(
      carpoolOffers,
      eq(carpoolSeatReservations.offerId, carpoolOffers.id)
    )
    .leftJoin(events, eq(carpoolOffers.eventId, events.id))
    .where(eq(carpoolSeatReservations.id, input.reservationId))
    .limit(1);
  const row = rows[0];
  if (!row?.offer || !row.event || row.offer.driverId !== driverId)
    throw new DomainError("Only the driver can remove a passenger");
  if (row.reservation.status !== "accepted")
    throw new DomainError("Only a confirmed passenger can be removed");
  const { offer, reservation } = row;
  const now = new Date();
  const seatsAvailable = await db.transaction(async tx => {
    const removed = await tx
      .update(carpoolSeatReservations)
      .set({ status: "cancelled", processedAt: now, processedBy: driverId })
      .where(
        and(
          eq(carpoolSeatReservations.id, reservation.id),
          eq(carpoolSeatReservations.status, "accepted")
        )
      );
    if (!removed[0].affectedRows)
      throw new DomainError("Only a confirmed passenger can be removed");
    await tx
      .update(carpoolOffers)
      .set({
        seatsAvailable: sql`least(${carpoolOffers.seatsTotal}, ${carpoolOffers.seatsAvailable} + ${reservation.seatsRequested})`,
      })
      .where(eq(carpoolOffers.id, offer.id));
    const updated = await tx
      .select({ seatsAvailable: carpoolOffers.seatsAvailable })
      .from(carpoolOffers)
      .where(eq(carpoolOffers.id, offer.id))
      .limit(1);
    return updated[0]?.seatsAvailable ?? 0;
  });
  await createUserNotification(reservation.passengerId, {
    type: "event_update",
    title: "Place de covoiturage retirée",
    body: `${row.event.title} · ${offer.departureLocation}${input.note ? ` · ${input.note}` : ""}`,
    actionPath: "/?view=my-outings",
  });
  return { seatsAvailable };
}

export async function getSafetyConsent(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(userSafetyConsents)
    .where(eq(userSafetyConsents.userId, userId))
    .limit(1);
  return result[0];
}

export async function saveSafetyConsent(
  userId: number,
  input: z.infer<typeof safetyConsentSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const values = {
    userId,
    termsVersion: "2026-08",
    acceptedAt: new Date(),
    ...input,
  };
  await db
    .insert(userSafetyConsents)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        termsVersion: values.termsVersion,
        acceptedAt: values.acceptedAt,
        locationSharingEnabled: input.locationSharingEnabled,
        emergencyContactEnabled: input.emergencyContactEnabled,
      },
    });
  return getSafetyConsent(userId);
}

export async function createSafetyCheckIn(
  userId: number,
  input: z.infer<typeof safetyCheckInSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(eventSafetyCheckIns)
    .values({ ...input, userId });
  return Number(result[0].insertId);
}

export async function listSafetyCheckIns(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: eventSafetyCheckIns.id,
      userId: eventSafetyCheckIns.userId,
      kind: eventSafetyCheckIns.kind,
      note: eventSafetyCheckIns.note,
      createdAt: eventSafetyCheckIns.createdAt,
      name: users.name,
    })
    .from(eventSafetyCheckIns)
    .leftJoin(users, eq(eventSafetyCheckIns.userId, users.id))
    .where(eq(eventSafetyCheckIns.eventId, eventId))
    .orderBy(desc(eventSafetyCheckIns.createdAt));
}

export async function saveLiveLocation(
  userId: number,
  input: z.infer<typeof liveLocationShareSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const existing = await db
    .select({
      isActive: liveLocationShares.isActive,
      expiresAt: liveLocationShares.expiresAt,
    })
    .from(liveLocationShares)
    .where(
      and(
        eq(liveLocationShares.userId, userId),
        eq(liveLocationShares.eventId, input.eventId)
      )
    )
    .limit(1);
  const keepExistingExpiry = Boolean(
    existing[0]?.isActive && existing[0].expiresAt > now
  );
  const expiresAt = keepExistingExpiry
    ? existing[0]!.expiresAt
    : new Date(now.getTime() + input.durationMinutes * 60 * 1000);
  await db
    .insert(liveLocationShares)
    .values({
      eventId: input.eventId,
      userId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      isActive: true,
      expiresAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters,
        isActive: true,
        expiresAt,
      },
    });
  return { expiresAt, started: !keepExistingExpiry };
}

export async function stopLiveLocation(userId: number, eventId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(liveLocationShares)
    .set({ isActive: false, expiresAt: new Date() })
    .where(
      and(
        eq(liveLocationShares.userId, userId),
        eq(liveLocationShares.eventId, eventId)
      )
    );
}

export async function getMyLiveLocationShare(userId: number, eventId: number) {
  const db = await getDb();
  if (!db) return { isActive: false, expiresAt: null };
  const row = await db
    .select({
      isActive: liveLocationShares.isActive,
      expiresAt: liveLocationShares.expiresAt,
    })
    .from(liveLocationShares)
    .where(
      and(
        eq(liveLocationShares.userId, userId),
        eq(liveLocationShares.eventId, eventId)
      )
    )
    .limit(1);
  const share = row[0];
  return {
    isActive: Boolean(share?.isActive && share.expiresAt > new Date()),
    expiresAt: share?.expiresAt ?? null,
  };
}

export async function listOutdoorServiceConsents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(outdoorServiceConsents)
    .where(eq(outdoorServiceConsents.userId, userId))
    .orderBy(desc(outdoorServiceConsents.updatedAt));
}

export async function setOutdoorServiceConsent(
  userId: number,
  input: z.infer<typeof outdoorServiceConsentSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  await db
    .insert(outdoorServiceConsents)
    .values({
      userId,
      provider: input.provider,
      purpose: input.purpose,
      status: input.enabled ? "prepared" : "revoked",
      consentedAt: now,
      revokedAt: input.enabled ? null : now,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: input.enabled ? "prepared" : "revoked",
        consentedAt: now,
        revokedAt: input.enabled ? null : now,
      },
    });
  return {
    provider: input.provider,
    purpose: input.purpose,
    enabled: input.enabled,
  };
}

export async function listActiveLiveLocations(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select({
      userId: liveLocationShares.userId,
      latitude: liveLocationShares.latitude,
      longitude: liveLocationShares.longitude,
      accuracyMeters: liveLocationShares.accuracyMeters,
      updatedAt: liveLocationShares.updatedAt,
      name: users.name,
    })
    .from(liveLocationShares)
    .leftJoin(users, eq(liveLocationShares.userId, users.id))
    .where(
      and(
        eq(liveLocationShares.eventId, eventId),
        eq(liveLocationShares.isActive, true),
        gte(liveLocationShares.expiresAt, now)
      )
    );
}

function resolveLevelDeclaration(
  event: {
    levelAdmissionPolicy?: "declarative" | "confirmation" | "organizer_review";
    levelRequirementNote?: string | null;
  },
  input: { levelAcknowledged?: boolean; levelExceptionNote?: string }
) {
  const exceptionNote = input.levelExceptionNote?.trim() || null;
  if (
    event.levelAdmissionPolicy !== "declarative" &&
    !input.levelAcknowledged &&
    !exceptionNote
  )
    throw new DomainError(
      "Confirm the required level or request a documented exception"
    );
  return {
    levelAcknowledgedAt: input.levelAcknowledged ? new Date() : null,
    levelExceptionNote: exceptionNote,
  };
}

export async function joinEvent(
  eventId: number,
  userId: number,
  status: "pending" | "going" | "waitlist",
  levelInput: { levelAcknowledged?: boolean; levelExceptionNote?: string } = {}
) {
  const db = await getDb();
  if (!db) return;
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("This outing no longer exists");
  const level = resolveLevelDeclaration(event, levelInput);
  const levelExceptionStatus = level.levelExceptionNote
    ? ("pending" as const)
    : ("none" as const);
  if (status !== "going") {
    await db
      .insert(eventParticipants)
      .values({ eventId, userId, status, ...level, levelExceptionStatus })
      .onDuplicateKeyUpdate({
        set: { status, ...level, levelExceptionStatus },
      });
    return;
  }
  await db.transaction(async tx => {
    await tx
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .for("update");
    const countRows = await tx
      .select({ count: sql<number>`count(*)` })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          inArray(eventParticipants.status, ["going", "pending"])
        )
      );
    if (Number(countRows[0]?.count ?? 0) >= event.capacity)
      throw new DomainError("EVENT_FULL");
    await tx
      .insert(eventParticipants)
      .values({ eventId, userId, status, ...level, levelExceptionStatus })
      .onDuplicateKeyUpdate({
        set: { status, ...level, levelExceptionStatus },
      });
  });
}

export async function getEventParticipantUserIds(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  const participants = await db
    .select({ userId: eventParticipants.userId })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.status, "going")
      )
    );
  return participants.map(participant => participant.userId);
}

/**
 * Everyone who follows an outing's chat: the organizer, the co-organizers and
 * the confirmed participants. The chat used to notify participants only, so
 * the organizing team never heard about a participant's message.
 */
export async function getEventChatAudienceUserIds(
  eventId: number
): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const [event, coOrganizers, participants] = await Promise.all([
    getEventById(eventId),
    db
      .select({ userId: eventCoOrganizers.userId })
      .from(eventCoOrganizers)
      .where(eq(eventCoOrganizers.eventId, eventId)),
    getEventParticipantUserIds(eventId),
  ]);
  return Array.from(
    new Set([
      ...(event ? [event.hostId] : []),
      ...coOrganizers.map(row => row.userId),
      ...participants,
    ])
  );
}

export async function listEventParticipants(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  await expirePendingWaitlistOffers(eventId, db);
  const rows = await db
    .select({
      id: eventParticipants.id,
      userId: eventParticipants.userId,
      status: eventParticipants.status,
      preparationReadyAt: eventParticipants.preparationReadyAt,
      levelAcknowledgedAt: eventParticipants.levelAcknowledgedAt,
      levelExceptionNote: eventParticipants.levelExceptionNote,
      levelExceptionStatus: eventParticipants.levelExceptionStatus,
      levelExceptionDecidedAt: eventParticipants.levelExceptionDecidedAt,
      levelExceptionDecisionNote: eventParticipants.levelExceptionDecisionNote,
      checkedInAt: eventParticipants.checkedInAt,
      name: users.name,
      publicSlug: userProfiles.publicSlug,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
      homeLocation: userProfiles.homeLocation,
      profileVisibility: userProfiles.profileVisibility,
      waitlistOfferStatus: eventWaitlistOffers.status,
      waitlistOfferExpiresAt: eventWaitlistOffers.expiresAt,
    })
    .from(eventParticipants)
    .leftJoin(users, eq(eventParticipants.userId, users.id))
    .leftJoin(userProfiles, eq(eventParticipants.userId, userProfiles.userId))
    .leftJoin(
      eventWaitlistOffers,
      and(
        eq(eventParticipants.eventId, eventWaitlistOffers.eventId),
        eq(eventParticipants.userId, eventWaitlistOffers.participantId)
      )
    )
    .where(eq(eventParticipants.eventId, eventId))
    .orderBy(asc(eventParticipants.createdAt));
  let waitlistPosition = 0;
  return rows.map(
    ({
      publicSlug,
      avatarUrl,
      bio,
      homeLocation,
      profileVisibility,
      waitlistOfferStatus,
      waitlistOfferExpiresAt,
      ...participant
    }) => {
      const position =
        participant.status === "waitlist" ? ++waitlistPosition : null;
      return {
        ...participant,
        waitlistPosition: position,
        waitlistOffer:
          participant.status === "waitlist" && waitlistOfferStatus
            ? { status: waitlistOfferStatus, expiresAt: waitlistOfferExpiresAt }
            : null,
        publicProfile:
          profileVisibility === "public" && publicSlug
            ? { publicSlug, avatarUrl, bio, homeLocation }
            : null,
      };
    }
  );
}

export async function getMyWaitlistOffer(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  await expirePendingWaitlistOffers(eventId, db);
  const participant = await db
    .select({ status: eventParticipants.status })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      )
    )
    .limit(1);
  if (participant[0]?.status !== "waitlist") return null;
  const queue = await db
    .select({ userId: eventParticipants.userId })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.status, "waitlist")
      )
    )
    .orderBy(asc(eventParticipants.createdAt));
  const offer = await db
    .select({
      status: eventWaitlistOffers.status,
      expiresAt: eventWaitlistOffers.expiresAt,
    })
    .from(eventWaitlistOffers)
    .where(
      and(
        eq(eventWaitlistOffers.eventId, eventId),
        eq(eventWaitlistOffers.participantId, userId)
      )
    )
    .limit(1);
  return {
    position: Math.max(
      1,
      queue.findIndex(entry => entry.userId === userId) + 1
    ),
    offer: offer[0] ?? null,
  };
}

export async function checkInParticipant(
  eventId: number,
  participantId: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(eventParticipants)
    .set({ checkedInAt: new Date() })
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, participantId)
      )
    );
}

/**
 * Cancels a passenger's carpool seats on one outing and gives the accepted ones
 * back to the drivers — otherwise the ride stays full for someone who is no
 * longer coming.
 */
async function releasePassengerCarpoolSeats(
  executor: Executor,
  eventId: number,
  passengerId: number,
  actorId: number,
  now: Date
) {
  const reservations = await executor
    .select({
      id: carpoolSeatReservations.id,
      offerId: carpoolSeatReservations.offerId,
      seatsRequested: carpoolSeatReservations.seatsRequested,
      status: carpoolSeatReservations.status,
    })
    .from(carpoolSeatReservations)
    .innerJoin(
      carpoolOffers,
      eq(carpoolSeatReservations.offerId, carpoolOffers.id)
    )
    .where(
      and(
        eq(carpoolOffers.eventId, eventId),
        eq(carpoolSeatReservations.passengerId, passengerId),
        inArray(carpoolSeatReservations.status, ["pending", "accepted"])
      )
    );
  if (!reservations.length) return;
  await executor
    .update(carpoolSeatReservations)
    .set({ status: "cancelled", processedAt: now, processedBy: actorId })
    .where(
      inArray(
        carpoolSeatReservations.id,
        reservations.map(reservation => reservation.id)
      )
    );
  const releasedSeats = new Map<number, number>();
  reservations
    .filter(reservation => reservation.status === "accepted")
    .forEach(reservation =>
      releasedSeats.set(
        reservation.offerId,
        (releasedSeats.get(reservation.offerId) ?? 0) +
          reservation.seatsRequested
      )
    );
  for (const [offerId, seats] of Array.from(releasedSeats.entries()))
    await executor
      .update(carpoolOffers)
      .set({
        seatsAvailable: sql`least(${carpoolOffers.seatsTotal}, ${carpoolOffers.seatsAvailable} + ${seats})`,
      })
      .where(eq(carpoolOffers.id, offerId));
}

/**
 * Withdraws ride offers and cancels every seat request on them, pending ones
 * included. Returns the passengers who had a confirmed seat, so the caller can
 * tell them once the change is committed.
 */
async function withdrawCarpoolOffersById(
  executor: Executor,
  offerIds: number[],
  actorId: number,
  now: Date,
  note: string | null = null
): Promise<number[]> {
  if (!offerIds.length) return [];
  const accepted = await executor
    .select({ passengerId: carpoolSeatReservations.passengerId })
    .from(carpoolSeatReservations)
    .where(
      and(
        inArray(carpoolSeatReservations.offerId, offerIds),
        eq(carpoolSeatReservations.status, "accepted")
      )
    );
  await executor
    .update(carpoolOffers)
    .set({
      status: "withdrawn",
      seatsAvailable: 0,
      withdrawalNote: note,
      withdrawnAt: now,
    })
    .where(inArray(carpoolOffers.id, offerIds));
  await executor
    .update(carpoolSeatReservations)
    .set({ status: "cancelled", processedAt: now, processedBy: actorId })
    .where(
      and(
        inArray(carpoolSeatReservations.offerId, offerIds),
        inArray(carpoolSeatReservations.status, ["pending", "accepted"])
      )
    );
  return Array.from(new Set(accepted.map(row => row.passengerId)));
}

/** A driver who will not be there must not keep an active offer on the outing. */
async function withdrawDriverCarpoolOffers(
  executor: Executor,
  eventId: number,
  driverId: number,
  actorId: number,
  now: Date
): Promise<number[]> {
  const offers = await executor
    .select({ id: carpoolOffers.id })
    .from(carpoolOffers)
    .where(
      and(
        eq(carpoolOffers.eventId, eventId),
        eq(carpoolOffers.driverId, driverId),
        eq(carpoolOffers.status, "active")
      )
    );
  return withdrawCarpoolOffersById(
    executor,
    offers.map(offer => offer.id),
    actorId,
    now
  );
}

async function notifyCarpoolWithdrawn(
  passengerIds: number[],
  event: { id: number; title: string }
) {
  await Promise.all(
    passengerIds.map(passengerId =>
      createUserNotification(passengerId, {
        type: "event_update",
        title: "Trajet covoiturage retiré",
        body: `${event.title} · Votre place de covoiturage n’est plus confirmée. Consultez les autres trajets proposés.`,
        actionPath: `/?view=my-outings&eventId=${event.id}&focus=carpool`,
      })
    )
  );
}

/** Confirmed places, optionally leaving one participant out of the count. */
async function countConfirmedPlaces(
  executor: Executor,
  eventId: number,
  excludeUserId?: number
) {
  const rows = await executor
    .select({ count: sql<number>`count(*)` })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        inArray(eventParticipants.status, ["going", "pending"]),
        excludeUserId === undefined
          ? undefined
          : ne(eventParticipants.userId, excludeUserId)
      )
    );
  return Number(rows[0]?.count ?? 0);
}

/** Row lock on the outing: serializes every change to its confirmed places. */
async function lockEvent(tx: Transaction, eventId: number) {
  await tx
    .select({ id: events.id })
    .from(events)
    .where(eq(events.id, eventId))
    .for("update");
}

export async function manageEventParticipant(
  actorId: number,
  input: z.infer<typeof organizerParticipantActionSchema>
) {
  const { db, event } = await getEventManagementAccess(input.eventId, actorId);
  if (event.status === "cancelled" || event.status === "completed")
    throw new DomainError("This outing can no longer be coordinated");
  const nextStatus =
    input.action === "remove"
      ? "cancelled"
      : input.action === "move_to_waitlist"
        ? "waitlist"
        : "going";
  const now = new Date();
  const withdrawnPassengers = await db.transaction(async tx => {
    await lockEvent(tx, input.eventId);
    const rows = await tx
      .select({ id: eventParticipants.id, status: eventParticipants.status })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, input.eventId),
          eq(eventParticipants.userId, input.participantId)
        )
      )
      .limit(1);
    const participant = rows[0];
    if (!participant || participant.status === "cancelled")
      throw new DomainError("This participant is no longer active");
    // A pending participant already holds a counted place, so they are left
    // out of the count: confirming them must not fail on a full outing.
    if (
      input.action === "restore_to_going" &&
      participant.status !== "going" &&
      (await countConfirmedPlaces(tx, input.eventId, input.participantId)) >=
        event.capacity
    )
      throw new DomainError("No confirmed place is available");
    await tx
      .update(eventParticipants)
      .set({
        status: nextStatus,
        checkedInAt: nextStatus === "going" ? undefined : null,
        preparationReadyAt: nextStatus === "going" ? undefined : null,
      })
      .where(eq(eventParticipants.id, participant.id));
    if (nextStatus === "going") return [];
    await tx
      .update(eventWaitlistOffers)
      .set({ status: "withdrawn", respondedAt: now })
      .where(
        and(
          eq(eventWaitlistOffers.eventId, input.eventId),
          eq(eventWaitlistOffers.participantId, input.participantId),
          eq(eventWaitlistOffers.status, "pending")
        )
      );
    await releasePassengerCarpoolSeats(
      tx,
      input.eventId,
      input.participantId,
      actorId,
      now
    );
    if (input.action === "remove")
      await tx
        .update(eventBookingRequests)
        .set({ status: "cancelled", processedAt: now, processedBy: actorId })
        .where(
          and(
            eq(eventBookingRequests.eventId, input.eventId),
            eq(eventBookingRequests.hikerId, input.participantId),
            eq(eventBookingRequests.status, "accepted")
          )
        );
    // Someone moved off the confirmed list will not be driving either.
    return withdrawDriverCarpoolOffers(
      tx,
      input.eventId,
      input.participantId,
      actorId,
      now
    );
  });
  await notifyCarpoolWithdrawn(withdrawnPassengers, event);
  const title =
    input.action === "remove"
      ? "Participation retirée / Participation removed"
      : input.action === "move_to_waitlist"
        ? "Liste d’attente / Waitlist"
        : "Participation confirmée / Participation confirmed";
  const body =
    input.action === "remove"
      ? `${event.title} · L’organisateur a retiré votre participation. Consultez Mes sorties pour le détail. / The organizer removed your participation. Check My outings for details.`
      : input.action === "move_to_waitlist"
        ? `${event.title} · Votre participation est maintenant en liste d’attente. / Your participation is now waitlisted.`
        : `${event.title} · Votre participation est confirmée. / Your participation is confirmed.`;
  await createUserNotification(input.participantId, {
    type: "registration",
    title,
    body,
    actionPath: `/?view=my-outings&eventId=${input.eventId}`,
  });
  return { status: nextStatus };
}

/**
 * Voluntary withdrawal from an outing.
 *
 * Until now the only route to `cancelled` was `manageEventParticipant`, which
 * requires organizer rights — so a participant who could no longer come had no
 * way out of their own registration and the organizer counted a phantom place
 * right up to departure. This mirrors that clean-up (waitlist offers, carpool
 * seats, booking request) for someone acting on themselves, and covers the
 * pending-application case too.
 *
 * Everything runs in one transaction: a failure half-way used to leave the
 * person cancelled while still holding a carpool seat, or the reverse.
 */
export async function leaveEvent(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("Outing not found");
  if (event.hostId === userId)
    throw new DomainError(
      "As the organizer you cannot leave your own outing — cancel it instead"
    );
  if (event.status === "completed")
    throw new DomainError("This outing is already over");

  const now = new Date();
  const { wasConfirmed, withdrawnPassengers } = await db.transaction(
    async tx => {
      await lockEvent(tx, eventId);
      const rows = await tx
        .select({ id: eventParticipants.id, status: eventParticipants.status })
        .from(eventParticipants)
        .where(
          and(
            eq(eventParticipants.eventId, eventId),
            eq(eventParticipants.userId, userId)
          )
        )
        .limit(1);
      const participant = rows[0];
      const requests = await tx
        .select({ status: eventBookingRequests.status })
        .from(eventBookingRequests)
        .where(
          and(
            eq(eventBookingRequests.eventId, eventId),
            eq(eventBookingRequests.hikerId, userId)
          )
        )
        .limit(1);

      const hadParticipation = Boolean(
        participant && participant.status !== "cancelled"
      );
      const hadPendingRequest = requests[0]?.status === "pending";
      if (!hadParticipation && !hadPendingRequest)
        throw new DomainError("You are not registered for this outing");

      if (hadParticipation && participant)
        await tx
          .update(eventParticipants)
          .set({
            status: "cancelled",
            checkedInAt: null,
            preparationReadyAt: null,
          })
          .where(eq(eventParticipants.id, participant.id));
      await tx
        .update(eventWaitlistOffers)
        .set({ status: "withdrawn", respondedAt: now })
        .where(
          and(
            eq(eventWaitlistOffers.eventId, eventId),
            eq(eventWaitlistOffers.participantId, userId),
            eq(eventWaitlistOffers.status, "pending")
          )
        );
      await tx
        .update(eventBookingRequests)
        .set({ status: "cancelled", processedAt: now, processedBy: userId })
        .where(
          and(
            eq(eventBookingRequests.eventId, eventId),
            eq(eventBookingRequests.hikerId, userId),
            inArray(eventBookingRequests.status, ["pending", "accepted"])
          )
        );
      await releasePassengerCarpoolSeats(tx, eventId, userId, userId, now);
      // The driver's passengers used to keep an "accepted" seat on a ride that
      // no longer existed, and nobody told them.
      const passengers = await withdrawDriverCarpoolOffers(
        tx,
        eventId,
        userId,
        userId,
        now
      );
      return {
        wasConfirmed: participant?.status === "going",
        withdrawnPassengers: passengers,
      };
    }
  );

  await notifyCarpoolWithdrawn(withdrawnPassengers, event);
  const leaver = await getUserById(userId);
  const leaverName = leaver?.name || "Un participant / A participant";
  await createUserNotification(event.hostId, {
    type: "registration",
    title: "Désistement / Withdrawal",
    body: wasConfirmed
      ? `${event.title} · ${leaverName} s’est retiré de la sortie. Une place se libère. / ${leaverName} withdrew from the outing. A place is free again.`
      : `${event.title} · ${leaverName} a retiré sa demande. / ${leaverName} withdrew their request.`,
    // `/sorties/:id` is not a route: the organizer landed on a 404.
    actionPath: `/?event=${eventId}`,
  });

  return { status: "cancelled" as const, freedConfirmedPlace: wasConfirmed };
}

/**
 * Voluntary departure from a community group. Joining was possible but leaving
 * was not, so membership was effectively permanent from the member's side.
 */
export async function leaveCommunityGroup(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const rows = await db
    .select({
      id: communityGroupMembers.id,
      role: communityGroupMembers.role,
      status: communityGroupMembers.status,
    })
    .from(communityGroupMembers)
    .where(
      and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId)
      )
    )
    .limit(1);
  const membership = rows[0];
  if (!membership || membership.status === "left")
    throw new DomainError("You are not a member of this group");
  if (membership.role === "owner")
    throw new DomainError(
      "Transfer ownership or delete the group before leaving it"
    );

  await db
    .update(communityGroupMembers)
    .set({ status: "left", role: "member" })
    .where(eq(communityGroupMembers.id, membership.id));
  return { status: "left" as const };
}

export async function setParticipantPreparationReady(
  eventId: number,
  userId: number,
  isReady: boolean
) {
  const db = await getDb();
  if (!db) return undefined;
  const participation = await getEventParticipation(eventId, userId);
  if (participation?.status !== "going")
    throw new DomainError(
      "Only confirmed participants can update preparation status"
    );
  await db
    .update(eventParticipants)
    .set({ preparationReadyAt: isReady ? new Date() : null })
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      )
    );
  return { preparationReadyAt: isReady ? new Date() : null };
}

export async function promoteWaitlistedParticipant(
  eventId: number,
  hostId: number,
  participantId: number
) {
  return offerWaitlistedParticipant(eventId, hostId, participantId, 6);
}

async function expirePendingWaitlistOffers(
  eventId: number,
  database?: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const db = database ?? (await getDb());
  if (!db) return;
  const now = new Date();
  await db
    .update(eventWaitlistOffers)
    .set({ status: "expired", respondedAt: now })
    .where(
      and(
        eq(eventWaitlistOffers.eventId, eventId),
        eq(eventWaitlistOffers.status, "pending"),
        lte(eventWaitlistOffers.expiresAt, now)
      )
    );
}

export async function offerWaitlistedParticipant(
  eventId: number,
  hostId: number,
  participantId: number,
  responseWindowHours = 6
) {
  const db = await getDb();
  if (!db) return undefined;
  const event = await getEventById(eventId);
  if (!event || event.hostId !== hostId)
    throw new DomainError("Only the organizer can offer a waitlist place");
  const confirmed = await getParticipantCount(eventId);
  if (confirmed >= event.capacity)
    throw new DomainError("No confirmed place is available");
  await expirePendingWaitlistOffers(eventId, db);
  const participant = await db
    .select({ id: eventParticipants.id })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, participantId),
        eq(eventParticipants.status, "waitlist")
      )
    )
    .limit(1);
  if (!participant[0])
    throw new DomainError("This waitlist entry is unavailable");
  const activeOffer = await db
    .select({ id: eventWaitlistOffers.id })
    .from(eventWaitlistOffers)
    .where(
      and(
        eq(eventWaitlistOffers.eventId, eventId),
        eq(eventWaitlistOffers.participantId, participantId),
        eq(eventWaitlistOffers.status, "pending")
      )
    )
    .limit(1);
  if (activeOffer[0])
    throw new DomainError("A place offer is already awaiting a response");
  const expiresAt = new Date(
    Date.now() + Math.max(1, Math.min(responseWindowHours, 72)) * 60 * 60 * 1000
  );
  await db
    .insert(eventWaitlistOffers)
    .values({
      eventId,
      participantId,
      offeredBy: hostId,
      expiresAt,
      status: "pending",
    })
    .onDuplicateKeyUpdate({
      set: {
        offeredBy: hostId,
        expiresAt,
        status: "pending",
        respondedAt: null,
      },
    });
  await createUserNotification(participantId, {
    type: "registration",
    title: "Place disponible / Spot available",
    body: `${event.title} · Répondez avant le ${expiresAt.toLocaleString("fr-CA")}. / Reply before ${expiresAt.toLocaleString("en-CA")}.`,
    actionPath: `/?view=my-outings&eventId=${eventId}`,
  });
  return { status: "pending" as const, expiresAt };
}

export async function acceptWaitlistOffer(
  eventId: number,
  participantId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  await expirePendingWaitlistOffers(eventId, db);
  const event = await getEventById(eventId);
  if (!event) throw new DomainError("This outing no longer exists");
  // Checked and written under the outing's row lock: two people accepting the
  // last place at the same moment could otherwise both get it.
  await db.transaction(async tx => {
    await lockEvent(tx, eventId);
    const offer = await tx
      .select({ id: eventWaitlistOffers.id })
      .from(eventWaitlistOffers)
      .where(
        and(
          eq(eventWaitlistOffers.eventId, eventId),
          eq(eventWaitlistOffers.participantId, participantId),
          eq(eventWaitlistOffers.status, "pending"),
          gt(eventWaitlistOffers.expiresAt, new Date())
        )
      )
      .limit(1);
    if (!offer[0])
      throw new DomainError("This place offer is no longer available");
    if ((await countConfirmedPlaces(tx, eventId)) >= event.capacity)
      throw new DomainError("This place is no longer available");
    const participant = await tx
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          eq(eventParticipants.userId, participantId),
          eq(eventParticipants.status, "waitlist")
        )
      )
      .limit(1);
    if (!participant[0])
      throw new DomainError("This waitlist entry is unavailable");
    const now = new Date();
    await tx
      .update(eventParticipants)
      .set({ status: "going" })
      .where(eq(eventParticipants.id, participant[0].id));
    await tx
      .update(eventWaitlistOffers)
      .set({ status: "accepted", respondedAt: now })
      .where(eq(eventWaitlistOffers.id, offer[0].id));
  });
  await createUserNotification(event.hostId, {
    type: "registration",
    title: "Liste d’attente confirmée / Waitlist confirmed",
    body: `${event.title} · Un participant a accepté la place proposée.`,
    actionPath: `/?event=${eventId}`,
  });
  return { status: "going" as const };
}

export async function declineWaitlistOffer(
  eventId: number,
  participantId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  await expirePendingWaitlistOffers(eventId, db);
  const offer = await db
    .select({ id: eventWaitlistOffers.id })
    .from(eventWaitlistOffers)
    .where(
      and(
        eq(eventWaitlistOffers.eventId, eventId),
        eq(eventWaitlistOffers.participantId, participantId),
        eq(eventWaitlistOffers.status, "pending")
      )
    )
    .limit(1);
  if (!offer[0])
    throw new DomainError("This place offer is no longer available");
  await db
    .update(eventWaitlistOffers)
    .set({ status: "declined", respondedAt: new Date() })
    .where(eq(eventWaitlistOffers.id, offer[0].id));
  return { status: "declined" as const };
}

export async function listCommunityPosts() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      id: posts.id,
      body: posts.body,
      title: posts.title,
      summary: posts.summary,
      postType: posts.postType,
      visibility: posts.visibility,
      locationName: posts.locationName,
      distanceKm: posts.distanceKm,
      elevationGain: posts.elevationGain,
      durationMinutes: posts.durationMinutes,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      authorName: users.name,
      authorId: posts.authorId,
      avatarUrl: userProfiles.avatarUrl,
      publicSlug: userProfiles.publicSlug,
      bio: userProfiles.bio,
      homeLocation: userProfiles.homeLocation,
      profileVisibility: userProfiles.profileVisibility,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .leftJoin(userProfiles, eq(posts.authorId, userProfiles.userId))
    .where(
      and(eq(posts.moderationStatus, "visible"), eq(posts.visibility, "public"))
    )
    .orderBy(desc(posts.createdAt))
    .limit(40);
  const media = await listMediaByPost(
    db,
    rows.map(post => post.id)
  );
  return rows.map(
    ({
      avatarUrl,
      publicSlug,
      bio,
      homeLocation,
      profileVisibility,
      ...post
    }) => {
      const authorPublicProfile =
        profileVisibility === "public" && publicSlug
          ? { publicSlug, avatarUrl, bio, homeLocation }
          : null;
      return {
        ...post,
        avatarUrl: authorPublicProfile?.avatarUrl ?? null,
        publicSlug: authorPublicProfile?.publicSlug ?? null,
        authorPublicProfile,
        images: media.get(post.id) ?? [],
      };
    }
  );
}

export async function createCommunityPost(
  authorId: number,
  input: z.infer<typeof postCreateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  if (input.images.length > 5)
    throw new DomainError("A post may contain at most five photos");
  const { images, ...post } = input;
  const result = await db
    .insert(posts)
    .values({ ...post, authorId, imageUrl: images[0] ?? null });
  const postId = Number(result[0].insertId);
  if (images.length)
    await db
      .insert(postMedia)
      .values(images.map((url, sortOrder) => ({ postId, url, sortOrder })));
  return postId;
}

export async function listPostMedia(postId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ url: postMedia.url })
    .from(postMedia)
    .where(eq(postMedia.postId, postId))
    .orderBy(asc(postMedia.sortOrder));
  return rows.map(row => row.url);
}

/**
 * Images of several posts in one query. The feed and the profile page used to
 * run one query per post — 40 round-trips for a single feed load.
 */
async function listMediaByPost(
  executor: Executor,
  postIds: number[]
): Promise<Map<number, string[]>> {
  const byPost = new Map<number, string[]>();
  if (!postIds.length) return byPost;
  const rows = await executor
    .select({ postId: postMedia.postId, url: postMedia.url })
    .from(postMedia)
    .where(inArray(postMedia.postId, postIds))
    .orderBy(asc(postMedia.postId), asc(postMedia.sortOrder));
  rows.forEach(row =>
    byPost.set(row.postId, [...(byPost.get(row.postId) ?? []), row.url])
  );
  return byPost;
}

/**
 * Choosing the same reaction again now removes it; it used to stay forever,
 * whatever the member did. Only a post still visible can be reacted to.
 */
export async function togglePostReaction(
  userId: number,
  postId: number,
  reaction: "trail" | "summit" | "inspire"
) {
  const db = await getDb();
  if (!db) return undefined;
  const post = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.moderationStatus, "visible")))
    .limit(1);
  if (!post[0]) return undefined;
  const existing = await db
    .select()
    .from(postReactions)
    .where(
      and(eq(postReactions.userId, userId), eq(postReactions.postId, postId))
    )
    .limit(1);
  if (existing[0]?.reaction === reaction) {
    await db.delete(postReactions).where(eq(postReactions.id, existing[0].id));
    return { active: false, reaction };
  }
  if (existing[0]) {
    await db
      .update(postReactions)
      .set({ reaction })
      .where(eq(postReactions.id, existing[0].id));
    return { active: true, reaction };
  }
  await db.insert(postReactions).values({ userId, postId, reaction });
  return { active: true, reaction };
}

export async function getSocialProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  // The user is looked up first: this is a public query, and creating the
  // profile row before checking let anonymous callers insert one for any id.
  const [user] = await db
    .select({ id: users.id, name: users.name, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return undefined;
  const storedProfile = await getOrCreateProfile(userId);
  if (!storedProfile) return undefined;
  const [
    followers,
    following,
    achievements,
    socialLinks,
    latestPosts,
    outingTotals,
  ] = await Promise.all([
    db
      .select({ id: follows.id })
      .from(follows)
      .where(eq(follows.followingId, userId)),
    db
      .select({ id: follows.id })
      .from(follows)
      .where(eq(follows.followerId, userId)),
    db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.earnedAt))
      .limit(12),
    db
      .select()
      .from(linkedSocialAccounts)
      .where(eq(linkedSocialAccounts.userId, userId)),
    db
      .select({
        id: posts.id,
        title: posts.title,
        summary: posts.summary,
        body: posts.body,
        postType: posts.postType,
        createdAt: posts.createdAt,
        imageUrl: posts.imageUrl,
        distanceKm: posts.distanceKm,
        elevationGain: posts.elevationGain,
        durationMinutes: posts.durationMinutes,
      })
      .from(posts)
      .where(
        and(
          eq(posts.authorId, userId),
          eq(posts.moderationStatus, "visible"),
          eq(posts.visibility, "public")
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(20),
    getOutingTotals(userId),
  ]);
  const media = await listMediaByPost(
    db,
    latestPosts.map(post => post.id)
  );
  return {
    user,
    profile: { ...storedProfile, ...outingTotals },
    followers: followers.length,
    following: following.length,
    achievements,
    socialLinks,
    posts: latestPosts.map(post => ({
      ...post,
      images: media.get(post.id) ?? [],
    })),
  };
}

export async function toggleFollow(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db || followerId === followingId) return undefined;
  const existing = await db
    .select()
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      )
    )
    .limit(1);
  if (existing[0]) {
    await db.delete(follows).where(eq(follows.id, existing[0].id));
    return { following: false };
  }
  await db.insert(follows).values({ followerId, followingId });
  return { following: true };
}

export async function sendFriendRequest(
  requesterId: number,
  addresseeId: number,
  note?: string
) {
  const db = await getDb();
  if (!db || requesterId === addresseeId) return undefined;
  // A blocked member could still send friend requests, each one landing as a
  // notification on the person who had blocked them.
  if (await hasBlockBetween(db, requesterId, addresseeId)) return undefined;
  const existing = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, requesterId),
          eq(friendships.addresseeId, addresseeId)
        ),
        and(
          eq(friendships.requesterId, addresseeId),
          eq(friendships.addresseeId, requesterId)
        )
      )
    )
    .limit(1);
  if (existing[0]) return existing[0].id;
  const result = await db
    .insert(friendships)
    .values({ requesterId, addresseeId, requestNote: note?.trim() || null });
  const requester = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, requesterId))
    .limit(1);
  await createUserNotification(addresseeId, {
    type: "account",
    title: "Friend request",
    body: `${requester[0]?.name || "A TrailConnect member"} sent you a friend request.`,
    actionPath: "/?view=account",
  });
  return Number(result[0].insertId);
}

export async function getProfileByPublicSlug(publicSlug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      publicSlug: userProfiles.publicSlug,
      avatarUrl: userProfiles.avatarUrl,
      coverImageUrl: userProfiles.coverImageUrl,
      bio: userProfiles.bio,
      homeLocation: userProfiles.homeLocation,
      phoneVerificationStatus: userProfiles.phoneVerificationStatus,
      profileVisibility: userProfiles.profileVisibility,
      directMessagePolicy: userMessagingPreferences.directMessagePolicy,
    })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId))
    .leftJoin(
      userMessagingPreferences,
      eq(userMessagingPreferences.userId, userProfiles.userId)
    )
    .where(eq(userProfiles.publicSlug, publicSlug))
    .limit(1);
  const profile = rows[0];
  if (!profile) return undefined;
  const { directMessagePolicy, ...publicProfile } = profile;
  return {
    ...publicProfile,
    canReceiveMessages: directMessagePolicy !== "none",
  };
}

export async function searchPublicProfiles(query: string) {
  const db = await getDb();
  if (!db) return [];
  const escapedQuery = query.trim().replace(/[\\%_]/g, "\\$&");
  return db
    .select({
      userId: users.id,
      name: users.name,
      publicSlug: userProfiles.publicSlug,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
      homeLocation: userProfiles.homeLocation,
    })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId))
    .where(
      and(
        eq(userProfiles.profileVisibility, "public"),
        escapedQuery
          ? or(
              like(users.name, `%${escapedQuery}%`),
              like(userProfiles.publicSlug, `%${escapedQuery.toLowerCase()}%`)
            )
          : undefined
      )
    )
    .orderBy(asc(users.name))
    .limit(12);
}

/**
 * Public organizer view. All metrics are facts drawn from TrailConnect activity;
 * declared experience is kept separate from verified guide status.
 */
export async function getOrganizerProfileByPublicSlug(publicSlug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const organizer = await getProfileByPublicSlug(publicSlug);
  if (!organizer || organizer.profileVisibility !== "public") return undefined;

  const [guideRows, trust, upcomingOutings, completedOutings] =
    await Promise.all([
      db
        .select({
          status: guideProfiles.status,
          headline: guideProfiles.headline,
          bio: guideProfiles.bio,
          languages: guideProfiles.languages,
          serviceRegions: guideProfiles.serviceRegions,
          certifications: guideProfiles.certifications,
          insuranceConfirmedAt: guideProfiles.insuranceConfirmedAt,
        })
        .from(guideProfiles)
        .where(eq(guideProfiles.userId, organizer.userId))
        .limit(1),
      getHostTrustSignals(organizer.userId),
      db
        .select({
          id: events.id,
          title: events.title,
          locationName: events.locationName,
          startsAt: events.startsAt,
          difficulty: events.difficulty,
          distanceKm: events.distanceKm,
          elevationGain: events.elevationGain,
          durationMinutes: events.durationMinutes,
          coverImageUrl: events.coverImageUrl,
          coverImageFocalX: events.coverImageFocalX,
          coverImageFocalY: events.coverImageFocalY,
        })
        .from(events)
        .where(
          // A public organizer page is readable by anyone: it must not list
          // the organizer's private or moderated outings.
          and(
            eq(events.hostId, organizer.userId),
            eq(events.status, "published"),
            eq(events.moderationStatus, "visible"),
            eq(events.visibility, "public"),
            gte(events.startsAt, new Date())
          )
        )
        .orderBy(asc(events.startsAt))
        .limit(6),
      db
        .select({
          id: events.id,
          title: events.title,
          locationName: events.locationName,
          startsAt: events.startsAt,
          difficulty: events.difficulty,
          distanceKm: events.distanceKm,
          elevationGain: events.elevationGain,
          durationMinutes: events.durationMinutes,
          coverImageUrl: events.coverImageUrl,
          coverImageFocalX: events.coverImageFocalX,
          coverImageFocalY: events.coverImageFocalY,
        })
        .from(events)
        .where(
          and(
            eq(events.hostId, organizer.userId),
            eq(events.status, "completed"),
            eq(events.moderationStatus, "visible"),
            eq(events.visibility, "public")
          )
        )
        .orderBy(desc(events.startsAt))
        .limit(6),
    ]);
  const guide = guideRows[0];
  const hasDeclaredExperience = Boolean(
    guide?.headline ||
      guide?.bio ||
      guide?.languages ||
      guide?.serviceRegions ||
      guide?.certifications
  );
  if (
    !hasDeclaredExperience &&
    upcomingOutings.length === 0 &&
    completedOutings.length === 0
  )
    return undefined;

  return {
    organizer,
    declaredExperience: guide
      ? {
          headline: guide.headline,
          bio: guide.bio,
          languages: guide.languages,
          serviceRegions: guide.serviceRegions,
          certifications: guide.certifications,
        }
      : null,
    trust: trust
      ? {
          phoneVerified: trust.phoneVerified,
          completedHostedOutings: trust.completedHostedOutings,
          participantCheckInRate: trust.participantCheckInRate,
          participantCheckInTotal: trust.participantCheckInTotal,
          weatherUpdatesPublished: trust.weatherUpdatesPublished,
          bookingResponseWithin48hRate: trust.bookingResponseWithin48hRate,
          bookingResponseSampleSize: trust.bookingResponseSampleSize,
          verifiedGuide: guide?.status === "approved",
          insuranceConfirmed:
            guide?.status === "approved" && Boolean(guide.insuranceConfirmedAt),
        }
      : null,
    upcomingOutings,
    completedOutings,
  };
}

export async function removeFriendship(friendshipId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .delete(friendships)
    .where(
      and(
        eq(friendships.id, friendshipId),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        )
      )
    );
  return result[0].affectedRows > 0;
}

async function requireEventHost(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event[0]) throw new DomainError("This outing no longer exists");
  if (event[0].hostId !== userId)
    throw new DomainError("Only the outing organizer can manage co-organizers");
  if (event[0].status === "cancelled" || event[0].status === "completed")
    throw new DomainError("This outing can no longer be delegated");
  return { db, event: event[0] };
}

export async function inviteEventCoOrganizer(
  eventId: number,
  inviterId: number,
  publicSlug: string
) {
  const { db, event } = await requireEventHost(eventId, inviterId);
  const profile = await getProfileByPublicSlug(publicSlug);
  if (!profile || profile.profileVisibility === "private")
    throw new DomainError("This public profile is unavailable");
  if (profile.userId === inviterId || profile.userId === event.hostId)
    throw new DomainError("This person already organizes this outing");
  const already = await db
    .select({ id: eventCoOrganizers.id })
    .from(eventCoOrganizers)
    .where(
      and(
        eq(eventCoOrganizers.eventId, eventId),
        eq(eventCoOrganizers.userId, profile.userId)
      )
    )
    .limit(1);
  if (already[0])
    throw new DomainError("This person is already a co-organizer");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await db
    .insert(eventCoOrganizerInvitations)
    .values({ eventId, inviterId, inviteeId: profile.userId, expiresAt })
    .onDuplicateKeyUpdate({
      set: { inviterId, status: "pending", expiresAt, respondedAt: null },
    });
  await createUserNotification(profile.userId, {
    type: "event_update",
    title: "Co-organizer invitation",
    body: `You have been invited to co-organize “${event.title}”.`,
    actionPath: "/?view=my-outings",
  });
  return { invitee: profile, expiresAt };
}

export async function respondToEventCoOrganizerInvite(
  invitationId: number,
  inviteeId: number,
  accept: boolean
) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const invitation = await db
    .select()
    .from(eventCoOrganizerInvitations)
    .where(
      and(
        eq(eventCoOrganizerInvitations.id, invitationId),
        eq(eventCoOrganizerInvitations.inviteeId, inviteeId)
      )
    )
    .limit(1);
  if (!invitation[0]) throw new DomainError("This invitation is unavailable");
  const target = invitation[0];
  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, target.eventId))
    .limit(1);
  if (
    !event[0] ||
    event[0].status === "cancelled" ||
    event[0].status === "completed" ||
    target.expiresAt < new Date()
  ) {
    await db
      .update(eventCoOrganizerInvitations)
      .set({ status: "invalid", respondedAt: new Date() })
      .where(eq(eventCoOrganizerInvitations.id, invitationId));
    throw new DomainError("This invitation is no longer valid");
  }
  if (target.status !== "pending")
    throw new DomainError("This invitation has already been resolved");
  const now = new Date();
  if (accept)
    await db
      .insert(eventCoOrganizers)
      .values({ eventId: target.eventId, userId: inviteeId, acceptedAt: now })
      .onDuplicateKeyUpdate({ set: { acceptedAt: now } });
  await db
    .update(eventCoOrganizerInvitations)
    .set({ status: accept ? "accepted" : "declined", respondedAt: now })
    .where(eq(eventCoOrganizerInvitations.id, invitationId));
  return {
    eventId: target.eventId,
    status: accept ? ("accepted" as const) : ("declined" as const),
  };
}

export async function revokeEventCoOrganizerInvite(
  invitationId: number,
  actorId: number
) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const invitation = await db
    .select()
    .from(eventCoOrganizerInvitations)
    .where(eq(eventCoOrganizerInvitations.id, invitationId))
    .limit(1);
  if (!invitation[0]) throw new DomainError("This invitation is unavailable");
  await requireEventHost(invitation[0].eventId, actorId);
  if (invitation[0].status !== "pending")
    throw new DomainError("Only pending invitations can be revoked");
  await db
    .update(eventCoOrganizerInvitations)
    .set({ status: "revoked", respondedAt: new Date() })
    .where(eq(eventCoOrganizerInvitations.id, invitationId));
}

export async function listPendingEventCoOrganizerInvites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: eventCoOrganizerInvitations.id,
      eventId: events.id,
      eventTitle: events.title,
      eventStatus: events.status,
      expiresAt: eventCoOrganizerInvitations.expiresAt,
      inviterName: users.name,
    })
    .from(eventCoOrganizerInvitations)
    .leftJoin(events, eq(eventCoOrganizerInvitations.eventId, events.id))
    .leftJoin(users, eq(eventCoOrganizerInvitations.inviterId, users.id))
    .where(
      and(
        eq(eventCoOrganizerInvitations.inviteeId, userId),
        eq(eventCoOrganizerInvitations.status, "pending")
      )
    )
    .orderBy(desc(eventCoOrganizerInvitations.createdAt));
  return rows.map(row => ({
    ...row,
    valid: Boolean(
      row.eventId &&
        row.eventStatus !== "cancelled" &&
        row.eventStatus !== "completed" &&
        row.expiresAt > new Date()
    ),
  }));
}

export async function listSentEventCoOrganizerInvites(
  eventId: number,
  hostId: number
) {
  const db = await getDb();
  if (!db) return [];
  await requireEventHost(eventId, hostId);
  return db
    .select({
      id: eventCoOrganizerInvitations.id,
      publicSlug: userProfiles.publicSlug,
      name: users.name,
      expiresAt: eventCoOrganizerInvitations.expiresAt,
    })
    .from(eventCoOrganizerInvitations)
    .leftJoin(users, eq(eventCoOrganizerInvitations.inviteeId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(
      and(
        eq(eventCoOrganizerInvitations.eventId, eventId),
        eq(eventCoOrganizerInvitations.status, "pending")
      )
    )
    .orderBy(desc(eventCoOrganizerInvitations.createdAt));
}

export async function respondToFriendship(
  friendshipId: number,
  addresseeId: number,
  status: "accepted" | "declined" | "blocked"
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(friendships)
    .set({ status, remindAt: null })
    .where(
      and(
        eq(friendships.id, friendshipId),
        eq(friendships.addresseeId, addresseeId)
      )
    );
}

export async function deferFriendship(
  friendshipId: number,
  addresseeId: number,
  remindAt: Date
) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(friendships)
    .set({ remindAt })
    .where(
      and(
        eq(friendships.id, friendshipId),
        eq(friendships.addresseeId, addresseeId),
        eq(friendships.status, "pending")
      )
    );
  return result[0].affectedRows > 0;
}

export async function listFriendships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const outgoing = await db
    .select({
      id: friendships.id,
      userId: friendships.addresseeId,
      status: friendships.status,
      direction: friendships.requesterId,
      createdAt: friendships.createdAt,
      updatedAt: friendships.updatedAt,
      requestNote: friendships.requestNote,
      remindAt: friendships.remindAt,
    })
    .from(friendships)
    .where(eq(friendships.requesterId, userId));
  const incoming = await db
    .select({
      id: friendships.id,
      userId: friendships.requesterId,
      status: friendships.status,
      direction: friendships.addresseeId,
      createdAt: friendships.createdAt,
      updatedAt: friendships.updatedAt,
      requestNote: friendships.requestNote,
      remindAt: friendships.remindAt,
    })
    .from(friendships)
    .where(eq(friendships.addresseeId, userId));
  const rows = [
    ...outgoing.map(row => ({ ...row, isIncoming: false })),
    ...incoming.map(row => ({ ...row, isIncoming: true })),
  ];
  const ids = rows.map(row => row.userId);
  const people = ids.length
    ? await db
        .select({ id: users.id, name: users.name, profile: userProfiles })
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    : [];
  const acceptedForUser = await db
    .select({
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        )
      )
    );
  const acceptedFriendIds = new Set(
    acceptedForUser.map(row =>
      row.requesterId === userId ? row.addresseeId : row.requesterId
    )
  );
  const candidateIds = Array.from(new Set(ids));
  const acceptedForCandidates = candidateIds.length
    ? await db
        .select({
          requesterId: friendships.requesterId,
          addresseeId: friendships.addresseeId,
        })
        .from(friendships)
        .where(
          and(
            eq(friendships.status, "accepted"),
            or(
              inArray(friendships.requesterId, candidateIds),
              inArray(friendships.addresseeId, candidateIds)
            )
          )
        )
    : [];
  const mutualFriendCounts = new Map<number, number>();
  for (const candidateId of candidateIds) {
    const mutualIds = new Set<number>();
    for (const row of acceptedForCandidates) {
      if (
        row.requesterId === candidateId &&
        acceptedFriendIds.has(row.addresseeId)
      )
        mutualIds.add(row.addresseeId);
      if (
        row.addresseeId === candidateId &&
        acceptedFriendIds.has(row.requesterId)
      )
        mutualIds.add(row.requesterId);
    }
    mutualFriendCounts.set(candidateId, mutualIds.size);
  }
  return rows.map(row => ({
    ...row,
    mutualFriendCount: mutualFriendCounts.get(row.userId) ?? 0,
    person: people.find(person => person.id === row.userId),
  }));
}

export async function createActivityCircle(
  ownerId: number,
  input: z.infer<typeof circleCreateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(activityCircles).values({ ownerId, ...input });
  const circleId = Number(result[0].insertId);
  await db
    .insert(circleMembers)
    .values({ circleId, userId: ownerId, role: "owner" });
  return circleId;
}

export async function addCircleMember(
  circleId: number,
  ownerId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return;
  const circle = await db
    .select()
    .from(activityCircles)
    .where(
      and(
        eq(activityCircles.id, circleId),
        eq(activityCircles.ownerId, ownerId)
      )
    )
    .limit(1);
  if (!circle[0])
    throw new DomainError("Only the circle owner can add members");
  await db
    .insert(circleMembers)
    .values({ circleId, userId })
    .onDuplicateKeyUpdate({ set: { role: "member" } });
}

export async function listActivityCircles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: activityCircles.id,
      name: activityCircles.name,
      description: activityCircles.description,
      visibility: activityCircles.visibility,
      ownerId: activityCircles.ownerId,
      role: circleMembers.role,
    })
    .from(circleMembers)
    .leftJoin(activityCircles, eq(circleMembers.circleId, activityCircles.id))
    .where(eq(circleMembers.userId, userId));
}

export async function createCommunityGroup(
  ownerId: number,
  input: z.infer<typeof groupCreateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(communityGroups).values({ ownerId, ...input });
  const groupId = Number(result[0].insertId);
  await db
    .insert(communityGroupMembers)
    .values({ groupId, userId: ownerId, role: "owner" });
  return groupId;
}

export async function isCommunityGroupNameAvailable(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const match = await db
    .select({ id: communityGroups.id })
    .from(communityGroups)
    .where(eq(communityGroups.name, name.trim()))
    .limit(1);
  return !match[0];
}

export async function listCommunityGroups() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: communityGroups.id,
      ownerId: communityGroups.ownerId,
      name: communityGroups.name,
      description: communityGroups.description,
      locationName: communityGroups.locationName,
      coverImageUrl: communityGroups.coverImageUrl,
      websiteUrl: communityGroups.websiteUrl,
      visibility: communityGroups.visibility,
      ownerName: users.name,
    })
    .from(communityGroups)
    .leftJoin(users, eq(communityGroups.ownerId, users.id))
    .where(eq(communityGroups.moderationStatus, "visible"))
    .orderBy(desc(communityGroups.createdAt))
    .limit(60);
}

export async function listUserCommunityGroupTemplates(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userCommunityGroupTemplates)
    .where(eq(userCommunityGroupTemplates.ownerId, ownerId))
    .orderBy(desc(userCommunityGroupTemplates.updatedAt));
}

export async function createUserCommunityGroupTemplate(
  ownerId: number,
  input: z.infer<typeof groupTemplateCreateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(userCommunityGroupTemplates)
    .values({ ownerId, ...input });
  return Number(result[0].insertId);
}

export async function deleteUserCommunityGroupTemplate(
  ownerId: number,
  templateId: number
) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .delete(userCommunityGroupTemplates)
    .where(
      and(
        eq(userCommunityGroupTemplates.id, templateId),
        eq(userCommunityGroupTemplates.ownerId, ownerId)
      )
    );
  return result[0].affectedRows > 0;
}

export async function joinCommunityGroup(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const group = await db
    .select()
    .from(communityGroups)
    .where(eq(communityGroups.id, groupId))
    .limit(1);
  if (!group[0]) throw new DomainError("Group not found");
  if (group[0].visibility === "invite")
    throw new DomainError("Invitation required");
  const membership = await db
    .select({ status: communityGroupMembers.status })
    .from(communityGroupMembers)
    .where(
      and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId)
      )
    )
    .limit(1);
  const current = membership[0]?.status;
  // The upsert used to overwrite any existing status: a banned member of a
  // public group walked straight back in, and the owner of a private group
  // who pressed "join" was demoted to pending and lost the group.
  if (current === "banned")
    throw new DomainError("You can no longer join this group");
  if (current === "active" || current === "pending") return;
  const status = group[0].visibility === "private" ? "pending" : "active";
  await db
    .insert(communityGroupMembers)
    .values({ groupId, userId, status })
    .onDuplicateKeyUpdate({ set: { status, role: "member" } });
}

async function requireCommunityGroupAdmin(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const member = await db
    .select({ role: communityGroupMembers.role })
    .from(communityGroupMembers)
    .where(
      and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
        eq(communityGroupMembers.status, "active")
      )
    )
    .limit(1);
  if (
    !member[0] ||
    (member[0].role !== "owner" && member[0].role !== "moderator")
  )
    throw new DomainError("Only group administrators can manage this group");
  return { db, role: member[0].role };
}

export async function getCommunityGroupDetail(
  groupId: number,
  viewerId?: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const group = await db
    .select({
      id: communityGroups.id,
      ownerId: communityGroups.ownerId,
      name: communityGroups.name,
      description: communityGroups.description,
      locationName: communityGroups.locationName,
      coverImageUrl: communityGroups.coverImageUrl,
      websiteUrl: communityGroups.websiteUrl,
      visibility: communityGroups.visibility,
      ownerName: users.name,
    })
    .from(communityGroups)
    .leftJoin(users, eq(communityGroups.ownerId, users.id))
    .where(
      and(
        eq(communityGroups.id, groupId),
        eq(communityGroups.moderationStatus, "visible")
      )
    )
    .limit(1);
  if (!group[0]) return undefined;
  const viewerMembership = viewerId
    ? await db
        .select({
          role: communityGroupMembers.role,
          status: communityGroupMembers.status,
        })
        .from(communityGroupMembers)
        .where(
          and(
            eq(communityGroupMembers.groupId, groupId),
            eq(communityGroupMembers.userId, viewerId)
          )
        )
        .limit(1)
    : [];
  if (
    group[0].visibility !== "public" &&
    viewerMembership[0]?.status !== "active"
  )
    throw new DomainError("Group access is restricted");
  const memberRows = await db
    .select({
      userId: communityGroupMembers.userId,
      role: communityGroupMembers.role,
      status: communityGroupMembers.status,
      name: users.name,
      avatarUrl: userProfiles.avatarUrl,
      publicSlug: userProfiles.publicSlug,
      bio: userProfiles.bio,
      homeLocation: userProfiles.homeLocation,
      profileVisibility: userProfiles.profileVisibility,
    })
    .from(communityGroupMembers)
    .leftJoin(users, eq(communityGroupMembers.userId, users.id))
    .leftJoin(
      userProfiles,
      eq(communityGroupMembers.userId, userProfiles.userId)
    )
    .where(eq(communityGroupMembers.groupId, groupId))
    .orderBy(asc(communityGroupMembers.createdAt));
  const contentRows = await db
    .select({
      id: communityGroupPosts.id,
      body: communityGroupPosts.body,
      imageUrl: communityGroupPosts.imageUrl,
      linkUrl: communityGroupPosts.linkUrl,
      authorId: communityGroupPosts.authorId,
      authorName: users.name,
      createdAt: communityGroupPosts.createdAt,
      avatarUrl: userProfiles.avatarUrl,
      publicSlug: userProfiles.publicSlug,
      bio: userProfiles.bio,
      homeLocation: userProfiles.homeLocation,
      profileVisibility: userProfiles.profileVisibility,
    })
    .from(communityGroupPosts)
    .leftJoin(users, eq(communityGroupPosts.authorId, users.id))
    .leftJoin(
      userProfiles,
      eq(communityGroupPosts.authorId, userProfiles.userId)
    )
    .where(eq(communityGroupPosts.groupId, groupId))
    .orderBy(desc(communityGroupPosts.createdAt))
    .limit(50);
  const members = memberRows.map(
    ({
      publicSlug,
      avatarUrl,
      bio,
      homeLocation,
      profileVisibility,
      ...member
    }) => ({
      ...member,
      avatarUrl,
      publicProfile:
        profileVisibility === "public" && publicSlug
          ? { publicSlug, avatarUrl, bio, homeLocation }
          : null,
    })
  );
  const content = contentRows.map(
    ({
      publicSlug,
      avatarUrl,
      bio,
      homeLocation,
      profileVisibility,
      ...post
    }) => ({
      ...post,
      publicProfile:
        profileVisibility === "public" && publicSlug
          ? { publicSlug, avatarUrl, bio, homeLocation }
          : null,
    })
  );
  return {
    ...group[0],
    members,
    content,
    viewerRole:
      viewerMembership[0]?.status === "active"
        ? viewerMembership[0].role
        : null,
    viewerMembershipStatus: viewerMembership[0]?.status ?? null,
  };
}

export async function updateCommunityGroup(
  groupId: number,
  actorId: number,
  input: z.infer<typeof groupUpdateSchema>
) {
  const { db } = await requireCommunityGroupAdmin(groupId, actorId);
  await db
    .update(communityGroups)
    .set({
      name: input.name,
      description: input.description,
      locationName: input.locationName,
      coverImageUrl: input.coverImageUrl,
      websiteUrl: input.websiteUrl,
      visibility: input.visibility,
    })
    .where(eq(communityGroups.id, groupId));
}

export async function deleteCommunityGroup(groupId: number, actorId: number) {
  const { db, role } = await requireCommunityGroupAdmin(groupId, actorId);
  if (role !== "owner")
    throw new DomainError("Only the group owner can delete this group");
  // Messages were left behind, orphaned, when a group was deleted.
  await db.transaction(async tx => {
    await tx
      .update(communityGroupCoAdminInvitations)
      .set({ status: "invalid", respondedAt: new Date() })
      .where(
        and(
          eq(communityGroupCoAdminInvitations.groupId, groupId),
          eq(communityGroupCoAdminInvitations.status, "pending")
        )
      );
    await tx
      .delete(communityGroupMessages)
      .where(eq(communityGroupMessages.groupId, groupId));
    await tx
      .delete(communityGroupPosts)
      .where(eq(communityGroupPosts.groupId, groupId));
    await tx
      .delete(communityGroupMembers)
      .where(eq(communityGroupMembers.groupId, groupId));
    await tx.delete(communityGroups).where(eq(communityGroups.id, groupId));
  });
}

export async function inviteCommunityGroupMember(
  groupId: number,
  actorId: number,
  userId: number,
  inviteMessage?: string
) {
  const { db } = await requireCommunityGroupAdmin(groupId, actorId);
  if (actorId === userId)
    throw new DomainError("You are already an administrator of this group");
  await db
    .insert(communityGroupMembers)
    .values({
      groupId,
      userId,
      status: "pending",
      inviteMessage: inviteMessage || null,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: "pending",
        role: "member",
        inviteMessage: inviteMessage || null,
      },
    });
}

export async function respondToCommunityGroupInvite(
  groupId: number,
  userId: number,
  accept: boolean
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(communityGroupMembers)
    .set({ status: accept ? "active" : "left" })
    .where(
      and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
        eq(communityGroupMembers.status, "pending")
      )
    );
}

export async function listPendingCommunityGroupInvites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      groupId: communityGroups.id,
      name: communityGroups.name,
      description: communityGroups.description,
      coverImageUrl: communityGroups.coverImageUrl,
      visibility: communityGroups.visibility,
      ownerName: users.name,
      inviteMessage: communityGroupMembers.inviteMessage,
    })
    .from(communityGroupMembers)
    .leftJoin(
      communityGroups,
      eq(communityGroupMembers.groupId, communityGroups.id)
    )
    .leftJoin(users, eq(communityGroups.ownerId, users.id))
    .where(
      and(
        eq(communityGroupMembers.userId, userId),
        eq(communityGroupMembers.status, "pending"),
        eq(communityGroups.moderationStatus, "visible")
      )
    )
    .orderBy(desc(communityGroupMembers.updatedAt));
}

export async function inviteCommunityGroupCoAdmin(
  groupId: number,
  actorId: number,
  publicSlug: string
) {
  const { db, role } = await requireCommunityGroupAdmin(groupId, actorId);
  if (role !== "owner")
    throw new DomainError("Only the group owner can invite a co-administrator");
  const profile = await getProfileByPublicSlug(publicSlug);
  if (!profile) throw new DomainError("No profile matches this public handle");
  if (profile.userId === actorId)
    throw new DomainError("You are already the owner of this group");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db
    .insert(communityGroupCoAdminInvitations)
    .values({
      groupId,
      inviterId: actorId,
      inviteeId: profile.userId,
      expiresAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        inviterId: actorId,
        status: "pending",
        expiresAt,
        respondedAt: null,
      },
    });
  await createUserNotification(profile.userId, {
    type: "group_message",
    title: "Community co-administrator invitation",
    body: "You have been invited to co-administer a community. Review or decline the invitation from your account.",
    actionPath: "/?view=account",
  });
  return { invitee: profile, expiresAt };
}

export async function respondToCommunityGroupCoAdminInvite(
  invitationId: number,
  inviteeId: number,
  accept: boolean
) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const rows = await db
    .select({
      invitation: communityGroupCoAdminInvitations,
      groupId: communityGroups.id,
      moderationStatus: communityGroups.moderationStatus,
    })
    .from(communityGroupCoAdminInvitations)
    .leftJoin(
      communityGroups,
      eq(communityGroupCoAdminInvitations.groupId, communityGroups.id)
    )
    .where(
      and(
        eq(communityGroupCoAdminInvitations.id, invitationId),
        eq(communityGroupCoAdminInvitations.inviteeId, inviteeId)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw new DomainError("This invitation is no longer available");
  const valid =
    row.invitation.status === "pending" &&
    row.invitation.expiresAt > new Date() &&
    Boolean(row.groupId) &&
    row.moderationStatus === "visible";
  if (!valid) {
    if (row.invitation.status === "pending")
      await db
        .update(communityGroupCoAdminInvitations)
        .set({ status: "invalid", respondedAt: new Date() })
        .where(eq(communityGroupCoAdminInvitations.id, invitationId));
    throw new DomainError("This invitation is no longer valid");
  }
  await db
    .update(communityGroupCoAdminInvitations)
    .set({ status: accept ? "accepted" : "declined", respondedAt: new Date() })
    .where(eq(communityGroupCoAdminInvitations.id, invitationId));
  if (accept)
    await db
      .insert(communityGroupMembers)
      .values({
        groupId: row.invitation.groupId,
        userId: inviteeId,
        role: "moderator",
        status: "active",
      })
      .onDuplicateKeyUpdate({ set: { role: "moderator", status: "active" } });
}

export async function revokeCommunityGroupCoAdminInvite(
  invitationId: number,
  actorId: number
) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const invitation = await db
    .select({ groupId: communityGroupCoAdminInvitations.groupId })
    .from(communityGroupCoAdminInvitations)
    .where(eq(communityGroupCoAdminInvitations.id, invitationId))
    .limit(1);
  if (!invitation[0]) throw new DomainError("Invitation not found");
  const { role } = await requireCommunityGroupAdmin(
    invitation[0].groupId,
    actorId
  );
  if (role !== "owner")
    throw new DomainError("Only the group owner can revoke this invitation");
  await db
    .update(communityGroupCoAdminInvitations)
    .set({ status: "revoked", respondedAt: new Date() })
    .where(
      and(
        eq(communityGroupCoAdminInvitations.id, invitationId),
        eq(communityGroupCoAdminInvitations.status, "pending")
      )
    );
}

export async function listPendingCommunityGroupCoAdminInvites(
  inviteeId: number
) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  await db
    .update(communityGroupCoAdminInvitations)
    .set({ status: "invalid", respondedAt: now })
    .where(
      and(
        eq(communityGroupCoAdminInvitations.inviteeId, inviteeId),
        eq(communityGroupCoAdminInvitations.status, "pending"),
        lt(communityGroupCoAdminInvitations.expiresAt, now)
      )
    );
  const rows = await db
    .select({
      id: communityGroupCoAdminInvitations.id,
      groupId: communityGroupCoAdminInvitations.groupId,
      groupName: communityGroups.name,
      inviterName: users.name,
      expiresAt: communityGroupCoAdminInvitations.expiresAt,
      moderationStatus: communityGroups.moderationStatus,
    })
    .from(communityGroupCoAdminInvitations)
    .leftJoin(
      communityGroups,
      eq(communityGroupCoAdminInvitations.groupId, communityGroups.id)
    )
    .leftJoin(users, eq(communityGroupCoAdminInvitations.inviterId, users.id))
    .where(eq(communityGroupCoAdminInvitations.inviteeId, inviteeId))
    .orderBy(desc(communityGroupCoAdminInvitations.createdAt));
  return rows.map(row => ({
    ...row,
    valid:
      Boolean(row.groupName) &&
      row.moderationStatus === "visible" &&
      row.expiresAt > now,
  }));
}

export async function setCommunityGroupMemberRole(
  groupId: number,
  actorId: number,
  userId: number,
  role: "moderator" | "member"
) {
  const { db, role: actorRole } = await requireCommunityGroupAdmin(
    groupId,
    actorId
  );
  if (actorRole !== "owner")
    throw new DomainError("Only the group owner can manage administrators");
  const target = await db
    .select({
      role: communityGroupMembers.role,
      status: communityGroupMembers.status,
    })
    .from(communityGroupMembers)
    .where(
      and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId)
      )
    )
    .limit(1);
  if (!target[0] || target[0].status !== "active" || target[0].role === "owner")
    throw new DomainError("This member cannot be assigned a role");
  await db
    .update(communityGroupMembers)
    .set({ role })
    .where(
      and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId)
      )
    );
}

export async function createCommunityGroupPost(
  groupId: number,
  actorId: number,
  input: z.infer<typeof groupPostCreateSchema>
) {
  const { db } = await requireCommunityGroupAdmin(groupId, actorId);
  const result = await db.insert(communityGroupPosts).values({
    groupId,
    authorId: actorId,
    body: input.body,
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl,
  });
  return Number(result[0].insertId);
}

export async function deleteCommunityGroupPost(
  groupId: number,
  postId: number,
  actorId: number
) {
  const { db } = await requireCommunityGroupAdmin(groupId, actorId);
  await db
    .delete(communityGroupPosts)
    .where(
      and(
        eq(communityGroupPosts.id, postId),
        eq(communityGroupPosts.groupId, groupId)
      )
    );
}

async function requireActiveCommunityGroupMember(
  groupId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const member = await db
    .select({ id: communityGroupMembers.id })
    .from(communityGroupMembers)
    .where(
      and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
        eq(communityGroupMembers.status, "active")
      )
    )
    .limit(1);
  if (!member[0])
    throw new DomainError("Only active group members can use this discussion");
  return db;
}

export async function listCommunityGroupMessages(
  groupId: number,
  userId: number
) {
  const db = await requireActiveCommunityGroupMember(groupId, userId);
  // Newest first, then flipped back to reading order. Ascending with a limit
  // returned the 200 oldest messages, so past that point new ones never showed.
  const newestFirst = await db
    .select({
      id: communityGroupMessages.id,
      senderId: communityGroupMessages.senderId,
      body: communityGroupMessages.body,
      moderationStatus: communityGroupMessages.moderationStatus,
      createdAt: communityGroupMessages.createdAt,
      senderName: users.name,
      avatarUrl: userProfiles.avatarUrl,
      publicSlug: userProfiles.publicSlug,
      bio: userProfiles.bio,
      homeLocation: userProfiles.homeLocation,
      profileVisibility: userProfiles.profileVisibility,
    })
    .from(communityGroupMessages)
    .leftJoin(users, eq(communityGroupMessages.senderId, users.id))
    .leftJoin(
      userProfiles,
      eq(communityGroupMessages.senderId, userProfiles.userId)
    )
    .where(
      and(
        eq(communityGroupMessages.groupId, groupId),
        eq(communityGroupMessages.moderationStatus, "visible")
      )
    )
    .orderBy(
      desc(communityGroupMessages.createdAt),
      desc(communityGroupMessages.id)
    )
    .limit(MESSAGE_PAGE_SIZE);
  return [...newestFirst]
    .reverse()
    .map(
      ({
        publicSlug,
        avatarUrl,
        bio,
        homeLocation,
        profileVisibility,
        ...message
      }) => ({
        ...message,
        avatarUrl,
        publicProfile:
          profileVisibility === "public" && publicSlug
            ? { publicSlug, avatarUrl, bio, homeLocation }
            : null,
      })
    );
}

export async function createCommunityGroupMessage(
  groupId: number,
  userId: number,
  input: z.infer<typeof groupMessageSchema>
) {
  const db = await requireActiveCommunityGroupMember(groupId, userId);
  const result = await db
    .insert(communityGroupMessages)
    .values({ groupId, senderId: userId, body: input.body });
  return Number(result[0].insertId);
}

export async function moderateCommunityGroupMessage(
  groupId: number,
  messageId: number,
  actorId: number,
  moderationStatus: "visible" | "hidden"
) {
  const { db } = await requireCommunityGroupAdmin(groupId, actorId);
  await db
    .update(communityGroupMessages)
    .set({ moderationStatus })
    .where(
      and(
        eq(communityGroupMessages.id, messageId),
        eq(communityGroupMessages.groupId, groupId)
      )
    );
}

export async function getMessagingPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const select = () =>
    db
      .select()
      .from(userMessagingPreferences)
      .where(eq(userMessagingPreferences.userId, userId))
      .limit(1);
  // Read first: this runs on every message sent and every thread opened, and
  // it used to issue an INSERT … ON DUPLICATE KEY UPDATE each time.
  const existing = await select();
  if (existing[0]) return existing[0];
  // Friends and outing companions by default (Law 25, s. 9.1): with sequential
  // ids, "everyone" let any member write to any other, private profiles
  // included. Opening up to everyone is the member's choice.
  await db
    .insert(userMessagingPreferences)
    .values({ userId, directMessagePolicy: "friends" })
    .onDuplicateKeyUpdate({ set: { userId } });
  return (await select())[0];
}

export async function updateMessagingPreferences(
  userId: number,
  input: z.infer<typeof messagingPreferencesSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  await db
    .insert(userMessagingPreferences)
    .values({ userId, directMessagePolicy: input.directMessagePolicy })
    .onDuplicateKeyUpdate({
      set: { directMessagePolicy: input.directMessagePolicy },
    });
  return getMessagingPreferences(userId);
}

export async function blockUser(blockerId: number, blockedId: number) {
  if (blockerId === blockedId)
    throw new DomainError("You cannot block yourself");
  const db = await getDb();
  if (!db) return;
  await db
    .insert(userBlocks)
    .values({ blockerId, blockedId })
    .onDuplicateKeyUpdate({ set: { blockerId } });
}

export async function unblockUser(blockerId: number, blockedId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(userBlocks)
    .where(
      and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      )
    );
}

export async function listBlockedUsers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: userBlocks.blockedId,
      name: users.name,
      avatarUrl: userProfiles.avatarUrl,
      createdAt: userBlocks.createdAt,
    })
    .from(userBlocks)
    .leftJoin(users, eq(userBlocks.blockedId, users.id))
    .leftJoin(userProfiles, eq(userBlocks.blockedId, userProfiles.userId))
    .where(eq(userBlocks.blockerId, userId))
    .orderBy(desc(userBlocks.createdAt));
}

/** Whether either member has blocked the other. */
async function hasBlockBetween(
  executor: Executor,
  firstUserId: number,
  secondUserId: number
): Promise<boolean> {
  const rows = await executor
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      or(
        and(
          eq(userBlocks.blockerId, firstUserId),
          eq(userBlocks.blockedId, secondUserId)
        ),
        and(
          eq(userBlocks.blockerId, secondUserId),
          eq(userBlocks.blockedId, firstUserId)
        )
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function areFriends(
  firstUserId: number,
  secondUserId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          and(
            eq(friendships.requesterId, firstUserId),
            eq(friendships.addresseeId, secondUserId)
          ),
          and(
            eq(friendships.requesterId, secondUserId),
            eq(friendships.addresseeId, firstUserId)
          )
        )
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

/**
 * Whether one member organizes an outing the other takes part in (or asked
 * to). With messages limited to friends by default, a participant must still
 * be able to reach their organizer, and the other way round.
 */
async function shareAnOuting(
  executor: Executor,
  firstUserId: number,
  secondUserId: number
): Promise<boolean> {
  const rows = await executor
    .select({ id: eventParticipants.id })
    .from(eventParticipants)
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .where(
      and(
        inArray(eventParticipants.status, ["going", "pending", "waitlist"]),
        ne(events.status, "cancelled"),
        or(
          and(
            eq(events.hostId, firstUserId),
            eq(eventParticipants.userId, secondUserId)
          ),
          and(
            eq(events.hostId, secondUserId),
            eq(eventParticipants.userId, firstUserId)
          )
        )
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

async function canDirectMessage(senderId: number, recipientId: number) {
  if (senderId === recipientId)
    throw new DomainError("You cannot message yourself");
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  if (await hasBlockBetween(db, senderId, recipientId))
    throw new DomainError("Messaging is unavailable for this member");
  const recipient = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);
  if (!recipient[0]) throw new DomainError("Recipient not found");
  const preferences = await getMessagingPreferences(recipientId);
  if (preferences?.directMessagePolicy === "none")
    throw new DomainError("This member does not accept direct messages");
  if (
    preferences?.directMessagePolicy === "friends" &&
    !(await areFriends(senderId, recipientId)) &&
    !(await shareAnOuting(db, senderId, recipientId))
  )
    throw new DomainError(
      "This member accepts messages from friends and outing companions only"
    );
  return db;
}

async function getOrCreateDirectConversation(
  senderId: number,
  recipientId: number
) {
  const db = await canDirectMessage(senderId, recipientId);
  const userOneId = Math.min(senderId, recipientId);
  const userTwoId = Math.max(senderId, recipientId);
  const existing = await db
    .select()
    .from(directConversations)
    .where(
      and(
        eq(directConversations.userOneId, userOneId),
        eq(directConversations.userTwoId, userTwoId)
      )
    )
    .limit(1);
  if (existing[0]) return { db, conversationId: existing[0].id };
  const result = await db
    .insert(directConversations)
    .values({ userOneId, userTwoId });
  return { db, conversationId: Number(result[0].insertId) };
}

export async function sendDirectMessage(
  senderId: number,
  input: z.infer<typeof directMessageSchema>
) {
  const { db, conversationId } = await getOrCreateDirectConversation(
    senderId,
    input.recipientId
  );
  const result = await db
    .insert(directMessages)
    .values({ conversationId, senderId, body: input.body });
  await db
    .update(directConversations)
    .set({ updatedAt: new Date() })
    .where(eq(directConversations.id, conversationId));
  return { conversationId, messageId: Number(result[0].insertId) };
}

/**
 * Reading a conversation needs no permission to send in it. It used to go
 * through `canDirectMessage`, so as soon as the other person restricted their
 * messages — or one side blocked the other — the whole history became
 * unreadable for both.
 */
export async function getDirectThread(userId: number, otherUserId: number) {
  if (userId === otherUserId)
    throw new DomainError("You cannot message yourself");
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const userOneId = Math.min(userId, otherUserId);
  const userTwoId = Math.max(userId, otherUserId);
  const conversation = await db
    .select({ id: directConversations.id })
    .from(directConversations)
    .where(
      and(
        eq(directConversations.userOneId, userOneId),
        eq(directConversations.userTwoId, userTwoId)
      )
    )
    .limit(1);
  if (!conversation[0]) return { conversationId: null, messages: [] };
  // Newest first, then back to reading order: see listCommunityGroupMessages.
  const newestFirst = await db
    .select({
      id: directMessages.id,
      senderId: directMessages.senderId,
      body: directMessages.body,
      moderationStatus: directMessages.moderationStatus,
      createdAt: directMessages.createdAt,
      senderName: users.name,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(directMessages)
    .leftJoin(users, eq(directMessages.senderId, users.id))
    .leftJoin(userProfiles, eq(directMessages.senderId, userProfiles.userId))
    .where(
      and(
        eq(directMessages.conversationId, conversation[0].id),
        eq(directMessages.moderationStatus, "visible")
      )
    )
    .orderBy(desc(directMessages.createdAt), desc(directMessages.id))
    .limit(MESSAGE_PAGE_SIZE);
  return {
    conversationId: conversation[0].id,
    messages: [...newestFirst].reverse(),
  };
}

export async function listDirectConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const conversations = await db
    .select()
    .from(directConversations)
    .where(
      or(
        eq(directConversations.userOneId, userId),
        eq(directConversations.userTwoId, userId)
      )
    )
    .orderBy(desc(directConversations.updatedAt))
    .limit(80);
  if (!conversations.length) return [];
  const otherIdOf = (conversation: (typeof conversations)[number]) =>
    conversation.userOneId === userId
      ? conversation.userTwoId
      : conversation.userOneId;
  const conversationIds = conversations.map(conversation => conversation.id);
  // Three queries in total; this used to be two per conversation, up to 160.
  const [others, latestIds] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(
        inArray(users.id, Array.from(new Set(conversations.map(otherIdOf))))
      ),
    db
      .select({ id: sql<number>`max(${directMessages.id})` })
      .from(directMessages)
      .where(
        and(
          inArray(directMessages.conversationId, conversationIds),
          eq(directMessages.moderationStatus, "visible")
        )
      )
      .groupBy(directMessages.conversationId),
  ]);
  const lastMessageIds = latestIds
    .map(row => Number(row.id))
    .filter(id => Number.isFinite(id) && id > 0);
  const lastMessages = lastMessageIds.length
    ? await db
        .select({
          conversationId: directMessages.conversationId,
          body: directMessages.body,
        })
        .from(directMessages)
        .where(inArray(directMessages.id, lastMessageIds))
    : [];
  const otherById = new Map(others.map(other => [other.id, other]));
  const lastByConversation = new Map(
    lastMessages.map(message => [message.conversationId, message.body])
  );
  return conversations.map(conversation => {
    const otherUserId = otherIdOf(conversation);
    const other = otherById.get(otherUserId);
    return {
      id: conversation.id,
      otherUserId,
      otherName: other?.name ?? "TrailConnect",
      otherAvatarUrl: other?.avatarUrl ?? null,
      updatedAt: conversation.updatedAt,
      lastMessage: lastByConversation.get(conversation.id) ?? null,
    };
  });
}

export async function createSocialInvite(
  senderId: number,
  input: z.infer<typeof socialInviteCreateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  const destinationHash = createHash("sha256")
    .update(input.destination.toLowerCase())
    .digest("hex");
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const result = await db.insert(socialInvitations).values({
    senderId,
    destinationHash,
    channel: input.channel,
    token,
    expiresAt,
  });
  return { inviteId: Number(result[0].insertId), token, expiresAt };
}

type SocialInviteState = {
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: Date;
};

function isSocialInviteUsable(invite: SocialInviteState, now: Date): boolean {
  return (
    invite.status === "pending" && invite.expiresAt.getTime() > now.getTime()
  );
}

/**
 * What someone opening an invitation link sees before signing in: who invited
 * them. The link used to lead to a 404 — nothing ever read the token back.
 */
export async function getSocialInvitePreview(
  token: string,
  now: Date = new Date()
) {
  const db = await getDb();
  if (!db) return undefined;
  const [invite] = await db
    .select({
      status: socialInvitations.status,
      expiresAt: socialInvitations.expiresAt,
      senderName: users.name,
      profileVisibility: userProfiles.profileVisibility,
      publicSlug: userProfiles.publicSlug,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(socialInvitations)
    .innerJoin(users, eq(users.id, socialInvitations.senderId))
    .leftJoin(userProfiles, eq(userProfiles.userId, socialInvitations.senderId))
    .where(eq(socialInvitations.token, token))
    .limit(1);
  if (!invite || !isSocialInviteUsable(invite, now)) return undefined;
  const isPublic = invite.profileVisibility === "public";
  return {
    senderName: invite.senderName ?? null,
    senderPublicSlug: isPublic ? invite.publicSlug : null,
    senderAvatarUrl: isPublic ? invite.avatarUrl : null,
    expiresAt: invite.expiresAt,
  };
}

/**
 * Accepting an invitation makes the two members friends: the sender asked for
 * it by sharing the link, the invitee by accepting. A shareable link works
 * for several people until it expires; one sent to a single address is used
 * once.
 */
export async function acceptSocialInvite(
  token: string,
  userId: number,
  now: Date = new Date()
): Promise<{ senderId: number }> {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const [invite] = await db
    .select({
      id: socialInvitations.id,
      senderId: socialInvitations.senderId,
      channel: socialInvitations.channel,
      status: socialInvitations.status,
      expiresAt: socialInvitations.expiresAt,
    })
    .from(socialInvitations)
    .where(eq(socialInvitations.token, token))
    .limit(1);
  if (!invite || !isSocialInviteUsable(invite, now))
    throw new DomainError("This invitation is no longer valid");
  if (invite.senderId === userId)
    throw new DomainError("This is your own invitation");
  if (await hasBlockBetween(db, invite.senderId, userId))
    throw new DomainError("This invitation is no longer valid");
  if (invite.channel !== "link") {
    const claimed = await db
      .update(socialInvitations)
      .set({ status: "accepted" })
      .where(
        and(
          eq(socialInvitations.id, invite.id),
          eq(socialInvitations.status, "pending")
        )
      );
    if (!claimed[0].affectedRows)
      throw new DomainError("This invitation is no longer valid");
  }
  const [existing] = await db
    .select({ id: friendships.id, status: friendships.status })
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, invite.senderId),
          eq(friendships.addresseeId, userId)
        ),
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, invite.senderId)
        )
      )
    )
    .limit(1);
  if (existing?.status === "blocked")
    throw new DomainError("This invitation is no longer valid");
  if (existing?.status === "accepted") return { senderId: invite.senderId };
  if (existing)
    await db
      .update(friendships)
      .set({ status: "accepted", remindAt: null })
      .where(eq(friendships.id, existing.id));
  else
    await db.insert(friendships).values({
      requesterId: invite.senderId,
      addresseeId: userId,
      status: "accepted",
    });
  const [invitee] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  await createUserNotification(invite.senderId, {
    type: "account",
    title: "Invitation acceptée / Invitation accepted",
    body: `${invitee?.name || "Un membre / A member"} a rejoint votre cercle. / joined your circle.`,
    actionPath: "/communaute",
  });
  return { senderId: invite.senderId };
}

export async function linkSocialAccount(
  userId: number,
  input: z.infer<typeof socialLinkSchema>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(linkedSocialAccounts)
    .values({
      userId,
      provider: input.provider,
      profileUrl: input.profileUrl,
      consentedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        profileUrl: input.profileUrl,
        consentedAt: new Date(),
        revokedAt: null,
      },
    });
}

export async function listEventMessages(eventId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      id: eventMessages.id,
      content: eventMessages.content,
      imageUrl: eventMessages.imageUrl,
      isPinned: eventMessages.isPinned,
      createdAt: eventMessages.createdAt,
      senderName: users.name,
      senderId: eventMessages.senderId,
      publicSlug: userProfiles.publicSlug,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
      homeLocation: userProfiles.homeLocation,
      profileVisibility: userProfiles.profileVisibility,
    })
    .from(eventMessages)
    .leftJoin(users, eq(eventMessages.senderId, users.id))
    .leftJoin(userProfiles, eq(eventMessages.senderId, userProfiles.userId))
    .where(eq(eventMessages.eventId, eventId))
    .orderBy(desc(eventMessages.isPinned), asc(eventMessages.createdAt));
  return rows.map(
    ({
      publicSlug,
      avatarUrl,
      bio,
      homeLocation,
      profileVisibility,
      ...message
    }) => ({
      ...message,
      publicProfile:
        profileVisibility === "public" && publicSlug
          ? { publicSlug, avatarUrl, bio, homeLocation }
          : null,
    })
  );
}

export async function createEventMessage(
  eventId: number,
  senderId: number,
  content: string
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(eventMessages)
    .values({ eventId, senderId, content });
  return Number(result[0].insertId);
}

export async function setEventMessagePinned(
  eventId: number,
  messageId: number,
  actorId: number,
  isPinned: boolean
) {
  const { db } = await getEventManagementAccess(eventId, actorId);
  const message = await db
    .select({ id: eventMessages.id })
    .from(eventMessages)
    .where(
      and(eq(eventMessages.id, messageId), eq(eventMessages.eventId, eventId))
    )
    .limit(1);
  if (!message[0]) throw new DomainError("This outing message is unavailable");
  if (isPinned)
    await db
      .update(eventMessages)
      .set({ isPinned: false })
      .where(eq(eventMessages.eventId, eventId));
  await db
    .update(eventMessages)
    .set({ isPinned })
    .where(eq(eventMessages.id, messageId));
  return { messageId, isPinned };
}

export async function getOrCreateProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(userProfiles).values({ userId });
  const created = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return created[0];
}

export async function updateProfile(
  userId: number,
  input: z.infer<typeof profileUpdateSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  await getOrCreateProfile(userId);
  await db
    .update(userProfiles)
    .set(input)
    .where(eq(userProfiles.userId, userId));
  return getOrCreateProfile(userId);
}

export async function getOrCreateNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(userNotificationPreferences).values({ userId });
  const created = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId))
    .limit(1);
  return created[0];
}

export async function updateNotificationPreferences(
  userId: number,
  input: z.infer<typeof notificationPreferencesSchema>
) {
  const db = await getDb();
  if (!db) return undefined;
  await getOrCreateNotificationPreferences(userId);
  await db
    .update(userNotificationPreferences)
    .set(input)
    .where(eq(userNotificationPreferences.userId, userId));
  return getOrCreateNotificationPreferences(userId);
}

export async function getAccountDeletionStatus(userId: number) {
  const profile = await getOrCreateProfile(userId);
  if (!profile) return undefined;
  return {
    deletionRequestedAt: profile.deletionRequestedAt,
    deletionScheduledAt: profile.deletionScheduledAt,
    deletedAt: profile.deletedAt,
  };
}

export async function requestAccountDeletion(userId: number) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const profile = await getOrCreateProfile(userId);
  if (!profile || profile.deletedAt)
    throw new DomainError("This profile is no longer available");
  const now = new Date();
  const deletionScheduledAt = new Date(
    now.getTime() + 15 * 24 * 60 * 60 * 1000
  );
  await db
    .update(userProfiles)
    .set({ deletionRequestedAt: now, deletionScheduledAt })
    .where(eq(userProfiles.userId, userId));
  await createUserNotification(userId, {
    type: "account",
    title: "Account deletion scheduled",
    body: "Your profile deletion is scheduled in 15 days. You can cancel it at any time before then.",
    actionPath: "/?view=account",
  });
  return { deletionScheduledAt };
}

export async function cancelAccountDeletion(userId: number) {
  const db = await getDb();
  if (!db) throw new DomainError("Database unavailable");
  const result = await db
    .update(userProfiles)
    .set({ deletionRequestedAt: null, deletionScheduledAt: null })
    .where(
      and(eq(userProfiles.userId, userId), isNull(userProfiles.deletedAt))
    );
  if (!result[0].affectedRows)
    throw new DomainError("No cancellable deletion request was found");
}

export async function listUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(80);
}

/**
 * Creates an in-app notification unless the member turned that kind off.
 *
 * `collapseUnread` keeps one unread notice per type and link: a busy outing
 * chat used to add one notification per message to every participant.
 */
export async function createUserNotification(
  userId: number,
  notification: {
    type: NotificationType;
    title: string;
    body: string;
    actionPath?: string;
  },
  options: { collapseUnread?: boolean } = {}
) {
  const db = await getDb();
  if (!db) return undefined;
  const [switches] = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId))
    .limit(1);
  if (!shouldDeliverNotification(notification.type, switches)) return undefined;
  if (options.collapseUnread) {
    const [unread] = await db
      .select({ id: userNotifications.id })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.type, notification.type),
          eq(userNotifications.isRead, false),
          notification.actionPath
            ? eq(userNotifications.actionPath, notification.actionPath)
            : isNull(userNotifications.actionPath)
        )
      )
      .limit(1);
    if (unread) return unread.id;
  }
  const result = await db
    .insert(userNotifications)
    .values({ userId, ...notification });
  return Number(result[0].insertId);
}

export async function markNotificationRead(
  userId: number,
  notificationId: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(userNotifications.id, notificationId),
        eq(userNotifications.userId, userId)
      )
    );
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.isRead, false)
      )
    );
}

export async function prepareEventReminder(input: {
  eventId: number;
  userId: number;
  channel: "email" | "push";
  kind: "day_before" | "two_hours" | "safety";
  scheduledFor: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(eventReminders)
    .values(input)
    .onDuplicateKeyUpdate({
      set: { scheduledFor: input.scheduledFor, status: "pending" },
    });
  return Number(result[0].insertId);
}

export async function getAdminDashboardStats() {
  const db = await getDb();
  if (!db)
    return {
      users: 0,
      activeEvents: 0,
      posts: 0,
      openReports: 0,
      suspendedUsers: 0,
    };
  const [allUsers, allEvents, allPosts, allReports] = await Promise.all([
    db.select({ id: users.id, accountStatus: users.accountStatus }).from(users),
    db
      .select({
        id: events.id,
        status: events.status,
        moderationStatus: events.moderationStatus,
      })
      .from(events),
    db
      .select({ id: posts.id, moderationStatus: posts.moderationStatus })
      .from(posts),
    db.select({ id: reports.id, status: reports.status }).from(reports),
  ]);
  return {
    users: allUsers.length,
    activeEvents: allEvents.filter(
      event =>
        event.status === "published" && event.moderationStatus === "visible"
    ).length,
    posts: allPosts.filter(post => post.moderationStatus === "visible").length,
    openReports: allReports.filter(
      report => report.status === "open" || report.status === "in_review"
    ).length,
    suspendedUsers: allUsers.filter(user => user.accountStatus !== "active")
      .length,
  };
}

export async function getOrCreateSiteSettings() {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select()
    .from(siteSettings)
    .orderBy(asc(siteSettings.id))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(siteSettings).values({});
  const created = await db
    .select()
    .from(siteSettings)
    .orderBy(asc(siteSettings.id))
    .limit(1);
  return created[0];
}

export async function updateSiteSettings(input: {
  defaultLocale?: "fr" | "en";
  defaultTimezone?: string;
  defaultUnits?: "metric" | "imperial";
  requireEventApproval?: boolean;
  communityPostingEnabled?: boolean;
  externalAlertsEnabled?: boolean;
  eventRemindersEnabled?: boolean;
  allTrailsEnabled?: boolean;
  gaiaEnabled?: boolean;
  stravaEnabled?: boolean;
  garminEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const settings = await getOrCreateSiteSettings();
  if (!settings) return undefined;
  await db
    .update(siteSettings)
    .set(input)
    .where(eq(siteSettings.id, settings.id));
  return getOrCreateSiteSettings();
}

export async function listAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      moderationNote: users.moderationNote,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(150);
}

export async function updateAdminUserStatus(
  userId: number,
  status: "active" | "suspended" | "banned",
  note?: string
) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db
    .update(users)
    .set({
      accountStatus: status,
      moderationNote: note ?? null,
      suspendedAt: status === "suspended" ? now : null,
      bannedAt: status === "banned" ? now : null,
    })
    .where(eq(users.id, userId));
}

export async function listAdminEvents() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: events.id,
      title: events.title,
      locationName: events.locationName,
      startsAt: events.startsAt,
      status: events.status,
      moderationStatus: events.moderationStatus,
      hostName: users.name,
      hostId: events.hostId,
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .orderBy(desc(events.createdAt))
    .limit(150);
}

export async function listAdminPosts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: posts.id,
      body: posts.body,
      moderationStatus: posts.moderationStatus,
      createdAt: posts.createdAt,
      authorName: users.name,
      authorId: posts.authorId,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(150);
}

export async function updateContentModeration(
  targetType: "event" | "post" | "message",
  targetId: number,
  moderationStatus: "visible" | "under_review" | "hidden",
  messageChannel?: "direct" | "group"
) {
  const db = await getDb();
  if (!db) return;
  if (targetType === "event")
    await db
      .update(events)
      .set({ moderationStatus })
      .where(eq(events.id, targetId));
  else if (targetType === "post")
    await db
      .update(posts)
      .set({ moderationStatus })
      .where(eq(posts.id, targetId));
  else if (messageChannel === "group")
    await db
      .update(communityGroupMessages)
      .set({ moderationStatus })
      .where(eq(communityGroupMessages.id, targetId));
  else if (messageChannel === "direct")
    await db
      .update(directMessages)
      .set({ moderationStatus })
      .where(eq(directMessages.id, targetId));
  else
    throw new DomainError(
      "A message channel is required for message moderation"
    );
}

export async function createReport(
  reporterId: number,
  input: {
    targetType: "user" | "event" | "post" | "message";
    targetId: number;
    messageChannel?: "direct" | "group";
    category:
      | "safety"
      | "harassment"
      | "fraud"
      | "inappropriate_content"
      | "other";
    description: string;
  }
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(reports).values({ reporterId, ...input });
  return Number(result[0].insertId);
}

export async function listAdminReports() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      category: reports.category,
      description: reports.description,
      status: reports.status,
      resolutionNote: reports.resolutionNote,
      createdAt: reports.createdAt,
      reporterName: users.name,
      reporterId: reports.reporterId,
    })
    .from(reports)
    .leftJoin(users, eq(reports.reporterId, users.id))
    .orderBy(desc(reports.createdAt))
    .limit(150);
}

export async function updateAdminReport(
  reportId: number,
  reviewerId: number,
  status: "open" | "in_review" | "resolved" | "rejected",
  resolutionNote?: string
) {
  const db = await getDb();
  if (!db) return undefined;
  await db
    .update(reports)
    .set({
      status,
      reviewerId,
      resolutionNote: resolutionNote ?? null,
      resolvedAt:
        status === "resolved" || status === "rejected" ? new Date() : null,
    })
    .where(eq(reports.id, reportId));
  // What the report was about, for the moderation log.
  const [report] = await db
    .select({ targetType: reports.targetType, targetId: reports.targetId })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  return report;
}

export async function createModerationAction(
  adminId: number,
  input: {
    targetType: "user" | "event" | "post" | "message";
    targetId: number;
    action:
      | "suspend"
      | "ban"
      | "restore"
      | "hide"
      | "review"
      | "resolve_report";
    note?: string;
  }
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(moderationActions)
    .values({ adminId, ...input });
  return Number(result[0].insertId);
}

export async function uploadRouteTrack(
  userId: number,
  filename: string,
  mimeType: string,
  contentBase64: string
) {
  const normalizedName = filename.replace(/[^a-zA-Z0-9_.-]/g, "-");
  const buffer = Buffer.from(contentBase64, "base64");
  return storagePut(
    `users/${userId}/tracks/${normalizedName}`,
    buffer,
    mimeType
  );
}

export async function uploadRouteTrackBytes(
  userId: number,
  filename: string,
  mimeType: string,
  content: Buffer
) {
  const normalizedName = filename.replace(/[^a-zA-Z0-9_.-]/g, "-");
  return storagePut(
    `users/${userId}/tracks/${normalizedName}`,
    content,
    mimeType
  );
}

export async function uploadSocialImage(
  userId: number,
  filename: string,
  mimeType: UploadImageType,
  contentBase64: string
) {
  const normalizedName = filename.replace(/[^a-zA-Z0-9_.-]/g, "-");
  // GPS position, time and device go before the file is stored.
  const buffer = stripImageMetadata(
    Buffer.from(contentBase64, "base64"),
    mimeType
  );
  return storagePut(
    `users/${userId}/social/${Date.now()}-${normalizedName}`,
    buffer,
    mimeType
  );
}
