export function shouldActivateOutingPreparation({ isPreview, locallyJoined, participationStatus, isOrganizer }: { isPreview: boolean; locallyJoined: boolean; participationStatus?: string | null; isOrganizer: boolean }) {
  return !isPreview && (locallyJoined || participationStatus === "going" || isOrganizer);
}
