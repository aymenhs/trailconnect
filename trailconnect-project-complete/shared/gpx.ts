export type GpxMetrics = {
  pointCount: number;
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
  weatherWaypoints: Array<{ latitude: number; longitude: number; elevationMeters?: number; label: "start" | "midpoint" | "high_point" | "finish" }>;
};

type Point = { lat: number; lon: number; elevation?: number };

function haversineKm(a: Point, b: Point) {
  const radius = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const origin = radians(a.lat);
  const destination = radians(b.lat);
  const unit = Math.sin(dLat / 2) ** 2 + Math.cos(origin) * Math.cos(destination) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(unit));
}

export function analyzeGpx(xml: string): GpxMetrics {
  const points: Point[] = [];
  const pattern = /<trkpt\s+[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml))) {
    const elevationMatch = /<ele>([^<]+)<\/ele>/i.exec(match[3]);
    const lat = Number(match[1]); const lon = Number(match[2]); const elevation = elevationMatch ? Number(elevationMatch[1]) : undefined;
    if (Number.isFinite(lat) && Number.isFinite(lon)) points.push({ lat, lon, ...(Number.isFinite(elevation) ? { elevation } : {}) });
  }
  let distanceKm = 0; let elevationGain = 0; let elevationLoss = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceKm += haversineKm(points[index - 1], points[index]);
    const previous = points[index - 1].elevation; const current = points[index].elevation;
    if (previous !== undefined && current !== undefined) { const delta = current - previous; if (delta > 0) elevationGain += delta; else elevationLoss += Math.abs(delta); }
  }
  const meaningfulPoints = points.length ? [
    { point: points[0], label: "start" as const },
    { point: points.reduce((highest, point) => (point.elevation ?? -Infinity) > (highest.elevation ?? -Infinity) ? point : highest, points[0]), label: "high_point" as const },
    { point: points[Math.floor((points.length - 1) / 2)], label: "midpoint" as const },
    { point: points[points.length - 1], label: "finish" as const },
  ] : [];
  const weatherWaypoints = meaningfulPoints.filter(({ point }, index, all) => all.findIndex(candidate => candidate.point.lat === point.lat && candidate.point.lon === point.lon) === index).map(({ point, label }) => ({ latitude: point.lat, longitude: point.lon, ...(point.elevation !== undefined ? { elevationMeters: point.elevation } : {}), label }));
  return { pointCount: points.length, distanceKm: Math.round(distanceKm * 100) / 100, elevationGain: Math.round(elevationGain), elevationLoss: Math.round(elevationLoss), weatherWaypoints };
}
