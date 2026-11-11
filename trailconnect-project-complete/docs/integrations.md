# Outdoor integration layer

TrailConnect exposes a typed integration catalog through `hiking.integrations.status`. The Google Maps client component is already available for interactive discovery maps, markers and geocoding. The weather and outdoor-service entries are deliberately marked **planned**; they do not present simulated connections to users.

| Connector | Current status | Prepared product contract |
|---|---|---|
| Google Maps | Available | Interactive map, markers, geocoding |
| Mountain weather | Planned | Summit forecast, wind and precipitation alerts |
| AllTrails / Gaia GPS | Planned | Manual route-import replacement, route metadata, topo layers |
| Strava | Planned | Post-event activity synchronisation and event segments |
| Garmin | Planned | Consent-based live location and SOS signal |

The backend contract is intentionally provider-neutral. OAuth callback management, provider credentials and scheduled synchronisation should be added only once the relevant provider access is confirmed.
