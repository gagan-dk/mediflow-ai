import type { MapProvider, SearchNearbyHospitalsOptions, SearchPlacesOptions, GeocodeOptions, RouteOptions } from './mapProvider';
import type { HospitalLocation, ReverseGeocodeResult, MapRouteResult, TileSource } from '../../types/map';
import { getQuotaStatus, incrementUsage, markExhausted, getApiKey, isConfigured } from './apiQuotaService';
import { mapCache } from './mapCacheService';
import { logDiscovery } from './discoveryDebugLog';

export class GeoapifyProvider implements MapProvider {
  name = 'geoapify' as const;
  private baseUrl = 'https://api.geoapify.com/v2';
  private tileBaseUrl = 'https://maps.geoapify.com/v1/tile';

  getQuotaStatus() {
    return getQuotaStatus('geoapify', 2800);
  }

  getAttribution(): string {
    return '© <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  }

  getTileSource(style: string = 'positron'): TileSource | null {
    const key = getApiKey('geoapify');
    if (!key) return null;
    return {
      url: `${this.tileBaseUrl}/${style}/{z}/{x}/{y}.png?apiKey=${key}`,
      attribution: this.getAttribution(),
      maxZoom: 19,
    };
  }

  async searchNearbyHospitals(
    options: SearchNearbyHospitalsOptions
  ): Promise<HospitalLocation[]> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      logDiscovery({
        provider: 'Geoapify',
        lat: options.lat,
        lon: options.lon,
        radius: options.radiusMeters,
        error: quota.status === 'not_configured' ? 'NOT_CONFIGURED' : 'EXHAUSTED',
        fallbackReason: quota.status === 'not_configured' ? 'API key missing' : 'Daily limit reached',
      });
      return [];
    }

    const key = getApiKey('geoapify');
    if (!key) return [];

    const cacheKey = `geoapify:nearby:${options.lat.toFixed(3)}:${options.lon.toFixed(3)}:${options.radiusMeters}`;
    const cached = mapCache.get<HospitalLocation[]>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/places`);
    url.searchParams.set('categories', 'healthcare');
    url.searchParams.set('filter', `circle:${options.lon},${options.lat},${options.radiusMeters}`);
    url.searchParams.set('bias', `proximity:${options.lon},${options.lat}`);
    url.searchParams.set('limit', '20');
    url.searchParams.set('apiKey', key);

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('geoapify', 'Rate limit exceeded');
          logDiscovery({
            provider: 'Geoapify',
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
          provider: 'Geoapify',
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
      const places = Array.isArray(data.features) ? data.features : [];

      const hospitals = places.filter((p: any) => {
        const cats = Array.isArray(p.properties?.categories) ? p.properties.categories : [];
        return cats.some((c: string) => c === 'healthcare.hospital');
      });

      const results: HospitalLocation[] = hospitals.map((p: any) => {
        const props = p.properties;
        return {
          provider: 'geoapify' as const,
          providerPlaceId: props.place_id || p.properties?.datasource?.raw?.osm_id?.toString(),
          name: props.name || 'Unknown Facility',
          address: props.address_line2 || props.formatted || undefined,
          latitude: p.geometry.coordinates[1],
          longitude: p.geometry.coordinates[0],
          distanceKm: props.distance ? Math.round((props.distance / 1000) * 10) / 10 : undefined,
          geographicSource: 'geoapify',
        };
      });

      logDiscovery({
        provider: 'Geoapify',
        lat: options.lat,
        lon: options.lon,
        radius: options.radiusMeters,
        status: res.status,
        results: results.length,
      });

      incrementUsage('geoapify', 1);
      mapCache.set(cacheKey, results, 10 * 60 * 1000);
      return results;
    } catch (err: any) {
      const errorType = err.name === 'AbortError' || err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      logDiscovery({
        provider: 'Geoapify',
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

    const key = getApiKey('geoapify');
    if (!key) return [];

    const cacheKey = `geoapify:search:${options.query.toLowerCase().replace(/\s+/g, ' ')}:${options.lat ?? '0'}:${options.lon ?? '0'}`;
    const cached = mapCache.get<HospitalLocation[]>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/places`);
    url.searchParams.set('text', options.query);
    if (options.lat !== undefined && options.lon !== undefined) {
      url.searchParams.set('lat', options.lat.toString());
      url.searchParams.set('lon', options.lon.toString());
      if (options.radiusMeters) {
        url.searchParams.set('radius', options.radiusMeters.toString());
      }
    }
    url.searchParams.set('limit', (options.limit || 10).toString());
    if (options.categories && options.categories.length > 0) {
      url.searchParams.set('categories', options.categories.join(','));
    }
    url.searchParams.set('apiKey', key);

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('geoapify', 'Rate limit exceeded');
          return [];
        }
        throw new Error(`Geoapify responded ${res.status}`);
      }

      const data = await res.json();
      const places = Array.isArray(data.features) ? data.features : [];

      const results: HospitalLocation[] = places
        .filter((p: any) => p.properties && p.properties.name)
        .map((p: any) => {
          const props = p.properties;
          return {
            provider: 'geoapify' as const,
            providerPlaceId: props.place_id || p.properties?.datasource?.raw?.osm_id?.toString(),
            name: props.name || 'Unknown Facility',
            address: props.address_line2 || props.formatted || undefined,
            latitude: p.geometry.coordinates[1],
            longitude: p.geometry.coordinates[0],
            distanceKm: props.distance ? Math.round((props.distance / 1000) * 10) / 10 : undefined,
            geographicSource: 'geoapify',
          };
        });

      incrementUsage('geoapify', 1);
      mapCache.set(cacheKey, results, 5 * 60 * 1000);
      return results;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        return [];
      }
      console.warn('[Geoapify] searchPlaces failed:', err.message);
      return [];
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'geoapify' };
    }

    const key = getApiKey('geoapify');
    if (!key) return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'geoapify' };

    const cacheKey = `geoapify:reverse:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    const cached = mapCache.get<ReverseGeocodeResult>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/geocode/reverse`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lon.toString());
    url.searchParams.set('apiKey', key);
    url.searchParams.set('limit', '1');

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('geoapify', 'Rate limit exceeded');
        }
        return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'geoapify' };
      }

      const data = await res.json();
      const feat = data.features && data.features[0];
      if (feat) {
        const result: ReverseGeocodeResult = {
          address: feat.properties.formatted || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          city: feat.properties.city || feat.properties.town,
          country: feat.properties.country,
          provider: 'geoapify',
        };
        incrementUsage('geoapify', 1);
        mapCache.set(cacheKey, result, 30 * 60 * 1000);
        return result;
      }
      return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'geoapify' };
    } catch {
      return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, provider: 'geoapify' };
    }
  }

  async geocode(options: GeocodeOptions): Promise<ReverseGeocodeResult[]> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      return [];
    }

    const key = getApiKey('geoapify');
    if (!key) return [];

    const url = new URL(`${this.baseUrl}/geocode/search`);
    url.searchParams.set('text', options.query);
    url.searchParams.set('limit', (options.limit || 5).toString());
    url.searchParams.set('apiKey', key);

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('geoapify', 'Rate limit exceeded');
        }
        return [];
      }

      const data = await res.json();
      const results = (data.features || []).map((f: any) => ({
        address: f.properties.formatted || options.query,
        city: f.properties.city,
        country: f.properties.country,
        provider: 'geoapify' as const,
      }));

      incrementUsage('geoapify', 1);
      return results;
    } catch {
      return [];
    }
  }

  async getRoute(options: RouteOptions): Promise<MapRouteResult | null> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      return null;
    }

    const key = getApiKey('geoapify');
    if (!key) return null;

    const cacheKey = `geoapify:route:${options.originLat.toFixed(4)}:${options.originLon.toFixed(4)}:${options.destLat.toFixed(4)}:${options.destLon.toFixed(4)}`;
    const cached = mapCache.get<MapRouteResult>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/routing`);
    url.searchParams.set('waypoints', `${options.originLat},${options.originLon}|${options.destLat},${options.destLon}`);
    url.searchParams.set('mode', 'drive');
    url.searchParams.set('apiKey', key);

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('geoapify', 'Rate limit exceeded');
        }
        return null;
      }

      const data = await res.json();
      const feature = data.features && data.features[0];
      if (!feature || !feature.properties) return null;

      const props = feature.properties;
      const result: MapRouteResult = {
        distanceKm: Math.round((props.distance / 1000) * 10) / 10,
        durationMinutes: Math.max(1, Math.round(props.time / 60)),
        provider: 'geoapify',
        geometry: JSON.stringify(feature.geometry),
      };

      incrementUsage('geoapify', 1);
      mapCache.set(cacheKey, result, 10 * 60 * 1000);
      return result;
    } catch {
      return null;
    }
  }
}

export const geoapifyProvider = new GeoapifyProvider();
