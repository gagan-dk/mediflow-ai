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
      const result = await getHospitalByIdApi(hospitalId);
      const backendHospital = result.hospital;

      if (backendHospital) {
        const stampedHospital = {
          ...backendHospital,
          lastUpdated: backendHospital.lastUpdated || new Date().toISOString(),
        };
        
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
