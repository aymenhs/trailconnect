export type NotificationType =
  | "registration"
  | "event_update"
  | "group_message"
  | "departure_reminder"
  | "safety"
  | "account";

export type NotificationSwitches = {
  inAppEnabled: boolean;
  eventUpdates: boolean;
  groupMessages: boolean;
  departureReminders: boolean;
  safetyAlerts: boolean;
};

/**
 * The switch that governs each type. `null` marks what the member asked for
 * themselves — their own registration, their account — which always arrives.
 */
const SWITCH_FOR_TYPE: Record<
  NotificationType,
  Exclude<keyof NotificationSwitches, "inAppEnabled"> | null
> = {
  registration: null,
  account: null,
  event_update: "eventUpdates",
  group_message: "groupMessages",
  departure_reminder: "departureReminders",
  safety: "safetyAlerts",
};

/**
 * Whether an in-app notification of `type` should be created. The settings page
 * offered these switches, but only one code path ever read them: turning off
 * group messages or reminders changed nothing. No saved preferences means the
 * defaults, which are all on.
 */
export function shouldDeliverNotification(
  type: NotificationType,
  switches: Partial<NotificationSwitches> | null | undefined
): boolean {
  const governingSwitch = SWITCH_FOR_TYPE[type];
  if (governingSwitch === null) return true;
  if (switches?.inAppEnabled === false) return false;
  return switches?.[governingSwitch] !== false;
}
