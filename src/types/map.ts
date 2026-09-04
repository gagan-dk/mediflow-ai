export type MapProviderName = 'geoapify' | 'locationiq' | 'cache';

export type ProviderStatus =
  | 'active'
  | 'standby'
  | 'exhausted'
  | 'error'
  | 'not_configured';

export interface ProviderQuotaInfo {
  provider: MapProviderName;
  status: ProviderStatus;
  dateUtc: string;
  used: number;
  safetyLimit: number;
  exhausted: boolean;
  lastError?: string;
  lastSuccess?: string;
}

export interface HospitalLocation {
  provider: MapProviderName;
  providerPlaceId?: string;
  hospitalId?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  travelTimeMinutes?: number;
  geographicSource: string;
  operationalDataAvailable?: boolean;
}

export interface MapRouteResult {
  distanceKm: number;
  durationMinutes: number;
  provider: MapProviderName;
  cached?: boolean;
  geometry?: string;
}

export interface ReverseGeocodeResult {
  address: string;
  city?: string;
  country?: string;
  provider: MapProviderName;
}

export interface TileSource {
  url: string;
  attribution: string;
  maxZoom?: number;
}

export type SuggestionType =
  | 'hospital'
  | 'address'
  | 'locality'
  | 'city'
  | 'landmark'
  | 'street'
  | 'other';

export interface SearchSuggestion {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  type: SuggestionType;
  source: MapProviderName;
  providerId?: string;
}

export interface SearchOptions {
  limit?: number;
  countryCodes?: string;
  proximityLat?: number;
  proximityLon?: number;
}
