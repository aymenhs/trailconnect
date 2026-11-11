export type IntegrationId = "maps" | "mountain_weather" | "alltrails" | "gaia" | "strava" | "garmin" | "apple_health" | "health_connect" | "inreach" | "zoleo" | "spot";
export type IntegrationStatus = "available" | "ready_to_connect" | "planned";

export type OutdoorIntegration = {
  id: IntegrationId;
  name: string;
  status: IntegrationStatus;
  capabilities: string[];
};

export const outdoorIntegrations: OutdoorIntegration[] = [
  { id: "maps", name: "Google Maps", status: "available", capabilities: ["interactive-map", "geocoding", "markers"] },
  { id: "mountain_weather", name: "Mountain weather", status: "planned", capabilities: ["summit-forecast", "wind-alerts", "precipitation-alerts"] },
  { id: "alltrails", name: "AllTrails", status: "planned", capabilities: ["route-import", "route-metadata"] },
  { id: "gaia", name: "Gaia GPS", status: "planned", capabilities: ["route-import", "topographic-layers"] },
  { id: "garmin", name: "Garmin", status: "ready_to_connect", capabilities: ["activity-import", "gpx-course-exchange"] },
  { id: "strava", name: "Strava", status: "ready_to_connect", capabilities: ["activity-import", "gpx-route-exchange"] },
  { id: "apple_health", name: "Apple Health", status: "ready_to_connect", capabilities: ["completed-activity-import", "route-consent"] },
  { id: "health_connect", name: "Health Connect", status: "ready_to_connect", capabilities: ["completed-activity-import", "route-consent"] },
  { id: "inreach", name: "Garmin inReach", status: "ready_to_connect", capabilities: ["voluntary-check-in", "location-message-ingest"] },
  { id: "zoleo", name: "ZOLEO", status: "ready_to_connect", capabilities: ["voluntary-check-in", "location-message-ingest"] },
  { id: "spot", name: "SPOT", status: "planned", capabilities: ["check-in-import"] },
];

export function getIntegration(id: IntegrationId) {
  return outdoorIntegrations.find(integration => integration.id === id);
}
