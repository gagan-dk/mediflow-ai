const DEV_LOG_PREFIX = '[HospitalDiscovery]';

export function logDiscovery(entry: {
  provider: string;
  lat: number;
  lon: number;
  radius: number;
  status?: number;
  results?: number;
  error?: string;
  fallbackReason?: string;
}) {
  if (import.meta.env.DEV) {
    if (entry.error) {
      console.warn(
        `${DEV_LOG_PREFIX}
Provider: ${entry.provider}
lat: ${entry.lat}
lon: ${entry.lon}
radius: ${entry.radius}
error: ${entry.error}
${entry.fallbackReason ? `→ falling back: ${entry.fallbackReason}` : ''}`
      );
    } else {
      console.log(
        `${DEV_LOG_PREFIX}
Provider: ${entry.provider}
lat: ${entry.lat}
lon: ${entry.lon}
radius: ${entry.radius}
status: ${entry.status ?? 'n/a'}
results: ${entry.results ?? 0}`
      );
    }
  }
}
