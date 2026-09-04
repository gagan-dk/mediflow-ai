import type { ProviderQuotaInfo, MapProviderName, ProviderStatus } from '../../types/map';

const STORAGE_KEY = 'mediflow_map_quota';

/**
 * Application-level quota tracking record.
 *
 * IMPORTANT: This is an APPLICATION-SAFETY counter, NOT the provider's official billing counter.
 * It exists to STOP this app from consuming free-tier limits too quickly.
 * Provider-reported 429/quota-exhausted responses ALWAYS take precedence over these counters.
 */
export interface QuotaRecord {
  provider: MapProviderName;
  dateUtc: string;
  used: number;
  safetyLimit: number;
  exhausted: boolean;
  lastError?: string;
  lastSuccess?: string;
}

function getTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadAll(): QuotaRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(records: QuotaRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage full or unavailable
  }
}

function getRecord(records: QuotaRecord[], provider: MapProviderName): QuotaRecord {
  const today = getTodayUtc();
  let rec = records.find(r => r.provider === provider && r.dateUtc === today);
  if (!rec) {
    rec = {
      provider,
      dateUtc: today,
      used: 0,
      safetyLimit: 0,
      exhausted: false,
    };
    records.push(rec);
  }
  return rec;
}

export function getQuotaStatus(provider: MapProviderName, defaultLimit: number): ProviderQuotaInfo {
  const records = loadAll();
  const rec = getRecord(records, provider);

  if (rec.safetyLimit === 0) {
    rec.safetyLimit = defaultLimit;
  }

  // This is an APPLICATION-LEVEL safety counter, not the provider's official billing counter.
  // Provider-reported 429/quota-exhausted responses ALWAYS take precedence.
  const status: ProviderStatus = rec.exhausted
    ? 'exhausted'
    : !isConfigured(provider)
    ? 'not_configured'
    : rec.used >= rec.safetyLimit
    ? 'exhausted'
    : 'active';

  return {
    provider,
    status,
    dateUtc: rec.dateUtc,
    used: rec.used,
    safetyLimit: rec.safetyLimit,
    exhausted: rec.exhausted || rec.used >= rec.safetyLimit,
    lastError: rec.lastError,
    lastSuccess: rec.lastSuccess,
  };
}

export function incrementUsage(provider: MapProviderName, amount: number = 1): void {
  const records = loadAll();
  const rec = getRecord(records, provider);
  rec.used += amount;
  rec.lastSuccess = new Date().toISOString();
  rec.lastError = undefined;
  saveAll(records);
}

export function markExhausted(provider: MapProviderName, reason: string): void {
  const records = loadAll();
  const rec = getRecord(records, provider);
  rec.exhausted = true;
  rec.lastError = reason;
  saveAll(records);
}

export function resetIfNewDay(provider: MapProviderName, defaultLimit: number): void {
  const records = loadAll();
  const today = getTodayUtc();
  const rec = records.find(r => r.provider === provider);
  if (rec && rec.dateUtc !== today) {
    rec.dateUtc = today;
    rec.used = 0;
    rec.exhausted = false;
    rec.lastError = undefined;
    rec.lastSuccess = undefined;
    rec.safetyLimit = defaultLimit;
    saveAll(records);
  }
}

export function isConfigured(provider: MapProviderName): boolean {
  if (provider === 'geoapify') {
    return Boolean(import.meta.env.VITE_GEOAPIFY_API_KEY);
  }
  if (provider === 'locationiq') {
    return Boolean(import.meta.env.VITE_LOCATIONIQ_API_KEY);
  }
  return true;
}

export function getApiKey(provider: MapProviderName): string | undefined {
  if (provider === 'geoapify') {
    return import.meta.env.VITE_GEOAPIFY_API_KEY;
  }
  if (provider === 'locationiq') {
    return import.meta.env.VITE_LOCATIONIQ_API_KEY;
  }
  return undefined;
}

export function setSafetyLimit(provider: MapProviderName, limit: number): void {
  const records = loadAll();
  const rec = getRecord(records, provider);
  rec.safetyLimit = limit;
  saveAll(records);
}

export function getAllQuotaStatuses(): ProviderQuotaInfo[] {
  return [
    getQuotaStatus('geoapify', 2800),
    getQuotaStatus('locationiq', 4500),
  ];
}
