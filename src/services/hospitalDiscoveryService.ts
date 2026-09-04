import { Hospital } from '../types/hospital';
import { mapService } from './map/mapService';
import { calculateHaversineDistanceKm, estimateTravelTimeMinutes } from './realHospitalService';
import type { HospitalLocation } from '../types/map';
import { logDiscovery } from './map/discoveryDebugLog';

export interface HospitalDiscoveryOptions {
  minHospitals?: number;
  maxRadiusKm?: number;
  initialRadiusKm?: number;
}

export interface HospitalDiscoveryResult {
  hospitals: Hospital[];
  searchRadiusKm: number;
  totalFound: number;
  source: 'geoapify' | 'locationiq' | 'cache';
  providerMessage?: string;
}

class HospitalDiscoveryService {
  private cache: Map<string, { hospitals: Hospital[]; timestamp: number }> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  async discoverHospitals(
    userLat: number,
    userLng: number,
    options: HospitalDiscoveryOptions = {}
  ): Promise<HospitalDiscoveryResult> {
    const {
      minHospitals = 5,
      maxRadiusKm = 30,
      initialRadiusKm = 10,
    } = options;

    const cacheKey = `${userLat.toFixed(2)},${userLng.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logDiscovery({
        provider: 'Cache',
        lat: userLat,
        lon: userLng,
        radius: initialRadiusKm * 1000,
        results: cached.hospitals.length,
      });
      return {
        hospitals: cached.hospitals,
        searchRadiusKm: initialRadiusKm,
        totalFound: cached.hospitals.length,
        source: cached.hospitals.length > 0 ? (cached.hospitals[0].geographicSource || 'cache') as HospitalDiscoveryResult['source'] : 'cache',
      };
    }

    const status = mapService.getStatus();
    
    // Only use cache-only mode if providers are actually exhausted, not just not configured
    const isGeoExhausted = status.primaryStatus === 'exhausted';
    const isIqExhausted = status.fallbackStatus === 'exhausted';
    const bothExhausted = isGeoExhausted && isIqExhausted;
    
    if (bothExhausted) {
      logDiscovery({
        provider: 'Cache',
        lat: userLat,
        lon: userLng,
        radius: initialRadiusKm * 1000,
        error: 'BOTH_EXHAUSTED',
        fallbackReason: status.message,
      });
      return {
        hospitals: [],
        searchRadiusKm: initialRadiusKm,
        totalFound: 0,
        source: 'cache',
        providerMessage: status.message,
      };
    }

    let currentRadius = initialRadiusKm;
    let allHospitals: Hospital[] = [];

    while (currentRadius <= maxRadiusKm) {
      logDiscovery({
        provider: status.primary === 'geoapify' ? 'Geoapify' : status.primary === 'locationiq' ? 'LocationIQ' : 'Unknown',
        lat: userLat,
        lon: userLng,
        radius: currentRadius * 1000,
      });

      const result = await mapService.searchNearbyHospitals(
        userLat,
        userLng,
        currentRadius * 1000
      );

      const mapped = result.hospitals.map((h: HospitalLocation) => this.mapLocationToHospital(h, userLat, userLng));
      allHospitals = this.deduplicateHospitals(mapped);

      logDiscovery({
        provider: result.provider === 'locationiq' ? 'LocationIQ' : 'Geoapify',
        lat: userLat,
        lon: userLng,
        radius: currentRadius * 1000,
        results: allHospitals.length,
      });

      if (allHospitals.length >= minHospitals) {
        this.cache.set(cacheKey, { hospitals: allHospitals, timestamp: Date.now() });
        return {
          hospitals: allHospitals,
          searchRadiusKm: currentRadius,
          totalFound: allHospitals.length,
          source: result.provider as HospitalDiscoveryResult['source'],
        };
      }

      if (allHospitals.length > 0) {
        this.cache.set(cacheKey, { hospitals: allHospitals, timestamp: Date.now() });
        return {
          hospitals: allHospitals,
          searchRadiusKm: currentRadius,
          totalFound: allHospitals.length,
          source: result.provider as HospitalDiscoveryResult['source'],
        };
      }

      currentRadius += 10;
    }

    this.cache.set(cacheKey, { hospitals: allHospitals, timestamp: Date.now() });
    const finalSource = allHospitals.length > 0 ? (allHospitals[0].geographicSource || 'cache') as HospitalDiscoveryResult['source'] : 'cache';
    return {
      hospitals: allHospitals,
      searchRadiusKm: currentRadius - 10,
      totalFound: allHospitals.length,
      source: finalSource,
      providerMessage: allHospitals.length === 0 ? 'No hospitals found within 30 km.' : status.message,
    };
  }

  async searchHospitalsByQuery(
    query: string,
    userLat: number,
    userLng: number
  ): Promise<Hospital[]> {
    if (!query || !query.trim()) return [];

    const result = await mapService.searchPlaces(query, userLat, userLng);
    const mapped = result.places
      .map((h: HospitalLocation) => this.mapLocationToHospital(h, userLat, userLng))
      .filter((h) => h.distanceKm !== undefined && h.distanceKm <= 40)
      .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

    return this.deduplicateHospitals(mapped);
  }

  private mapLocationToHospital(loc: any, userLat: number, userLng: number): Hospital {
    const distanceKm = loc.distanceKm ?? calculateHaversineDistanceKm(userLat, userLng, loc.latitude, loc.longitude);
    const traffic: 'Low' | 'Moderate' | 'Heavy' = distanceKm < 3 ? 'Low' : distanceKm < 7 ? 'Moderate' : 'Heavy';
    const travelTime = estimateTravelTimeMinutes(distanceKm, traffic);

    return {
      id: loc.providerPlaceId || `${loc.provider}-${Math.round(loc.latitude * 1000)}-${Math.round(loc.longitude * 1000)}`,
      hospitalId: loc.providerPlaceId || `${loc.provider}-${Math.round(loc.latitude * 1000)}-${Math.round(loc.longitude * 1000)}`,
      name: loc.name || 'Unknown Facility',
      type: 'General Hospital',
      address: loc.address || `${distanceKm.toFixed(1)} km from your location`,
      coordinates: { lat: loc.latitude, lng: loc.longitude },
      distanceKm,
      travelTimeMinutes: travelTime,
      trafficCondition: traffic,
      phone: '+91 112 (Emergency)',
      isOpen: true,
      rating: 0,
      specialties: [],
      emergencyAvailable: true,
      icuAvailable: false,
      oxygenSupport: false,
      ventilatorAvailability: false,
      traumaLevel: 0,
      cardiacCareAvailable: false,
      strokeUnitAvailable: false,
      orthopedicAvailable: false,
      pediatricAvailable: false,
      ambulanceAvailableCount: 0,
      beds: { total: 0, available: 0, occupied: 0, reserved: 0 },
      icu: { total: 0, available: 0, occupied: 0, reserved: 0 },
      emergencyRooms: { total: 0, available: 0, occupied: 0, cleaning: 0 },
      queue: { totalPatients: 0, criticalCount: 0, highCount: 0, moderateCount: 0, lowCount: 0, estimatedWaitTimeMinutes: 0, currentERLoadPercent: 0 },
      ambulances: { total: 0, available: 0, dispatched: 0, enRoute: 0, atHospital: 0 },
      doctors: { total: 0, available: 0, onDuty: 0, bySpecialization: {} },
      facilities: {
        emergencyDepartment: false,
        icu: false,
        oxygenSupport: false,
        ventilator: false,
        traumaCare: false,
        cardiacCare: false,
        strokeUnit: false,
        orthopedicSurgeon: false,
        pediatricEmergency: false,
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: loc.geographicSource,
      configComplete: false,
      operationalDataAvailable: false,
      geographicSource: loc.geographicSource,
      isDirectSearchMatch: false,
      // backward-compatible aliases
      availableICUBeds: 0,
      availableEmergencyBeds: 0,
      availableBeds: 0,
      totalBeds: 0,
      totalICUBeds: 0,
      totalEmergencyBeds: 0,
      currentERLoadPercent: 0,
      estimatedWaitTimeMinutes: 0,
    } as Hospital;
  }

  private deduplicateHospitals(hospitals: Hospital[]): Hospital[] {
    const seen = new Set<string>();
    return hospitals.filter(h => {
      const key = `${h.coordinates.lat.toFixed(4)},${h.coordinates.lng.toFixed(4)}-${h.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const hospitalDiscoveryService = new HospitalDiscoveryService();
