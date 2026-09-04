import type { SearchSuggestion, SearchOptions, MapProviderName } from '../../types/map';

export type { SearchSuggestion, SearchOptions, MapProviderName };

export interface SearchProvider {
  name: MapProviderName;

  autocomplete(query: string, options?: SearchOptions): Promise<SearchSuggestion[]>;

  geocode(query: string, options?: SearchOptions): Promise<SearchSuggestion[]>;

  getQuotaStatus(): {
    status: 'active' | 'standby' | 'exhausted' | 'error' | 'not_configured';
    used: number;
    safetyLimit: number;
    exhausted: boolean;
    lastError?: string;
  };

  getAttribution(): string;
}
