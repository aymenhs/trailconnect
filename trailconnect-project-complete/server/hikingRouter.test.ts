import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listPublishedEvents: vi.fn(),
  listMyOutings: vi.fn(),
  searchPublishedEvents: vi.fn(),
  getEventDetail: vi.fn(),
  isEventCoOrganizer: vi.fn(),
  getHostTrustSignals: vi.fn(),
  getEventParticipation: vi.fn(),
  getBookingRequestForEvent: vi.fn(),
  canViewEventCoordination: vi.fn(),
  canReadEventSheet: vi.fn(),
  leaveEvent: vi.fn(),
  leaveCommunityGroup: vi.fn(),
  getEventLogistics: vi.fn(),
  listCarpoolOffers: vi.fn(),
  listCarpoolSeatReservations: vi.fn(),
  getSocialProfile: vi.fn(),
  getEventPreparationState: vi.fn(),
  updateEventPreparationState: vi.fn(),
  listParticipantPackingItems: vi.fn(),
  updateParticipantPackingItem: vi.fn(),
  getEventPackingProgressSummary: vi.fn(),
  createEventPackingItem: vi.fn(),
  updateEventPackingItem: vi.fn(),
  deleteEventPackingItem: vi.fn(),
  createHikingEvent: vi.fn(),
  updateHikingEvent: vi.fn(),
  updateEventManualRoute: vi.fn(),
  setLocalWeatherSource: vi.fn(),
  publishWeatherUpdate: vi.fn(),
  listWeatherUpdates: vi.fn(),
  acknowledgeWeatherUpdate: vi.fn(),
  getDepartureReadiness: vi.fn(),
  listEventActionAssignments: vi.fn(),
  setEventActionAssignment: vi.fn(),
  listEventTerrainLandmarks: vi.fn(),
  createEventTerrainLandmark: vi.fn(),
  updateEventTerrainLandmark: vi.fn(),
  deleteEventTerrainLandmark: vi.fn(),
  updateEventLogistics: vi.fn(),
  listEventRoutePlanHistory: vi.fn(),
  getDayOfBriefAcknowledgementStatus: vi.fn(),
  acknowledgeDayOfBrief: vi.fn(),
  listEventConditionReports: vi.fn(),
  createEventConditionReport: vi.fn(),
  setEventMessagePinned: vi.fn(),
  cancelHikingEvent: vi.fn(),
  getEventById: vi.fn(),
  getParticipantCount: vi.fn(),
  joinEvent: vi.fn(),
  createBookingRequest: vi.fn(),
  decideBookingRequest: vi.fn(),
  promoteWaitlistedParticipant: vi.fn(),
  requestCarpoolSeat: vi.fn(),
  decideCarpoolSeatReservation: vi.fn(),
  updateCarpoolOffer: vi.fn(),
  setParticipantPreparationReady: vi.fn(),
  getEventParticipantUserIds: vi.fn(),
  getEventChatAudienceUserIds: vi.fn(),
  getSocialInvitePreview: vi.fn(),
  acceptSocialInvite: vi.fn(),
  areFriends: vi.fn(),
  listActiveLiveLocations: vi.fn(),
  listBookingRequests: vi.fn(),
  listSafetyCheckIns: vi.fn(),
  listEventParticipants: vi.fn(),
  checkInParticipant: vi.fn(),
  manageEventParticipant: vi.fn(),
  createUserNotification: vi.fn(),
  listCommunityPosts: vi.fn(),
  createCommunityPost: vi.fn(),
  getOrCreateSiteSettings: vi.fn(),
  listEventMessages: vi.fn(),
  createEventMessage: vi.fn(),
  getOrCreateProfile: vi.fn(),
  updateProfile: vi.fn(),
  getAccountDeletionStatus: vi.fn(),
  requestAccountDeletion: vi.fn(),
  cancelAccountDeletion: vi.fn(),
  getProfileByPublicSlug: vi.fn(),
  searchPublicProfiles: vi.fn(),
  getOrganizerProfileByPublicSlug: vi.fn(),
  sendFriendRequest: vi.fn(),
  removeFriendship: vi.fn(),
  deferFriendship: vi.fn(),
  listPendingEventCoOrganizerInvites: vi.fn(),
  listSentEventCoOrganizerInvites: vi.fn(),
  inviteEventCoOrganizer: vi.fn(),
  respondToEventCoOrganizerInvite: vi.fn(),
  revokeEventCoOrganizerInvite: vi.fn(),
  uploadRouteTrack: vi.fn(),
  getAdminDashboardStats: vi.fn(),
  listAdminUsers: vi.fn(),
  listAdminEvents: vi.fn(),
  listAdminPosts: vi.fn(),
  listAdminReports: vi.fn(),
  getUserById: vi.fn(),
  updateAdminUserStatus: vi.fn(),
  updateContentModeration: vi.fn(),
  updateAdminReport: vi.fn(),
  createModerationAction: vi.fn(),
  updateSiteSettings: vi.fn(),
  getHikerMatches: vi.fn(),
  reviewGuideProfile: vi.fn(),
  saveSafetyConsent: vi.fn(),
  createSafetyCheckIn: vi.fn(),
  togglePostReaction: vi.fn(),
  toggleFollow: vi.fn(),
  createCommunityGroup: vi.fn(),
  isCommunityGroupNameAvailable: vi.fn(),
  listUserCommunityGroupTemplates: vi.fn(),
  createUserCommunityGroupTemplate: vi.fn(),
  deleteUserCommunityGroupTemplate: vi.fn(),
  setCommunityGroupMemberRole: vi.fn(),
  getMessagingPreferences: vi.fn(),
  updateMessagingPreferences: vi.fn(),
  sendDirectMessage: vi.fn(),
  blockUser: vi.fn(),
  createCommunityGroupMessage: vi.fn(),
  listPendingCommunityGroupInvites: vi.fn(),
  respondToCommunityGroupInvite: vi.fn(),
  listCommunityGroupMessages: vi.fn(),
  inviteCommunityGroupMember: vi.fn(),
  listPendingCommunityGroupCoAdminInvites: vi.fn(),
  inviteCommunityGroupCoAdmin: vi.fn(),
  respondToCommunityGroupCoAdminInvite: vi.fn(),
  revokeCommunityGroupCoAdminInvite: vi.fn(),
  listUserNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  moderateCommunityGroupMessage: vi.fn(),
  getDirectThread: vi.fn(),
  listEventAccessRadar: vi.fn(),
  createEventAccessRadarEntry: vi.fn(),
  deleteEventAccessRadarEntry: vi.fn(),
  listEventCarpoolHubs: vi.fn(),
  createEventCarpoolHub: vi.fn(),
  deleteEventCarpoolHub: vi.fn(),
  listMyPreparationPassportEntries: vi.fn(),
  savePreparationPassportEntry: vi.fn(),
  listEventPaceGroups: vi.fn(),
  createEventPaceGroup: vi.fn(),
  deleteEventPaceGroup: vi.fn(),
  selectEventPaceGroup: vi.fn(),
  listOperationalDecisions: vi.fn(),
  publishOperationalDecision: vi.fn(),
  acknowledgeOperationalDecision: vi.fn(),
  listMyEventSeries: vi.fn(),
  createEventSeries: vi.fn(),
  getEventSeriesForEvent: vi.fn(),
  toggleEventSeriesInterest: vi.fn(),
  listRelaunchCandidates: vi.fn(),
  sendEventRelaunchInvites: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { DomainError } from "./domainError";
import { hikingRouter } from "./hikingRouter";

const user = {
  id: 42,
  externalId: "trail-user",
  name: "Aymen",
  email: null,
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};
const publicContext = { user: null, req: {}, res: {} } as any;
const protectedContext = { user, req: {}, res: {} } as any;
const adminContext = {
  user: { ...user, id: 1, role: "admin" },
  req: {},
  res: {},
} as any;
const validEvent = {
  title: "Sunrise trail above the valley",
  description:
    "A well-paced morning hike for people who enjoy alpine landscapes.",
  locationName: "Col du Grand-Saint-Bernard",
  startsAt: new Date("2026-09-06T06:30:00.000Z"),
  difficulty: "intermediate" as const,
  distanceKm: 12.4,
  elevationGain: 890,
  durationMinutes: 300,
  capacity: 14,
};
/** The columns `events.join` checks before taking a new participant. */
const joinableOuting = {
  hostId: 7,
  visibility: "public",
  status: "published",
  moderationStatus: "visible",
  startsAt: new Date(Date.now() + 7 * 86_400_000),
};

describe("hiking tRPC procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The outing-sheet panels are readable by default so each test states its
    // own subject; the visibility guard itself is covered by its own test.
    dbMocks.canReadEventSheet.mockResolvedValue(true);
    // `clearAllMocks` keeps implementations, so a participation stubbed by one
    // test would otherwise make `join` see an existing place in the next.
    dbMocks.getEventParticipation.mockResolvedValue(undefined);
    dbMocks.getBookingRequestForEvent.mockResolvedValue(undefined);
  });

  it("passes structured filters to the public event search", async () => {
    dbMocks.searchPublishedEvents.mockResolvedValue([
      { id: 7, title: "Lac Noir" },
    ]);
    const result = await hikingRouter
      .createCaller(publicContext)
      .events.search({
        query: "lac",
        difficulty: "beginner",
        maxDistanceKm: 12,
        carpoolOnly: true,
      });
    expect(result).toEqual([{ id: 7, title: "Lac Noir" }]);
    expect(dbMocks.searchPublishedEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "lac",
        difficulty: "beginner",
        maxDistanceKm: 12,
        carpoolOnly: true,
      })
    );
  });

  it("exposes a published outing to the Explorer source", async () => {
    dbMocks.listPublishedEvents.mockResolvedValue([
      {
        id: 44,
        title: "Sortie publiée du Mont-Tremblant",
        locationName: "Laurentides",
        startsAt: new Date("2026-09-20T12:00:00.000Z"),
      },
    ]);
    await expect(
      hikingRouter.createCaller(publicContext).events.list()
    ).resolves.toEqual([
      {
        id: 44,
        title: "Sortie publiée du Mont-Tremblant",
        locationName: "Laurentides",
        startsAt: new Date("2026-09-20T12:00:00.000Z"),
      },
    ]);
    expect(dbMocks.listPublishedEvents).toHaveBeenCalledTimes(1);
  });

  it("returns only the authenticated user’s organized and joined outings", async () => {
    dbMocks.listMyOutings.mockResolvedValue([
      {
        id: 12,
        title: "Boucle des lacs de Mont-Tremblant",
        relationship: "participant",
      },
    ]);
    await expect(
      hikingRouter.createCaller(protectedContext).events.mine()
    ).resolves.toEqual([
      {
        id: 12,
        title: "Boucle des lacs de Mont-Tremblant",
        relationship: "participant",
      },
    ]);
    expect(dbMocks.listMyOutings).toHaveBeenCalledWith(42);
  });

  it("returns null for absent optional preparation and series modules", async () => {
    dbMocks.getEventSeriesForEvent.mockResolvedValue(undefined);
    dbMocks.getEventById.mockResolvedValue({ id: 12, hostId: 42 });
    dbMocks.getEventPreparationState.mockResolvedValue(undefined);
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.events.series.byEvent({ eventId: 12 })
    ).resolves.toBeNull();
    await expect(
      caller.events.preparation.detail({ eventId: 12 })
    ).resolves.toBeNull();
  });

  it("lists and marks only the authenticated user’s notifications as read", async () => {
    dbMocks.listUserNotifications.mockResolvedValue([
      { id: 6, title: "Invitation reçue", isRead: false },
    ]);
    await expect(
      hikingRouter.createCaller(protectedContext).notifications.list()
    ).resolves.toEqual([{ id: 6, title: "Invitation reçue", isRead: false }]);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .notifications.markRead({ notificationId: 6 })
    ).resolves.toEqual({ success: true });
    await expect(
      hikingRouter.createCaller(protectedContext).notifications.markAllRead()
    ).resolves.toEqual({ success: true });
    expect(dbMocks.listUserNotifications).toHaveBeenCalledWith(42);
    expect(dbMocks.markNotificationRead).toHaveBeenCalledWith(42, 6);
    expect(dbMocks.markAllNotificationsRead).toHaveBeenCalledWith(42);
  });

  it("reads and updates only the authenticated member profile", async () => {
    dbMocks.getOrCreateProfile
      .mockResolvedValueOnce({
        userId: 42,
        homeLocation: "Montréal",
        experienceLevel: "intermediate",
      })
      .mockResolvedValueOnce({
        userId: 42,
        homeLocation: "Montréal",
        experienceLevel: "advanced",
      });
    dbMocks.updateProfile.mockResolvedValue({
      userId: 42,
      homeLocation: "Montréal",
      experienceLevel: "advanced",
    });
    await expect(
      hikingRouter.createCaller(protectedContext).profile.mine()
    ).resolves.toMatchObject({ userId: 42, homeLocation: "Montréal" });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .profile.update({ experienceLevel: "advanced" })
    ).resolves.toMatchObject({ experienceLevel: "advanced" });
    expect(dbMocks.getOrCreateProfile).toHaveBeenCalledWith(42);
    expect(dbMocks.updateProfile).toHaveBeenCalledWith(42, {
      experienceLevel: "advanced",
    });
  });

  it("exposes a public organizer profile by shareable handle without requiring a session", async () => {
    const organizerProfile = {
      organizer: { userId: 9, name: "Camille", publicSlug: "camille-rando" },
      declaredExperience: {
        headline: "Sorties de groupe dans les Laurentides",
      },
      trust: { completedHostedOutings: 4, phoneVerified: true },
      upcomingOutings: [],
      completedOutings: [],
    };
    dbMocks.getOrganizerProfileByPublicSlug.mockResolvedValue(organizerProfile);
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .marketplace.organizers.bySlug({ publicSlug: "camille-rando" })
    ).resolves.toEqual(organizerProfile);
    expect(dbMocks.getOrganizerProfileByPublicSlug).toHaveBeenCalledWith(
      "camille-rando"
    );
  });

  it("includes the authenticated user’s participation status in event detail", async () => {
    dbMocks.getEventDetail.mockResolvedValue({
      id: 12,
      title: "Boucle des lacs",
      hostTrust: { phoneVerified: true, guideStatus: "approved" },
    });
    dbMocks.getEventParticipation.mockResolvedValue({
      status: "going",
      checkedInAt: null,
    });
    await expect(
      hikingRouter.createCaller(protectedContext).events.detail({ eventId: 12 })
    ).resolves.toMatchObject({
      id: 12,
      participationStatus: "going",
      checkedInAt: null,
      hostTrust: { phoneVerified: true, guideStatus: "approved" },
    });
    expect(dbMocks.getEventParticipation).toHaveBeenCalledWith(12, 42);
  });

  it("persists a preparation action only for a confirmed participant", async () => {
    dbMocks.getEventById.mockResolvedValue({ id: 12, hostId: 9 });
    dbMocks.getEventParticipation.mockResolvedValue({ status: "going" });
    dbMocks.updateEventPreparationState.mockResolvedValue({
      eventId: 12,
      userId: 42,
      checklistCompleted: true,
    });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.preparation.update({ eventId: 12, checklistCompleted: true })
    ).resolves.toMatchObject({ checklistCompleted: true });
    expect(dbMocks.updateEventPreparationState).toHaveBeenCalledWith(42, {
      eventId: 12,
      checklistCompleted: true,
    });
  });

  it("persists a personal checklist item only for the authenticated confirmed participant", async () => {
    dbMocks.getEventById.mockResolvedValue({ id: 12, hostId: 9 });
    dbMocks.getEventParticipation.mockResolvedValue({ status: "going" });
    dbMocks.updateParticipantPackingItem.mockResolvedValue({
      itemKey: "dynamic:water",
      checked: true,
    });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.preparation.updateChecklistItem({
          eventId: 12,
          itemKey: "dynamic:water",
          checked: true,
        })
    ).resolves.toMatchObject({ itemKey: "dynamic:water", checked: true });
    expect(dbMocks.updateParticipantPackingItem).toHaveBeenCalledWith(42, {
      eventId: 12,
      itemKey: "dynamic:water",
      checked: true,
    });
  });

  it("allows an organizer to manage suggestions and retrieve anonymous checklist totals", async () => {
    dbMocks.getEventPackingProgressSummary.mockResolvedValue({
      confirmedParticipants: 3,
      items: [{ id: 7, label: "Water", checkedParticipants: 2 }],
    });
    dbMocks.createEventPackingItem.mockResolvedValue(8);
    dbMocks.updateEventPackingItem.mockResolvedValue({ itemId: 7 });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.preparation.packingSummary({ eventId: 12 })
    ).resolves.toMatchObject({ confirmedParticipants: 3 });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.preparation.addPackingItem({
          eventId: 12,
          label: "Headlamp",
          category: "safety",
        })
    ).resolves.toEqual({ itemId: 8 });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.preparation.updatePackingItem({
          eventId: 12,
          itemId: 7,
          label: "Water",
          category: "essential",
        })
    ).resolves.toEqual({ itemId: 7 });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.preparation.deletePackingItem({ eventId: 12, itemId: 7 })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.createEventPackingItem).toHaveBeenCalledWith(
      12,
      42,
      expect.objectContaining({ label: "Headlamp", category: "safety" })
    );
    expect(dbMocks.updateEventPackingItem).toHaveBeenCalledWith(
      12,
      42,
      expect.objectContaining({ itemId: 7, label: "Water" })
    );
    expect(dbMocks.deleteEventPackingItem).toHaveBeenCalledWith(12, 7, 42);
  });

  it("lists coordination owners and restricts assignment changes to the authenticated organizer context", async () => {
    dbMocks.listEventActionAssignments.mockResolvedValue([
      { action: "weather", assigneeId: 42, assigneeName: "Aymen" },
    ]);
    dbMocks.setEventActionAssignment.mockResolvedValue({
      action: "weather",
      assigneeId: 42,
    });
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .events.actionAssignments({ eventId: 12 })
    ).resolves.toEqual([
      { action: "weather", assigneeId: 42, assigneeName: "Aymen" },
    ]);
    await expect(
      hikingRouter.createCaller(protectedContext).events.setActionAssignment({
        eventId: 12,
        action: "weather",
        assigneeId: 42,
      })
    ).resolves.toEqual({ action: "weather", assigneeId: 42 });
    expect(dbMocks.listEventActionAssignments).toHaveBeenCalledWith(12);
    expect(dbMocks.setEventActionAssignment).toHaveBeenCalledWith(
      12,
      42,
      "weather",
      42
    );
  });

  it("lists factual terrain landmarks publicly and lets an authenticated organizer maintain them", async () => {
    dbMocks.listEventTerrainLandmarks.mockResolvedValue([
      { id: 7, type: "water", label: "Source du refuge", status: "reported" },
    ]);
    dbMocks.createEventTerrainLandmark.mockResolvedValue(7);
    dbMocks.updateEventTerrainLandmark.mockResolvedValue(undefined);
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .events.terrainLandmarks({ eventId: 12 })
    ).resolves.toEqual([
      { id: 7, type: "water", label: "Source du refuge", status: "reported" },
    ]);
    await expect(
      hikingRouter.createCaller(protectedContext).events.createTerrainLandmark({
        eventId: 12,
        type: "water",
        label: "Source du refuge",
        status: "reported",
      })
    ).resolves.toEqual({ landmarkId: 7 });
    await expect(
      hikingRouter.createCaller(protectedContext).events.updateTerrainLandmark({
        eventId: 12,
        landmarkId: 7,
        type: "water",
        label: "Source du refuge principal",
        status: "reported",
        latitude: 45.5356,
        longitude: -73.1529,
      })
    ).resolves.toEqual({ success: true });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.deleteTerrainLandmark({ eventId: 12, landmarkId: 7 })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.createEventTerrainLandmark).toHaveBeenCalledWith(
      12,
      42,
      expect.objectContaining({ type: "water", label: "Source du refuge" })
    );
    expect(dbMocks.updateEventTerrainLandmark).toHaveBeenCalledWith(
      12,
      7,
      42,
      expect.objectContaining({
        label: "Source du refuge principal",
        latitude: 45.5356,
        longitude: -73.1529,
      })
    );
    expect(dbMocks.deleteEventTerrainLandmark).toHaveBeenCalledWith(12, 7, 42);
  });

  it("persists the organizer’s indicative operational route and plan B", async () => {
    dbMocks.updateEventLogistics.mockResolvedValue({
      eventId: 12,
      operationalRoute: "Boucle du lac",
      backupPlan: "Retour par le belvédère",
    });
    await expect(
      hikingRouter.createCaller(protectedContext).marketplace.logistics.update({
        eventId: 12,
        operationalRoute: "Boucle du lac",
        backupPlan: "Retour par le belvédère",
      })
    ).resolves.toMatchObject({
      operationalRoute: "Boucle du lac",
      backupPlan: "Retour par le belvédère",
    });
    expect(dbMocks.updateEventLogistics).toHaveBeenCalledWith(42, {
      eventId: 12,
      operationalRoute: "Boucle du lac",
      backupPlan: "Retour par le belvédère",
    });
  });

  it("exposes route-plan history and records an authenticated participant’s day-of brief acknowledgement", async () => {
    dbMocks.listEventRoutePlanHistory.mockResolvedValue([
      { id: 3, operationalRoute: "Boucle du lac", authorName: "Camille" },
    ]);
    dbMocks.getDayOfBriefAcknowledgementStatus.mockResolvedValue({
      versionUpdatedAt: new Date("2026-09-05T18:00:00.000Z"),
      isParticipant: true,
      canManage: false,
      acknowledgedAt: null,
      confirmedParticipants: 4,
      acknowledgedParticipants: 1,
    });
    dbMocks.acknowledgeDayOfBrief.mockResolvedValue({
      acknowledgedAt: new Date("2026-09-05T19:00:00.000Z"),
      versionUpdatedAt: new Date("2026-09-05T18:00:00.000Z"),
    });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.routePlanHistory({ eventId: 12 })
    ).resolves.toEqual([
      { id: 3, operationalRoute: "Boucle du lac", authorName: "Camille" },
    ]);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.dayOfBriefReadStatus({ eventId: 12 })
    ).resolves.toMatchObject({
      isParticipant: true,
      acknowledgedParticipants: 1,
    });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.acknowledgeDayOfBrief({ eventId: 12 })
    ).resolves.toMatchObject({ acknowledgedAt: expect.any(Date) });
    expect(dbMocks.listEventRoutePlanHistory).toHaveBeenCalledWith(12, 42);
    expect(dbMocks.getDayOfBriefAcknowledgementStatus).toHaveBeenCalledWith(
      12,
      42
    );
    expect(dbMocks.acknowledgeDayOfBrief).toHaveBeenCalledWith(12, 42);
  });

  it("covers the confirmed hiker lifecycle from joining through preparation to an outing recap", async () => {
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 12,
      hostId: 9,
      title: "Mont Tremblant",
      locationName: "Laurentides",
      capacity: 12,
      requiresApproval: false,
    });
    dbMocks.getParticipantCount.mockResolvedValue(3);
    dbMocks.getEventParticipation.mockResolvedValue({ status: "going" });
    // Not yet registered when `join` looks; confirmed for every later step.
    dbMocks.getEventParticipation.mockResolvedValueOnce(undefined);
    dbMocks.updateEventPreparationState.mockResolvedValue({
      eventId: 12,
      userId: 42,
      meetingAcknowledged: true,
      transportConfirmed: true,
      checklistCompleted: true,
      offlineReady: true,
    });
    dbMocks.getOrCreateSiteSettings.mockResolvedValue({
      communityPostingEnabled: true,
    });
    dbMocks.createCommunityPost.mockResolvedValue(91);

    await expect(
      hikingRouter.createCaller(protectedContext).events.join({ eventId: 12 })
    ).resolves.toEqual({ status: "going" });
    await expect(
      hikingRouter.createCaller(protectedContext).events.preparation.update({
        eventId: 12,
        meetingAcknowledged: true,
        transportConfirmed: true,
        checklistCompleted: true,
        offlineReady: true,
      })
    ).resolves.toMatchObject({ offlineReady: true });
    await expect(
      hikingRouter.createCaller(protectedContext).community.createPost({
        eventId: 12,
        postType: "outing_recap",
        title: "Débrief Tremblant",
        body: "Météo stable, covoiturage fluide et groupe bien préparé.",
        visibility: "public",
        images: [],
      })
    ).resolves.toEqual({ postId: 91 });

    expect(dbMocks.joinEvent).toHaveBeenCalledWith(12, 42, "going");
    expect(dbMocks.createUserNotification).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ type: "registration" })
    );
    expect(dbMocks.updateEventPreparationState).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ eventId: 12, offlineReady: true })
    );
    expect(dbMocks.createCommunityPost).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ postType: "outing_recap", eventId: 12 })
    );
  });

  it("allows a confirmed participant to publish a structured outing recap", async () => {
    dbMocks.getOrCreateSiteSettings.mockResolvedValue({
      communityPostingEnabled: true,
    });
    dbMocks.getEventById.mockResolvedValue({ id: 12, hostId: 9 });
    dbMocks.getEventParticipation.mockResolvedValue({ status: "going" });
    dbMocks.createCommunityPost.mockResolvedValue(81);
    await expect(
      hikingRouter.createCaller(protectedContext).community.createPost({
        eventId: 12,
        postType: "outing_recap",
        title: "Débrief",
        body: "Conditions sèches et logistique fluide.",
        visibility: "public",
        images: [],
      })
    ).resolves.toEqual({ postId: 81 });
  });

  it("resolves a shareable public identifier before creating an incoming friendship request", async () => {
    dbMocks.getProfileByPublicSlug.mockResolvedValue({
      userId: 77,
      name: "Camille",
      publicSlug: "camille-rando",
      profileVisibility: "public",
    });
    dbMocks.sendFriendRequest.mockResolvedValue(19);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.friendships.requestBySlug({
          publicSlug: "camille-rando",
          note: "On s’est rencontrés sur le sentier.",
        })
    ).resolves.toEqual({ friendshipId: 19, userId: 77 });
    expect(dbMocks.sendFriendRequest).toHaveBeenCalledWith(
      42,
      77,
      "On s’est rencontrés sur le sentier."
    );
  });

  it("searches public member summaries without requiring authentication", async () => {
    dbMocks.searchPublicProfiles.mockResolvedValue([
      {
        userId: 77,
        name: "Camille",
        publicSlug: "camille-rando",
        bio: "Sentiers et sommets",
      },
    ]);
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .social.members.search({ query: "Camille" })
    ).resolves.toEqual([
      {
        userId: 77,
        name: "Camille",
        publicSlug: "camille-rando",
        bio: "Sentiers et sommets",
      },
    ]);
    expect(dbMocks.searchPublicProfiles).toHaveBeenCalledWith("Camille");
  });

  it("allows an empty public-member query for initial profile discovery", async () => {
    dbMocks.searchPublicProfiles.mockResolvedValue([
      {
        userId: 77,
        name: "Camille",
        publicSlug: "camille-rando",
        bio: "Sentiers et sommets",
      },
    ]);
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .social.members.search({ query: "" })
    ).resolves.toEqual([
      {
        userId: 77,
        name: "Camille",
        publicSlug: "camille-rando",
        bio: "Sentiers et sommets",
      },
    ]);
    expect(dbMocks.searchPublicProfiles).toHaveBeenCalledWith("");
  });

  it("defers an incoming friend request for a future reminder date", async () => {
    dbMocks.deferFriendship.mockResolvedValue(true);
    const remindAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.friendships.defer({ friendshipId: 19, remindAt })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.deferFriendship).toHaveBeenCalledWith(19, 42, remindAt);
  });

  it("allows either party to remove their friendship without exposing another relationship", async () => {
    dbMocks.removeFriendship.mockResolvedValue(true);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.friendships.remove({ friendshipId: 19 })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.removeFriendship).toHaveBeenCalledWith(19, 42);
  });

  it("invites a co-organizer by public handle and exposes their pending action", async () => {
    dbMocks.inviteEventCoOrganizer.mockResolvedValue({
      invitee: { userId: 77, publicSlug: "camille-rando" },
      expiresAt: new Date("2026-09-01"),
    });
    dbMocks.listPendingEventCoOrganizerInvites.mockResolvedValue([
      { id: 8, eventId: 12, eventTitle: "Boucle des lacs", valid: true },
    ]);
    await expect(
      hikingRouter.createCaller(protectedContext).events.coOrganizers.invite({
        eventId: 12,
        publicSlug: "camille-rando",
      })
    ).resolves.toMatchObject({ invitee: { userId: 77 } });
    await expect(
      hikingRouter.createCaller(protectedContext).events.coOrganizers.pending()
    ).resolves.toEqual([
      { id: 8, eventId: 12, eventTitle: "Boucle des lacs", valid: true },
    ]);
  });

  it("lists sent co-organizer invitations only through the authenticated event host", async () => {
    dbMocks.listSentEventCoOrganizerInvites.mockResolvedValue([
      { id: 8, publicSlug: "camille-rando" },
    ]);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.coOrganizers.sent({ eventId: 12 })
    ).resolves.toEqual([{ id: 8, publicSlug: "camille-rando" }]);
    expect(dbMocks.listSentEventCoOrganizerInvites).toHaveBeenCalledWith(
      12,
      42
    );
  });

  it("returns a conflict when a co-organizer invitation became invalid before acceptance", async () => {
    dbMocks.respondToEventCoOrganizerInvite.mockRejectedValue(
      new DomainError("This invitation is no longer valid")
    );
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.coOrganizers.respond({ invitationId: 8, accept: true })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "This invitation is no longer valid",
    });
  });

  it("creates an event for the authenticated host", async () => {
    dbMocks.createHikingEvent.mockResolvedValue(88);
    const result = await hikingRouter
      .createCaller(protectedContext)
      .events.create(validEvent);
    expect(result).toEqual({ eventId: 88 });
    expect(dbMocks.createHikingEvent).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: validEvent.title })
    );
  });

  it("schedules and cancels profile deletion only for the authenticated account", async () => {
    dbMocks.getAccountDeletionStatus.mockResolvedValue({
      deletionRequestedAt: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });
    dbMocks.requestAccountDeletion.mockResolvedValue({
      deletionScheduledAt: new Date("2026-09-01"),
    });
    dbMocks.cancelAccountDeletion.mockResolvedValue(undefined);
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(caller.profile.deletionStatus()).resolves.toMatchObject({
      deletionScheduledAt: null,
    });
    await expect(caller.profile.requestDeletion()).resolves.toMatchObject({
      deletionScheduledAt: new Date("2026-09-01"),
    });
    await expect(caller.profile.cancelDeletion()).resolves.toEqual({
      success: true,
    });
    expect(dbMocks.getAccountDeletionStatus).toHaveBeenCalledWith(42);
    expect(dbMocks.requestAccountDeletion).toHaveBeenCalledWith(42);
    expect(dbMocks.cancelAccountDeletion).toHaveBeenCalledWith(42);
  });

  it("passes an authenticated organizer identity when updating an outing", async () => {
    dbMocks.updateHikingEvent.mockResolvedValue(undefined);
    await expect(
      hikingRouter.createCaller(protectedContext).events.update({
        ...validEvent,
        eventId: 88,
        difficultyOverrideReason: undefined,
      })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.updateHikingEvent).toHaveBeenCalledWith(
      88,
      42,
      expect.objectContaining({ eventId: 88, title: validEvent.title })
    );
  });

  it("passes the authenticated organizer and an indicative out-and-back route to the dedicated route update", async () => {
    const points = [
      { latitude: 45.5, longitude: -73.5 },
      { latitude: 45.51, longitude: -73.51 },
    ];
    const attentionZones = [
      {
        type: "access" as const,
        note: "Accès à vérifier",
        latitude: 45.505,
        longitude: -73.505,
      },
    ];
    dbMocks.updateEventManualRoute.mockResolvedValue({
      points,
      roundTrip: true,
      attentionZones,
    });
    await expect(
      hikingRouter.createCaller(protectedContext).events.updateManualRoute({
        eventId: 88,
        points,
        roundTrip: true,
        attentionZones,
      })
    ).resolves.toMatchObject({ roundTrip: true, attentionZones });
    expect(dbMocks.updateEventManualRoute).toHaveBeenCalledWith(88, 42, {
      points,
      roundTrip: true,
      attentionZones,
    });
  });

  it("lets an authenticated organizer persist a labeled HTTPS local weather source", async () => {
    dbMocks.setLocalWeatherSource.mockResolvedValue({
      label: "Parc national — bulletin local",
      url: "https://example.org/meteo",
    });
    await expect(
      hikingRouter.createCaller(protectedContext).events.setLocalWeatherSource({
        eventId: 88,
        label: "Parc national — bulletin local",
        url: "https://example.org/meteo",
      })
    ).resolves.toEqual({
      label: "Parc national — bulletin local",
      url: "https://example.org/meteo",
    });
    expect(dbMocks.setLocalWeatherSource).toHaveBeenCalledWith(88, 42, {
      label: "Parc national — bulletin local",
      url: "https://example.org/meteo",
    });
  });

  it("lets an authenticated organizer publish a dated important weather update", async () => {
    const weatherUpdatedAt = new Date("2026-08-15T10:30:00.000Z");
    dbMocks.publishWeatherUpdate.mockResolvedValue({
      note: "Des rafales plus fortes sont signalées.",
      weatherUpdatedAt,
    });
    await expect(
      hikingRouter.createCaller(protectedContext).events.publishWeatherUpdate({
        eventId: 88,
        note: "Des rafales plus fortes sont signalées.",
      })
    ).resolves.toEqual({
      note: "Des rafales plus fortes sont signalées.",
      weatherUpdatedAt,
    });
    expect(dbMocks.publishWeatherUpdate).toHaveBeenCalledWith(
      88,
      42,
      "Des rafales plus fortes sont signalées."
    );
  });

  it("exposes weather history publicly and records a confirmed participant’s read receipt", async () => {
    dbMocks.listWeatherUpdates.mockResolvedValue([
      { id: 6, note: "Vent signalé", acknowledgedAt: null },
    ]);
    dbMocks.acknowledgeWeatherUpdate.mockResolvedValue({
      readAt: new Date("2026-08-15T10:45:00.000Z"),
    });
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .events.weatherUpdates({ eventId: 88 })
    ).resolves.toEqual([{ id: 6, note: "Vent signalé", acknowledgedAt: null }]);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.acknowledgeWeatherUpdate({ eventId: 88, weatherUpdateId: 6 })
    ).resolves.toEqual({ readAt: new Date("2026-08-15T10:45:00.000Z") });
    expect(dbMocks.listWeatherUpdates).toHaveBeenCalledWith(88, undefined);
    expect(dbMocks.acknowledgeWeatherUpdate).toHaveBeenCalledWith(88, 6, 42);
  });

  it("routes organizer departure markers, condition observations and Day-J pinning through authenticated identities", async () => {
    dbMocks.getDepartureReadiness.mockResolvedValue([
      { userId: 9, meetingAcknowledged: true },
    ]);
    dbMocks.listEventConditionReports.mockResolvedValue([
      { id: 3, category: "access", note: "Route ouverte" },
    ]);
    dbMocks.createEventConditionReport.mockResolvedValue(4);
    dbMocks.setEventMessagePinned.mockResolvedValue({
      messageId: 11,
      isPinned: true,
    });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.departureReadiness({ eventId: 88 })
    ).resolves.toEqual([{ userId: 9, meetingAcknowledged: true }]);
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .events.conditionReports({ eventId: 88 })
    ).resolves.toEqual([{ id: 3, category: "access", note: "Route ouverte" }]);
    await expect(
      hikingRouter.createCaller(protectedContext).events.createConditionReport({
        eventId: 88,
        category: "access",
        note: "La route d’accès était ouverte et dégagée.",
      })
    ).resolves.toEqual({ reportId: 4 });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .community.pinMessage({ eventId: 88, messageId: 11, isPinned: true })
    ).resolves.toEqual({ messageId: 11, isPinned: true });
    expect(dbMocks.getDepartureReadiness).toHaveBeenCalledWith(88, 42);
    expect(dbMocks.createEventConditionReport).toHaveBeenCalledWith(
      88,
      42,
      "access",
      "La route d’accès était ouverte et dégagée."
    );
    expect(dbMocks.setEventMessagePinned).toHaveBeenCalledWith(
      88,
      11,
      42,
      true
    );
  });

  it("passes an authenticated organizer identity when cancelling an outing", async () => {
    dbMocks.cancelHikingEvent.mockResolvedValue(undefined);
    await expect(
      hikingRouter.createCaller(protectedContext).events.cancel({ eventId: 88 })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.cancelHikingEvent).toHaveBeenCalledWith(88, 42);
  });

  it("persists trailhead facilities with a newly created outing", async () => {
    dbMocks.createHikingEvent.mockResolvedValue(89);
    await hikingRouter.createCaller(protectedContext).events.create({
      ...validEvent,
      toiletsStatus: "available",
      waterStatus: "limited",
      parkingStatus: "unavailable",
      facilitiesNotes: "The water tap closes seasonally.",
    });
    expect(dbMocks.createHikingEvent).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        toiletsStatus: "available",
        waterStatus: "limited",
        parkingStatus: "unavailable",
        facilitiesNotes: "The water tap closes seasonally.",
      })
    );
  });

  it("refuses to sign a member up to a private outing reached by its id", async () => {
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 61,
      visibility: "private",
    });
    dbMocks.getParticipantCount.mockResolvedValue(0);
    await expect(
      hikingRouter.createCaller(protectedContext).events.join({ eventId: 61 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.joinEvent).not.toHaveBeenCalled();
    expect(dbMocks.createBookingRequest).not.toHaveBeenCalled();
  });

  it("refuses to sign up to an outing that has already started", async () => {
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 62,
      startsAt: new Date(Date.now() - 60_000),
    });
    dbMocks.getParticipantCount.mockResolvedValue(0);
    await expect(
      hikingRouter.createCaller(protectedContext).events.join({ eventId: 62 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.joinEvent).not.toHaveBeenCalled();
  });

  it("keeps a confirmed place when join is retried on a now-full outing", async () => {
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 63,
      capacity: 4,
    });
    dbMocks.getParticipantCount.mockResolvedValue(4);
    dbMocks.getEventParticipation.mockResolvedValue({ status: "going" });
    await expect(
      hikingRouter.createCaller(protectedContext).events.join({ eventId: 63 })
    ).resolves.toEqual({ status: "going" });
    expect(dbMocks.joinEvent).not.toHaveBeenCalled();
  });

  it("places an approval-required event into pending status", async () => {
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 8,
      capacity: 10,
      requiresApproval: true,
    });
    dbMocks.getParticipantCount.mockResolvedValue(3);
    const result = await hikingRouter
      .createCaller(protectedContext)
      .events.join({ eventId: 8 });
    expect(result).toEqual({ status: "pending" });
    expect(dbMocks.createBookingRequest).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ eventId: 8 })
    );
    expect(dbMocks.joinEvent).not.toHaveBeenCalled();
  });

  it("places a participant on the waitlist rather than refusing a full outing", async () => {
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 20,
      title: "Mont Orford",
      locationName: "Estrie",
      capacity: 3,
      requiresApproval: false,
    });
    dbMocks.getParticipantCount.mockResolvedValue(3);
    await expect(
      hikingRouter.createCaller(protectedContext).events.join({ eventId: 20 })
    ).resolves.toEqual({ status: "waitlist" });
    expect(dbMocks.joinEvent).toHaveBeenCalledWith(20, 42, "waitlist");
    expect(dbMocks.createUserNotification).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        type: "registration",
        title: "Liste d’attente",
      })
    );
  });

  it("lets the organizer promote a waitlisted participant when a place becomes available", async () => {
    dbMocks.promoteWaitlistedParticipant.mockResolvedValue({ status: "going" });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.promoteWaitlist({ eventId: 20, participantId: 73 })
    ).resolves.toEqual({ status: "going" });
    expect(dbMocks.promoteWaitlistedParticipant).toHaveBeenCalledWith(
      20,
      42,
      73
    );
  });

  it("creates a traceable request for an available carpool seat", async () => {
    dbMocks.requestCarpoolSeat.mockResolvedValue(54);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .marketplace.logistics.requestSeat({ offerId: 12, seatsRequested: 1 })
    ).resolves.toEqual({ reservationId: 54 });
    expect(dbMocks.requestCarpoolSeat).toHaveBeenCalledWith(42, {
      offerId: 12,
      seatsRequested: 1,
    });
  });

  it("records the driver’s decision for a carpool seat request", async () => {
    dbMocks.decideCarpoolSeatReservation.mockResolvedValue({
      status: "accepted",
    });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .marketplace.logistics.decideSeat({
          reservationId: 54,
          status: "accepted",
        })
    ).resolves.toEqual({ status: "accepted" });
    expect(dbMocks.decideCarpoolSeatReservation).toHaveBeenCalledWith(42, {
      reservationId: 54,
      status: "accepted",
    });
  });

  it("lets the driver update a ride’s place, time and seats without withdrawing it", async () => {
    dbMocks.updateCarpoolOffer.mockResolvedValue({
      offerId: 12,
      notifiedPassengers: 2,
    });
    const input = {
      eventId: 20,
      offerId: 12,
      departureLocation: "Station Montmorency",
      departureAt: new Date("2026-09-20T12:30:00.000Z"),
      seatsTotal: 4,
      seatsAvailable: 4,
      note: "Départ avancé",
    };
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .marketplace.logistics.updateCarpool(input)
    ).resolves.toEqual({ offerId: 12, notifiedPassengers: 2 });
    expect(dbMocks.updateCarpoolOffer).toHaveBeenCalledWith(42, input);
  });

  it("rejects a carpool update the driver is not allowed to perform", async () => {
    dbMocks.updateCarpoolOffer.mockRejectedValue(
      new DomainError("Cannot reduce seats below confirmed count (2)")
    );
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .marketplace.logistics.updateCarpool({
          eventId: 20,
          offerId: 12,
          departureLocation: "Berri-UQAM",
          seatsTotal: 1,
          seatsAvailable: 1,
        })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Cannot reduce seats below confirmed count (2)",
    });
  });

  it("routes optional access, hub, pace, passport and day-of operations through the correct authenticated identity", async () => {
    dbMocks.listEventAccessRadar.mockResolvedValue([
      { id: 2, label: "Stationnement", status: "caution" },
    ]);
    dbMocks.createEventAccessRadarEntry.mockResolvedValue(3);
    dbMocks.listEventCarpoolHubs.mockResolvedValue([{ id: 4, label: "Métro" }]);
    dbMocks.createEventCarpoolHub.mockResolvedValue(5);
    dbMocks.listEventPaceGroups.mockResolvedValue([
      { id: 6, label: "Régulier" },
    ]);
    dbMocks.createEventPaceGroup.mockResolvedValue(7);
    dbMocks.selectEventPaceGroup.mockResolvedValue({ groupId: 6 });
    dbMocks.listMyPreparationPassportEntries.mockResolvedValue([
      { eventId: 88, paceReflection: "comfortable" },
    ]);
    dbMocks.savePreparationPassportEntry.mockResolvedValue({ eventId: 88 });
    dbMocks.listOperationalDecisions.mockResolvedValue([
      { id: 8, acknowledgementRequired: true },
    ]);
    dbMocks.publishOperationalDecision.mockResolvedValue(8);
    dbMocks.acknowledgeOperationalDecision.mockResolvedValue({
      acknowledgedAt: new Date("2026-09-06T08:00:00.000Z"),
    });
    const protectedCaller = hikingRouter.createCaller(protectedContext);
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .events.accessRadar({ eventId: 88 })
    ).resolves.toEqual([{ id: 2, label: "Stationnement", status: "caution" }]);
    await expect(
      protectedCaller.events.createAccessRadarEntry({
        eventId: 88,
        category: "parking",
        status: "caution",
        label: "Stationnement",
        sourceLabel: "Parc",
        sourceUrl: "https://example.org/access",
        checkedAt: new Date("2026-09-06T07:00:00.000Z"),
      })
    ).resolves.toEqual({ entryId: 3 });
    await expect(
      protectedCaller.marketplace.logistics.hubs({ eventId: 88 })
    ).resolves.toEqual([{ id: 4, label: "Métro" }]);
    await expect(
      protectedCaller.marketplace.logistics.createHub({
        eventId: 88,
        label: "Métro",
        instructions: "Sortie nord",
      })
    ).resolves.toEqual({ hubId: 5 });
    await expect(
      protectedCaller.events.paceGroups({ eventId: 88 })
    ).resolves.toEqual([{ id: 6, label: "Régulier" }]);
    await expect(
      protectedCaller.events.createPaceGroup({
        eventId: 88,
        label: "Régulier",
        paceDescription: "Allure stable avec regroupements annoncés.",
      })
    ).resolves.toEqual({ groupId: 7 });
    await expect(
      protectedCaller.events.selectPaceGroup({ eventId: 88, groupId: 6 })
    ).resolves.toEqual({ groupId: 6 });
    await expect(
      protectedCaller.events.preparation.passport()
    ).resolves.toEqual([{ eventId: 88, paceReflection: "comfortable" }]);
    await expect(
      protectedCaller.events.preparation.savePassport({
        eventId: 88,
        paceReflection: "comfortable",
      })
    ).resolves.toEqual({ eventId: 88 });
    await expect(
      protectedCaller.events.operationalDecisions({ eventId: 88 })
    ).resolves.toEqual([{ id: 8, acknowledgementRequired: true }]);
    await expect(
      protectedCaller.events.publishOperationalDecision({
        eventId: 88,
        outcome: "adapted",
        note: "Départ adapté au stationnement nord.",
        acknowledgementRequired: true,
      })
    ).resolves.toEqual({ decisionId: 8 });
    await expect(
      protectedCaller.events.acknowledgeOperationalDecision({
        eventId: 88,
        decisionId: 8,
      })
    ).resolves.toEqual(
      expect.objectContaining({ acknowledgedAt: expect.any(Date) })
    );
    expect(dbMocks.createEventAccessRadarEntry).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ eventId: 88, category: "parking" })
    );
    expect(dbMocks.createEventCarpoolHub).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ eventId: 88, label: "Métro" })
    );
    expect(dbMocks.selectEventPaceGroup).toHaveBeenCalledWith(42, {
      eventId: 88,
      groupId: 6,
    });
    expect(dbMocks.savePreparationPassportEntry).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ eventId: 88, paceReflection: "comfortable" })
    );
    expect(dbMocks.acknowledgeOperationalDecision).toHaveBeenCalledWith(42, {
      eventId: 88,
      decisionId: 8,
    });
  });

  it("lets a confirmed participant declare preparation status", async () => {
    dbMocks.setParticipantPreparationReady.mockResolvedValue({
      preparationReadyAt: new Date("2026-09-01T12:00:00.000Z"),
    });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.setPreparationReady({ eventId: 20, isReady: true })
    ).resolves.toEqual(
      expect.objectContaining({ preparationReadyAt: expect.any(Date) })
    );
    expect(dbMocks.setParticipantPreparationReady).toHaveBeenCalledWith(
      20,
      42,
      true
    );
  });

  it("covers the P0/P1 collective coordination chain with explicit participant actions", async () => {
    dbMocks.getEventById.mockResolvedValue({
      id: 20,
      hostId: 42,
      title: "Mont Orford",
      locationName: "Estrie",
      capacity: 3,
      requiresApproval: false,
      levelAdmissionPolicy: "confirmation",
    });
    // The join below is made by a participant, not by the organizer.
    dbMocks.getEventById.mockResolvedValueOnce({
      ...joinableOuting,
      id: 20,
      hostId: 9,
      title: "Mont Orford",
      locationName: "Estrie",
      capacity: 3,
      requiresApproval: false,
      levelAdmissionPolicy: "confirmation",
    });
    dbMocks.getParticipantCount.mockResolvedValue(3);
    dbMocks.promoteWaitlistedParticipant.mockResolvedValue({ status: "going" });
    dbMocks.requestCarpoolSeat.mockResolvedValue(54);
    dbMocks.decideCarpoolSeatReservation.mockResolvedValue({
      status: "accepted",
    });
    dbMocks.setParticipantPreparationReady.mockResolvedValue({
      preparationReadyAt: new Date("2026-09-01T12:00:00.000Z"),
    });
    dbMocks.checkInParticipant.mockResolvedValue(undefined);
    dbMocks.decideBookingRequest.mockResolvedValue({
      id: 31,
      eventId: 20,
      levelExceptionNote: "Expérience équivalente décrite.",
    });

    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.join({ eventId: 20, levelAcknowledged: true })
    ).resolves.toEqual({ status: "waitlist" });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.promoteWaitlist({ eventId: 20, participantId: 73 })
    ).resolves.toEqual({ status: "going" });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .marketplace.logistics.requestSeat({ offerId: 12, seatsRequested: 1 })
    ).resolves.toEqual({ reservationId: 54 });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .marketplace.logistics.decideSeat({
          reservationId: 54,
          status: "accepted",
        })
    ).resolves.toEqual({ status: "accepted" });
    await expect(
      hikingRouter.createCaller(protectedContext).marketplace.bookings.decide({
        requestId: 31,
        status: "accepted",
        levelExceptionDecisionNote: "Contexte confirmé avec le participant.",
      })
    ).resolves.toEqual({ success: true });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.setPreparationReady({ eventId: 20, isReady: true })
    ).resolves.toEqual(
      expect.objectContaining({ preparationReadyAt: expect.any(Date) })
    );
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.checkIn({ eventId: 20, participantId: 42 })
    ).resolves.toEqual({ success: true });

    expect(dbMocks.createUserNotification).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: "Liste d’attente" })
    );
    expect(dbMocks.joinEvent).toHaveBeenCalledWith(
      20,
      42,
      "waitlist",
      expect.objectContaining({ levelAcknowledged: true })
    );
    expect(dbMocks.checkInParticipant).toHaveBeenCalledWith(20, 42);
  });

  it("requires a confirmation or documented exception when the organizer activates a level requirement", async () => {
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 18,
      capacity: 10,
      requiresApproval: false,
      levelAdmissionPolicy: "confirmation",
    });
    dbMocks.getParticipantCount.mockResolvedValue(2);
    await expect(
      hikingRouter.createCaller(protectedContext).events.join({ eventId: 18 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("Confirm the required level"),
    });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.join({ eventId: 18, levelAcknowledged: true })
    ).resolves.toEqual({ status: "going" });
    expect(dbMocks.joinEvent).toHaveBeenCalledWith(
      18,
      42,
      "going",
      expect.objectContaining({ levelAcknowledged: true })
    );
  });

  it("routes a documented level exception to organizer review", async () => {
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 19,
      capacity: 10,
      requiresApproval: false,
      levelAdmissionPolicy: "confirmation",
    });
    dbMocks.getParticipantCount.mockResolvedValue(2);
    await expect(
      hikingRouter.createCaller(protectedContext).events.join({
        eventId: 19,
        levelExceptionNote:
          "Je souhaite participer avec un coorganisateur expérimenté.",
      })
    ).resolves.toEqual({ status: "pending" });
    expect(dbMocks.createBookingRequest).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        eventId: 19,
        levelExceptionNote:
          "Je souhaite participer avec un coorganisateur expérimenté.",
      })
    );
  });

  it("persists the organizer’s documented decision when resolving a level exception", async () => {
    dbMocks.decideBookingRequest.mockResolvedValue({
      id: 31,
      eventId: 19,
      levelExceptionNote:
        "Je souhaite participer avec un coorganisateur expérimenté.",
    });
    await expect(
      hikingRouter.createCaller(protectedContext).marketplace.bookings.decide({
        requestId: 31,
        status: "accepted",
        levelExceptionDecisionNote:
          "Contexte discuté et rythme de groupe adapté.",
      })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.decideBookingRequest).toHaveBeenCalledWith(
      31,
      42,
      "accepted",
      "Contexte discuté et rythme de groupe adapté."
    );
  });

  it("persists a documented refusal when the organizer declines a level exception", async () => {
    dbMocks.decideBookingRequest.mockResolvedValue({
      id: 32,
      eventId: 19,
      levelExceptionNote:
        "Je souhaite participer avec un coorganisateur expérimenté.",
    });
    await expect(
      hikingRouter.createCaller(protectedContext).marketplace.bookings.decide({
        requestId: 32,
        status: "declined",
        levelExceptionDecisionNote:
          "Les prérequis annoncés restent nécessaires pour cette sortie.",
      })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.decideBookingRequest).toHaveBeenCalledWith(
      32,
      42,
      "declined",
      "Les prérequis annoncés restent nécessaires pour cette sortie."
    );
  });

  it("returns ranked personal matches for an authenticated hiker", async () => {
    dbMocks.getHikerMatches.mockResolvedValue([
      { id: 12, matchScore: 85, matchReasons: ["difficulty", "distance"] },
    ]);
    await expect(
      hikingRouter.createCaller(protectedContext).marketplace.matches()
    ).resolves.toEqual([
      { id: 12, matchScore: 85, matchReasons: ["difficulty", "distance"] },
    ]);
    expect(dbMocks.getHikerMatches).toHaveBeenCalledWith(42);
  });

  it("connects organizer-guide creation, hiker matching and joining, then organizer check-in", async () => {
    const hikerContext = {
      user: { ...user, id: 73, externalId: "hiker-user", name: "Camille" },
      req: {},
      res: {},
    } as any;
    dbMocks.createHikingEvent.mockResolvedValue(88);
    dbMocks.getHikerMatches.mockResolvedValue([
      {
        id: 88,
        matchScore: 91,
        matchReasons: ["guide", "difficulty", "carpool"],
      },
    ]);
    dbMocks.getEventById.mockResolvedValue({
      ...joinableOuting,
      id: 88,
      hostId: 42,
      capacity: 12,
      requiresApproval: false,
    });
    dbMocks.getParticipantCount.mockResolvedValue(3);
    dbMocks.checkInParticipant.mockResolvedValue(undefined);

    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.create({ ...validEvent, outingType: "guided_hike" })
    ).resolves.toEqual({ eventId: 88 });
    await expect(
      hikingRouter.createCaller(hikerContext).marketplace.matches()
    ).resolves.toEqual([expect.objectContaining({ id: 88, matchScore: 91 })]);
    await expect(
      hikingRouter.createCaller(hikerContext).events.join({ eventId: 88 })
    ).resolves.toEqual({ status: "going" });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .events.checkIn({ eventId: 88, participantId: 73 })
    ).resolves.toEqual({ success: true });

    expect(dbMocks.createHikingEvent).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ outingType: "guided_hike" })
    );
    expect(dbMocks.getHikerMatches).toHaveBeenCalledWith(73);
    expect(dbMocks.joinEvent).toHaveBeenCalledWith(88, 73, "going");
    expect(dbMocks.checkInParticipant).toHaveBeenCalledWith(88, 73);
  });

  it("returns a clear unavailable state when a weather outlook has no route coordinates or is out of range", async () => {
    dbMocks.getEventById.mockResolvedValueOnce({
      id: 15,
      latitude: null,
      longitude: null,
    });
    await expect(
      hikingRouter.createCaller(publicContext).weather.outlook({ eventId: 15 })
    ).resolves.toMatchObject({ available: false });
    dbMocks.getEventById.mockResolvedValueOnce({
      id: 16,
      latitude: 46.81,
      longitude: -71.2,
      startsAt: new Date(Date.now() + 20 * 86_400_000),
    });
    await expect(
      hikingRouter.createCaller(publicContext).weather.outlook({ eventId: 16 })
    ).resolves.toMatchObject({
      available: false,
      note: expect.stringContaining("forecast window"),
    });
  });

  it("hides the weather outlook of an outing the caller may not read", async () => {
    dbMocks.canReadEventSheet.mockResolvedValue(false);
    await expect(
      hikingRouter.createCaller(publicContext).weather.outlook({ eventId: 17 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.getEventById).not.toHaveBeenCalled();
  });

  it("builds an indicative route outlook from representative GPX points", async () => {
    const startsAt = new Date(Date.now() + 3 * 86_400_000);
    const day = startsAt.toISOString().slice(0, 10);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        utc_offset_seconds: 0,
        daily: {
          time: [day],
          temperature_2m_min: [2],
          temperature_2m_max: [11],
          precipitation_probability_max: [45],
          wind_speed_10m_max: [24],
          wind_gusts_10m_max: [36],
          uv_index_max: [7],
          weather_code: [3],
        },
        hourly: {
          time: [`${day}T12:00`, `${day}T13:00`],
          temperature_2m: [22, 30],
          dew_point_2m: [14, 20],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      hikingRouter.createCaller(publicContext).weather.routeOutlook({
        startsAt,
        points: [
          {
            latitude: 46.81,
            longitude: -71.2,
            elevationMeters: 850,
            label: "high_point",
          },
        ],
      })
    ).resolves.toMatchObject({
      available: true,
      routePoints: [
        expect.objectContaining({
          label: "high_point",
          elevationMeters: 850,
          windSpeedKmh: 24,
          windGustKmh: 36,
          humidexMax: 38,
          uvIndexMax: 7,
        }),
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("persists a non-empty message in an event group", async () => {
    dbMocks.canViewEventCoordination.mockResolvedValue(true);
    dbMocks.createEventMessage.mockResolvedValue(19);
    dbMocks.getEventChatAudienceUserIds.mockResolvedValue([]);
    const result = await hikingRouter
      .createCaller(protectedContext)
      .community.sendMessage({ eventId: 8, content: "I will bring water." });
    expect(result).toEqual({ messageId: 19 });
    expect(dbMocks.createEventMessage).toHaveBeenCalledWith(
      8,
      42,
      "I will bring water."
    );
  });

  it("tells the organizing team about a participant's chat message, once per outing", async () => {
    dbMocks.canViewEventCoordination.mockResolvedValue(true);
    dbMocks.createEventMessage.mockResolvedValue(20);
    // Organizer 7, co-organizer 9, and the sender (42) who must not be told.
    dbMocks.getEventChatAudienceUserIds.mockResolvedValue([7, 9, 42]);

    await hikingRouter
      .createCaller(protectedContext)
      .community.sendMessage({ eventId: 8, content: "Retard de 10 minutes." });

    const notified = dbMocks.createUserNotification.mock.calls.map(
      ([userId]) => userId
    );
    expect(notified.sort()).toEqual([7, 9]);
    expect(dbMocks.createUserNotification).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        type: "group_message",
        actionPath: "/?event=8",
      }),
      { collapseUnread: true }
    );
  });

  it("restricts private outing details to the organizing team, participants and pending requesters", async () => {
    const privateEvent = {
      id: 31,
      hostId: 7,
      title: "Sortie privée",
      visibility: "private",
      checklist: [],
      logistics: {},
    };
    dbMocks.getEventDetail.mockResolvedValue(privateEvent);
    dbMocks.getEventParticipation.mockResolvedValue(undefined);
    dbMocks.getBookingRequestForEvent.mockResolvedValue(undefined);
    dbMocks.isEventCoOrganizer.mockResolvedValue(false);
    await expect(
      hikingRouter.createCaller(protectedContext).events.detail({ eventId: 31 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    dbMocks.getEventParticipation.mockResolvedValue({
      status: "going",
      checkedInAt: null,
      preparationReadyAt: null,
      levelAcknowledgedAt: null,
      levelExceptionStatus: null,
      levelExceptionDecisionNote: null,
    });
    await expect(
      hikingRouter.createCaller(protectedContext).events.detail({ eventId: 31 })
    ).resolves.toMatchObject({
      id: 31,
      participationStatus: "going",
      managementRole: null,
    });
    dbMocks.getEventParticipation.mockResolvedValue(undefined);
    dbMocks.isEventCoOrganizer.mockResolvedValue(true);
    await expect(
      hikingRouter.createCaller(protectedContext).events.detail({ eventId: 31 })
    ).resolves.toMatchObject({ id: 31, managementRole: "co_organizer" });
  });

  it("keeps event chat and coordination data for confirmed participants and the organizing team only", async () => {
    dbMocks.canViewEventCoordination.mockResolvedValue(false);
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.community.messages({ eventId: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.community.sendMessage({
        eventId: 8,
        content: "I will bring water.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.marketplace.logistics.detail({ eventId: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.createEventMessage).not.toHaveBeenCalled();
    dbMocks.canViewEventCoordination.mockResolvedValue(true);
    dbMocks.listEventMessages.mockResolvedValue([
      { id: 1, content: "Rendez-vous à 8 h" },
    ]);
    dbMocks.getEventLogistics.mockResolvedValue({
      meetingPoint: "Stationnement principal",
    });
    dbMocks.listCarpoolOffers.mockResolvedValue([]);
    dbMocks.listCarpoolSeatReservations.mockResolvedValue([]);
    await expect(caller.community.messages({ eventId: 8 })).resolves.toEqual([
      { id: 1, content: "Rendez-vous à 8 h" },
    ]);
    await expect(
      caller.marketplace.logistics.detail({ eventId: 8 })
    ).resolves.toEqual({
      logistics: { meetingPoint: "Stationnement principal" },
      carpool: [],
      reservations: [],
    });
  });

  it("hides non-public social profiles from other members while the owner keeps access", async () => {
    dbMocks.getSocialProfile.mockResolvedValue({
      user: { id: 9, name: "Nora" },
      profile: { profileVisibility: "private" },
      followers: 0,
      following: 0,
      achievements: [],
      socialLinks: [],
      posts: [],
    });
    await expect(
      hikingRouter.createCaller(protectedContext).social.profile({ userId: 9 })
    ).resolves.toBeNull();
    dbMocks.getSocialProfile.mockResolvedValue({
      user: { id: 42, name: "Camille" },
      profile: { profileVisibility: "private" },
      followers: 0,
      following: 0,
      achievements: [],
      socialLinks: [],
      posts: [],
    });
    await expect(
      hikingRouter.createCaller(protectedContext).social.profile({ userId: 42 })
    ).resolves.toMatchObject({ user: { id: 42 } });
  });

  it("shows a friends-only profile to friends and to nobody else", async () => {
    const friendsOnly = {
      user: { id: 9, name: "Nora" },
      profile: { profileVisibility: "friends" },
      followers: 0,
      following: 0,
      achievements: [],
      socialLinks: [],
      posts: [],
    };
    dbMocks.getSocialProfile.mockResolvedValue(friendsOnly);

    dbMocks.areFriends.mockResolvedValueOnce(true);
    await expect(
      hikingRouter.createCaller(protectedContext).social.profile({ userId: 9 })
    ).resolves.toMatchObject({ user: { id: 9 } });
    expect(dbMocks.areFriends).toHaveBeenCalledWith(9, user.id);

    dbMocks.areFriends.mockResolvedValueOnce(false);
    await expect(
      hikingRouter.createCaller(protectedContext).social.profile({ userId: 9 })
    ).resolves.toBeNull();

    await expect(
      hikingRouter.createCaller(publicContext).social.profile({ userId: 9 })
    ).resolves.toBeNull();

    dbMocks.getProfileByPublicSlug.mockResolvedValueOnce({
      userId: 9,
      publicSlug: "nora",
      profileVisibility: "friends",
    });
    dbMocks.areFriends.mockResolvedValueOnce(true);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.profileBySlug({ publicSlug: "nora" })
    ).resolves.toMatchObject({ userId: 9 });
  });

  it("rejects safety check-ins from users who are not confirmed participants", async () => {
    dbMocks.getEventById.mockResolvedValue({ id: 8, hostId: 7 });
    dbMocks.getEventParticipation.mockResolvedValue(undefined);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .safety.checkIn({ eventId: 8, kind: "manual_ok" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.createSafetyCheckIn).not.toHaveBeenCalled();
  });

  it("lets an authenticated hiker react and follow another profile", async () => {
    dbMocks.togglePostReaction.mockResolvedValue({ action: "added" });
    dbMocks.toggleFollow.mockResolvedValue({ following: true });
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.social.react({ postId: 9, reaction: "summit" })
    ).resolves.toEqual({ action: "added" });
    await expect(caller.social.follow({ userId: 10 })).resolves.toEqual({
      following: true,
    });
    expect(dbMocks.togglePostReaction).toHaveBeenCalledWith(42, 9, "summit");
    expect(dbMocks.toggleFollow).toHaveBeenCalledWith(42, 10);
  });

  it("returns an explicit conflict when a group name is already taken", async () => {
    dbMocks.createCommunityGroup.mockRejectedValue(
      new Error("Duplicate entry for key communityGroups_name_unique")
    );
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.groups.create({ name: "Montréal Trek", visibility: "public" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("checks group-name availability for an authenticated creator without replacing the database constraint", async () => {
    dbMocks.isCommunityGroupNameAvailable.mockResolvedValue(true);
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.groups.nameAvailable({ name: "Randonnées du dimanche" })
    ).resolves.toEqual({ available: true });
    expect(dbMocks.isCommunityGroupNameAvailable).toHaveBeenCalledWith(
      "Randonnées du dimanche"
    );
  });

  it("creates and lists organizer series with voluntary interest controls", async () => {
    dbMocks.createEventSeries.mockResolvedValue(21);
    dbMocks.listMyEventSeries.mockResolvedValue([
      {
        id: 21,
        sourceEventId: 8,
        name: "Randos du dimanche",
        cadence: "weekly",
        interestCount: 3,
      },
    ]);
    dbMocks.getEventSeriesForEvent.mockResolvedValue({
      id: 21,
      sourceEventId: 8,
      name: "Randos du dimanche",
      interestCount: 3,
      myInterested: false,
    });
    dbMocks.toggleEventSeriesInterest.mockResolvedValue({ interested: true });
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.events.series.create({
        sourceEventId: 8,
        name: "Randos du dimanche",
        cadence: "weekly",
      })
    ).resolves.toEqual({ seriesId: 21 });
    await expect(caller.events.series.mine()).resolves.toEqual([
      expect.objectContaining({ id: 21, interestCount: 3 }),
    ]);
    await expect(caller.events.series.byEvent({ eventId: 8 })).resolves.toEqual(
      expect.objectContaining({ myInterested: false })
    );
    await expect(
      caller.events.series.toggleInterest({ seriesId: 21 })
    ).resolves.toEqual({ interested: true });
    expect(dbMocks.createEventSeries).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ sourceEventId: 8, cadence: "weekly" })
    );
  });

  it("only sends a targeted relaunch through the protected organizer procedure", async () => {
    dbMocks.listRelaunchCandidates.mockResolvedValue([
      { userId: 9, name: "Nora", eventTitle: "Mont Rigaud" },
    ]);
    dbMocks.sendEventRelaunchInvites.mockResolvedValue({ sent: 1 });
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.events.series.relaunchCandidates({ eventId: 8 })
    ).resolves.toEqual([expect.objectContaining({ userId: 9 })]);
    await expect(
      caller.events.series.relaunch({
        eventId: 8,
        participantIds: [9],
        message: "Une nouvelle date est proposée si elle vous convient.",
      })
    ).resolves.toEqual({ sent: 1 });
    expect(dbMocks.sendEventRelaunchInvites).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ eventId: 8, participantIds: [9] })
    );
  });

  it("creates and lists personal group templates only for the authenticated owner", async () => {
    dbMocks.createUserCommunityGroupTemplate.mockResolvedValue(14);
    dbMocks.listUserCommunityGroupTemplates.mockResolvedValue([
      {
        id: 14,
        ownerId: 42,
        label: "Sorties locales",
        name: "Randonnées du dimanche",
        visibility: "public",
      },
    ]);
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.social.groups.templates.create({
        label: "Sorties locales",
        name: "Randonnées du dimanche",
        description: "Un modèle réutilisable.",
        visibility: "public",
      })
    ).resolves.toEqual({ templateId: 14 });
    await expect(caller.social.groups.templates.list()).resolves.toEqual([
      {
        id: 14,
        ownerId: 42,
        label: "Sorties locales",
        name: "Randonnées du dimanche",
        visibility: "public",
      },
    ]);
    expect(dbMocks.createUserCommunityGroupTemplate).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        label: "Sorties locales",
        name: "Randonnées du dimanche",
      })
    );
    expect(dbMocks.listUserCommunityGroupTemplates).toHaveBeenCalledWith(42);
  });

  it("protects group administrator roles and lets a group owner delegate one", async () => {
    dbMocks.setCommunityGroupMemberRole.mockRejectedValueOnce(
      new DomainError("Only the group owner can manage administrators")
    );
    await expect(
      hikingRouter.createCaller(protectedContext).social.groups.setMemberRole({
        groupId: 5,
        userId: 19,
        role: "moderator",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    dbMocks.setCommunityGroupMemberRole.mockResolvedValueOnce(undefined);
    await expect(
      hikingRouter.createCaller(adminContext).social.groups.setMemberRole({
        groupId: 5,
        userId: 19,
        role: "moderator",
      })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.setCommunityGroupMemberRole).toHaveBeenCalledWith(
      5,
      1,
      19,
      "moderator"
    );
  });

  it("uses direct-message preferences and forwards messages only through the protected messaging procedure", async () => {
    dbMocks.updateMessagingPreferences.mockResolvedValue({
      userId: 42,
      directMessagePolicy: "friends",
    });
    dbMocks.sendDirectMessage.mockResolvedValue({
      conversationId: 4,
      messageId: 22,
    });
    dbMocks.blockUser.mockResolvedValue(undefined);
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.messaging.updatePreferences({ directMessagePolicy: "friends" })
    ).resolves.toMatchObject({ directMessagePolicy: "friends" });
    await expect(
      caller.messaging.send({
        recipientId: 12,
        body: "Hello, would you like to hike?",
      })
    ).resolves.toEqual({ conversationId: 4, messageId: 22 });
    await expect(caller.messaging.block({ userId: 12 })).resolves.toEqual({
      success: true,
    });
    expect(dbMocks.sendDirectMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ recipientId: 12 })
    );
  });

  it("restricts group discussion messages to the protected group messaging procedure", async () => {
    dbMocks.createCommunityGroupMessage.mockResolvedValue(31);
    await expect(
      hikingRouter.createCaller(protectedContext).messaging.group.send({
        groupId: 8,
        body: "Meeting at the trailhead at 8:00.",
      })
    ).resolves.toEqual({ messageId: 31 });
    expect(dbMocks.createCommunityGroupMessage).toHaveBeenCalledWith(
      8,
      42,
      expect.objectContaining({ body: "Meeting at the trailhead at 8:00." })
    );
  });

  it("lists and responds to group invitations from the authenticated member", async () => {
    dbMocks.listPendingCommunityGroupInvites.mockResolvedValue([
      { groupId: 8, name: "Laurentides Trek" },
    ]);
    dbMocks.respondToCommunityGroupInvite.mockResolvedValue(undefined);
    dbMocks.inviteCommunityGroupMember.mockResolvedValue(undefined);
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.social.groups.invite({
        groupId: 8,
        userId: 19,
        message: "Souhaites-tu rejoindre nos sorties ?",
      })
    ).resolves.toEqual({ success: true });
    await expect(caller.social.groups.invitations()).resolves.toEqual([
      { groupId: 8, name: "Laurentides Trek" },
    ]);
    await expect(
      caller.social.groups.respondToInvite({ groupId: 8, accept: true })
    ).resolves.toEqual({ success: true });
    await expect(
      caller.social.groups.respondToInvite({ groupId: 8, accept: false })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.respondToCommunityGroupInvite).toHaveBeenCalledWith(
      8,
      42,
      true
    );
    expect(dbMocks.respondToCommunityGroupInvite).toHaveBeenCalledWith(
      8,
      42,
      false
    );
    expect(dbMocks.inviteCommunityGroupMember).toHaveBeenCalledWith(
      8,
      42,
      19,
      "Souhaites-tu rejoindre nos sorties ?"
    );
  });

  it("invites and accepts a community co-administrator by public handle", async () => {
    dbMocks.inviteCommunityGroupCoAdmin.mockResolvedValue({
      invitee: { userId: 77, publicSlug: "camille-rando" },
    });
    dbMocks.listPendingCommunityGroupCoAdminInvites.mockResolvedValue([
      { id: 15, groupName: "Laurentides Trek", valid: true },
    ]);
    dbMocks.respondToCommunityGroupCoAdminInvite.mockResolvedValue(undefined);
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.social.groups.coAdmins.invite({
        groupId: 8,
        publicSlug: "camille-rando",
      })
    ).resolves.toMatchObject({ invitee: { userId: 77 } });
    await expect(caller.social.groups.coAdmins.pending()).resolves.toEqual([
      { id: 15, groupName: "Laurentides Trek", valid: true },
    ]);
    await expect(
      caller.social.groups.coAdmins.respond({ invitationId: 15, accept: true })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.inviteCommunityGroupCoAdmin).toHaveBeenCalledWith(
      8,
      42,
      "camille-rando"
    );
    expect(dbMocks.respondToCommunityGroupCoAdminInvite).toHaveBeenCalledWith(
      15,
      42,
      true
    );
  });

  it("surfaces an invalid community co-administrator invitation as a conflict", async () => {
    dbMocks.respondToCommunityGroupCoAdminInvite.mockRejectedValue(
      new DomainError("This invitation is no longer valid")
    );
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.groups.coAdmins.respond({ invitationId: 15, accept: true })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "This invitation is no longer valid",
    });
  });

  it("surfaces a direct-message policy refusal and protects restricted group reads", async () => {
    dbMocks.sendDirectMessage
      .mockRejectedValueOnce(
        new DomainError("This member accepts messages from friends only")
      )
      .mockRejectedValueOnce(
        new DomainError("Messaging is unavailable for this member")
      );
    dbMocks.listCommunityGroupMessages.mockRejectedValueOnce(
      new DomainError("Only active group members can use this discussion")
    );
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.messaging.send({
        recipientId: 12,
        body: "Hello, may I join your hike?",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.messaging.send({
        recipientId: 12,
        body: "I will not reach a blocked member.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.messaging.group.list({ groupId: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps the no-direct-message policy and restricted direct threads inaccessible", async () => {
    dbMocks.updateMessagingPreferences.mockResolvedValueOnce({
      userId: 42,
      directMessagePolicy: "none",
    });
    dbMocks.sendDirectMessage.mockRejectedValueOnce(
      new DomainError("This member does not accept direct messages")
    );
    dbMocks.getDirectThread.mockRejectedValueOnce(
      new DomainError("Messaging is unavailable for this member")
    );
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.messaging.updatePreferences({ directMessagePolicy: "none" })
    ).resolves.toMatchObject({ directMessagePolicy: "none" });
    await expect(
      caller.messaging.send({
        recipientId: 12,
        body: "This should be refused.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.messaging.thread({ userId: 12 })).rejects.toMatchObject(
      { code: "FORBIDDEN" }
    );
  });

  it("lets a group administrator hide a message through the protected group moderation route", async () => {
    dbMocks.moderateCommunityGroupMessage.mockResolvedValue(undefined);
    await expect(
      hikingRouter.createCaller(protectedContext).messaging.group.moderate({
        groupId: 8,
        messageId: 17,
        moderationStatus: "hidden",
      })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.moderateCommunityGroupMessage).toHaveBeenCalledWith(
      8,
      17,
      42,
      "hidden"
    );
  });

  it("allows an organizer to check in a participant", async () => {
    dbMocks.getEventById.mockResolvedValue({ id: 8, hostId: 42 });
    const result = await hikingRouter
      .createCaller(protectedContext)
      .events.checkIn({ eventId: 8, participantId: 16 });
    expect(result).toEqual({ success: true });
    expect(dbMocks.checkInParticipant).toHaveBeenCalledWith(8, 16);
  });

  it("lets an organizer manage a participant through an explicit protected action", async () => {
    dbMocks.manageEventParticipant.mockResolvedValue({ status: "waitlist" });
    await expect(
      hikingRouter.createCaller(protectedContext).events.manageParticipant({
        eventId: 8,
        participantId: 16,
        action: "move_to_waitlist",
      })
    ).resolves.toEqual({ status: "waitlist" });
    expect(dbMocks.manageEventParticipant).toHaveBeenCalledWith(42, {
      eventId: 8,
      participantId: 16,
      action: "move_to_waitlist",
    });
  });

  it("blocks a standard user from accessing administration", async () => {
    await expect(
      hikingRouter.createCaller(protectedContext).admin.dashboard()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a standard user from every administrative read procedure", async () => {
    const caller = hikingRouter.createCaller(protectedContext);
    for (const request of [
      caller.admin.users(),
      caller.admin.guides(),
      caller.admin.reports(),
      caller.admin.events(),
      caller.admin.posts(),
      caller.admin.settings(),
    ]) {
      await expect(request).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("blocks a standard user from every sensitive administration mutation", async () => {
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.admin.updateSettings({ defaultLocale: "fr" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.updateUserStatus({ userId: 9, accountStatus: "suspended" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.reviewGuide({
        userId: 12,
        status: "approved",
        insuranceConfirmed: true,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.moderateContent({
        targetType: "post",
        targetId: 4,
        moderationStatus: "hidden",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.updateReport({ reportId: 3, status: "resolved" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires an insurance attestation before a guide approval", async () => {
    const caller = hikingRouter.createCaller(adminContext);
    await expect(
      caller.admin.reviewGuide({
        userId: 12,
        status: "approved",
        insuranceConfirmed: false,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    dbMocks.reviewGuideProfile.mockResolvedValue({
      userId: 12,
      status: "approved",
    });
    await expect(
      caller.admin.reviewGuide({
        userId: 12,
        status: "approved",
        insuranceConfirmed: true,
      })
    ).resolves.toMatchObject({ status: "approved" });
    expect(dbMocks.reviewGuideProfile).toHaveBeenCalledWith(
      1,
      12,
      "approved",
      true
    );
  });

  it("persists safety consent and a manual safety check-in", async () => {
    dbMocks.saveSafetyConsent.mockResolvedValue({
      userId: 42,
      locationSharingEnabled: true,
      emergencyContactEnabled: false,
    });
    dbMocks.getEventById.mockResolvedValue({ id: 8, hostId: 7 });
    dbMocks.getEventParticipation.mockResolvedValue({ status: "going" });
    dbMocks.createSafetyCheckIn.mockResolvedValue(28);
    const caller = hikingRouter.createCaller(protectedContext);
    await expect(
      caller.safety.saveConsent({
        locationSharingEnabled: true,
        emergencyContactEnabled: false,
      })
    ).resolves.toMatchObject({ locationSharingEnabled: true });
    await expect(
      caller.safety.checkIn({ eventId: 8, kind: "manual_ok" })
    ).resolves.toEqual({ checkInId: 28 });
  });

  it("lets a super user moderate a non-admin account", async () => {
    dbMocks.getUserById.mockResolvedValue({ id: 9, role: "user" });
    const result = await hikingRouter
      .createCaller(adminContext)
      .admin.updateUserStatus({
        userId: 9,
        accountStatus: "suspended",
        note: "Safety review",
      });
    expect(result).toEqual({ success: true });
    expect(dbMocks.updateAdminUserStatus).toHaveBeenCalledWith(
      9,
      "suspended",
      "Safety review"
    );
    expect(dbMocks.createModerationAction).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ targetType: "user", action: "suspend" })
    );
  });

  it("lets a super user update Canada defaults and integration policy", async () => {
    dbMocks.updateSiteSettings.mockResolvedValue({
      id: 1,
      defaultLocale: "fr",
      allTrailsEnabled: true,
      gaiaEnabled: true,
      stravaEnabled: true,
      garminEnabled: true,
      externalAlertsEnabled: true,
    });
    const result = await hikingRouter
      .createCaller(adminContext)
      .admin.updateSettings({
        defaultLocale: "fr",
        allTrailsEnabled: true,
        gaiaEnabled: true,
        stravaEnabled: true,
        garminEnabled: true,
        externalAlertsEnabled: true,
        eventRemindersEnabled: false,
      });
    expect(result).toMatchObject({
      id: 1,
      allTrailsEnabled: true,
      garminEnabled: true,
    });
    expect(dbMocks.updateSiteSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultLocale: "fr",
        allTrailsEnabled: true,
        gaiaEnabled: true,
        stravaEnabled: true,
        garminEnabled: true,
        externalAlertsEnabled: true,
      })
    );
  });

  it("lets a super user hide content and resolve a report", async () => {
    const adminCaller = hikingRouter.createCaller(adminContext);
    dbMocks.updateAdminReport.mockResolvedValueOnce({
      targetType: "post",
      targetId: 4,
    });
    await expect(
      adminCaller.admin.moderateContent({
        targetType: "post",
        targetId: 4,
        moderationStatus: "hidden",
        note: "Policy breach",
      })
    ).resolves.toEqual({ success: true });
    await expect(
      adminCaller.admin.updateReport({
        reportId: 3,
        status: "resolved",
        resolutionNote: "Content hidden",
      })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.updateContentModeration).toHaveBeenCalledWith(
      "post",
      4,
      "hidden",
      undefined
    );
    expect(dbMocks.updateAdminReport).toHaveBeenCalledWith(
      3,
      1,
      "resolved",
      "Content hidden"
    );
    // Logged against the reported post, not against a "message" numbered 3.
    expect(dbMocks.createModerationAction).toHaveBeenLastCalledWith(1, {
      targetType: "post",
      targetId: 4,
      action: "resolve_report",
      note: "Content hidden",
    });
  });

  it("lets a super user hide a reported message", async () => {
    const adminCaller = hikingRouter.createCaller(adminContext);
    await expect(
      adminCaller.admin.moderateContent({
        targetType: "message",
        targetId: 9,
        messageChannel: "direct",
        moderationStatus: "hidden",
        note: "Harassment report",
      })
    ).resolves.toEqual({ success: true });
    expect(dbMocks.updateContentModeration).toHaveBeenCalledWith(
      "message",
      9,
      "hidden",
      "direct"
    );
  });

  it("hides outing-sheet panels from anyone who may not read the outing", async () => {
    dbMocks.canReadEventSheet.mockResolvedValue(false);
    const caller = hikingRouter.createCaller(publicContext);
    const panels = [
      () => caller.events.terrainLandmarks({ eventId: 12 }),
      () => caller.events.actionAssignments({ eventId: 12 }),
      () => caller.events.conditionReports({ eventId: 12 }),
      () => caller.events.accessRadar({ eventId: 12 }),
      () => caller.events.weatherUpdates({ eventId: 12 }),
    ];
    for (const call of panels) {
      await expect(call()).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect(dbMocks.listEventTerrainLandmarks).not.toHaveBeenCalled();
    expect(dbMocks.listEventActionAssignments).not.toHaveBeenCalled();
    expect(dbMocks.listEventConditionReports).not.toHaveBeenCalled();
    expect(dbMocks.listEventAccessRadar).not.toHaveBeenCalled();
    expect(dbMocks.listWeatherUpdates).not.toHaveBeenCalled();
  });

  it("keeps a hidden or draft outing out of reach through a direct link", async () => {
    for (const state of [
      { status: "published", moderationStatus: "hidden" },
      { status: "draft", moderationStatus: "visible" },
    ]) {
      vi.clearAllMocks();
      dbMocks.canReadEventSheet.mockResolvedValue(true);
      dbMocks.getEventDetail.mockResolvedValue({
        id: 12,
        hostId: 999,
        visibility: "public",
        ...state,
      });
      dbMocks.getEventParticipation.mockResolvedValue(undefined);
      dbMocks.getBookingRequestForEvent.mockResolvedValue(undefined);
      dbMocks.isEventCoOrganizer.mockResolvedValue(false);
      await expect(
        hikingRouter.createCaller(publicContext).events.detail({ eventId: 12 })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });

  it("resolves an invitation link for a visitor and lets a member accept it", async () => {
    dbMocks.getSocialInvitePreview.mockResolvedValueOnce({
      senderName: "Ana",
      senderPublicSlug: null,
      senderAvatarUrl: null,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const token = "V1StGXR8_Z5jdHi6B-myT0123456789ab";
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .social.invitations.preview({ token })
    ).resolves.toMatchObject({ senderName: "Ana" });

    dbMocks.getSocialInvitePreview.mockResolvedValueOnce(undefined);
    await expect(
      hikingRouter
        .createCaller(publicContext)
        .social.invitations.preview({ token })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      hikingRouter
        .createCaller(publicContext)
        .social.invitations.accept({ token })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    dbMocks.acceptSocialInvite.mockResolvedValueOnce({ senderId: 7 });
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.invitations.accept({ token })
    ).resolves.toEqual({ senderId: 7 });
    expect(dbMocks.acceptSocialInvite).toHaveBeenCalledWith(token, user.id);

    dbMocks.acceptSocialInvite.mockRejectedValueOnce(
      new DomainError("This invitation is no longer valid")
    );
    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.invitations.accept({ token })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This invitation is no longer valid",
    });
  });

  it("gives co-organizers the organizer's participant and safety screens", async () => {
    const caller = hikingRouter.createCaller(protectedContext);
    dbMocks.getEventById.mockResolvedValue({ id: 30, hostId: 7 });
    dbMocks.listEventParticipants.mockResolvedValue([]);
    dbMocks.listActiveLiveLocations.mockResolvedValue([]);
    dbMocks.listBookingRequests.mockResolvedValue([]);
    dbMocks.listSafetyCheckIns.mockResolvedValue([{ id: 1 }]);

    dbMocks.isEventCoOrganizer.mockResolvedValue(true);
    await expect(caller.events.participants({ eventId: 30 })).resolves.toEqual(
      []
    );
    await expect(caller.safety.liveLocations({ eventId: 30 })).resolves.toEqual(
      []
    );
    await expect(
      caller.marketplace.bookings.list({ eventId: 30 })
    ).resolves.toEqual([]);
    await expect(caller.safety.checkIns({ eventId: 30 })).resolves.toEqual([
      { id: 1 },
    ]);

    dbMocks.isEventCoOrganizer.mockResolvedValue(false);
    await expect(
      caller.events.participants({ eventId: 30 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.safety.liveLocations({ eventId: 30 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.safety.checkIns({ eventId: 30 })).resolves.toEqual([]);
  });

  it("applies the join rule to a participation request", async () => {
    const caller = hikingRouter.createCaller(protectedContext);
    for (const unavailable of [
      { visibility: "private" },
      { visibility: "invite" },
      { status: "cancelled" },
      { moderationStatus: "hidden" },
    ]) {
      dbMocks.getEventById.mockResolvedValueOnce({
        id: 30,
        ...joinableOuting,
        ...unavailable,
      });
      await expect(
        caller.marketplace.bookings.request({
          eventId: 30,
          levelAcknowledged: false,
        })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    dbMocks.getEventById.mockResolvedValueOnce({
      id: 30,
      ...joinableOuting,
      startsAt: new Date(Date.now() - 60_000),
    });
    await expect(
      caller.marketplace.bookings.request({
        eventId: 30,
        levelAcknowledged: false,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createBookingRequest).not.toHaveBeenCalled();

    dbMocks.getEventById.mockResolvedValueOnce({ id: 30, ...joinableOuting });
    dbMocks.createBookingRequest.mockResolvedValueOnce(5);
    await expect(
      caller.marketplace.bookings.request({
        eventId: 30,
        levelAcknowledged: false,
      })
    ).resolves.toEqual({ requestId: 5 });
  });

  it("keeps the meeting point and emergency plan out of a visitor's outing sheet", async () => {
    const logistics = {
      meetingPoint: "Stationnement du chalet, 7 h",
      meetingInstructions: "Appeler Ana au 418 555-0199 en cas de retard",
      emergencyPlan: "Point d'évacuation : refuge du lac",
      operationalRoute: "Sentier 4 puis crête",
      backupPlan: "Boucle du lac",
      routeImageUrl: "/uploads/route.webp",
      terrainStatus: "caution",
      accessStatus: "open",
      terrainAccessNote: "Boue après le km 3",
    };
    dbMocks.getEventDetail.mockResolvedValue({
      id: 12,
      hostId: 999,
      visibility: "public",
      status: "published",
      moderationStatus: "visible",
      logistics,
    });
    dbMocks.getEventParticipation.mockResolvedValue(undefined);
    dbMocks.getBookingRequestForEvent.mockResolvedValue(undefined);
    dbMocks.isEventCoOrganizer.mockResolvedValue(false);

    const visitorSheet = await hikingRouter
      .createCaller(publicContext)
      .events.detail({ eventId: 12 });
    expect(visitorSheet.logistics).toMatchObject({
      meetingPoint: null,
      meetingInstructions: null,
      emergencyPlan: null,
      operationalRoute: null,
      backupPlan: null,
      routeImageUrl: null,
      terrainStatus: "caution",
      accessStatus: "open",
      terrainAccessNote: "Boue après le km 3",
    });

    dbMocks.getEventParticipation.mockResolvedValue({ status: "going" });
    const participantSheet = await hikingRouter
      .createCaller(protectedContext)
      .events.detail({ eventId: 12 });
    expect(participantSheet.logistics).toEqual(logistics);
  });

  it("lets a participant withdraw from an outing and reports the freed place", async () => {
    dbMocks.leaveEvent.mockResolvedValue({
      status: "cancelled",
      freedConfirmedPlace: true,
    });

    await expect(
      hikingRouter.createCaller(protectedContext).events.leave({ eventId: 12 })
    ).resolves.toEqual({ status: "cancelled", freedConfirmedPlace: true });
    expect(dbMocks.leaveEvent).toHaveBeenCalledWith(12, user.id);
  });

  it("surfaces why a withdrawal is refused instead of failing silently", async () => {
    dbMocks.leaveEvent.mockRejectedValue(
      new DomainError(
        "As the organizer you cannot leave your own outing — cancel it instead"
      )
    );

    await expect(
      hikingRouter.createCaller(protectedContext).events.leave({ eventId: 12 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot leave your own outing"),
    });
  });

  it("never forwards the text of an unexpected database error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    dbMocks.leaveEvent.mockRejectedValue(
      new Error(
        "Failed query: update `eventParticipants` set `status` = ? params: cancelled"
      )
    );

    const failure = hikingRouter
      .createCaller(protectedContext)
      .events.leave({ eventId: 12 });
    await expect(failure).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Unable to withdraw from this outing",
    });
    await expect(failure).rejects.not.toMatchObject({
      message: expect.stringContaining("Failed query"),
    });
    consoleError.mockRestore();
  });

  it("requires a session to withdraw", async () => {
    await expect(
      hikingRouter.createCaller(publicContext).events.leave({ eventId: 12 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.leaveEvent).not.toHaveBeenCalled();
  });

  it("lets a member leave a community group", async () => {
    dbMocks.leaveCommunityGroup.mockResolvedValue({ status: "left" });

    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.groups.leave({ groupId: 5 })
    ).resolves.toEqual({ status: "left" });
    expect(dbMocks.leaveCommunityGroup).toHaveBeenCalledWith(5, user.id);
  });

  it("refuses to let the group owner leave without handing the group over", async () => {
    dbMocks.leaveCommunityGroup.mockRejectedValue(
      new DomainError(
        "Transfer ownership or delete the group before leaving it"
      )
    );

    await expect(
      hikingRouter
        .createCaller(protectedContext)
        .social.groups.leave({ groupId: 5 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("Transfer ownership"),
    });
  });
});
