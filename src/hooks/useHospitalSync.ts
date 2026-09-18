import { useState, useEffect, useCallback, useRef } from 'react';
import { Hospital } from '../types/hospital';
import { hospitalService } from '../services/hospitalService';
import { getHospitalById as getHospitalByIdApi } from '../services/api/hospitalApi';

interface UseHospitalSyncReturn {
  hospital: Hospital | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refetch: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  hasFreshData: boolean;
}

export function useHospitalSync(hospitalId: string | null, options?: { autoRefresh?: boolean; ttl?: number }) {
  const { autoRefresh = true, ttl = 30000 } = options || {};
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [hasFreshData, setHasFreshData] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const refetch = useCallback(async () => {
    if (!hospitalId) return;

    const now = Date.now();
    const shouldRefetch = now - lastFetchRef.current >= ttl;

    if (!shouldRefetch && hospital) {
      setHasFreshData(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const backendHospital = await getHospitalByIdApi(hospitalId);

      if (backendHospital) {
        const cached = hospitalService.getHospitalByIdSync(hospitalId);
        const stampedHospital: Hospital = cached
          ? {
              ...cached,
              name: backendHospital.name || cached.name,
              address: backendHospital.address || cached.address,
              phone: backendHospital.phone || cached.phone,
              emergencyAvailable: backendHospital.emergency_available ?? cached.emergencyAvailable,
              lastUpdated: backendHospital.updated_at || new Date().toISOString(),
            }
          : ({
              id: backendHospital.id,
              hospitalId: backendHospital.id,
              name: backendHospital.name,
              type: 'General Hospital',
              address: backendHospital.address || '',
              coordinates: {
                lat: backendHospital.latitude || 0,
                lng: backendHospital.longitude || 0,
              },
              phone: backendHospital.phone || '',
              isOpen: true,
              rating: 0,
              specialties: [],
              emergencyAvailable: backendHospital.emergency_available || false,
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
                emergencyDepartment: backendHospital.emergency_available || false,
                icu: false,
                oxygenSupport: false,
                ventilator: false,
                traumaCare: false,
                cardiacCare: false,
                strokeUnit: false,
                orthopedicSurgeon: false,
                pediatricEmergency: false,
              },
              distanceKm: 0,
              travelTimeMinutes: 0,
              trafficCondition: 'Moderate',
              availableICUBeds: 0,
              availableEmergencyBeds: 0,
              availableBeds: 0,
              totalBeds: 0,
              totalICUBeds: 0,
              totalEmergencyBeds: 0,
              currentERLoadPercent: 0,
              estimatedWaitTimeMinutes: 0,
              operationalDataAvailable: true,
              lastUpdated: backendHospital.updated_at || new Date().toISOString(),
              updatedBy: 'hospital_staff',
              configComplete: true,
            } as Hospital);
        
        await hospitalService.updateHospital(stampedHospital);
        setHospital(stampedHospital);
        setLastUpdated(stampedHospital.lastUpdated);
        setHasFreshData(true);
      }
    } catch (err: any) {
      console.error('[useHospitalSync] Refetch error:', err);
      setError(err?.message || 'Failed to refresh hospital data');
      
      const cached = hospitalService.getHospitalByIdSync(hospitalId);
      if (cached) {
        setHospital(cached);
        setLastUpdated(cached.lastUpdated);
        setHasFreshData(false);
      }
    } finally {
      lastFetchRef.current = Date.now();
      setLoading(false);
    }
  }, [hospitalId, ttl]);

  const forceRefresh = useCallback(async () => {
    lastFetchRef.current = 0;
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (!hospitalId) {
      setHospital(null);
      setLoading(false);
      return;
    }

    refetch();

    const handleStorageChange = () => {
      const cached = hospitalService.getHospitalByIdSync(hospitalId);
      if (cached && cached.lastUpdated) {
        setHospital(cached);
        setLastUpdated(cached.lastUpdated);
        setHasFreshData(Date.now() - new Date(cached.lastUpdated).getTime() < ttl);
      }
    };

    window.addEventListener('mediflow:hospitals-changed', handleStorageChange as EventListener);
    return () => {
      window.removeEventListener('mediflow:hospitals-changed', handleStorageChange as EventListener);
    };
  }, [hospitalId, ttl, refetch]);

  useEffect(() => {
    if (!autoRefresh || !hospitalId) return;

    const interval = setInterval(() => {
      refetch();
    }, ttl);

    return () => clearInterval(interval);
  }, [autoRefresh, hospitalId, ttl, refetch]);

  return {
    hospital,
    loading,
    error,
    lastUpdated,
    refetch,
    forceRefresh,
    hasFreshData,
  };
}
