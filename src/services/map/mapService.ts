import type {
  HospitalLocation,
  MapRouteResult,
  ReverseGeocodeResult,
  TileSource,
  ProviderQuotaInfo,
} from '../../types/map';
import { geoapifyProvider } from './geoapifyProvider';
import { locationIqProvider } from './locationIqProvider';
import { mapCache } from './mapCacheService';
import {
  getAllQuotaStatuses,
  isConfigured,
  markExhausted,
  resetIfNewDay,
} from './apiQuotaService';
import { logDiscovery } from './discoveryDebugLog';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export type MapServiceStatus = {
  primary: 'geoapify' | 'locationiq' | 'cache';
  primaryStatus: string;
  fallbackStatus: string;
  message?: string;
};

export class MapService {
  private primary = geoapifyProvider;
  private fallback = locationIqProvider;
  private lastNearbyCacheKey = '';

  private resetDailyCounters(): void {
    resetIfNewDay('geoapify', 2800);
    resetIfNewDay('locationiq', 4500);
  }

  private getPrimary(): typeof geoapifyProvider | typeof locationIqProvider {
    this.resetDailyCounters();
    const geoStatus = this.primary.getQuotaStatus();
    if (geoStatus.status === 'active') {
      return this.primary;
    }
    const iqStatus = this.fallback.getQuotaStatus();
    if (iqStatus.status === 'active') {
      return this.fallback;
    }
    // Both unavailable — return primary as fallback target for messaging
    return this.primary;
  }

  getStatus(): MapServiceStatus {
    this.resetDailyCounters();
    const geo = geoapifyProvider.getQuotaStatus();
    const iq = locationIqProvider.getQuotaStatus();

    let primaryName: 'geoapify' | 'locationiq' | 'cache' = 'geoapify';
    let message: string | undefined;

    const geoActive = geo.status === 'active';
    const iqActive = iq.status === 'active';

    if (geoActive) {
      primaryName = 'geoapify';
    } else if (iqActive) {
      primaryName = 'locationiq';
    } else {
      primaryName = 'cache';
      if (!isConfigured('geoapify') && !isConfigured('locationiq')) {
        message = 'Map provider not configured. Add VITE_GEOAPIFY_API_KEY or VITE_LOCATIONIQ_API_KEY to your environment.';
      } else if (geo.status === 'exhausted' && iq.status === 'exhausted') {
        message = "Today's free map-service limit has been reached. Live map search is temporarily unavailable. Showing available MediFlow-synchronized hospital information.";
      } else if (geo.status === 'exhausted') {
        message = 'Geoapify daily free usage limit reached. Switching to LocationIQ.';
      } else if (iq.status === 'exhausted') {
        message = 'LocationIQ daily free usage limit reached. Live map services are temporarily limited.';
      }
    }

    return {
      primary: primaryName,
      primaryStatus: geo.status,
      fallbackStatus: iq.status,
      message,
    };
  }

  getAllQuotaStatuses(): ProviderQuotaInfo[] {
    return getAllQuotaStatuses();
  }

  getTileSource(style: string = 'positron'): TileSource | null {
    const provider = this.getPrimary();
    return provider.getTileSource(style);
  }

  async searchNearbyHospitals(
    lat: number,
    lon: number,
    radiusMeters: number
  ): Promise<{ hospitals: HospitalLocation[]; provider: string; cached: boolean }> {
    const cacheKey = `nearby:${lat.toFixed(3)}:${lon.toFixed(3)}:${radiusMeters}`;
    const cached = mapCache.get<{ hospitals: HospitalLocation[]; provider: string }>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const provider = this.getPrimary();
    let results: HospitalLocation[] = [];

    try {
      results = await provider.searchNearbyHospitals({ lat, lon, radiusMeters });
    } catch (err: any) {
      logDiscovery({
        provider: provider.name === 'geoapify' ? 'Geoapify' : 'LocationIQ',
        lat,
        lon,
        radius: radiusMeters,
        error: 'NETWORK_ERROR',
        fallbackReason: err.message,
      });
    }

    // If primary is Geoapify and returned empty, try LocationIQ
    if (results.length === 0 && provider.name === 'geoapify') {
      logDiscovery({
        provider: 'Geoapify',
        lat,
        lon,
        radius: radiusMeters,
        results: 0,
        fallbackReason: 'No results from primary provider',
      });
      try {
        const fallbackResults = await locationIqProvider.searchNearbyHospitals({ lat, lon, radiusMeters });
        if (fallbackResults.length > 0) {
          results = fallbackResults;
        }
      } catch (err: any) {
        logDiscovery({
          provider: 'LocationIQ',
          lat,
          lon,
          radius: radiusMeters,
          error: 'NETWORK_ERROR',
          fallbackReason: err.message,
        });
      }
    }

    const out = { hospitals: results, provider: results.length > 0 && provider.name === 'geoapify' && results[0].provider === 'locationiq' ? 'locationiq' : provider.name, cached: false };
    mapCache.set(cacheKey, out, 10 * 60 * 1000);
    return out;
  }

  async searchPlaces(
    query: string,
    lat?: number,
    lon?: number
  ): Promise<{ places: HospitalLocation[]; provider: string }> {
    const provider = this.getPrimary();
    let results: HospitalLocation[] = [];

    try {
      results = await provider.searchPlaces({
        query,
        lat,
        lon,
        radiusMeters: 30000,
        limit: 15,
        categories: ['healthcare.hospital'],
      });
    } catch {
      // transient
    }

    if (results.length === 0 && provider.name === 'geoapify') {
      try {
        const fb = await locationIqProvider.searchPlaces({ query, lat, lon, limit: 15 });
        if (fb.length > 0) results = fb;
      } catch {
        // ignore
      }
    }

    return { places: results, provider: results.length > 0 ? (provider.name === 'geoapify' && results[0].provider === 'locationiq' ? 'locationiq' : provider.name) : provider.name };
  }

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
    const provider = this.getPrimary();
    try {
      const result = await provider.reverseGeocode(lat, lon);
      if (result.address && !result.address.includes(`${lat.toFixed(4)}, ${lon.toFixed(4)}`)) {
        return result;
      }
    } catch {
      // transient
    }

    if (provider.name === 'geoapify') {
      try {
        return await locationIqProvider.reverseGeocode(lat, lon);
      } catch {
        // ignore
      }
    }

    return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'cache' };
  }

  async geocode(query: string): Promise<ReverseGeocodeResult[]> {
    const provider = this.getPrimary();
    let results: ReverseGeocodeResult[] = [];

    try {
      results = await provider.geocode({ query, limit: 5 });
    } catch {
      // transient
    }

    if (results.length === 0 && provider.name === 'geoapify') {
      try {
        results = await locationIqProvider.geocode({ query, limit: 5 });
      } catch {
        // ignore
      }
    }

    return results;
  }

  async getRoute(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number
  ): Promise<MapRouteResult | null> {
    const cacheKey = `route:${originLat.toFixed(4)}:${originLon.toFixed(4)}:${destLat.toFixed(4)}:${destLon.toFixed(4)}`;
    const cached = mapCache.get<MapRouteResult>(cacheKey);
    if (cached) return { ...cached, cached: true };

    // 1. Try Geoapify Routing first
    try {
      const geoRoute = await geoapifyProvider.getRoute({ originLat, originLon, destLat, destLon });
      if (geoRoute) {
        mapCache.set(cacheKey, geoRoute, 10 * 60 * 1000);
        return geoRoute;
      }
    } catch {
      // transient
    }

    // 2. Try LocationIQ Routing (free tier may not support routing)
    try {
      const iqRoute = await locationIqProvider.getRoute({ originLat, originLon, destLat, destLon });
      if (iqRoute) {
        mapCache.set(cacheKey, iqRoute, 10 * 60 * 1000);
        return iqRoute;
      }
    } catch {
      // transient
    }

    // 3. Optional public OSRM demo fallback — ONLY if explicitly enabled via env flag.
    // WARNING: public OSRM demo is rate-limited and NOT for production use.
    const enableOsrmDemo = import.meta.env.VITE_ENABLE_OSRM_DEMO_FALLBACK === 'true';
    if (enableOsrmDemo) {
      try {
        const url = `${OSRM_BASE}/${originLon},${originLat};${destLon},${destLat}?overview=full`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error('OSRM routing failed');

        const data = await res.json();
        const route = data.routes && data.routes[0];
        if (!route) return null;

        const result: MapRouteResult = {
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(route.duration / 60)),
          provider: 'cache',
          geometry: route.geometry,
        };

        mapCache.set(cacheKey, result, 10 * 60 * 1000);
        return result;
      } catch {
        // ignore
      }
    }

    // 4. No route available
    return null;
  }

  getAttribution(): string {
    const provider = this.getPrimary();
    return provider.getAttribution();
  }

  isConfigured(): boolean {
    return isConfigured('geoapify') || isConfigured('locationiq');
  }

  getUnconfiguredMessage(): string | null {
    if (!isConfigured('geoapify') && !isConfigured('locationiq')) {
      return 'Map provider not configured. Add VITE_GEOAPIFY_API_KEY or VITE_LOCATIONIQ_API_KEY to your environment.';
    }
    return null;
  }
}

export const mapService = new MapService();
