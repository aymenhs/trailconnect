export type HumidexInput = { temperatureC?: number | null; dewPointC?: number | null };
export type WindChillInput = { temperatureC?: number | null; windSpeedKmh?: number | null };
export type WindChillEstimate = { temperatureC: number; deltaC: number };

/** Canadian wind-chill index, relevant at 0 °C or lower with wind speed of at least 5 km/h. */
export function getWindChillEstimate({ temperatureC, windSpeedKmh }: WindChillInput): WindChillEstimate | null {
  if (!Number.isFinite(temperatureC) || !Number.isFinite(windSpeedKmh) || (temperatureC ?? Infinity) > 0 || (windSpeedKmh ?? 0) < 5) return null;
  const windFactor = Math.pow(windSpeedKmh as number, 0.16);
  const estimate = 13.12 + 0.6215 * (temperatureC as number) - 11.37 * windFactor + 0.3965 * (temperatureC as number) * windFactor;
  const roundedTemperature = Math.round(estimate);
  return { temperatureC: roundedTemperature, deltaC: Math.max(0, Math.round(temperatureC as number) - roundedTemperature) };
}

/** Environment and Climate Change Canada humidex formula using air temperature and dew point. */
export function getHumidexEstimate({ temperatureC, dewPointC }: HumidexInput): number | null {
  if (!Number.isFinite(temperatureC) || !Number.isFinite(dewPointC) || (temperatureC ?? -Infinity) < 25) return null;
  const vapourPressure = 6.11 * Math.exp(5417.7530 * ((1 / 273.15) - (1 / ((dewPointC as number) + 273.15))));
  const humidex = Math.round((temperatureC as number) + 0.5555 * (vapourPressure - 10));
  return humidex > Math.round(temperatureC as number) ? humidex : null;
}
