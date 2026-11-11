// Final step of an account deletion request, run by the scheduled task once the
// 15-day grace period is over.
//
// It used to blank five profile columns and stop there: `users.name`, the email,
// the identity-provider subject, every post and message, emergency contacts and
// shared locations all stayed, the name kept showing on everything the person
// had written, and signing in again reopened the account. The privacy policy
// promises erasure, and Law 25 requires it.
//
// What happens now:
// - upcoming commitments are withdrawn through the normal flows, so organizers
//   and carpool passengers are told, and hosted outings still ahead are
//   cancelled with their participants notified;
// - owned community groups pass to the next moderator or member, or are
//   deleted when nobody is left;
// - personal data and everything the person wrote are deleted, and the
//   remaining rows (past participations, past outings) point at a user row
//   with no name, no email and an identity that no login can ever match;
// - uploaded files are removed from disk.
//
// Each step is idempotent: a run that fails half-way leaves `deletedAt` unset,
// so the next run picks the account up again.

import { and, asc, eq, gt, inArray, isNull, lte, ne, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  activityCircles,
  carpoolOffers,
  carpoolSeatReservations,
  circleMembers,
  communityGroupCoAdminInvitations,
  communityGroupMembers,
  communityGroupMessages,
  communityGroupPosts,
  communityGroups,
  directMessages,
  emergencyContacts,
  eventActionAssignments,
  eventInvitationShareEvents,
  eventBookingRequests,
  eventCoOrganizerInvitations,
  eventCoOrganizers,
  eventDateOptionAvailabilities,
  eventDayOfBriefAcknowledgements,
  eventMessages,
  eventOperationalDecisionAcknowledgements,
  eventPaceGroupAssignments,
  eventParticipants,
  eventPreparationStates,
  eventReminders,
  eventSafetyCheckIns,
  eventSeriesInterests,
  eventWaitlistOffers,
  eventWeatherUpdateAcknowledgements,
  events,
  follows,
  friendships,
  guideProfiles,
  hikerPreferences,
  linkedSocialAccounts,
  liveLocationShares,
  outdoorServiceConsents,
  participantPackingItems,
  phoneVerificationChallenges,
  postMedia,
  postReactions,
  posts,
  socialInvitations,
  userAchievements,
  userBlocks,
  userCommunityGroupTemplates,
  userInvitationTemplates,
  userMessagingPreferences,
  userNotificationPreferences,
  userNotifications,
  userPreparationPassportEntries,
  userProfiles,
  userSafetyConsents,
  users,
} from "../drizzle/schema";
import { cancelHikingEvent, getDb, leaveEvent } from "./db";
import { storageDeleteByUrl } from "./storage";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Placeholder left on past carpool offers, whose origin may be a home address. */
const REMOVED_LOCATION = "Retiré / Removed";

export async function finalizeDueAccountDeletions(
  now: Date = new Date()
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const due = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(
      and(
        lte(userProfiles.deletionScheduledAt, now),
        isNull(userProfiles.deletedAt)
      )
    );
  let finalized = 0;
  for (const { userId } of due) {
    try {
      await eraseAccount(db, userId, now);
      finalized += 1;
    } catch (error) {
      // One failing account must not block the others; it is retried next run.
      console.error(`[AccountErasure] user ${userId} failed:`, error);
    }
  }
  return finalized;
}

async function eraseAccount(db: Database, userId: number, now: Date) {
  await withdrawFromUpcomingOutings(db, userId, now);
  await cancelUpcomingHostedOutings(db, userId, now);
  await handOverOwnedGroups(db, userId);
  const uploads = await collectUploadUrls(db, userId);
  await purgePersonalData(db, userId, now);
  await Promise.all(
    uploads.map(url =>
      storageDeleteByUrl(url).catch(error =>
        console.error(`[AccountErasure] could not delete ${url}:`, error)
      )
    )
  );
}

async function withdrawFromUpcomingOutings(
  db: Database,
  userId: number,
  now: Date
) {
  const upcoming = and(
    gt(events.startsAt, now),
    inArray(events.status, ["draft", "published"]),
    ne(events.hostId, userId)
  );
  const [participations, requests] = await Promise.all([
    db
      .select({ eventId: eventParticipants.eventId })
      .from(eventParticipants)
      .innerJoin(events, eq(events.id, eventParticipants.eventId))
      .where(
        and(
          eq(eventParticipants.userId, userId),
          inArray(eventParticipants.status, ["going", "waitlist", "pending"]),
          upcoming
        )
      ),
    db
      .select({ eventId: eventBookingRequests.eventId })
      .from(eventBookingRequests)
      .innerJoin(events, eq(events.id, eventBookingRequests.eventId))
      .where(
        and(
          eq(eventBookingRequests.hikerId, userId),
          eq(eventBookingRequests.status, "pending"),
          upcoming
        )
      ),
  ]);
  const eventIds = new Set(
    [...participations, ...requests].map(row => row.eventId)
  );
  // Sequential on purpose: each withdrawal releases carpool seats and
  // notifies an organizer; running them together gains nothing here.
  for (const eventId of Array.from(eventIds))
    await leaveEvent(eventId, userId).catch(error =>
      // The purge below still removes the person's data from this outing; an
      // outing that cannot be left must not hold the whole erasure hostage.
      console.error(`[AccountErasure] leave ${eventId} failed:`, error)
    );
}

async function cancelUpcomingHostedOutings(
  db: Database,
  userId: number,
  now: Date
) {
  const hosted = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.hostId, userId),
        gt(events.startsAt, now),
        inArray(events.status, ["draft", "published"])
      )
    );
  for (const { id } of hosted)
    await cancelHikingEvent(id, userId).catch(error =>
      console.error(`[AccountErasure] cancel ${id} failed:`, error)
    );
}

/**
 * A group belongs to its members as much as to its owner, so it is handed to
 * the longest-standing moderator, else member. Only an empty group is deleted.
 */
async function handOverOwnedGroups(db: Database, userId: number) {
  const owned = await db
    .select({ id: communityGroups.id })
    .from(communityGroups)
    .where(eq(communityGroups.ownerId, userId));
  for (const { id: groupId } of owned) {
    const [successor] = await db
      .select({
        id: communityGroupMembers.id,
        userId: communityGroupMembers.userId,
      })
      .from(communityGroupMembers)
      .where(
        and(
          eq(communityGroupMembers.groupId, groupId),
          eq(communityGroupMembers.status, "active"),
          ne(communityGroupMembers.userId, userId)
        )
      )
      // MySQL orders an ENUM by declaration (owner, moderator, member), so
      // ascending puts moderators ahead of plain members.
      .orderBy(
        asc(communityGroupMembers.role),
        asc(communityGroupMembers.createdAt)
      )
      .limit(1);
    await db.transaction(async tx => {
      if (successor) {
        await tx
          .update(communityGroups)
          .set({ ownerId: successor.userId })
          .where(eq(communityGroups.id, groupId));
        await tx
          .update(communityGroupMembers)
          .set({ role: "owner" })
          .where(eq(communityGroupMembers.id, successor.id));
        return;
      }
      await tx
        .delete(communityGroupCoAdminInvitations)
        .where(eq(communityGroupCoAdminInvitations.groupId, groupId));
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
}

/** Files that only exist because of this person. */
async function collectUploadUrls(db: Database, userId: number) {
  const [profile, authoredPosts, groupPosts, outingMessages] =
    await Promise.all([
      db
        .select({
          avatarUrl: userProfiles.avatarUrl,
          coverImageUrl: userProfiles.coverImageUrl,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId)),
      db
        .select({ id: posts.id, imageUrl: posts.imageUrl })
        .from(posts)
        .where(eq(posts.authorId, userId)),
      db
        .select({ imageUrl: communityGroupPosts.imageUrl })
        .from(communityGroupPosts)
        .where(eq(communityGroupPosts.authorId, userId)),
      db
        .select({ imageUrl: eventMessages.imageUrl })
        .from(eventMessages)
        .where(eq(eventMessages.senderId, userId)),
    ]);
  const postIds = authoredPosts.map(post => post.id);
  const media = postIds.length
    ? await db
        .select({ url: postMedia.url })
        .from(postMedia)
        .where(inArray(postMedia.postId, postIds))
    : [];
  const urls = [
    ...profile.flatMap(row => [row.avatarUrl, row.coverImageUrl]),
    ...authoredPosts.map(row => row.imageUrl),
    ...media.map(row => row.url),
    ...groupPosts.map(row => row.imageUrl),
    ...outingMessages.map(row => row.imageUrl),
  ];
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

async function purgePersonalData(db: Database, userId: number, now: Date) {
  await db.transaction(async tx => {
    const authoredPosts = await tx
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.authorId, userId));
    const postIds = authoredPosts.map(post => post.id);
    if (postIds.length) {
      await tx.delete(postMedia).where(inArray(postMedia.postId, postIds));
      await tx
        .delete(postReactions)
        .where(inArray(postReactions.postId, postIds));
      await tx.delete(posts).where(inArray(posts.id, postIds));
    }

    const ownedCircles = await tx
      .select({ id: activityCircles.id })
      .from(activityCircles)
      .where(eq(activityCircles.ownerId, userId));
    const circleIds = ownedCircles.map(circle => circle.id);
    if (circleIds.length) {
      await tx
        .delete(circleMembers)
        .where(inArray(circleMembers.circleId, circleIds));
      await tx
        .delete(activityCircles)
        .where(inArray(activityCircles.id, circleIds));
    }

    const deletions = [
      // What the person wrote.
      tx.delete(postReactions).where(eq(postReactions.userId, userId)),
      tx
        .delete(communityGroupPosts)
        .where(eq(communityGroupPosts.authorId, userId)),
      tx
        .delete(communityGroupMessages)
        .where(eq(communityGroupMessages.senderId, userId)),
      tx.delete(directMessages).where(eq(directMessages.senderId, userId)),
      tx.delete(eventMessages).where(eq(eventMessages.senderId, userId)),
      // Safety data: the most sensitive of all.
      tx.delete(emergencyContacts).where(eq(emergencyContacts.userId, userId)),
      tx
        .delete(userSafetyConsents)
        .where(eq(userSafetyConsents.userId, userId)),
      tx
        .delete(liveLocationShares)
        .where(eq(liveLocationShares.userId, userId)),
      tx
        .delete(eventSafetyCheckIns)
        .where(eq(eventSafetyCheckIns.userId, userId)),
      tx
        .delete(phoneVerificationChallenges)
        .where(eq(phoneVerificationChallenges.userId, userId)),
      // Account settings and private records.
      tx.delete(userNotifications).where(eq(userNotifications.userId, userId)),
      tx
        .delete(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, userId)),
      tx
        .delete(userMessagingPreferences)
        .where(eq(userMessagingPreferences.userId, userId)),
      tx
        .delete(userInvitationTemplates)
        .where(eq(userInvitationTemplates.userId, userId)),
      tx
        .delete(userCommunityGroupTemplates)
        .where(eq(userCommunityGroupTemplates.ownerId, userId)),
      tx.delete(eventReminders).where(eq(eventReminders.userId, userId)),
      tx.delete(hikerPreferences).where(eq(hikerPreferences.userId, userId)),
      tx.delete(guideProfiles).where(eq(guideProfiles.userId, userId)),
      tx
        .delete(userPreparationPassportEntries)
        .where(eq(userPreparationPassportEntries.userId, userId)),
      tx
        .delete(linkedSocialAccounts)
        .where(eq(linkedSocialAccounts.userId, userId)),
      tx
        .delete(outdoorServiceConsents)
        .where(eq(outdoorServiceConsents.userId, userId)),
      tx.delete(userAchievements).where(eq(userAchievements.userId, userId)),
      tx
        .delete(socialInvitations)
        .where(eq(socialInvitations.senderId, userId)),
      // Outing coordination tied to the person.
      tx
        .delete(eventPreparationStates)
        .where(eq(eventPreparationStates.userId, userId)),
      tx
        .delete(participantPackingItems)
        .where(eq(participantPackingItems.participantId, userId)),
      tx
        .delete(eventWaitlistOffers)
        .where(eq(eventWaitlistOffers.participantId, userId)),
      tx
        .delete(eventWeatherUpdateAcknowledgements)
        .where(eq(eventWeatherUpdateAcknowledgements.userId, userId)),
      tx
        .delete(eventDayOfBriefAcknowledgements)
        .where(eq(eventDayOfBriefAcknowledgements.userId, userId)),
      tx
        .delete(eventOperationalDecisionAcknowledgements)
        .where(eq(eventOperationalDecisionAcknowledgements.userId, userId)),
      tx
        .delete(eventPaceGroupAssignments)
        .where(eq(eventPaceGroupAssignments.userId, userId)),
      tx
        .delete(eventDateOptionAvailabilities)
        .where(eq(eventDateOptionAvailabilities.userId, userId)),
      tx
        .delete(eventSeriesInterests)
        .where(eq(eventSeriesInterests.userId, userId)),
      tx.delete(eventCoOrganizers).where(eq(eventCoOrganizers.userId, userId)),
      // Relationships, in both directions.
      tx
        .delete(follows)
        .where(
          or(eq(follows.followerId, userId), eq(follows.followingId, userId))
        ),
      tx
        .delete(friendships)
        .where(
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId)
          )
        ),
      tx
        .delete(userBlocks)
        .where(
          or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId))
        ),
      tx
        .delete(eventCoOrganizerInvitations)
        .where(
          or(
            eq(eventCoOrganizerInvitations.inviterId, userId),
            eq(eventCoOrganizerInvitations.inviteeId, userId)
          )
        ),
      tx
        .delete(communityGroupCoAdminInvitations)
        .where(
          or(
            eq(communityGroupCoAdminInvitations.inviterId, userId),
            eq(communityGroupCoAdminInvitations.inviteeId, userId)
          )
        ),
      tx.delete(circleMembers).where(eq(circleMembers.userId, userId)),
      tx
        .delete(communityGroupMembers)
        .where(eq(communityGroupMembers.userId, userId)),
      // Free text kept on rows other people still rely on.
      tx
        .update(eventParticipants)
        .set({ levelExceptionNote: null, levelExceptionDecisionNote: null })
        .where(eq(eventParticipants.userId, userId)),
      tx
        .update(eventBookingRequests)
        .set({ note: null, levelExceptionNote: null })
        .where(eq(eventBookingRequests.hikerId, userId)),
      tx
        .update(carpoolSeatReservations)
        .set({ note: null })
        .where(eq(carpoolSeatReservations.passengerId, userId)),
      tx
        .update(carpoolOffers)
        .set({
          note: null,
          withdrawalNote: null,
          departureLocation: REMOVED_LOCATION,
        })
        .where(eq(carpoolOffers.driverId, userId)),
      // Coordination roles and invitation-share analytics naming the person.
      tx
        .delete(eventActionAssignments)
        .where(eq(eventActionAssignments.assigneeId, userId)),
      tx
        .delete(eventInvitationShareEvents)
        .where(eq(eventInvitationShareEvents.actorId, userId)),
    ];
    for (const statement of deletions) await statement;

    // A fresh random subject: no identity-provider login can match it again,
    // and any session still carrying the old one stops resolving.
    await tx
      .update(users)
      .set({
        name: null,
        email: null,
        loginMethod: null,
        externalId: `deleted:${userId}:${nanoid(16)}`,
      })
      .where(eq(users.id, userId));
    await tx
      .update(userProfiles)
      .set({
        deletedAt: now,
        deletionScheduledAt: null,
        profileVisibility: "private",
        publicSlug: null,
        avatarUrl: null,
        coverImageUrl: null,
        bio: null,
        homeLocation: null,
        phoneVerificationStatus: "unverified",
        phoneVerifiedAt: null,
      })
      .where(eq(userProfiles.userId, userId));
  });
}
