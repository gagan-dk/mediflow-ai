import { Hospital } from '../types/hospital';
import { mapService } from './map/mapService';

export interface UserGeoLocation {
  lat: number;
  lng: number;
  address: string;
  isLiveGps: boolean;
  accuracyMeters?: number;
  city?: string;
}

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function estimateTravelTimeMinutes(distanceKm: number, trafficCondition: 'Low' | 'Moderate' | 'Heavy' = 'Moderate'): number {
  let avgSpeedKmh = 32;
  if (trafficCondition === 'Low') avgSpeedKmh = 45;
  if (trafficCondition === 'Heavy') avgSpeedKmh = 18;
  const hours = distanceKm / avgSpeedKmh;
  return Math.max(3, Math.round(hours * 60 + (distanceKm > 2 ? 3 : 1)));
}

export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords: [number, number][] = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}

export async function reverseGeocodeCoords(lat: number, lng: number): Promise<{ address: string; city: string }> {
  try {
    const result = await mapService.reverseGeocode(lat, lng);
    return {
      address: result.address,
      city: result.city || 'Current Location',
    };
  } catch {
    return {
      address: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      city: 'Current Location',
    };
  }
}
