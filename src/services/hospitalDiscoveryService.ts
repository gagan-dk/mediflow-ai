/**
 * Hospital Discovery Service
 * Dynamically discovers nearby hospitals using OpenStreetMap data
 * with expanding search radius and multi-mirror failover.
 * Returns REAL hospital names from OpenStreetMap whenever available.
 */

import { Hospital } from '../types/hospital';
import { calculateHaversineDistanceKm, estimateTravelTimeMinutes, generateRealCalibratedHospitals } from './realHospitalService';

export interface HospitalDiscoveryOptions {
  minHospitals?: number;
  maxRadiusKm?: number;
  initialRadiusKm?: number;
}

export interface HospitalDiscoveryResult {
  hospitals: Hospital[];
  searchRadiusKm: number;
  totalFound: number;
  source: 'osm' | 'fallback';
}

// Multiple Overpass mirrors for resilience (rate limits / downtime)
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

class HospitalDiscoveryService {
  private cache: Map<string, { hospitals: Hospital[]; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Discover nearby hospitals with automatic radius expansion
   */
  async discoverHospitals(
    userLat: number,
    userLng: number,
    options: HospitalDiscoveryOptions = {}
  ): Promise<HospitalDiscoveryResult> {
    const { minHospitals = 10, maxRadiusKm = 30, initialRadiusKm = 10 } = options;

    // Check cache first
    const cacheKey = `${userLat.toFixed(2)},${userLng.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return {
        hospitals: cached.hospitals,
        searchRadiusKm: initialRadiusKm,
        totalFound: cached.hospitals.length,
        source: cached.hospitals.length > 0 && cached.hospitals[0].id.startsWith('osm-') ? 'osm' : 'fallback',
      };
    }

    // Try with expanding radius across multiple mirrors
    let currentRadius = initialRadiusKm;
    let allHospitals: Hospital[] = [];

    while (currentRadius <= maxRadiusKm) {
      try {
        const hospitals = await this.fetchHospitalsFromOSM(userLat, userLng, currentRadius);
        allHospitals = hospitals;

        // Prefer giving REAL hospitals even if fewer than requested, rather than faking the count
        if (hospitals.length >= minHospitals) {
          this.cache.set(cacheKey, { hospitals, timestamp: Date.now() });
          return {
            hospitals,
            searchRadiusKm: currentRadius,
            totalFound: hospitals.length,
            source: 'osm',
          };
        }

        // If we found any real hospitals, keep them; we'll only add fallback if ZERO were found
        if (hospitals.length > 0) {
          this.cache.set(cacheKey, { hospitals, timestamp: Date.now() });
          return {
            hospitals,
            searchRadiusKm: currentRadius,
            totalFound: hospitals.length,
            source: 'osm',
          };
        }

        currentRadius += 10; // Expand radius by 10km
      } catch (error) {
        console.warn(`Failed to fetch hospitals at ${currentRadius}km radius:`, error);
        currentRadius += 10;
      }
    }

    // Only if NO real hospitals were found anywhere do we use calibrated estimates
    if (allHospitals.length === 0) {
      allHospitals = generateRealCalibratedHospitals(userLat, userLng);
      this.cache.set(cacheKey, { hospitals: allHospitals, timestamp: Date.now() });
      return {
        hospitals: allHospitals.slice(0, 12),
        searchRadiusKm: currentRadius - 10,
        totalFound: allHospitals.length,
        source: 'fallback',
      };
    }

    const deduped = this.deduplicateHospitals(allHospitals);
    this.cache.set(cacheKey, { hospitals: deduped, timestamp: Date.now() });
    return {
      hospitals: deduped.slice(0, 15),
      searchRadiusKm: currentRadius - 10,
      totalFound: deduped.length,
      source: 'osm',
    };
  }

  /**
   * Fetch hospitals from OpenStreetMap Overpass API with mirror failover
   */
  private async fetchHospitalsFromOSM(
    userLat: number,
    userLng: number,
    radiusKm: number
  ): Promise<Hospital[]> {
    const radiusMeters = radiusKm * 1000;

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"]["name"](around:${radiusMeters},${userLat},${userLng});
        way["amenity"="hospital"]["name"](around:${radiusMeters},${userLat},${userLng});
        relation["amenity"="hospital"]["name"](around:${radiusMeters},${userLat},${userLng});
        node["healthcare"="hospital"]["name"](around:${radiusMeters},${userLat},${userLng});
        way["healthcare"="hospital"]["name"](around:${radiusMeters},${userLat},${userLng});
        relation["healthcare"="hospital"]["name"](around:${radiusMeters},${userLat},${userLng});
        node["amenity"="clinic"]["name"](around:${radiusMeters},${userLat},${userLng});
        way["amenity"="clinic"]["name"](around:${radiusMeters},${userLat},${userLng});
      );
      out center 35;
    `;

    let lastError: Error | null = null;

    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(mirror, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`[Hospitals] Mirror ${mirror} responded ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (!data.elements || data.elements.length === 0) {
          console.warn(`[Hospitals] Mirror ${mirror} returned no hospitals`);
          continue;
        }

        return this.mapOsmElementsToHospitals(data.elements, userLat, userLng);
      } catch (error: any) {
        lastError = error;
        console.warn(`[Hospitals] Mirror ${mirror} failed:`, error?.message || error);
      }
    }

    if (lastError) throw lastError;
    return [];
  }

  /**
   * Convert raw OSM elements into Hospital objects with real names/addresses
   */
  private mapOsmElementsToHospitals(
    elements: any[],
    userLat: number,
    userLng: number
  ): Hospital[] {
    const visited = new Set<number>();

    const hospitals: Hospital[] = elements
      .filter((elem: any) => {
        const id = elem.id;
        if (visited.has(id)) return false;
        visited.add(id);
        return true;
      })
      .map((elem: any, idx: number) => {
        const lat = elem.lat || elem.center?.lat || userLat;
        const lng = elem.lon || elem.center?.lon || userLng;
        const name = elem.tags?.name || elem.tags?.['name:en'] || `Hospital #${idx + 1}`;
        const distanceKm = calculateHaversineDistanceKm(userLat, userLng, lat, lng);

        const traffic: 'Low' | 'Moderate' | 'Heavy' =
          distanceKm < 3 ? 'Low' : distanceKm < 7 ? 'Moderate' : 'Heavy';
        const travelTime = estimateTravelTimeMinutes(distanceKm, traffic);

        const isMajor =
          name.toLowerCase().includes('medical') ||
          name.toLowerCase().includes('institute') ||
          name.toLowerCase().includes('general') ||
          name.toLowerCase().includes('specialty') ||
          name.toLowerCase().includes('hospital');

        const totalBeds = isMajor ? 200 + (idx * 25) % 150 : 90 + (idx * 15) % 60;
        const availableBeds = Math.max(4, Math.round(totalBeds * (0.15 + ((idx * 7) % 25) / 100)));
        const totalICUBeds = isMajor ? 20 + (idx * 4) % 15 : 8 + (idx * 2) % 6;
        const availableICUBeds = idx === 1 ? 0 : Math.max(1, Math.round(totalICUBeds * 0.25));
        const totalEmergencyBeds = isMajor ? 25 + (idx * 3) % 10 : 12;
        const availableEmergencyBeds = Math.max(2, Math.round(totalEmergencyBeds * 0.3));
        const erLoad = Math.min(95, Math.max(35, Math.round(75 - availableEmergencyBeds * 3 + (idx * 6) % 20)));
        const waitTime = Math.max(5, Math.round((erLoad / 100) * 35));

        // Build a real address from OSM tags
        const t = elem.tags || {};
        const houseNum = t['addr:housenumber'] || t['addr:unit'] || '';
        const street = t['addr:street'] || '';
        const city = t['addr:city'] || t['addr:suburb'] || t['addr:town'] || t['addr:district'] || '';
        const addressParts = [houseNum, street, city].filter(Boolean);
        const address = addressParts.length > 0
          ? addressParts.join(', ')
          : `${distanceKm.toFixed(1)} km from your location`;

        return {
          id: `osm-hosp-${elem.id || idx}`,
          hospitalId: `osm-hosp-${elem.id || idx}`,
          name,
          type: isMajor ? 'Super Specialty' as const : 'General Hospital' as const,
          address,
          distanceKm,
          travelTimeMinutes: travelTime,
          trafficCondition: traffic,
          coordinates: { lat, lng },
          phone: t.phone || t['contact:phone'] || '+91 112',
          isOpen: true,
          totalBeds,
          availableBeds,
          totalICUBeds,
          availableICUBeds,
          totalEmergencyBeds,
          availableEmergencyBeds,
          currentERLoadPercent: erLoad,
          estimatedWaitTimeMinutes: waitTime,
          emergencyAvailable: true,
          icuAvailable: availableICUBeds > 0,
          oxygenSupport: true,
          ventilatorAvailability: isMajor,
          traumaLevel: isMajor ? (1 as const) : (2 as const),
          cardiacCareAvailable: isMajor,
          strokeUnitAvailable: isMajor,
          orthopedicAvailable: true,
          pediatricAvailable: true,
          ambulanceAvailableCount: Math.max(1, (idx % 3) + 1),
          rating: 4.0 + (idx % 5) * 0.15,
          operationalDataAvailable: false,
          specialties: isMajor
            ? ['Emergency Medicine', 'ICU & Critical Care', 'Cardiology', 'Trauma']
            : ['Emergency Medicine', 'General Surgery', 'Internal Medicine'],
        } as Hospital;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return hospitals.slice(0, 15);
  }

  /**
   * Remove duplicate hospitals (OSM node + way of the same facility)
   */
  private deduplicateHospitals(hospitals: Hospital[]): Hospital[] {
    const seen = new Set<string>();
    return hospitals.filter(h => {
      const key = `${h.coordinates.lat.toFixed(4)},${h.coordinates.lng.toFixed(4)}-${h.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Search for specific hospitals by name / text query using OpenStreetMap Nominatim and Overpass APIs.
   * STRICTLY BOUNDED to the user's live GPS geographic area (radius <= 35km).
   */
  async searchHospitalsByQuery(
    query: string,
    userLat: number,
    userLng: number
  ): Promise<Hospital[]> {
    if (!query || !query.trim()) return [];
    const cleanQuery = query.trim();
    const results: Hospital[] = [];
    const seenCoordinates = new Set<string>();

    // Define a strict local bounding box (~35km box around user's GPS coords)
    // 1 deg lat ≈ 111km -> 0.32 deg ≈ 35km
    const boxOffset = 0.32;
    const minLng = userLng - boxOffset;
    const minLat = userLat - boxOffset;
    const maxLng = userLng + boxOffset;
    const maxLat = userLat + boxOffset;
    // Nominatim format: left,top,right,bottom -> minLng,maxLat,maxLng,minLat
    const viewbox = `${minLng.toFixed(4)},${maxLat.toFixed(4)},${maxLng.toFixed(4)},${minLat.toFixed(4)}`;

    // 1. Try Nominatim Geocoding Search strictly bounded to the user's location
    try {
      const nominatimUrls = [
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&viewbox=${viewbox}&bounded=1&addressdetails=1&extratags=1&limit=15`,
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ' hospital')}&viewbox=${viewbox}&bounded=1&addressdetails=1&extratags=1&limit=10`
      ];

      for (const url of nominatimUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(url, {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'MediFlowAI-HospitalSearch/1.0'
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const items = await res.json();
            if (Array.isArray(items) && items.length > 0) {
              for (const item of items) {
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lon);
                if (isNaN(lat) || isNaN(lng)) continue;

                // Strict distance check: MUST be within 40 km of the user
                const distanceKm = calculateHaversineDistanceKm(userLat, userLng, lat, lng);
                if (distanceKm > 40) continue;

                const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
                if (seenCoordinates.has(coordKey)) continue;
                seenCoordinates.add(coordKey);

                // Build clean hospital name
                const addr = item.address || {};
                const name = addr.hospital || addr.clinic || addr.amenity || item.name || item.display_name.split(',')[0].trim();
                
                // Address components
                const houseNum = addr.house_number || addr.housenumber || '';
                const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || '';
                const city = addr.city || addr.town || addr.municipality || addr.district || addr.state_district || addr.county || '';
                const state = addr.state || '';
                const country = addr.country || '';
                
                const addressParts = [houseNum, road, city, state, country].filter(Boolean);
                const address = addressParts.length > 0 ? addressParts.join(', ') : item.display_name;

                const traffic: 'Low' | 'Moderate' | 'Heavy' =
                  distanceKm < 3 ? 'Low' : distanceKm < 7 ? 'Moderate' : 'Heavy';
                const travelTime = estimateTravelTimeMinutes(distanceKm, traffic);

                const isMajor =
                  name.toLowerCase().includes('medical') ||
                  name.toLowerCase().includes('institute') ||
                  name.toLowerCase().includes('general') ||
                  name.toLowerCase().includes('specialty') ||
                  name.toLowerCase().includes('hospital') ||
                  name.toLowerCase().includes('aiims') ||
                  name.toLowerCase().includes('apollo') ||
                  name.toLowerCase().includes('fortis') ||
                  name.toLowerCase().includes('max') ||
                  name.toLowerCase().includes('manipal');

                const totalBeds = isMajor ? 250 : 100;
                const availableBeds = Math.max(8, Math.round(totalBeds * 0.22));
                const totalICUBeds = isMajor ? 24 : 10;
                const availableICUBeds = Math.max(3, Math.round(totalICUBeds * 0.3));
                const totalEmergencyBeds = isMajor ? 30 : 12;
                const availableEmergencyBeds = Math.max(4, Math.round(totalEmergencyBeds * 0.35));
                const erLoad = Math.min(85, Math.max(40, Math.round(65 - availableEmergencyBeds * 2)));
                const waitTime = Math.max(5, Math.round((erLoad / 100) * 30));

                const hospitalObj: Hospital = {
                  id: `search-osm-${item.osm_id || item.place_id || Math.round(lat * 1000)}`,
                  hospitalId: `search-osm-${item.osm_id || item.place_id || Math.round(lat * 1000)}`,
                  name,
                  type: isMajor ? ('Super Specialty' as const) : ('General Hospital' as const),
                  address,
                  distanceKm,
                  travelTimeMinutes: travelTime,
                  trafficCondition: traffic,
                  coordinates: { lat, lng },
                  phone: item.extratags?.phone || item.extratags?.['contact:phone'] || '+91 112 (Emergency)',
                  isOpen: true,
                  totalBeds,
                  availableBeds,
                  totalICUBeds,
                  availableICUBeds,
                  totalEmergencyBeds,
                  availableEmergencyBeds,
                  currentERLoadPercent: erLoad,
                  estimatedWaitTimeMinutes: waitTime,
                  emergencyAvailable: true,
                  icuAvailable: availableICUBeds > 0,
                  oxygenSupport: true,
                  ventilatorAvailability: isMajor,
                  traumaLevel: isMajor ? (1 as const) : (2 as const),
                  cardiacCareAvailable: isMajor,
                  strokeUnitAvailable: isMajor,
                  orthopedicAvailable: true,
                  pediatricAvailable: true,
                  ambulanceAvailableCount: Math.max(2, Math.floor(Math.random() * 4) + 1),
                  rating: 4.5,
                  operationalDataAvailable: false,
                  isDirectSearchMatch: true,
                  specialties: isMajor
                    ? ['Emergency Medicine', 'ICU & Critical Care', 'Cardiology', 'Trauma', 'Super Specialty']
                    : ['Emergency Medicine', 'General Surgery', 'Internal Medicine'],
                  beds: {
                    total: totalBeds,
                    available: availableBeds,
                    occupied: totalBeds - availableBeds,
                    reserved: 0
                  },
                  icu: {
                    total: totalICUBeds,
                    available: availableICUBeds,
                    occupied: totalICUBeds - availableICUBeds,
                    reserved: 0
                  },
                  emergencyRooms: {
                    total: totalEmergencyBeds,
                    available: availableEmergencyBeds,
                    occupied: totalEmergencyBeds - availableEmergencyBeds,
                    cleaning: 0
                  },
                  queue: {
                    totalPatients: 10,
                    criticalCount: 1,
                    highCount: 3,
                    moderateCount: 4,
                    lowCount: 2,
                    estimatedWaitTimeMinutes: waitTime,
                    currentERLoadPercent: erLoad
                  },
                  ambulances: {
                    total: 5,
                    available: 3,
                    dispatched: 1,
                    enRoute: 1,
                    atHospital: 0
                  },
                  doctors: {
                    total: isMajor ? 25 : 12,
                    available: isMajor ? 14 : 7,
                    onDuty: isMajor ? 20 : 10,
                    bySpecialization: {}
                  },
                  facilities: {
                    emergencyDepartment: true,
                    icu: true,
                    oxygenSupport: true,
                    ventilator: isMajor,
                    traumaCare: isMajor,
                    cardiacCare: isMajor,
                    strokeUnit: isMajor,
                    orthopedicSurgeon: true,
                    pediatricEmergency: true
                  },
                  lastUpdated: new Date().toISOString(),
                  updatedBy: 'OpenStreetMap Search',
                  configComplete: true
                };

                results.push(hospitalObj);
              }
            }
          }
          if (results.length >= 5) break;
        } catch (subErr) {
          console.warn('[Hospital Search] Nominatim subquery error:', subErr);
        }
      }
    } catch (err) {
      console.warn('[Hospital Search] Nominatim fetch error:', err);
    }

    // 2. Also try Overpass name query strictly within 35km of user location
    try {
      const safeQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const overpassQuery = `
        [out:json][timeout:15];
        (
          node["amenity"="hospital"]["name"~"${safeQuery}",i](around:35000,${userLat},${userLng});
          way["amenity"="hospital"]["name"~"${safeQuery}",i](around:35000,${userLat},${userLng});
          relation["amenity"="hospital"]["name"~"${safeQuery}",i](around:35000,${userLat},${userLng});
          node["healthcare"="hospital"]["name"~"${safeQuery}",i](around:35000,${userLat},${userLng});
          way["healthcare"="hospital"]["name"~"${safeQuery}",i](around:35000,${userLat},${userLng});
          node["amenity"="clinic"]["name"~"${safeQuery}",i](around:30000,${userLat},${userLng});
          way["amenity"="clinic"]["name"~"${safeQuery}",i](around:30000,${userLat},${userLng});
        );
        out center 20;
      `;

      for (const mirror of OVERPASS_MIRRORS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          const response = await fetch(mirror, {
            method: 'POST',
            body: `data=${encodeURIComponent(overpassQuery)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            if (data.elements && data.elements.length > 0) {
              const overpassHospitals = this.mapOsmElementsToHospitals(data.elements, userLat, userLng);
              for (const oh of overpassHospitals) {
                if (oh.distanceKm > 40) continue; // strict distance limit
                const key = `${oh.coordinates.lat.toFixed(4)},${oh.coordinates.lng.toFixed(4)}`;
                if (!seenCoordinates.has(key)) {
                  seenCoordinates.add(key);
                  oh.isDirectSearchMatch = true;
                  results.push(oh);
                }
              }
            }
            break;
          }
        } catch (mErr) {
          // continue
        }
      }
    } catch (opErr) {
      console.warn('[Hospital Search] Overpass name query failed:', opErr);
    }

    // Sort by proximity to user, prioritizing exact name match within user's local area
    return results.sort((a, b) => {
      const aExact = a.name.toLowerCase().includes(cleanQuery.toLowerCase()) ? 0 : 1;
      const bExact = b.name.toLowerCase().includes(cleanQuery.toLowerCase()) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.distanceKm - b.distanceKm;
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Filter hospitals by various criteria
   */
  filterHospitals(
    hospitals: Hospital[],
    filterType: string,
    maxDistanceKm?: number
  ): Hospital[] {
    let filtered = [...hospitals];

    switch (filterType) {
      case 'nearest':
        filtered = filtered.sort((a, b) => a.distanceKm - b.distanceKm);
        if (maxDistanceKm) {
          filtered = filtered.filter(h => h.distanceKm <= maxDistanceKm);
        }
        break;
      case 'lowest_wait':
        filtered = filtered.sort((a, b) => a.estimatedWaitTimeMinutes - b.estimatedWaitTimeMinutes);
        break;
      case 'icu':
        filtered = filtered.filter(h => h.availableICUBeds > 0);
        break;
      case 'emergency':
        filtered = filtered.filter(h => h.emergencyAvailable && h.currentERLoadPercent < 80);
        break;
      case 'most_beds':
        filtered = filtered.sort((a, b) => b.availableBeds - a.availableBeds);
        break;
      case 'all':
      default:
        break;
    }

    return filtered;
  }
}

export const hospitalDiscoveryService = new HospitalDiscoveryService();