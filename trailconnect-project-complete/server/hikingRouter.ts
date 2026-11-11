import { TRPCError } from "@trpc/server";
import { outdoorIntegrations } from "../shared/integrations";
import * as db from "./db";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  friendRequestBySlugSchema,
  friendshipDeferSchema,
  friendshipRemoveSchema,
  groupNameSchema,
  groupTemplateCreateSchema,
  groupTemplateDeleteSchema,
  publicSlugSchema,
} from "./hikingValidation";
import { memberSearchSchema } from "./hikingValidation";
import {
  coOrganizerInviteResponseSchema,
  coOrganizerInviteRevokeSchema,
  coOrganizerInviteSchema,
} from "./hikingValidation";
import {
  eventManualRouteUpdateSchema,
  eventUpdateSchema,
  eventSeriesCreateSchema,
  eventSeriesIdSchema,
  eventSeriesRelaunchSchema,
  waitlistOfferResponseSchema,
  waitlistOfferSchema,
  waitlistPromotionSchema,
} from "./hikingValidation";
import {
  eventPackingItemCreateSchema,
  eventPackingItemDeleteSchema,
  eventPackingItemUpdateSchema,
} from "./hikingValidation";
import {
  eventAccessRadarEntryDeleteSchema,
  eventAccessRadarEntrySchema,
  eventCarpoolHubDeleteSchema,
  eventCarpoolHubSchema,
  eventOperationalDecisionAcknowledgementSchema,
  eventPaceGroupAssignmentSchema,
  eventPaceGroupDeleteSchema,
  eventPaceGroupSchema,
  preparationPassportEntrySchema,
} from "./hikingValidation";
import { organizerParticipantActionSchema } from "./hikingValidation";
import {
  adminContentModerationSchema,
  adminGuideReviewSchema,
  adminReportStatusSchema,
  adminSiteSettingsSchema,
  adminUserStatusSchema,
  bookingDecisionSchema,
  bookingRequestSchema,
  carpoolOfferSchema,
  carpoolUpdateSchema,
  carpoolSeatDecisionSchema,
  carpoolSeatRemovalSchema,
  carpoolSeatReservationSchema,
  carpoolWithdrawalSchema,
  circleCreateSchema,
  circleMemberSchema,
  createReportSchema,
  dayOfBriefAcknowledgeSchema,
  directMessageSchema,
  directThreadSchema,
  eventActionAssignmentSchema,
  eventConditionReportSchema,
  eventCoverFocalPointSchema,
  eventCreateSchema,
  eventDateAvailabilitySchema,
  eventDateOptionPublishSchema,
  eventDateOptionSchema,
  eventIdSchema,
  eventInvitationShareSchema,
  eventJoinSchema,
  eventLogisticsSchema,
  eventMessagePinSchema,
  eventOperationalDecisionSchema,
  eventPreparationUpdateSchema,
  eventListSchema,
  eventSearchSchema,
  eventTerrainLandmarkDeleteSchema,
  eventTerrainLandmarkSchema,
  eventTerrainLandmarkUpdateSchema,
  friendRequestSchema,
  friendshipActionSchema,
  groupCoAdminInviteResponseSchema,
  groupCoAdminInviteRevokeSchema,
  groupCoAdminInviteSchema,
  groupCreateSchema,
  groupIdSchema,
  groupInviteResponseSchema,
  groupInviteSchema,
  groupMemberRoleSchema,
  groupMessageModerationSchema,
  groupMessageSchema,
  groupPostCreateSchema,
  groupPostDeleteSchema,
  groupUpdateSchema,
  guideProfileSchema,
  hikerPreferencesSchema,
  imageUploadSchema,
  invitationTemplateDeleteSchema,
  invitationTemplateSchema,
  liveLocationShareSchema,
  liveLocationStopSchema,
  localWeatherSourceSchema,
  messageCreateSchema,
  messagingPreferencesSchema,
  notificationIdSchema,
  notificationPreferencesSchema,
  outdoorServiceConsentSchema,
  participantCheckInSchema,
  participantPackingItemSchema,
  participantReadinessSchema,
  postCreateSchema,
  profileUpdateSchema,
  routeWeatherSchema,
  safetyCheckInSchema,
  safetyConsentSchema,
  socialInviteCreateSchema,
  socialInviteTokenSchema,
  socialLinkSchema,
  socialPostReactionSchema,
  socialUserIdSchema,
  trackUploadSchema,
  userBlockSchema,
  weatherUpdateAcknowledgementSchema,
  weatherUpdateSchema,
} from "./hikingValidation";
import { fetchForecastDay, isWithinForecastWindow } from "./weather";
import { getJoinRefusal } from "./eventJoinPolicy";
import { DomainError, publicMessage } from "./domainError";

/**
 * Guards the panels hanging off an outing sheet (conditions, landmarks, access
 * radar, weather updates, coordination assignments). They accept a bare
 * `eventId`, so without this check anyone could walk the id range and read the
 * participant names and landmark coordinates of private outings.
 *
 * NOT_FOUND rather than FORBIDDEN: telling an anonymous caller that an outing
 * exists but is hidden is itself a disclosure.
 */
async function assertEventSheetAccess(
  eventId: number,
  userId?: number
): Promise<void> {
  if (await db.canReadEventSheet(eventId, userId)) return;
  throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
}

/**
 * The admission rule shared by `events.join` and `marketplace.bookings.request`.
 * The second one skipped it, so a request on any id — private, cancelled, past —
 * attached its author to the outing and opened the private sheet.
 */
function assertJoinable(
  event: Parameters<typeof getJoinRefusal>[0],
  userId: number
): void {
  const refusal = getJoinRefusal(event, userId);
  if (refusal === "unavailable")
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  if (refusal === "organizer")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You organize this outing",
    });
  if (refusal === "started")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This outing has already started",
    });
}

/**
 * The outing sheet is public for a public outing, but the coordination part of
 * its logistics is not: `logistics.detail` keeps the meeting point, the
 * emergency plan and the route for the organizing team and confirmed
 * participants, while `events.detail` handed the whole row to any visitor.
 * Terrain and access status stay: they help people decide whether to join.
 */
function withoutCoordinationDetails<
  T extends Record<string, unknown> | null | undefined,
>(logistics: T): T {
  if (!logistics) return logistics;
  return {
    ...logistics,
    meetingPoint: null,
    meetingInstructions: null,
    emergencyPlan: null,
    operationalRoute: null,
    backupPlan: null,
    routeImageUrl: null,
  };
}

/**
 * "Friends" visibility was offered in the settings but never honoured: only
 * public profiles were ever shown, so a friend saw nothing.
 */
async function canSeeProfile(
  visibility: "public" | "friends" | "private",
  ownerId: number,
  viewerId?: number
): Promise<boolean> {
  if (visibility === "public") return true;
  if (viewerId === undefined) return false;
  if (viewerId === ownerId) return true;
  return visibility === "friends" && (await db.areFriends(ownerId, viewerId));
}

/**
 * The organizer or an accepted co-organizer. Co-organizers can edit the outing,
 * publish decisions and coordinate, yet the participant list, check-ins,
 * shared locations and booking requests checked `hostId` alone.
 */
async function isOutingManager(
  event: { id: number; hostId: number },
  userId: number
): Promise<boolean> {
  return (
    event.hostId === userId || (await db.isEventCoOrganizer(event.id, userId))
  );
}

export const hikingRouter = router({
  integrations: router({
    status: publicProcedure.query(() => outdoorIntegrations),
    myConsents: protectedProcedure.query(({ ctx }) =>
      db.listOutdoorServiceConsents(ctx.user.id)
    ),
    setConsent: protectedProcedure
      .input(outdoorServiceConsentSchema)
      .mutation(({ ctx, input }) =>
        db.setOutdoorServiceConsent(ctx.user.id, input)
      ),
  }),
  weather: router({
    routeOutlook: publicProcedure
      .input(routeWeatherSchema)
      .query(async ({ input }) => {
        if (!isWithinForecastWindow(input.startsAt))
          return {
            available: false as const,
            note: "This indicative mountain outlook is available only within the provider forecast window.",
          };
        try {
          const outlooks = await Promise.all(
            input.points.map(async point => ({
              label: point.label,
              elevationMeters: point.elevationMeters,
              ...(await fetchForecastDay({
                latitude: point.latitude,
                longitude: point.longitude,
                elevationMeters: point.elevationMeters,
                startsAt: input.startsAt,
              })),
            }))
          );
          return {
            available: true as const,
            source: "Open-Meteo",
            advisory: true,
            routePoints: outlooks,
            note: "Indicative model data sampled at a few GPX route points. Mountain conditions can differ substantially between points and change quickly; this is not an official warning, a route-opening status, or a safety assessment.",
          };
        } catch {
          return {
            available: false as const,
            note: "The indicative mountain weather source is temporarily unavailable. Check official local forecasts before departure.",
          };
        }
      }),
    outlook: publicProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        // Same guard as the other sheet panels: answering for a private
        // outing confirmed that its id existed.
        await assertEventSheetAccess(input.eventId, ctx.user?.id);
        const event = await db.getEventById(input.eventId);
        if (!event || event.latitude === null || event.longitude === null)
          return {
            available: false as const,
            note: "No weather outlook is available because this outing has no starting-point coordinates.",
          };
        if (!isWithinForecastWindow(event.startsAt))
          return {
            available: false as const,
            note: "This indicative outlook is available only within the provider forecast window.",
          };
        try {
          const forecast = await fetchForecastDay({
            latitude: event.latitude,
            longitude: event.longitude,
            startsAt: event.startsAt,
          });
          return {
            available: true as const,
            source: "Open-Meteo",
            advisory: true,
            ...forecast,
            note: "Indicative model data for the starting area only. It is not a safety assessment, warning service, or substitute for official local forecasts and on-site judgment.",
          };
        } catch {
          return {
            available: false as const,
            note: "The indicative weather source is temporarily unavailable. Check official local forecasts before departure.",
          };
        }
      }),
  }),
  reports: router({
    create: protectedProcedure
      .input(createReportSchema)
      .mutation(async ({ ctx, input }) => {
        const reportId = await db.createReport(ctx.user.id, input);
        if (!reportId)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to create report",
          });
        return { reportId };
      }),
  }),
  social: router({
    feed: publicProcedure.query(
      async () => (await db.listCommunityPosts()) ?? []
    ),
    profile: publicProcedure
      .input(socialUserIdSchema)
      .query(async ({ ctx, input }) => {
        const result = await db.getSocialProfile(input.userId);
        if (!result) return null;
        return (await canSeeProfile(
          result.profile.profileVisibility,
          input.userId,
          ctx.user?.id
        ))
          ? result
          : null;
      }),
    profileBySlug: publicProcedure
      .input(publicSlugSchema)
      .query(async ({ ctx, input }) => {
        const profile = await db.getProfileByPublicSlug(input.publicSlug);
        if (!profile) return null;
        return (await canSeeProfile(
          profile.profileVisibility,
          profile.userId,
          ctx.user?.id
        ))
          ? profile
          : null;
      }),
    members: router({
      search: publicProcedure
        .input(memberSearchSchema)
        .query(async ({ input }) => db.searchPublicProfiles(input.query)),
    }),
    react: protectedProcedure
      .input(socialPostReactionSchema)
      .mutation(async ({ ctx, input }) => {
        const result = await db.togglePostReaction(
          ctx.user.id,
          input.postId,
          input.reaction
        );
        if (!result)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This post is no longer available",
          });
        return result;
      }),
    follow: protectedProcedure
      .input(socialUserIdSchema)
      .mutation(async ({ ctx, input }) => {
        const result = await db.toggleFollow(ctx.user.id, input.userId);
        if (!result)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot follow this profile",
          });
        return result;
      }),
    friendships: router({
      list: protectedProcedure.query(async ({ ctx }) =>
        db.listFriendships(ctx.user.id)
      ),
      request: protectedProcedure
        .input(friendRequestSchema)
        .mutation(async ({ ctx, input }) => {
          const friendshipId = await db.sendFriendRequest(
            ctx.user.id,
            input.userId,
            input.note
          );
          if (!friendshipId)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot create friend request",
            });
          return { friendshipId };
        }),
      requestBySlug: protectedProcedure
        .input(friendRequestBySlugSchema)
        .mutation(async ({ ctx, input }) => {
          const profile = await db.getProfileByPublicSlug(input.publicSlug);
          if (!profile || profile.profileVisibility === "private")
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "This public profile is unavailable",
            });
          const friendshipId = await db.sendFriendRequest(
            ctx.user.id,
            profile.userId,
            input.note
          );
          if (!friendshipId)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot create friend request",
            });
          return { friendshipId, userId: profile.userId };
        }),
      respond: protectedProcedure
        .input(friendshipActionSchema)
        .mutation(async ({ ctx, input }) => {
          await db.respondToFriendship(
            input.friendshipId,
            ctx.user.id,
            input.action
          );
          return { success: true } as const;
        }),
      defer: protectedProcedure
        .input(friendshipDeferSchema)
        .mutation(async ({ ctx, input }) => {
          const deferred = await db.deferFriendship(
            input.friendshipId,
            ctx.user.id,
            input.remindAt
          );
          if (!deferred)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Friend request is unavailable",
            });
          return { success: true } as const;
        }),
      remove: protectedProcedure
        .input(friendshipRemoveSchema)
        .mutation(async ({ ctx, input }) => {
          const removed = await db.removeFriendship(
            input.friendshipId,
            ctx.user.id
          );
          if (!removed)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Friendship is unavailable",
            });
          return { success: true } as const;
        }),
    }),
    circles: router({
      list: protectedProcedure.query(async ({ ctx }) =>
        db.listActivityCircles(ctx.user.id)
      ),
      create: protectedProcedure
        .input(circleCreateSchema)
        .mutation(async ({ ctx, input }) => {
          const circleId = await db.createActivityCircle(ctx.user.id, input);
          if (!circleId)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to create circle",
            });
          return { circleId };
        }),
      addMember: protectedProcedure
        .input(circleMemberSchema)
        .mutation(async ({ ctx, input }) => {
          await db.addCircleMember(input.circleId, ctx.user.id, input.userId);
          return { success: true } as const;
        }),
    }),
    groups: router({
      list: publicProcedure.query(
        async () => (await db.listCommunityGroups()) ?? []
      ),
      nameAvailable: protectedProcedure
        .input(groupNameSchema)
        .query(async ({ input }) => ({
          available: await db.isCommunityGroupNameAvailable(input.name),
        })),
      templates: router({
        list: protectedProcedure.query(({ ctx }) =>
          db.listUserCommunityGroupTemplates(ctx.user.id)
        ),
        create: protectedProcedure
          .input(groupTemplateCreateSchema)
          .mutation(async ({ ctx, input }) => {
            const templateId = await db.createUserCommunityGroupTemplate(
              ctx.user.id,
              input
            );
            if (!templateId)
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to save group template",
              });
            return { templateId };
          }),
        delete: protectedProcedure
          .input(groupTemplateDeleteSchema)
          .mutation(async ({ ctx, input }) => {
            if (
              !(await db.deleteUserCommunityGroupTemplate(
                ctx.user.id,
                input.templateId
              ))
            )
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Group template is unavailable",
              });
            return { success: true } as const;
          }),
      }),
      create: protectedProcedure
        .input(groupCreateSchema)
        .mutation(async ({ ctx, input }) => {
          let groupId: number | undefined;
          try {
            groupId = await db.createCommunityGroup(ctx.user.id, input);
          } catch (error) {
            if (
              String(error).includes("communityGroups_name_unique") ||
              String(error).includes("Duplicate entry")
            )
              throw new TRPCError({
                code: "CONFLICT",
                message: "A group with this name already exists",
              });
            throw error;
          }
          if (!groupId)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to create group",
            });
          return { groupId };
        }),
      detail: protectedProcedure
        .input(groupIdSchema)
        .query(async ({ ctx, input }) => {
          try {
            const group = await db.getCommunityGroupDetail(
              input.groupId,
              ctx.user.id
            );
            if (!group)
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Group not found",
              });
            return group;
          } catch (error) {
            if (error instanceof TRPCError) throw error;
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This group is private or invitation-only",
            });
          }
        }),
      join: protectedProcedure
        .input(groupIdSchema)
        .mutation(async ({ ctx, input }) => {
          await db.joinCommunityGroup(input.groupId, ctx.user.id);
          return { success: true } as const;
        }),
      leave: protectedProcedure
        .input(groupIdSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await db.leaveCommunityGroup(input.groupId, ctx.user.id);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to leave this group"),
            });
          }
        }),
      invitations: protectedProcedure.query(async ({ ctx }) =>
        db.listPendingCommunityGroupInvites(ctx.user.id)
      ),
      update: protectedProcedure
        .input(groupUpdateSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.updateCommunityGroup(input.groupId, ctx.user.id, input);
          } catch (error) {
            if (
              String(error).includes("communityGroups_name_unique") ||
              String(error).includes("Duplicate entry")
            )
              throw new TRPCError({
                code: "CONFLICT",
                message: "A group with this name already exists",
              });
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You cannot edit this group",
            });
          }
          return { success: true } as const;
        }),
      delete: protectedProcedure
        .input(groupIdSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.deleteCommunityGroup(input.groupId, ctx.user.id);
          } catch {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the group owner can delete this group",
            });
          }
          return { success: true } as const;
        }),
      invite: protectedProcedure
        .input(groupInviteSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.inviteCommunityGroupMember(
              input.groupId,
              ctx.user.id,
              input.userId,
              input.message
            );
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(error, "Unable to invite this member"),
            });
          }
          return { success: true } as const;
        }),
      coAdmins: router({
        pending: protectedProcedure.query(({ ctx }) =>
          db.listPendingCommunityGroupCoAdminInvites(ctx.user.id)
        ),
        invite: protectedProcedure
          .input(groupCoAdminInviteSchema)
          .mutation(async ({ ctx, input }) => {
            try {
              return await db.inviteCommunityGroupCoAdmin(
                input.groupId,
                ctx.user.id,
                input.publicSlug
              );
            } catch (error) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: publicMessage(
                  error,
                  "Unable to invite this co-administrator"
                ),
              });
            }
          }),
        respond: protectedProcedure
          .input(groupCoAdminInviteResponseSchema)
          .mutation(async ({ ctx, input }) => {
            try {
              await db.respondToCommunityGroupCoAdminInvite(
                input.invitationId,
                ctx.user.id,
                input.accept
              );
              return { success: true } as const;
            } catch (error) {
              throw new TRPCError({
                code: "CONFLICT",
                message: publicMessage(
                  error,
                  "This invitation is no longer valid"
                ),
              });
            }
          }),
        revoke: protectedProcedure
          .input(groupCoAdminInviteRevokeSchema)
          .mutation(async ({ ctx, input }) => {
            try {
              await db.revokeCommunityGroupCoAdminInvite(
                input.invitationId,
                ctx.user.id
              );
              return { success: true } as const;
            } catch (error) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: publicMessage(
                  error,
                  "Unable to revoke this invitation"
                ),
              });
            }
          }),
      }),
      respondToInvite: protectedProcedure
        .input(groupInviteResponseSchema)
        .mutation(async ({ ctx, input }) => {
          await db.respondToCommunityGroupInvite(
            input.groupId,
            ctx.user.id,
            input.accept
          );
          return { success: true } as const;
        }),
      setMemberRole: protectedProcedure
        .input(groupMemberRoleSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.setCommunityGroupMemberRole(
              input.groupId,
              ctx.user.id,
              input.userId,
              input.role
            );
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(error, "Unable to change this role"),
            });
          }
          return { success: true } as const;
        }),
      createPost: protectedProcedure
        .input(groupPostCreateSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const postId = await db.createCommunityGroupPost(
              input.groupId,
              ctx.user.id,
              input
            );
            return { postId };
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(error, "Unable to add group content"),
            });
          }
        }),
      deletePost: protectedProcedure
        .input(groupPostDeleteSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.deleteCommunityGroupPost(
              input.groupId,
              input.postId,
              ctx.user.id
            );
          } catch {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You cannot delete this group content",
            });
          }
          return { success: true } as const;
        }),
    }),
    invitations: router({
      create: protectedProcedure
        .input(socialInviteCreateSchema)
        .mutation(async ({ ctx, input }) => {
          const invitation = await db.createSocialInvite(ctx.user.id, input);
          if (!invitation)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to create invitation",
            });
          return invitation;
        }),
      /** Public: shown on /invite/<token> before the visitor signs in. */
      preview: publicProcedure
        .input(socialInviteTokenSchema)
        .query(async ({ input }) => {
          const preview = await db.getSocialInvitePreview(input.token);
          if (!preview)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "This invitation is no longer valid",
            });
          return preview;
        }),
      accept: protectedProcedure
        .input(socialInviteTokenSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await db.acceptSocialInvite(input.token, ctx.user.id);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(
                error,
                "This invitation is no longer valid"
              ),
            });
          }
        }),
    }),
    links: router({
      connect: protectedProcedure
        .input(socialLinkSchema)
        .mutation(async ({ ctx, input }) => {
          await db.linkSocialAccount(ctx.user.id, input);
          return { success: true } as const;
        }),
    }),
  }),
  messaging: router({
    preferences: protectedProcedure.query(
      async ({ ctx }) => (await db.getMessagingPreferences(ctx.user.id)) ?? null
    ),
    updatePreferences: protectedProcedure
      .input(messagingPreferencesSchema)
      .mutation(
        async ({ ctx, input }) =>
          (await db.updateMessagingPreferences(ctx.user.id, input)) ?? null
      ),
    inbox: protectedProcedure.query(async ({ ctx }) =>
      db.listDirectConversations(ctx.user.id)
    ),
    thread: protectedProcedure
      .input(directThreadSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.getDirectThread(ctx.user.id, input.userId);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "This conversation is unavailable"),
          });
        }
      }),
    send: protectedProcedure
      .input(directMessageSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.sendDirectMessage(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unable to send this message"),
          });
        }
      }),
    block: protectedProcedure
      .input(userBlockSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await db.blockUser(ctx.user.id, input.userId);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to block this member"),
          });
        }
        return { success: true } as const;
      }),
    unblock: protectedProcedure
      .input(userBlockSchema)
      .mutation(async ({ ctx, input }) => {
        await db.unblockUser(ctx.user.id, input.userId);
        return { success: true } as const;
      }),
    blocked: protectedProcedure.query(async ({ ctx }) =>
      db.listBlockedUsers(ctx.user.id)
    ),
    group: router({
      list: protectedProcedure
        .input(groupIdSchema)
        .query(async ({ ctx, input }) => {
          try {
            return await db.listCommunityGroupMessages(
              input.groupId,
              ctx.user.id
            );
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(
                error,
                "This group discussion is unavailable"
              ),
            });
          }
        }),
      send: protectedProcedure
        .input(groupMessageSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const messageId = await db.createCommunityGroupMessage(
              input.groupId,
              ctx.user.id,
              input
            );
            return { messageId };
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(
                error,
                "Unable to send this group message"
              ),
            });
          }
        }),
      moderate: protectedProcedure
        .input(groupMessageModerationSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.moderateCommunityGroupMessage(
              input.groupId,
              input.messageId,
              ctx.user.id,
              input.moderationStatus
            );
            return { success: true } as const;
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(
                error,
                "Unable to moderate this group message"
              ),
            });
          }
        }),
    }),
  }),
  marketplace: router({
    guide: router({
      mine: protectedProcedure.query(
        async ({ ctx }) =>
          (await db.getOrCreateGuideProfile(ctx.user.id)) ?? null
      ),
      update: protectedProcedure
        .input(guideProfileSchema)
        .mutation(async ({ ctx, input }) => {
          const guide = await db.updateGuideProfile(ctx.user.id, input);
          if (!guide)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to update guide profile",
            });
          return guide;
        }),
    }),
    organizers: router({
      bySlug: publicProcedure
        .input(publicSlugSchema)
        .query(
          async ({ input }) =>
            (await db.getOrganizerProfileByPublicSlug(input.publicSlug)) ?? null
        ),
    }),
    preferences: router({
      mine: protectedProcedure.query(
        async ({ ctx }) =>
          (await db.getOrCreateHikerPreferences(ctx.user.id)) ?? null
      ),
      update: protectedProcedure
        .input(hikerPreferencesSchema)
        .mutation(async ({ ctx, input }) => {
          const preferences = await db.updateHikerPreferences(
            ctx.user.id,
            input
          );
          if (!preferences)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to update preferences",
            });
          return preferences;
        }),
    }),
    matches: protectedProcedure.query(async ({ ctx }) =>
      db.getHikerMatches(ctx.user.id)
    ),
    bookings: router({
      request: protectedProcedure
        .input(bookingRequestSchema)
        .mutation(async ({ ctx, input }) => {
          const event = await db.getEventById(input.eventId);
          if (!event)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Event not found",
            });
          assertJoinable(event, ctx.user.id);
          let requestId: number | undefined;
          try {
            requestId = await db.createBookingRequest(ctx.user.id, input);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to request this outing"),
            });
          }
          if (!requestId)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Unable to request this outing",
            });
          return { requestId };
        }),
      list: protectedProcedure
        .input(eventIdSchema)
        .query(async ({ ctx, input }) => {
          const event = await db.getEventById(input.eventId);
          if (!event || !(await isOutingManager(event, ctx.user.id)))
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the organizing team can access booking requests",
            });
          return db.listBookingRequests(input.eventId);
        }),
      decide: protectedProcedure
        .input(bookingDecisionSchema)
        .mutation(async ({ ctx, input }) => {
          const request = await db.decideBookingRequest(
            input.requestId,
            ctx.user.id,
            input.status,
            input.levelExceptionDecisionNote
          );
          if (!request)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Booking request not found",
            });
          return { success: true } as const;
        }),
    }),
    logistics: router({
      detail: protectedProcedure
        .input(eventIdSchema)
        .query(async ({ ctx, input }) => {
          if (!(await db.canViewEventCoordination(input.eventId, ctx.user.id)))
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Only confirmed participants and the organizing team can view coordination details",
            });
          return {
            logistics: await db.getEventLogistics(input.eventId),
            carpool: await db.listCarpoolOffers(input.eventId),
            reservations: await db.listCarpoolSeatReservations(
              input.eventId,
              ctx.user.id
            ),
          };
        }),
      update: protectedProcedure
        .input(eventLogisticsSchema)
        .mutation(async ({ ctx, input }) => {
          const logistics = await db.updateEventLogistics(ctx.user.id, input);
          if (!logistics)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to update logistics",
            });
          return logistics;
        }),
      offerCarpool: protectedProcedure
        .input(carpoolOfferSchema)
        .mutation(async ({ ctx, input }) => {
          let offerId: number | undefined;
          try {
            offerId = await db.createCarpoolOffer(ctx.user.id, input);
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(
                error,
                "Unable to offer a ride on this outing"
              ),
            });
          }
          if (!offerId)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to create carpool offer",
            });
          return { offerId };
        }),
      updateCarpool: protectedProcedure
        .input(carpoolUpdateSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await db.updateCarpoolOffer(ctx.user.id, input);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to update carpool offer"),
            });
          }
        }),
      requestSeat: protectedProcedure
        .input(carpoolSeatReservationSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const reservationId = await db.requestCarpoolSeat(
              ctx.user.id,
              input
            );
            if (!reservationId)
              throw new DomainError("Unable to request a carpool seat");
            return { reservationId };
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to request a carpool seat"),
            });
          }
        }),
      decideSeat: protectedProcedure
        .input(carpoolSeatDecisionSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const decision = await db.decideCarpoolSeatReservation(
              ctx.user.id,
              input
            );
            if (!decision)
              throw new DomainError("Unable to decide the carpool request");
            return decision;
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(
                error,
                "Unable to decide the carpool request"
              ),
            });
          }
        }),
      removePassenger: protectedProcedure
        .input(carpoolSeatRemovalSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const result = await db.removeCarpoolPassenger(ctx.user.id, input);
            if (!result)
              throw new DomainError("Unable to remove this passenger");
            return result;
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to remove this passenger"),
            });
          }
        }),
      withdrawCarpool: protectedProcedure
        .input(carpoolWithdrawalSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            const result = await db.withdrawCarpoolOffer(ctx.user.id, input);
            if (!result) throw new DomainError("Unable to withdraw this ride");
            return result;
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to withdraw this ride"),
            });
          }
        }),
      carpoolRecovery: protectedProcedure
        .input(eventIdSchema)
        .query(async ({ ctx, input }) => {
          try {
            return await db.getCarpoolRecovery(input.eventId, ctx.user.id);
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(error, "Unavailable"),
            });
          }
        }),
      hubs: protectedProcedure
        .input(eventIdSchema)
        .query(async ({ ctx, input }) => {
          try {
            return await db.listEventCarpoolHubs(input.eventId, ctx.user.id);
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(error, "Unavailable"),
            });
          }
        }),
      createHub: protectedProcedure
        .input(eventCarpoolHubSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return {
              hubId: await db.createEventCarpoolHub(ctx.user.id, input),
            };
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to create meeting hub"),
            });
          }
        }),
      deleteHub: protectedProcedure
        .input(eventCarpoolHubDeleteSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.deleteEventCarpoolHub(
              ctx.user.id,
              input.eventId,
              input.hubId
            );
            return { success: true } as const;
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to remove meeting hub"),
            });
          }
        }),
    }),
  }),
  safety: router({
    consent: protectedProcedure.query(
      async ({ ctx }) => (await db.getSafetyConsent(ctx.user.id)) ?? null
    ),
    saveConsent: protectedProcedure
      .input(safetyConsentSchema)
      .mutation(async ({ ctx, input }) => {
        const consent = await db.saveSafetyConsent(ctx.user.id, input);
        if (!consent)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to save safety consent",
          });
        return consent;
      }),
    checkIns: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Outing not found",
          });
        if (!(await isOutingManager(event, ctx.user.id))) return [];
        return db.listSafetyCheckIns(input.eventId);
      }),
    checkIn: protectedProcedure
      .input(safetyCheckInSchema)
      .mutation(async ({ ctx, input }) => {
        const event = await db.getEventById(input.eventId);
        const participation = await db.getEventParticipation(
          input.eventId,
          ctx.user.id
        );
        if (
          !event ||
          (event.hostId !== ctx.user.id && participation?.status !== "going")
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only confirmed participants can check in for this outing",
          });
        const checkInId = await db.createSafetyCheckIn(ctx.user.id, input);
        if (!checkInId)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to save safety check-in",
          });
        return { checkInId };
      }),
    shareLocation: protectedProcedure
      .input(liveLocationShareSchema)
      .mutation(async ({ ctx, input }) => {
        const consent = await db.getSafetyConsent(ctx.user.id);
        if (!consent?.locationSharingEnabled)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Location sharing requires explicit consent",
          });
        const participantIds = await db.getEventParticipantUserIds(
          input.eventId
        );
        if (!participantIds.includes(ctx.user.id))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only confirmed participants can share a location",
          });
        const location = await db.saveLiveLocation(ctx.user.id, input);
        if (!location)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to save location",
          });
        return location;
      }),
    stopLocation: protectedProcedure
      .input(liveLocationStopSchema)
      .mutation(async ({ ctx, input }) => {
        await db.stopLiveLocation(ctx.user.id, input.eventId);
        return { success: true } as const;
      }),
    myLocationShare: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) =>
        db.getMyLiveLocationShare(ctx.user.id, input.eventId)
      ),
    liveLocations: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event || !(await isOutingManager(event, ctx.user.id)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the organizing team can view shared locations",
          });
        return db.listActiveLiveLocations(input.eventId);
      }),
  }),
  admin: router({
    dashboard: adminProcedure.query(() => db.getAdminDashboardStats()),
    settings: adminProcedure.query(() => db.getOrCreateSiteSettings()),
    users: adminProcedure.query(() => db.listAdminUsers()),
    events: adminProcedure.query(() => db.listAdminEvents()),
    posts: adminProcedure.query(() => db.listAdminPosts()),
    reports: adminProcedure.query(() => db.listAdminReports()),
    guides: adminProcedure.query(() => db.listGuideProfilesForAdmin()),
    reviewGuide: adminProcedure
      .input(adminGuideReviewSchema)
      .mutation(async ({ ctx, input }) => {
        if (input.status === "approved" && !input.insuranceConfirmed)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insurance attestation is required to approve a guide",
          });
        const guide = await db.reviewGuideProfile(
          ctx.user.id,
          input.userId,
          input.status,
          input.insuranceConfirmed
        );
        if (!guide)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Guide profile not found",
          });
        return guide;
      }),
    updateUserStatus: adminProcedure
      .input(adminUserStatusSchema)
      .mutation(async ({ ctx, input }) => {
        const target = await db.getUserById(input.userId);
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (target.id === ctx.user.id || target.role === "admin")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Administrator accounts cannot be moderated here",
          });
        await db.updateAdminUserStatus(
          input.userId,
          input.accountStatus,
          input.note
        );
        await db.createModerationAction(ctx.user.id, {
          targetType: "user",
          targetId: input.userId,
          action:
            input.accountStatus === "banned"
              ? "ban"
              : input.accountStatus === "suspended"
                ? "suspend"
                : "restore",
          note: input.note,
        });
        return { success: true } as const;
      }),
    moderateContent: adminProcedure
      .input(adminContentModerationSchema)
      .mutation(async ({ ctx, input }) => {
        await db.updateContentModeration(
          input.targetType,
          input.targetId,
          input.moderationStatus,
          input.messageChannel
        );
        await db.createModerationAction(ctx.user.id, {
          targetType: input.targetType,
          targetId: input.targetId,
          action:
            input.moderationStatus === "hidden"
              ? "hide"
              : input.moderationStatus === "under_review"
                ? "review"
                : "restore",
          note: input.note,
        });
        return { success: true } as const;
      }),
    updateReport: adminProcedure
      .input(adminReportStatusSchema)
      .mutation(async ({ ctx, input }) => {
        const report = await db.updateAdminReport(
          input.reportId,
          ctx.user.id,
          input.status,
          input.resolutionNote
        );
        if (!report)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Report not found",
          });
        // Logged against what was reported. It used to be recorded as a
        // "message" whose id was the report's, pointing at an unrelated row.
        await db.createModerationAction(ctx.user.id, {
          targetType: report.targetType,
          targetId: report.targetId,
          action: "resolve_report",
          note: input.resolutionNote,
        });
        return { success: true } as const;
      }),
    updateSettings: adminProcedure
      .input(adminSiteSettingsSchema)
      .mutation(async ({ input }) => {
        const settings = await db.updateSiteSettings(input);
        if (!settings)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to update site settings",
          });
        return settings;
      }),
  }),
  events: router({
    series: router({
      mine: protectedProcedure.query(({ ctx }) =>
        db.listMyEventSeries(ctx.user.id)
      ),
      byEvent: protectedProcedure
        .input(eventIdSchema)
        .query(
          async ({ ctx, input }) =>
            (await db.getEventSeriesForEvent(input.eventId, ctx.user.id)) ??
            null
        ),
      create: protectedProcedure
        .input(eventSeriesCreateSchema)
        .mutation(async ({ ctx, input }) => ({
          seriesId: await db.createEventSeries(ctx.user.id, input),
        })),
      toggleInterest: protectedProcedure
        .input(eventSeriesIdSchema)
        .mutation(async ({ ctx, input }) =>
          db.toggleEventSeriesInterest(ctx.user.id, input.seriesId)
        ),
      relaunchCandidates: protectedProcedure
        .input(eventIdSchema)
        .query(({ ctx, input }) =>
          db.listRelaunchCandidates(input.eventId, ctx.user.id)
        ),
      relaunch: protectedProcedure
        .input(eventSeriesRelaunchSchema)
        .mutation(async ({ ctx, input }) =>
          db.sendEventRelaunchInvites(ctx.user.id, input)
        ),
    }),
    list: publicProcedure.input(eventListSchema.optional()).query(
      async ({ input }) =>
        (await db.listPublishedEvents(input?.offset, input?.limit)) ?? {
          items: [],
          nextOffset: null,
        }
    ),
    mine: protectedProcedure.query(async ({ ctx }) =>
      db.listMyOutings(ctx.user.id)
    ),
    coOrganizers: router({
      pending: protectedProcedure.query(async ({ ctx }) =>
        db.listPendingEventCoOrganizerInvites(ctx.user.id)
      ),
      sent: protectedProcedure
        .input(eventIdSchema)
        .query(async ({ ctx, input }) =>
          db.listSentEventCoOrganizerInvites(input.eventId, ctx.user.id)
        ),
      invite: protectedProcedure
        .input(coOrganizerInviteSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await db.inviteEventCoOrganizer(
              input.eventId,
              ctx.user.id,
              input.publicSlug
            );
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to invite co-organizer"),
            });
          }
        }),
      respond: protectedProcedure
        .input(coOrganizerInviteResponseSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await db.respondToEventCoOrganizerInvite(
              input.invitationId,
              ctx.user.id,
              input.accept
            );
          } catch (error) {
            throw new TRPCError({
              code: "CONFLICT",
              message: publicMessage(error, "Invitation is unavailable"),
            });
          }
        }),
      revoke: protectedProcedure
        .input(coOrganizerInviteRevokeSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.revokeEventCoOrganizerInvite(
              input.invitationId,
              ctx.user.id
            );
            return { success: true } as const;
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to revoke invitation"),
            });
          }
        }),
    }),
    preparation: router({
      detail: protectedProcedure
        .input(eventIdSchema)
        .query(async ({ ctx, input }) => {
          const event = await db.getEventById(input.eventId);
          if (!event)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Outing not found",
            });
          const participation = await db.getEventParticipation(
            input.eventId,
            ctx.user.id
          );
          if (event.hostId !== ctx.user.id && participation?.status !== "going")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Join the outing before accessing preparation",
            });
          return (
            (await db.getEventPreparationState(input.eventId, ctx.user.id)) ??
            null
          );
        }),
      checklistProgress: protectedProcedure
        .input(eventIdSchema)
        .query(async ({ ctx, input }) => {
          const event = await db.getEventById(input.eventId);
          if (!event)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Outing not found",
            });
          const participation = await db.getEventParticipation(
            input.eventId,
            ctx.user.id
          );
          if (event.hostId !== ctx.user.id && participation?.status !== "going")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Join the outing before accessing checklist progress",
            });
          return db.listParticipantPackingItems(input.eventId, ctx.user.id);
        }),
      updateChecklistItem: protectedProcedure
        .input(participantPackingItemSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await db.updateParticipantPackingItem(ctx.user.id, input);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to update checklist item"),
            });
          }
        }),
      packingSummary: protectedProcedure
        .input(eventIdSchema)
        .query(async ({ ctx, input }) => {
          try {
            return await db.getEventPackingProgressSummary(
              input.eventId,
              ctx.user.id
            );
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: publicMessage(
                error,
                "Unable to access checklist summary"
              ),
            });
          }
        }),
      addPackingItem: protectedProcedure
        .input(eventPackingItemCreateSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return {
              itemId: await db.createEventPackingItem(
                input.eventId,
                ctx.user.id,
                input
              ),
            };
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to add checklist item"),
            });
          }
        }),
      updatePackingItem: protectedProcedure
        .input(eventPackingItemUpdateSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await db.updateEventPackingItem(
              input.eventId,
              ctx.user.id,
              input
            );
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to update checklist item"),
            });
          }
        }),
      deletePackingItem: protectedProcedure
        .input(eventPackingItemDeleteSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            await db.deleteEventPackingItem(
              input.eventId,
              input.itemId,
              ctx.user.id
            );
            return { success: true } as const;
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to remove checklist item"),
            });
          }
        }),
      update: protectedProcedure
        .input(eventPreparationUpdateSchema)
        .mutation(async ({ ctx, input }) => {
          const event = await db.getEventById(input.eventId);
          if (!event)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Outing not found",
            });
          const participation = await db.getEventParticipation(
            input.eventId,
            ctx.user.id
          );
          if (event.hostId !== ctx.user.id && participation?.status !== "going")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Join the outing before updating preparation",
            });
          return db.updateEventPreparationState(ctx.user.id, input);
        }),
      passport: protectedProcedure.query(async ({ ctx }) =>
        db.listMyPreparationPassportEntries(ctx.user.id)
      ),
      savePassport: protectedProcedure
        .input(preparationPassportEntrySchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await db.savePreparationPassportEntry(ctx.user.id, input);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(
                error,
                "Unable to save this private reflection"
              ),
            });
          }
        }),
    }),
    search: publicProcedure.input(eventSearchSchema).query(
      async ({ input }) =>
        (await db.searchPublishedEvents(input)) ?? {
          items: [],
          nextOffset: null,
        }
    ),
    detail: publicProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        const event = await db.getEventDetail(input.eventId);
        if (!event)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        const participation = ctx.user
          ? await db.getEventParticipation(input.eventId, ctx.user.id)
          : undefined;
        const bookingRequest =
          ctx.user && !participation
            ? await db.getBookingRequestForEvent(input.eventId, ctx.user.id)
            : undefined;
        const isCoOrganizer =
          ctx.user && event.hostId !== ctx.user.id
            ? await db.isEventCoOrganizer(input.eventId, ctx.user.id)
            : false;
        const managementRole =
          event.hostId === ctx.user?.id
            ? "host"
            : isCoOrganizer
              ? "co_organizer"
              : null;
        const isAttached =
          Boolean(managementRole) ||
          participation?.status === "going" ||
          participation?.status === "waitlist" ||
          bookingRequest?.status === "pending";
        if (
          (event.visibility === "private" || event.visibility === "invite") &&
          !isAttached
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This outing is shared with its participants only",
          });
        // A draft, a cancelled outing or one an administrator hid stays out of
        // the listings, but the sheet used to remain readable through a direct
        // `?event=<id>` link, which made moderation cosmetic. Only people
        // already attached to the outing keep access to it. A completed public
        // outing stays readable: recaps and organizer pages link to it.
        if (
          !isAttached &&
          ((event.status !== "published" && event.status !== "completed") ||
            event.moderationStatus !== "visible")
        )
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        const seesCoordination =
          Boolean(managementRole) || participation?.status === "going";
        return {
          ...event,
          logistics: seesCoordination
            ? event.logistics
            : withoutCoordinationDetails(event.logistics),
          participationStatus:
            participation?.status ??
            (bookingRequest?.status === "pending" ? "pending" : undefined),
          checkedInAt: participation?.checkedInAt ?? null,
          preparationReadyAt: participation?.preparationReadyAt ?? null,
          levelAcknowledgedAt: participation?.levelAcknowledgedAt ?? null,
          levelExceptionStatus: participation?.levelExceptionStatus ?? null,
          levelExceptionDecisionNote:
            participation?.levelExceptionDecisionNote ?? null,
          managementRole,
        };
      }),
    create: protectedProcedure
      .input(eventCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getOrCreateSiteSettings();
        const eventId = await db.createHikingEvent(ctx.user.id, {
          ...input,
          requiresApproval:
            input.requiresApproval || settings?.requireEventApproval || false,
        });
        if (!eventId)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to create event",
          });
        return { eventId };
      }),
    update: protectedProcedure
      .input(eventUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await db.updateHikingEvent(input.eventId, ctx.user.id, input);
          return { success: true } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to update outing"),
          });
        }
      }),
    updateManualRoute: protectedProcedure
      .input(eventManualRouteUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { eventId, ...route } = input;
        try {
          return await db.updateEventManualRoute(eventId, ctx.user.id, route);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to update manual route"),
          });
        }
      }),
    updateCoverFocalPoint: protectedProcedure
      .input(eventCoverFocalPointSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.updateEventCoverFocalPoint(
            input.eventId,
            ctx.user.id,
            input.focalX,
            input.focalY
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to update cover focal point"),
          });
        }
      }),
    setLocalWeatherSource: protectedProcedure
      .input(localWeatherSourceSchema)
      .mutation(async ({ ctx, input }) => {
        const { eventId, ...source } = input;
        try {
          return await db.setLocalWeatherSource(eventId, ctx.user.id, source);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to update local weather source"
            ),
          });
        }
      }),
    publishWeatherUpdate: protectedProcedure
      .input(weatherUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.publishWeatherUpdate(
            input.eventId,
            ctx.user.id,
            input.note
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to publish weather update"),
          });
        }
      }),
    weatherUpdates: publicProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        await assertEventSheetAccess(input.eventId, ctx.user?.id);
        return db.listWeatherUpdates(input.eventId, ctx.user?.id);
      }),
    acknowledgeWeatherUpdate: protectedProcedure
      .input(weatherUpdateAcknowledgementSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.acknowledgeWeatherUpdate(
            input.eventId,
            input.weatherUpdateId,
            ctx.user.id
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to acknowledge weather update"
            ),
          });
        }
      }),
    departureReadiness: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.getDepartureReadiness(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    conditionReports: publicProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        await assertEventSheetAccess(input.eventId, ctx.user?.id);
        return db.listEventConditionReports(input.eventId);
      }),
    actionAssignments: publicProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        await assertEventSheetAccess(input.eventId, ctx.user?.id);
        return db.listEventActionAssignments(input.eventId);
      }),
    setActionAssignment: protectedProcedure
      .input(eventActionAssignmentSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.setEventActionAssignment(
            input.eventId,
            ctx.user.id,
            input.action,
            input.assigneeId
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to assign coordination responsibility"
            ),
          });
        }
      }),
    routePlanHistory: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.listEventRoutePlanHistory(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    dayOfBriefComparison: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.getDayOfBriefComparison(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    operationalDecisions: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.listOperationalDecisions(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    publishOperationalDecision: protectedProcedure
      .input(eventOperationalDecisionSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return {
            decisionId: await db.publishOperationalDecision(ctx.user.id, input),
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to publish this decision"),
          });
        }
      }),
    acknowledgeOperationalDecision: protectedProcedure
      .input(eventOperationalDecisionAcknowledgementSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.acknowledgeOperationalDecision(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to acknowledge this decision"
            ),
          });
        }
      }),
    accessRadar: publicProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        await assertEventSheetAccess(input.eventId, ctx.user?.id);
        return db.listEventAccessRadar(input.eventId);
      }),
    createAccessRadarEntry: protectedProcedure
      .input(eventAccessRadarEntrySchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return {
            entryId: await db.createEventAccessRadarEntry(ctx.user.id, input),
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to save this access source"),
          });
        }
      }),
    deleteAccessRadarEntry: protectedProcedure
      .input(eventAccessRadarEntryDeleteSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await db.deleteEventAccessRadarEntry(
            ctx.user.id,
            input.eventId,
            input.entryId
          );
          return { success: true } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to remove this access source"
            ),
          });
        }
      }),
    paceGroups: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.listEventPaceGroups(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    createPaceGroup: protectedProcedure
      .input(eventPaceGroupSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return { groupId: await db.createEventPaceGroup(ctx.user.id, input) };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to create pace group"),
          });
        }
      }),
    deletePaceGroup: protectedProcedure
      .input(eventPaceGroupDeleteSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await db.deleteEventPaceGroup(
            ctx.user.id,
            input.eventId,
            input.groupId
          );
          return { success: true } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to remove pace group"),
          });
        }
      }),
    selectPaceGroup: protectedProcedure
      .input(eventPaceGroupAssignmentSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.selectEventPaceGroup(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to select pace group"),
          });
        }
      }),
    dateOptions: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.listEventDateOptions(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    createDateOption: protectedProcedure
      .input(eventDateOptionSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return {
            optionId: await db.createEventDateOption(ctx.user.id, input),
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to add a date option"),
          });
        }
      }),
    publishDateOption: protectedProcedure
      .input(eventDateOptionPublishSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await db.publishEventFromDateOption(
            ctx.user.id,
            input
          );
          if (!result)
            throw new DomainError("Unable to publish this alternate date");
          return result;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to publish this alternate date"
            ),
          });
        }
      }),
    invitationTemplates: protectedProcedure.query(({ ctx }) =>
      db.listInvitationTemplates(ctx.user.id)
    ),
    createInvitationTemplate: protectedProcedure
      .input(invitationTemplateSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return {
            templateId: await db.createInvitationTemplate(ctx.user.id, input),
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to save this invitation template"
            ),
          });
        }
      }),
    deleteInvitationTemplate: protectedProcedure
      .input(invitationTemplateDeleteSchema)
      .mutation(async ({ ctx, input }) => ({
        deleted: await db.deleteInvitationTemplate(ctx.user.id, input),
      })),
    invitationShareStats: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.getEventInvitationShareStats(
            input.eventId,
            ctx.user.id
          );
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    recordInvitationShare: protectedProcedure
      .input(eventInvitationShareSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.recordEventInvitationShare(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(
              error,
              "Unable to record this manual action"
            ),
          });
        }
      }),
    updateDateAvailability: protectedProcedure
      .input(eventDateAvailabilitySchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.updateEventDateAvailability(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to update availability"),
          });
        }
      }),
    postOutingSignals: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.getPostOutingSignals(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    dayOfBriefReadStatus: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await db.getDayOfBriefAcknowledgementStatus(
            input.eventId,
            ctx.user.id
          );
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: publicMessage(error, "Unavailable"),
          });
        }
      }),
    acknowledgeDayOfBrief: protectedProcedure
      .input(dayOfBriefAcknowledgeSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.acknowledgeDayOfBrief(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to acknowledge the day-of brief"
            ),
          });
        }
      }),
    terrainLandmarks: publicProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        await assertEventSheetAccess(input.eventId, ctx.user?.id);
        return db.listEventTerrainLandmarks(input.eventId);
      }),
    createTerrainLandmark: protectedProcedure
      .input(eventTerrainLandmarkSchema)
      .mutation(async ({ ctx, input }) => {
        const { eventId, ...landmark } = input;
        try {
          return {
            landmarkId: await db.createEventTerrainLandmark(
              eventId,
              ctx.user.id,
              landmark
            ),
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to create terrain landmark"),
          });
        }
      }),
    updateTerrainLandmark: protectedProcedure
      .input(eventTerrainLandmarkUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { eventId, landmarkId, ...landmark } = input;
        try {
          await db.updateEventTerrainLandmark(
            eventId,
            landmarkId,
            ctx.user.id,
            landmark
          );
          return { success: true } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to update terrain landmark"),
          });
        }
      }),
    deleteTerrainLandmark: protectedProcedure
      .input(eventTerrainLandmarkDeleteSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await db.deleteEventTerrainLandmark(
            input.eventId,
            input.landmarkId,
            ctx.user.id
          );
          return { success: true } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to remove terrain landmark"),
          });
        }
      }),
    createConditionReport: protectedProcedure
      .input(eventConditionReportSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const reportId = await db.createEventConditionReport(
            input.eventId,
            ctx.user.id,
            input.category,
            input.note
          );
          return { reportId };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to submit condition report"),
          });
        }
      }),
    cancel: protectedProcedure
      .input(eventIdSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await db.cancelHikingEvent(input.eventId, ctx.user.id);
          return { success: true } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to cancel outing"),
          });
        }
      }),
    join: protectedProcedure
      .input(eventJoinSchema)
      .mutation(async ({ ctx, input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        // Idempotent for someone already holding a place or a request: a
        // double-click or a network retry on a now-full outing used to fall
        // through to the waitlist branch and demote a confirmed participant.
        const [participation, bookingRequest] = await Promise.all([
          db.getEventParticipation(input.eventId, ctx.user.id),
          db.getBookingRequestForEvent(input.eventId, ctx.user.id),
        ]);
        if (
          participation?.status === "going" ||
          participation?.status === "waitlist" ||
          participation?.status === "pending"
        )
          return { status: participation.status };
        if (bookingRequest?.status === "pending")
          return { status: "pending" as const };
        assertJoinable(event, ctx.user.id);
        const levelPolicy = event.levelAdmissionPolicy ?? "declarative";
        if (
          levelPolicy !== "declarative" &&
          !input.levelAcknowledged &&
          !input.levelExceptionNote
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Confirm the required level or request a documented exception",
          });
        const participantCount = await db.getParticipantCount(input.eventId);
        if (participantCount >= event.capacity) {
          try {
            if (input.levelAcknowledged || input.levelExceptionNote)
              await db.joinEvent(input.eventId, ctx.user.id, "waitlist", input);
            else await db.joinEvent(input.eventId, ctx.user.id, "waitlist");
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to join the waitlist"),
            });
          }
          await db.createUserNotification(ctx.user.id, {
            type: "registration",
            title: "Liste d’attente",
            body: `${event.title} · vous serez informé si une place se libère.`,
            actionPath: "/?view=my-outings",
          });
          return { status: "waitlist" as const };
        }
        const needsReview =
          event.requiresApproval ||
          levelPolicy === "organizer_review" ||
          Boolean(input.levelExceptionNote);
        if (needsReview) {
          try {
            await db.createBookingRequest(ctx.user.id, input);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(
                error,
                "Unable to send the participation request"
              ),
            });
          }
        } else {
          try {
            if (input.levelAcknowledged || input.levelExceptionNote)
              await db.joinEvent(input.eventId, ctx.user.id, "going", input);
            else await db.joinEvent(input.eventId, ctx.user.id, "going");
          } catch (error) {
            if (error instanceof Error && error.message === "EVENT_FULL") {
              try {
                if (input.levelAcknowledged || input.levelExceptionNote)
                  await db.joinEvent(
                    input.eventId,
                    ctx.user.id,
                    "waitlist",
                    input
                  );
                else await db.joinEvent(input.eventId, ctx.user.id, "waitlist");
              } catch (waitlistError) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: publicMessage(
                    waitlistError,
                    "Unable to join the waitlist"
                  ),
                });
              }
              await db.createUserNotification(ctx.user.id, {
                type: "registration",
                title: "Liste d’attente",
                body: `${event.title} · vous serez informé si une place se libère.`,
                actionPath: "/?view=my-outings",
              });
              return { status: "waitlist" as const };
            }
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: publicMessage(error, "Unable to confirm participation"),
            });
          }
        }
        const status = needsReview ? "pending" : "going";
        await db.createUserNotification(ctx.user.id, {
          type: "registration",
          title:
            status === "going" ? "Participation confirmée" : "Demande envoyée",
          body: `${event.title} · ${event.locationName}`,
          actionPath: "/",
        });
        return { status };
      }),
    /**
     * Counterpart to `join`: withdraw from an outing, or take back a pending
     * application. Without it a participant was locked in and had to ask the
     * organizer to remove them by hand.
     */
    leave: protectedProcedure
      .input(eventIdSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.leaveEvent(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to withdraw from this outing"
            ),
          });
        }
      }),
    participants: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        if (!(await isOutingManager(event, ctx.user.id)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the organizing team can access participants",
          });
        return db.listEventParticipants(input.eventId);
      }),
    myWaitlistOffer: protectedProcedure
      .input(eventIdSchema)
      .query(({ ctx, input }) =>
        db.getMyWaitlistOffer(input.eventId, ctx.user.id)
      ),
    checkIn: protectedProcedure
      .input(participantCheckInSchema)
      .mutation(async ({ ctx, input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        if (!(await isOutingManager(event, ctx.user.id)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the organizing team can check in participants",
          });
        await db.checkInParticipant(input.eventId, input.participantId);
        return { success: true } as const;
      }),
    manageParticipant: protectedProcedure
      .input(organizerParticipantActionSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.manageEventParticipant(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to manage this participant"),
          });
        }
      }),
    setPreparationReady: protectedProcedure
      .input(participantReadinessSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.setParticipantPreparationReady(
            input.eventId,
            ctx.user.id,
            input.isReady
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to update preparation status"
            ),
          });
        }
      }),
    promoteWaitlist: protectedProcedure
      .input(waitlistPromotionSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.promoteWaitlistedParticipant(
            input.eventId,
            ctx.user.id,
            input.participantId
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to promote waitlisted participant"
            ),
          });
        }
      }),
    offerWaitlistPlace: protectedProcedure
      .input(waitlistOfferSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.offerWaitlistedParticipant(
            input.eventId,
            ctx.user.id,
            input.participantId,
            input.responseWindowHours
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to offer a waitlist place"),
          });
        }
      }),
    acceptWaitlistPlace: protectedProcedure
      .input(waitlistOfferResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.acceptWaitlistOffer(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to accept this waitlist place"
            ),
          });
        }
      }),
    declineWaitlistPlace: protectedProcedure
      .input(waitlistOfferResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.declineWaitlistOffer(input.eventId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(
              error,
              "Unable to decline this waitlist place"
            ),
          });
        }
      }),
  }),
  community: router({
    feed: publicProcedure.query(
      async () => (await db.listCommunityPosts()) ?? []
    ),
    createPost: protectedProcedure
      .input(postCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getOrCreateSiteSettings();
        if (settings && !settings.communityPostingEnabled)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Community posting is temporarily disabled",
          });
        if (input.postType === "outing_recap" && input.eventId) {
          const event = await db.getEventById(input.eventId);
          const participation = await db.getEventParticipation(
            input.eventId,
            ctx.user.id
          );
          if (
            !event ||
            (event.hostId !== ctx.user.id && participation?.status !== "going")
          )
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Only confirmed participants can publish an outing recap",
            });
        }
        const postId = await db.createCommunityPost(ctx.user.id, input);
        if (!postId)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to create post",
          });
        return { postId };
      }),
    messages: protectedProcedure
      .input(eventIdSchema)
      .query(async ({ ctx, input }) => {
        if (!(await db.canViewEventCoordination(input.eventId, ctx.user.id)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only confirmed participants and the organizing team can read this chat",
          });
        return (await db.listEventMessages(input.eventId)) ?? [];
      }),
    sendMessage: protectedProcedure
      .input(messageCreateSchema)
      .mutation(async ({ ctx, input }) => {
        if (!(await db.canViewEventCoordination(input.eventId, ctx.user.id)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only confirmed participants and the organizing team can post to this chat",
          });
        const messageId = await db.createEventMessage(
          input.eventId,
          ctx.user.id,
          input.content
        );
        if (!messageId)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to send message",
          });
        const recipients = await db.getEventChatAudienceUserIds(input.eventId);
        await Promise.all(
          recipients
            .filter(userId => userId !== ctx.user.id)
            .map(userId =>
              db.createUserNotification(
                userId,
                {
                  type: "group_message",
                  title: "Nouveau message de groupe",
                  body: input.content.slice(0, 160),
                  actionPath: `/?event=${input.eventId}`,
                },
                // One unread notice per outing chat, not one per message.
                { collapseUnread: true }
              )
            )
        );
        return { messageId };
      }),
    pinMessage: protectedProcedure
      .input(eventMessagePinSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.setEventMessagePinned(
            input.eventId,
            input.messageId,
            ctx.user.id,
            input.isPinned
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to update pinned message"),
          });
        }
      }),
  }),
  profile: router({
    mine: protectedProcedure.query(
      async ({ ctx }) => (await db.getOrCreateProfile(ctx.user.id)) ?? null
    ),
    deletionStatus: protectedProcedure.query(
      async ({ ctx }) =>
        (await db.getAccountDeletionStatus(ctx.user.id)) ?? null
    ),
    requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        return await db.requestAccountDeletion(ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: publicMessage(error, "Unable to schedule account deletion"),
        });
      }
    }),
    cancelDeletion: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        await db.cancelAccountDeletion(ctx.user.id);
        return { success: true } as const;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: publicMessage(error, "Unable to cancel account deletion"),
        });
      }
    }),
    update: protectedProcedure
      .input(profileUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const profile = await db.updateProfile(ctx.user.id, input);
        if (!profile)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to update profile",
          });
        return profile;
      }),
  }),
  notifications: router({
    list: protectedProcedure.query(
      async ({ ctx }) => (await db.listUserNotifications(ctx.user.id)) ?? []
    ),
    markRead: protectedProcedure
      .input(notificationIdSchema)
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationRead(ctx.user.id, input.notificationId);
        return { success: true } as const;
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true } as const;
    }),
    preferences: protectedProcedure.query(
      async ({ ctx }) =>
        (await db.getOrCreateNotificationPreferences(ctx.user.id)) ?? null
    ),
    updatePreferences: protectedProcedure
      .input(notificationPreferencesSchema)
      .mutation(async ({ ctx, input }) => {
        const preferences = await db.updateNotificationPreferences(
          ctx.user.id,
          input
        );
        if (!preferences)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to update notification preferences",
          });
        return preferences;
      }),
  }),
  tracks: router({
    upload: protectedProcedure
      .input(trackUploadSchema)
      .mutation(async ({ ctx, input }) => {
        const uploaded = await db.uploadRouteTrack(
          ctx.user.id,
          input.filename,
          input.mimeType,
          input.contentBase64
        );
        return { url: uploaded.url, key: uploaded.key };
      }),
  }),
  media: router({
    uploadImage: protectedProcedure
      .input(imageUploadSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const uploaded = await db.uploadSocialImage(
            ctx.user.id,
            input.filename,
            input.mimeType,
            input.contentBase64
          );
          return { url: uploaded.url, key: uploaded.key };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: publicMessage(error, "Unable to upload this image"),
          });
        }
      }),
  }),
});
