/**
 * Centralized Location Service
 * Manages device geolocation, permission state, and coordinate tracking
 */

export type LocationPermissionState = 'NOT_REQUESTED' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationServiceState {
  permissionState: LocationPermissionState;
  currentCoordinates: LocationCoordinates | null;
  lastError: string | null;
  permissionAcknowledged: boolean;
}

const STORAGE_KEY = 'mediflow_location_permission_acknowledged';

class LocationService {
  private state: LocationServiceState = {
    permissionState: 'NOT_REQUESTED',
    currentCoordinates: null,
    lastError: null,
    permissionAcknowledged: false,
  };

  private listeners: Array<(state: LocationServiceState) => void> = [];

  constructor() {
    // Load permission acknowledgment from storage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      this.state.permissionAcknowledged = true;
    }
  }

  /**
   * Subscribe to location state changes
   */
  subscribe(listener: (state: LocationServiceState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current state
   */
  getState(): LocationServiceState {
    return { ...this.state };
  }

  /**
   * Check if location is available
   */
  isLocationAvailable(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Check if permission has been acknowledged by user
   */
  isPermissionAcknowledged(): boolean {
    return this.state.permissionAcknowledged;
  }

  /**
   * Mark permission as acknowledged (user has seen and responded to the modal)
   */
  acknowledgePermission(granted: boolean): void {
    this.state.permissionAcknowledged = true;
    localStorage.setItem(STORAGE_KEY, 'true');
    
    if (granted) {
      this.requestLocation();
    } else {
      this.updateState({
        permissionState: 'DENIED',
        lastError: 'Location permission denied by user',
      });
    }
  }

  /**
   * Request current device location
   */
  async requestLocation(): Promise<LocationCoordinates> {
    if (!this.isLocationAvailable()) {
      this.updateState({
        permissionState: 'UNAVAILABLE',
        lastError: 'Geolocation is not supported by this browser',
      });
      throw new Error('Geolocation not available');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: LocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          this.updateState({
            permissionState: 'GRANTED',
            currentCoordinates: coords,
            lastError: null,
          });

          resolve(coords);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          let permissionState: LocationPermissionState = 'DENIED';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              permissionState = 'DENIED';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              permissionState = 'UNAVAILABLE';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }

          this.updateState({
            permissionState,
            lastError: errorMessage,
          });

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  /**
   * Get current coordinates (cached if available)
   */
  getCurrentCoordinates(): LocationCoordinates | null {
    return this.state.currentCoordinates;
  }

  /**
   * Refresh location
   */
  async refreshLocation(): Promise<LocationCoordinates> {
    return this.requestLocation();
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
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

  /**
   * Estimate travel time based on distance and traffic
   */
  estimateTravelTime(
    distanceKm: number,
    traffic: 'Low' | 'Moderate' | 'Heavy' = 'Moderate'
  ): number {
    let avgSpeedKmh = 32;
    if (traffic === 'Low') avgSpeedKmh = 45;
    if (traffic === 'Heavy') avgSpeedKmh = 18;

    const hours = distanceKm / avgSpeedKmh;
    return Math.max(3, Math.round(hours * 60 + (distanceKm > 2 ? 3 : 1)));
  }

  /**
   * Reset permission acknowledgment (for testing)
   */
  resetPermission(): void {
    this.state.permissionAcknowledged = false;
    localStorage.removeItem(STORAGE_KEY);
    this.updateState({
      permissionState: 'NOT_REQUESTED',
      lastError: null,
    });
  }

  private updateState(updates: Partial<LocationServiceState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

export const locationService = new LocationService();
