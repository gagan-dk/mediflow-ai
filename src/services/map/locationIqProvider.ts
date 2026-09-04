import type { MapProvider, SearchNearbyHospitalsOptions, SearchPlacesOptions, GeocodeOptions, RouteOptions } from './mapProvider';
import type { HospitalLocation, ReverseGeocodeResult, MapRouteResult, TileSource } from '../../types/map';
import { getQuotaStatus, incrementUsage, markExhausted, getApiKey, isConfigured } from './apiQuotaService';
import { mapCache } from './mapCacheService';
import { logDiscovery } from './discoveryDebugLog';

export class LocationIqProvider implements MapProvider {
  name = 'locationiq' as const;
  private baseUrl = 'https://us1.locationiq.com/v1';
  private tileBaseUrl = 'https://tiles.locationiq.com/v1/static';

  getQuotaStatus() {
    return getQuotaStatus('locationiq', 4500);
  }

  getAttribution(): string {
    return '© <a href="https://locationiq.com/" target="_blank" rel="noopener">LocationIQ</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  }

  getTileSource(_style?: string): TileSource | null {
    const key = getApiKey('locationiq');
    if (!key) return null;
    // LocationIQ static tiles require a style; default to streets
    return {
      url: `${this.tileBaseUrl}/streets/{z}/{x}/{y}.png?key=${key}`,
      attribution: this.getAttribution(),
      maxZoom: 18,
    };
  }

  async searchNearbyHospitals(
    options: SearchNearbyHospitalsOptions
  ): Promise<HospitalLocation[]> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      logDiscovery({
        provider: 'LocationIQ',
        lat: options.lat,
        lon: options.lon,
        radius: options.radiusMeters,
        error: quota.status === 'not_configured' ? 'NOT_CONFIGURED' : 'EXHAUSTED',
        fallbackReason: quota.status === 'not_configured' ? 'API key missing' : 'Daily limit reached',
      });
      return [];
    }

    const key = getApiKey('locationiq');
    if (!key) return [];

    const cacheKey = `locationiq:nearby:${options.lat.toFixed(3)}:${options.lon.toFixed(3)}:${options.radiusMeters}`;
    const cached = mapCache.get<HospitalLocation[]>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/nearby`);
    url.searchParams.set('key', key);
    url.searchParams.set('lat', options.lat.toString());
    url.searchParams.set('lon', options.lon.toString());
    url.searchParams.set('radius', options.radiusMeters.toString());
    url.searchParams.set('tag', 'hospital');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '20');

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('locationiq', 'Rate limit exceeded');
          logDiscovery({
            provider: 'LocationIQ',
            lat: options.lat,
            lon: options.lon,
            radius: options.radiusMeters,
            status: res.status,
            error: 'RATE_LIMITED',
            fallbackReason: 'Provider returned 429',
          });
          return [];
        }
        logDiscovery({
          provider: 'LocationIQ',
          lat: options.lat,
          lon: options.lon,
          radius: options.radiusMeters,
          status: res.status,
          error: `HTTP ${res.status}`,
          fallbackReason: 'Invalid request or provider error',
        });
        return [];
      }

      const data = await res.json();
      const places = Array.isArray(data) ? data : [];

      const results: HospitalLocation[] = places
        .filter((p: any) => p.display_name && p.type === 'hospital')
        .map((p: any) => ({
          provider: 'locationiq' as const,
          providerPlaceId: p.place_id?.toString(),
          name: p.display_name.split(',')[0].trim(),
          address: p.display_name,
          latitude: parseFloat(p.lat),
          longitude: parseFloat(p.lon),
          distanceKm: p.distance ? Math.round((p.distance / 1000) * 10) / 10 : undefined,
          geographicSource: 'locationiq',
        }));

      logDiscovery({
        provider: 'LocationIQ',
        lat: options.lat,
        lon: options.lon,
        radius: options.radiusMeters,
        status: res.status,
        results: results.length,
      });

      incrementUsage('locationiq', 1);
      mapCache.set(cacheKey, results, 10 * 60 * 1000);
      return results;
    } catch (err: any) {
      const errorType = err.name === 'AbortError' || err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      logDiscovery({
        provider: 'LocationIQ',
        lat: options.lat,
        lon: options.lon,
        radius: options.radiusMeters,
        error: errorType,
        fallbackReason: errorType === 'TIMEOUT' ? 'Request timed out' : err.message,
      });
      return [];
    }
  }

  async searchPlaces(options: SearchPlacesOptions): Promise<HospitalLocation[]> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      return [];
    }

    const key = getApiKey('locationiq');
    if (!key) return [];

    const cacheKey = `locationiq:search:${options.query.toLowerCase().replace(/\s+/g, ' ')}:${options.lat ?? '0'}:${options.lon ?? '0'}`;
    const cached = mapCache.get<HospitalLocation[]>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/search.php`);
    url.searchParams.set('key', key);
    url.searchParams.set('q', options.query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', (options.limit || 10).toString());
    if (options.lat !== undefined && options.lon !== undefined) {
      url.searchParams.set('viewbox', `${options.lon - 0.1},${options.lat + 0.1},${options.lon + 0.1},${options.lat - 0.1}`);
      url.searchParams.set('bounded', '1');
    }

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('locationiq', 'Rate limit exceeded');
          return [];
        }
        throw new Error(`LocationIQ responded ${res.status}`);
      }

      const data = await res.json();
      const places = Array.isArray(data) ? data : [];

      const results: HospitalLocation[] = places.map((p: any) => ({
        provider: 'locationiq' as const,
        providerPlaceId: p.place_id?.toString(),
        name: p.display_name.split(',')[0].trim(),
        address: p.display_name,
        latitude: parseFloat(p.lat),
        longitude: parseFloat(p.lon),
        distanceKm: p.distance ? Math.round((p.distance / 1000) * 10) / 10 : undefined,
        geographicSource: 'locationiq',
      }));

      incrementUsage('locationiq', 1);
      mapCache.set(cacheKey, results, 5 * 60 * 1000);
      return results;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        return [];
      }
      console.warn('[LocationIQ] searchPlaces failed:', err.message);
      return [];
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'locationiq' };
    }

    const key = getApiKey('locationiq');
    if (!key) return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'locationiq' };

    const cacheKey = `locationiq:reverse:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    const cached = mapCache.get<ReverseGeocodeResult>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/reverse.php`);
    url.searchParams.set('key', key);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lon.toString());
    url.searchParams.set('format', 'json');

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('locationiq', 'Rate limit exceeded');
        }
        return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'locationiq' };
      }

      const data = await res.json();
      if (data && data.display_name) {
        const result: ReverseGeocodeResult = {
          address: data.display_name,
          city: data.address?.city || data.address?.town,
          country: data.address?.country,
          provider: 'locationiq',
        };
        incrementUsage('locationiq', 1);
        mapCache.set(cacheKey, result, 30 * 60 * 1000);
        return result;
      }
      return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'locationiq' };
    } catch {
      return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'locationiq' };
    }
  }

  async geocode(options: GeocodeOptions): Promise<ReverseGeocodeResult[]> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      return [];
    }

    const key = getApiKey('locationiq');
    if (!key) return [];

    const url = new URL(`${this.baseUrl}/search.php`);
    url.searchParams.set('key', key);
    url.searchParams.set('q', options.query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', (options.limit || 5).toString());

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('locationiq', 'Rate limit exceeded');
        }
        return [];
      }

      const data = await res.json();
      const results = Array.isArray(data) ? data : [];
      const mapped = results.map((p: any) => ({
        address: p.display_name || options.query,
        city: p.address?.city || p.address?.town,
        country: p.address?.country,
        provider: 'locationiq' as const,
      }));

      incrementUsage('locationiq', 1);
      return mapped;
    } catch {
      return [];
    }
  }

  async getRoute(options: RouteOptions): Promise<MapRouteResult | null> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      return null;
    }

    const key = getApiKey('locationiq');
    if (!key) return null;

    const cacheKey = `locationiq:route:${options.originLat.toFixed(4)}:${options.originLon.toFixed(4)}:${options.destLat.toFixed(4)}:${options.destLon.toFixed(4)}`;
    const cached = mapCache.get<MapRouteResult>(cacheKey);
    if (cached) return cached;

    const coordinates = `${options.originLon},${options.originLat};${options.destLon},${options.destLat}`;
    const url = `${this.baseUrl}/directions/driving/${coordinates}?key=${key}&overview=full`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('locationiq', 'Rate limit exceeded');
        }
        return null;
      }

      const data = await res.json();
      const route = data.routes && data.routes[0];
      if (!route) return null;

      const result: MapRouteResult = {
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
        provider: 'locationiq',
        geometry: route.geometry,
      };

      incrementUsage('locationiq', 1);
      mapCache.set(cacheKey, result, 10 * 60 * 1000);
      return result;
    } catch {
      return null;
    }
  }
}

export const locationIqProvider = new LocationIqProvider();
