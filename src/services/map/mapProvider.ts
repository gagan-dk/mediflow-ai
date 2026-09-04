import type {
  HospitalLocation,
  ProviderQuotaInfo,
  MapRouteResult,
  ReverseGeocodeResult,
  MapProviderName,
  ProviderStatus,
  TileSource,
} from '../../types/map';

export interface SearchNearbyHospitalsOptions {
  lat: number;
  lon: number;
  radiusMeters: number;
  categories?: string[];
}

export interface SearchPlacesOptions {
  query: string;
  lat?: number;
  lon?: number;
  radiusMeters?: number;
  categories?: string[];
  limit?: number;
}

export interface GeocodeOptions {
  query: string;
  limit?: number;
}

export interface RouteOptions {
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
}

export interface MapProvider {
  name: MapProviderName;

  searchNearbyHospitals(
    options: SearchNearbyHospitalsOptions
  ): Promise<HospitalLocation[]>;

  searchPlaces(options: SearchPlacesOptions): Promise<HospitalLocation[]>;

  reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult>;

  geocode(options: GeocodeOptions): Promise<ReverseGeocodeResult[]>;

  getRoute(options: RouteOptions): Promise<MapRouteResult | null>;

  getTileSource(style?: string): TileSource | null;

  getQuotaStatus(): ProviderQuotaInfo;

  getAttribution(): string;
}
