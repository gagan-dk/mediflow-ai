import type { SearchProvider, SearchOptions } from './searchProvider';
import type { SearchSuggestion } from '../../types/map';
import { getQuotaStatus, incrementUsage, markExhausted, getApiKey, isConfigured } from './apiQuotaService';
import { mapCache } from './mapCacheService';
import { logDiscovery } from './discoveryDebugLog';

export class GeoapifySearchProvider implements SearchProvider {
  name = 'geoapify' as const;
  private baseUrl = 'https://api.geoapify.com/v1';

  getQuotaStatus() {
    return getQuotaStatus('geoapify', 2800);
  }

  getAttribution(): string {
    return '© <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  }

  async autocomplete(query: string, options?: SearchOptions): Promise<SearchSuggestion[]> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      logDiscovery({
        provider: 'Geoapify',
        lat: options?.proximityLat || 0,
        lon: options?.proximityLon || 0,
        radius: 0,
        error: quota.status === 'not_configured' ? 'NOT_CONFIGURED' : 'EXHAUSTED',
      });
      return [];
    }

    const key = getApiKey('geoapify');
    if (!key) return [];

    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    if (normalizedQuery.length < 2) return [];

    const cacheKey = `geoapify:autocomplete:${normalizedQuery.toLowerCase()}`;
    const cached = mapCache.get<SearchSuggestion[]>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/geocode/autocomplete`);
    url.searchParams.set('text', normalizedQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', (options?.limit || 5).toString());
    url.searchParams.set('apiKey', key);

    if (options?.proximityLat !== undefined && options?.proximityLon !== undefined) {
      url.searchParams.set('bias', `proximity:${options.proximityLon},${options.proximityLat}`);
    }

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('geoapify', 'Rate limit exceeded');
          logDiscovery({
            provider: 'Geoapify',
            lat: options?.proximityLat || 0,
            lon: options?.proximityLon || 0,
            radius: 0,
            status: res.status,
            error: 'RATE_LIMITED',
          });
          return [];
        }
        logDiscovery({
          provider: 'Geoapify',
          lat: options?.proximityLat || 0,
          lon: options?.proximityLon || 0,
          radius: 0,
          status: res.status,
          error: `HTTP ${res.status}`,
        });
        return [];
      }

      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      const suggestions: SearchSuggestion[] = results.map((f: any) => {
        const isHospital = f.category === 'healthcare.hospital' || (f.name || '').toLowerCase().includes('hospital');
        return {
          id: f.place_id || `geoapify-${f.lon || ''}-${f.lat || ''}-${Date.now()}-${Math.random()}`,
          name: f.name || f.formatted?.split(',')[0]?.trim() || query,
          formattedAddress: f.formatted || '',
          lat: f.lat || 0,
          lng: f.lon || 0,
          type: isHospital ? 'hospital' : this.inferType(f),
          source: 'geoapify',
          providerId: f.place_id,
        };
      });

      logDiscovery({
        provider: 'Geoapify',
        lat: options?.proximityLat || 0,
        lon: options?.proximityLon || 0,
        radius: 0,
        status: res.status,
        results: suggestions.length,
      });

      incrementUsage('geoapify', 1);
      mapCache.set(cacheKey, suggestions, 5 * 60 * 1000);
      return suggestions;
    } catch (err: any) {
      const errorType = err.name === 'AbortError' || err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      logDiscovery({
        provider: 'Geoapify',
        lat: options?.proximityLat || 0,
        lon: options?.proximityLon || 0,
        radius: 0,
        error: errorType,
        fallbackReason: err.message,
      });
      return [];
    }
  }

  async geocode(query: string, options?: SearchOptions): Promise<SearchSuggestion[]> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      return [];
    }

    const key = getApiKey('geoapify');
    if (!key) return [];

    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const url = new URL(`${this.baseUrl}/geocode/search`);
    url.searchParams.set('text', normalizedQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', (options?.limit || 5).toString());
    url.searchParams.set('apiKey', key);

    if (options?.proximityLat !== undefined && options?.proximityLon !== undefined) {
      url.searchParams.set('bias', `proximity:${options.proximityLon},${options.proximityLat}`);
    }

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('geoapify', 'Rate limit exceeded');
        }
        return [];
      }

      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      const suggestions: SearchSuggestion[] = results.map((f: any) => {
        const isHospital = f.category === 'healthcare.hospital' || (f.name || '').toLowerCase().includes('hospital');
        return {
          id: f.place_id || `geoapify-${f.lon || ''}-${f.lat || ''}-${Date.now()}-${Math.random()}`,
          name: f.name || f.formatted?.split(',')[0]?.trim() || query,
          formattedAddress: f.formatted || '',
          lat: f.lat || 0,
          lng: f.lon || 0,
          type: isHospital ? 'hospital' : this.inferType(f),
          source: 'geoapify',
          providerId: f.place_id,
        };
      });

      incrementUsage('geoapify', 1);
      return suggestions;
    } catch {
      return [];
    }
  }

  private inferType(f: any): 'hospital' | 'address' | 'locality' | 'city' | 'landmark' | 'street' | 'other' {
    const cats = (f.category || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    const formatted = (f.formatted || '').toLowerCase();
    const resultType = (f.result_type || '').toLowerCase();

    if (cats.includes('hospital') || name.includes('hospital') || name.includes('medical') || name.includes('clinic')) {
      return 'hospital';
    }
    if (resultType === 'street' || formatted.includes('road') || formatted.includes('street') || formatted.includes('main road')) {
      return 'street';
    }
    if (resultType === 'suburb' || formatted.includes('layout') || formatted.includes('nagar') || resultType === 'neighbourhood') {
      return 'locality';
    }
    if (resultType === 'city' || formatted.includes('city')) {
      return 'city';
    }
    if (resultType === 'tourism' || resultType === 'historic' || name.includes('temple') || name.includes('palace') || name.includes('fort')) {
      return 'landmark';
    }
    return 'other';
  }
}

export const geoapifySearchProvider = new GeoapifySearchProvider();
