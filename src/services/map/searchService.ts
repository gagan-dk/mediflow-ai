import type { SearchSuggestion, SearchOptions } from '../../types/map';
import { geoapifySearchProvider } from './geoapifySearchProvider';
import { locationIqSearchProvider } from './locationIqSearchProvider';
import { mapCache } from './mapCacheService';
import { logDiscovery } from './discoveryDebugLog';

export type SearchServiceStatus = {
  primary: 'geoapify' | 'locationiq' | 'cache';
  primaryStatus: string;
  fallbackStatus: string;
  message?: string;
};

export interface SearchResult {
  suggestions: SearchSuggestion[];
  provider: string;
  cached?: boolean;
}

export class SearchService {
  private primary = geoapifySearchProvider;
  private fallback = locationIqSearchProvider;
  private abortController: AbortController | null = null;

  getStatus(): SearchServiceStatus {
    const geo = geoapifySearchProvider.getQuotaStatus();
    const iq = locationIqSearchProvider.getQuotaStatus();

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
      if (geo.status === 'not_configured' && iq.status === 'not_configured') {
        message = 'Map provider not configured.';
      } else if (geo.status === 'exhausted' && iq.status === 'exhausted') {
        message = 'Live search temporarily unavailable.';
      } else if (geo.status === 'exhausted') {
        message = 'Geoapify daily free usage limit reached. Switching to LocationIQ.';
      } else if (iq.status === 'exhausted') {
        message = 'LocationIQ daily free usage limit reached. Live search temporarily limited.';
      }
    }

    return {
      primary: primaryName,
      primaryStatus: geo.status,
      fallbackStatus: iq.status,
      message,
    };
  }

  async autocomplete(query: string, options?: SearchOptions): Promise<SearchResult> {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    if (normalizedQuery.length < 2) {
      return { suggestions: [], provider: 'none', cached: false } as SearchResult;
    }

    const cacheKey = `autocomplete:${normalizedQuery.toLowerCase()}`;
    const cached = mapCache.get<SearchResult>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    let provider: typeof geoapifySearchProvider | typeof locationIqSearchProvider = this.primary;
    if (this.primary.getQuotaStatus().status !== 'active') {
      provider = this.fallback.getQuotaStatus().status === 'active' ? this.fallback : this.primary;
    }

    let suggestions: SearchSuggestion[] = [];

    try {
      suggestions = await provider.autocomplete(normalizedQuery, options);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { suggestions: [], provider: provider.name, cached: false } as SearchResult;
      }
    }

    if (suggestions.length === 0 && provider === geoapifySearchProvider) {
      try {
        const fbSuggestions = await locationIqSearchProvider.autocomplete(normalizedQuery, options);
        if (fbSuggestions.length > 0) {
          suggestions = fbSuggestions;
          provider = locationIqSearchProvider;
        }
      } catch {
        // ignore
      }
    }

    const out: SearchResult = { suggestions, provider: suggestions.length > 0 && provider === geoapifySearchProvider && suggestions[0].source === 'locationiq' ? 'locationiq' : provider.name, cached: false };
    mapCache.set(cacheKey, out, 5 * 60 * 1000);
    return out;
  }

  async geocode(query: string, options?: SearchOptions): Promise<SearchResult> {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    if (normalizedQuery.length < 2) {
      return { suggestions: [], provider: 'none', cached: false } as SearchResult;
    }

    let provider: typeof geoapifySearchProvider | typeof locationIqSearchProvider = this.primary;
    if (this.primary.getQuotaStatus().status !== 'active') {
      provider = this.fallback.getQuotaStatus().status === 'active' ? this.fallback : this.primary;
    }

    let suggestions: SearchSuggestion[] = [];

    try {
      suggestions = await provider.geocode(normalizedQuery, options);
    } catch {
      // ignore
    }

    if (suggestions.length === 0 && provider === geoapifySearchProvider) {
      try {
        const fbSuggestions = await locationIqSearchProvider.geocode(normalizedQuery, options);
        if (fbSuggestions.length > 0) {
          suggestions = fbSuggestions;
          provider = locationIqSearchProvider;
        }
      } catch {
        // ignore
      }
    }

    return { suggestions, provider: suggestions.length > 0 && provider === geoapifySearchProvider && suggestions[0].source === 'locationiq' ? 'locationiq' : provider.name, cached: false } as SearchResult;
  }

  cancelPending(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const searchService = new SearchService();
