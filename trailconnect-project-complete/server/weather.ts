// Indicative forecasts from Open-Meteo, shared by the outing and route outlooks.
//
// Two defects lived in the copies this replaces, one in each procedure:
// - the requested day was `startsAt.toISOString().slice(0, 10)`, the UTC date.
//   With `timezone=auto` Open-Meteo reads dates in the location's local time, so
//   any outing leaving after 20:00 in Québec (UTC-4) got the next day's forecast;
// - nothing was cached, so each public call cost one to four upstream requests
//   against a daily quota shared by every visitor.

import { getHumidexEstimate } from "../shared/weatherComfort";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DAILY_FIELDS =
  "temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,weather_code";
const DAY_MS = 86_400_000;
/** Open-Meteo forecasts today plus 15 days. */
const MAX_FORECAST_DAYS_AHEAD = 15;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const REQUEST_TIMEOUT_MS = 4_000;

export type ForecastRequest = {
  latitude: number;
  longitude: number;
  startsAt: Date;
  elevationMeters?: number;
};

export type ForecastDay = {
  temperatureMinC: number;
  temperatureMaxC: number;
  precipitationProbability: number;
  windSpeedKmh: number;
  windGustKmh: number;
  humidexMax: number | undefined;
  uvIndexMax: number | undefined;
  weatherCode: number;
};

type ForecastPayload = {
  utc_offset_seconds?: number;
  daily?: Record<string, unknown[]>;
  hourly?: Record<string, unknown[]>;
};

const cache = new Map<string, { expiresAt: number; value: ForecastDay }>();

/** For tests: forget every cached forecast. */
export function clearForecastCache(): void {
  cache.clear();
}

const isoDay = (time: number): string =>
  new Date(time).toISOString().slice(0, 10);

function cacheKey(request: ForecastRequest): string {
  return [
    request.latitude.toFixed(3),
    request.longitude.toFixed(3),
    request.elevationMeters ?? "",
    // Hour precision: two outings leaving the same hour share an answer.
    Math.floor(request.startsAt.getTime() / 3_600_000),
  ].join("|");
}

function readCache(key: string): ForecastDay | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt > Date.now()) return entry.value;
  cache.delete(key);
  return undefined;
}

function writeCache(key: string, value: ForecastDay): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

/**
 * The local date is only known once the provider has told us the location's
 * UTC offset, so the request spans the UTC day on either side and the right
 * day is picked from the answer.
 */
function buildUrl(request: ForecastRequest): URL {
  const startsAtMs = request.startsAt.getTime();
  const lastForecastDay = Date.now() + MAX_FORECAST_DAYS_AHEAD * DAY_MS;
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(request.latitude));
  url.searchParams.set("longitude", String(request.longitude));
  url.searchParams.set("daily", DAILY_FIELDS);
  url.searchParams.set("hourly", "temperature_2m,dew_point_2m");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", isoDay(startsAtMs - DAY_MS));
  url.searchParams.set(
    "end_date",
    isoDay(Math.min(startsAtMs + DAY_MS, lastForecastDay))
  );
  if (request.elevationMeters !== undefined)
    url.searchParams.set("elevation", String(request.elevationMeters));
  return url;
}

function humidexMaxForDay(
  hourly: Record<string, unknown[]> | undefined,
  localDay: string
): number | undefined {
  const times = hourly?.time;
  const temperatures = hourly?.temperature_2m;
  const dewPoints = hourly?.dew_point_2m;
  if (
    !Array.isArray(times) ||
    !Array.isArray(temperatures) ||
    !Array.isArray(dewPoints)
  )
    return undefined;
  const values = times
    .map((time, index) =>
      String(time).startsWith(localDay)
        ? getHumidexEstimate({
            temperatureC: Number(temperatures[index]),
            dewPointC: Number(dewPoints[index]),
          })
        : null
    )
    .filter((value): value is number => value !== null);
  return values.length ? Math.max(...values) : undefined;
}

function pickDay(payload: ForecastPayload, startsAt: Date): ForecastDay {
  const daily = payload.daily;
  if (!daily || !Array.isArray(daily.time))
    throw new Error("Missing weather data");
  const offsetMs = Number(payload.utc_offset_seconds ?? 0) * 1000;
  const localDay = isoDay(startsAt.getTime() + offsetMs);
  const index = daily.time.findIndex(time => time === localDay);
  if (index === -1) throw new Error("No forecast for the outing day");
  const at = (field: string) => Number(daily[field]?.[index]);
  const uvIndex = at("uv_index_max");
  return {
    temperatureMinC: at("temperature_2m_min"),
    temperatureMaxC: at("temperature_2m_max"),
    precipitationProbability: at("precipitation_probability_max"),
    windSpeedKmh: at("wind_speed_10m_max"),
    windGustKmh: at("wind_gusts_10m_max"),
    humidexMax: humidexMaxForDay(payload.hourly, localDay),
    uvIndexMax: Number.isFinite(uvIndex) ? Math.round(uvIndex) : undefined,
    weatherCode: at("weather_code"),
  };
}

/** Whether `startsAt` falls inside the provider's forecast window. */
export function isWithinForecastWindow(startsAt: Date): boolean {
  const daysAway = Math.floor((startsAt.getTime() - Date.now()) / DAY_MS);
  return daysAway >= 0 && daysAway <= MAX_FORECAST_DAYS_AHEAD;
}

/** Forecast for the outing's local day. Throws when the provider fails. */
export async function fetchForecastDay(
  request: ForecastRequest
): Promise<ForecastDay> {
  const key = cacheKey(request);
  const cached = readCache(key);
  if (cached) return cached;

  const response = await fetch(buildUrl(request), {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Weather provider unavailable");
  const forecast = pickDay(
    (await response.json()) as ForecastPayload,
    request.startsAt
  );
  writeCache(key, forecast);
  return forecast;
}
