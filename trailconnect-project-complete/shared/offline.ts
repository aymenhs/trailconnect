export type OfflinePack = {
  version: 1;
  event: {
    id: number;
    title: string;
    locationName: string;
    startsAt: string;
    distanceKm: number;
    elevationGain: number;
    durationMinutes: number;
    gpxUrl?: string | null;
  };
  checklist: string[];
  safetyNote: string;
  dayOfBrief?: {
    generatedAt: string;
    meetingPoint?: string | null;
    meetingInstructions?: string | null;
    emergencyPlan?: string | null;
    operationalRoute?: string | null;
    backupPlan?: string | null;
    routeImageUrl?: string | null;
    weatherUpdate?: string | null;
    weatherUpdatedAt?: string | null;
    localWeatherSource?: { label: string; url: string } | null;
    terrainAccess?: {
      terrainStatus: "unknown" | "open" | "caution" | "restricted" | "closed";
      accessStatus: "unknown" | "open" | "caution" | "restricted" | "closed";
      note?: string | null;
      source?: { label: string; url: string } | null;
      checkedAt?: string | null;
    } | null;
    pinnedMessage?: {
      content: string;
      senderName?: string | null;
      createdAt?: string | null;
    } | null;
    terrainLandmarks?: Array<{
      type: "water" | "shelter" | "parking";
      label: string;
      note?: string | null;
      status: "reported" | "limited" | "unavailable" | "unknown";
      latitude?: number | null;
      longitude?: number | null;
      verifiedAt?: string | null;
    }>;
    carpool: Array<{
      departureLocation: string;
      seatsAvailable: number;
      departureAt?: string | null;
      driverName?: string | null;
    }>;
  };
  savedAt: string;
};

const storagePrefix = "trailconnect-offline-";

export function buildOfflinePack(
  input: Omit<OfflinePack, "version" | "savedAt">,
  savedAt = new Date().toISOString()
): OfflinePack {
  return { version: 1, ...input, savedAt };
}

/**
 * Returns false when the pack could not be stored — a full quota throws
 * QuotaExceededError, and this used to bring the calling component down.
 * Callers are expected to tell the user rather than silently pretend the
 * outing is available offline.
 */
export function saveOfflinePack(pack: OfflinePack): boolean {
  try {
    window.localStorage.setItem(
      `${storagePrefix}${pack.event.id}`,
      JSON.stringify(pack)
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * How long a pack outlives its outing. Packs hold the meeting point, the
 * emergency plan and drivers' names; they used to stay in the browser forever.
 */
export const OFFLINE_PACK_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

function offlinePackKeys(): string[] {
  return Object.keys(window.localStorage).filter(key =>
    key.startsWith(storagePrefix)
  );
}

function readPack(key: string): OfflinePack | null {
  try {
    const pack = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return pack?.version === 1 && pack.event?.title ? pack : null;
  } catch {
    return null;
  }
}

function isExpired(pack: OfflinePack, now: number): boolean {
  const startsAt = Date.parse(pack.event.startsAt);
  return (
    Number.isFinite(startsAt) && startsAt + OFFLINE_PACK_RETENTION_MS < now
  );
}

/** Saved packs, newest first. Unreadable and expired packs are removed. */
export function listOfflinePacks(now: number = Date.now()): OfflinePack[] {
  try {
    const packs = offlinePackKeys().flatMap(key => {
      const pack = readPack(key);
      if (pack && !isExpired(pack, now)) return [pack];
      window.localStorage.removeItem(key);
      return [];
    });
    return packs.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

/** On sign-out: a shared device must not keep the last member's outings. */
export function clearOfflinePacks(): void {
  try {
    offlinePackKeys().forEach(key => window.localStorage.removeItem(key));
  } catch {
    // Storage unavailable: nothing was stored either.
  }
}
