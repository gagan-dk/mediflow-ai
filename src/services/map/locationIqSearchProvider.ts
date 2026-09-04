import type { SearchProvider, SearchOptions } from './searchProvider';
import type { SearchSuggestion } from '../../types/map';
import { getQuotaStatus, incrementUsage, markExhausted, getApiKey, isConfigured } from './apiQuotaService';
import { mapCache } from './mapCacheService';
import { logDiscovery } from './discoveryDebugLog';

export class LocationIqSearchProvider implements SearchProvider {
  name = 'locationiq' as const;
  private baseUrl = 'https://us1.locationiq.com/v1';

  getQuotaStatus() {
    return getQuotaStatus('locationiq', 4500);
  }

  getAttribution(): string {
    return '© <a href="https://locationiq.com/" target="_blank" rel="noopener">LocationIQ</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  }

  async autocomplete(query: string, options?: SearchOptions): Promise<SearchSuggestion[]> {
    const quota = this.getQuotaStatus();
    if (quota.status === 'exhausted' || quota.status === 'not_configured') {
      logDiscovery({
        provider: 'LocationIQ',
        lat: options?.proximityLat || 0,
        lon: options?.proximityLon || 0,
        radius: 0,
        error: quota.status === 'not_configured' ? 'NOT_CONFIGURED' : 'EXHAUSTED',
      });
      return [];
    }

    const key = getApiKey('locationiq');
    if (!key) return [];

    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    if (normalizedQuery.length < 2) return [];

    const cacheKey = `locationiq:autocomplete:${normalizedQuery.toLowerCase()}`;
    const cached = mapCache.get<SearchSuggestion[]>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/autocomplete`);
    url.searchParams.set('key', key);
    url.searchParams.set('q', normalizedQuery);
    url.searchParams.set('limit', (options?.limit || 5).toString());
    if (options?.countryCodes) {
      url.searchParams.set('countrycodes', options.countryCodes);
    }

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('locationiq', 'Rate limit exceeded');
          logDiscovery({
            provider: 'LocationIQ',
            lat: options?.proximityLat || 0,
            lon: options?.proximityLon || 0,
            radius: 0,
            status: res.status,
            error: 'RATE_LIMITED',
          });
          return [];
        }
        logDiscovery({
          provider: 'LocationIQ',
          lat: options?.proximityLat || 0,
          lon: options?.proximityLon || 0,
          radius: 0,
          status: res.status,
          error: `HTTP ${res.status}`,
        });
        return [];
      }

      const data = await res.json();
      const suggestions: SearchSuggestion[] = (Array.isArray(data) ? data : [])
        .filter((p: any) => p.display_name)
        .map((p: any) => ({
          id: p.place_id ? `locationiq-${p.place_id}` : `locationiq-${p.lat}-${p.lon}-${Date.now()}-${Math.random()}`,
          name: (p.name || p.display_name.split(',')[0] || query).trim(),
          formattedAddress: p.display_name || '',
          lat: parseFloat(p.lat),
          lng: parseFloat(p.lon),
          type: this.inferType(p),
          source: 'locationiq',
          providerId: p.place_id?.toString(),
        }));

      logDiscovery({
        provider: 'LocationIQ',
        lat: options?.proximityLat || 0,
        lon: options?.proximityLon || 0,
        radius: 0,
        status: res.status,
        results: suggestions.length,
      });

      incrementUsage('locationiq', 1);
      mapCache.set(cacheKey, suggestions, 5 * 60 * 1000);
      return suggestions;
    } catch (err: any) {
      const errorType = err.name === 'AbortError' || err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      logDiscovery({
        provider: 'LocationIQ',
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

    const key = getApiKey('locationiq');
    if (!key) return [];

    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const url = new URL(`${this.baseUrl}/search.php`);
    url.searchParams.set('key', key);
    url.searchParams.set('q', normalizedQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', (options?.limit || 5).toString());

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        if (res.status === 429) {
          markExhausted('locationiq', 'Rate limit exceeded');
        }
        return [];
      }

      const data = await res.json();
      const suggestions: SearchSuggestion[] = (Array.isArray(data) ? data : [])
        .filter((p: any) => p.display_name)
        .map((p: any) => ({
          id: p.place_id ? `locationiq-${p.place_id}` : `locationiq-${p.lat}-${p.lon}-${Date.now()}-${Math.random()}`,
          name: (p.name || p.display_name.split(',')[0] || query).trim(),
          formattedAddress: p.display_name || '',
          lat: parseFloat(p.lat),
          lng: parseFloat(p.lon),
          type: this.inferType(p),
          source: 'locationiq',
          providerId: p.place_id?.toString(),
        }));

      incrementUsage('locationiq', 1);
      return suggestions;
    } catch {
      return [];
    }
  }

  private inferType(p: any): 'hospital' | 'address' | 'locality' | 'city' | 'landmark' | 'street' | 'other' {
    const name = (p.name || '').toLowerCase();
    const display = (p.display_name || '').toLowerCase();
    const tagType = (p.tag_type || '').toLowerCase();

    if (tagType === 'hospital' || name.includes('hospital') || name.includes('medical') || name.includes('clinic')) {
      return 'hospital';
    }
    if (tagType === 'highway' || display.includes('road') || display.includes('street') || display.includes('main road')) {
      return 'street';
    }
    if (tagType === 'place' || display.includes('layout') || display.includes('nagar')) {
      return 'locality';
    }
    if (tagType === 'city' || display.includes('city')) {
      return 'city';
    }
    if (tagType === 'tourism' || tagType === 'historic' || name.includes('temple') || name.includes('palace') || name.includes('fort')) {
      return 'landmark';
    }
    return 'other';
  }
}

export const locationIqSearchProvider = new LocationIqSearchProvider();
