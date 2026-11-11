import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearForecastCache, fetchForecastDay } from "./weather";

/** Open-Meteo answer for three local days around the requested one. */
function threeDayPayload(utcOffsetSeconds: number) {
  return {
    utc_offset_seconds: utcOffsetSeconds,
    daily: {
      time: ["2026-09-29", "2026-09-30", "2026-10-01"],
      temperature_2m_min: [1, 2, 3],
      temperature_2m_max: [10, 20, 30],
      precipitation_probability_max: [5, 50, 95],
      wind_speed_10m_max: [11, 22, 33],
      wind_gusts_10m_max: [14, 28, 42],
      uv_index_max: [1, 4, 7],
      weather_code: [0, 3, 61],
    },
    hourly: {
      time: ["2026-09-30T13:00", "2026-10-01T13:00"],
      temperature_2m: [22, 35],
      dew_point_2m: [14, 25],
    },
  };
}

describe("fetchForecastDay", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00.000Z"));
    clearForecastCache();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => threeDayPayload(-4 * 3600),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reads the local day of an evening outing, not the UTC day", async () => {
    // 20:30 in Montréal on Sept 30 is already Oct 1 in UTC.
    const forecast = await fetchForecastDay({
      latitude: 45.5,
      longitude: -73.6,
      startsAt: new Date("2026-10-01T00:30:00.000Z"),
    });
    expect(forecast).toMatchObject({
      temperatureMaxC: 20,
      precipitationProbability: 50,
      windGustKmh: 28,
      uvIndexMax: 4,
      weatherCode: 3,
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("start_date")).toBe("2026-09-30");
    expect(url.searchParams.get("end_date")).toBe("2026-10-02");
  });

  it("serves a repeated request from cache", async () => {
    const request = {
      latitude: 46.81,
      longitude: -71.2,
      startsAt: new Date("2026-10-01T00:30:00.000Z"),
    };
    await fetchForecastDay(request);
    await fetchForecastDay(request);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails when the provider has no data for the local day", async () => {
    await expect(
      fetchForecastDay({
        latitude: 45.5,
        longitude: -73.6,
        startsAt: new Date("2026-10-05T15:00:00.000Z"),
      })
    ).rejects.toThrow();
  });
});
