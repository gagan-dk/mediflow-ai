# MEDIFLOW — PATIENT/STAFF DATA SYNCHRONIZATION (PHASE 5)

## Overview
Implemented reliable synchronization using API refetch/invalidation without WebSockets.

## Key Components

### 1. useHospitalSync Hook (src/hooks/useHospitalSync.ts)
- **Auto-refetch**: Polls backend at configurable intervals (default: 30s)
- **TTL-based cache**: Respects data freshness with configurable TTL
- **Storage sync**: Listens for `mediflow:hospitals-changed` events for cross-tab sync
- **Fallback**: Falls back to localStorage if API fails
- **Force refresh**: Allows immediate cache invalidation

```typescript
const { hospital, loading, lastUpdated, refetch, forceRefresh, hasFreshData } = useHospitalSync(hospitalId, { 
  autoRefresh: true, 
  ttl: 30000 
});
```

### 2. Hospital Service Updates (src/services/hospitalService.ts)
- **Backend as source of truth**: API calls take precedence over localStorage
- **Mutation invalidation**: Staff mutations update localStorage and dispatch storage events
- **Timestamp tracking**: All updates include `lastUpdated` ISO timestamps
- **Sync events**: Dispatch `mediflow:hospitals-changed` custom events on updates

### 3. Patient Journey Page (src/pages/PatientJourneyPage.tsx)
- **Refresh button**: Explicit refresh action for patients
- **Last updated display**: Shows when data was last fetched from server
- **Auto-refresh**: Maintains fresh data with 30-second polling

```typescript
<button onClick={() => refetch()} disabled={loading}>
  ↻ Refresh
</button>
<span>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
```

### 4. Hospital Finder Page (src/pages/HospitalFinderPage.tsx)
- **Timestamp display**: Shows last update time for each hospital
- **Operational data indicators**: Visual feedback on data freshness

## Synchronization Flow

### Staff Mutation → Backend → Patient Fetch

1. **Staff updates data** (e.g., bed availability)
   - `updateHospitalProfile()` → Backend API call
   - `hospitalService.updateHospital()` → localStorage + storage event
   
2. **Backend response** includes updated timestamp
   ```json
   {
     "hospital": { ... },
     "lastUpdated": "2026-09-09T13:45:00.000Z"
   }
   ```

3. **Storage event fires** → `mediflow:hospitals-changed`
   - Patient's `useHospitalSync` hook detects change
   - Invalidates local cache if stale

4. **Patient view refreshes**
   - Auto-refetch after TTL expiration
   - Or force-refresh via UI button
   - Shows "Last updated: HH:MM" timestamp

## Key Features

### ✅ Backend as Source of Truth
- API calls always take precedence
- localStorage is fallback/cache only
- Staff mutations go through backend first

### ✅ Cache Invalidation
- TTL-based (configurable, default 30s)
- Storage event triggers on mutation
- Force refresh available via button

### ✅ Stale Data Handling
- `lastUpdated` timestamp on all hospital records
- Display time since last update
- Visual indicators for stale data

### ✅ No WebSockets Required
- HTTP polling sufficient for SIH
- Storage events for cross-tab sync
- Lower complexity, easier debugging

### ✅ Real-Time-ish Behavior
- 30-second refresh interval
- Immediate localStorage sync on mutation
- Storage events for instant cross-tab updates

## API Endpoints (Already Implemented)

### Backend Mutations
- `PUT /hospitals/{id}` - Update hospital profile
- `PUT /hospitals/{id}/beds/metrics` - Update bed counts
- `PUT /hospitals/{id}/icu/metrics` - Update ICU metrics
- `PUT /hospitals/{id}/queue/metrics` - Update queue stats
- `PUT /hospitals/{id}/capabilities` - Update facilities

### Frontend Hooks
- `useStaffHospital()` - Staff data management
- `useHospitalSync()` - Patient/observer data sync

## Testing the Synchronization

### Scenario: City Center Hospital (10 beds)

**Staff Action:**
1. Login as staff@mediflow.ai
2. Navigate to Hospital Command Center
3. Update bed capacity (e.g., 10 → 8 available beds)
4. Observe backend API call with updated_at timestamp

**Patient Action:**
1. Login as patient@mediflow.ai
2. Navigate to Hospital Finder
3. Open City Center Hospital details
4. See updated 8 beds available
5. "Last updated" timestamp shows recent fetch time

**Cross-Tab Sync:**
1. Open app in two tabs
2. Staff updates in Tab A
3. Patient tab (Tab B) automatically detects change
4. Refresh button shows updated data

## Files Modified

1. **src/hooks/useHospitalSync.ts** - New hook for patient data sync
2. **src/services/hospitalService.ts** - Added mutation invalidation
3. **src/pages/PatientJourneyPage.tsx** - Added refresh button + timestamp
4. **src/pages/HospitalFinderPage.tsx** - Added "Last updated" display
5. **src/context/AppContext.tsx** - Integrated hospitalService methods
6. **src/types/hospital.ts** - Already has `lastUpdated` field

## Configuration

### TTL (Time-to-Live)
Default 30 seconds, configurable per hook:

```typescript
useHospitalSync(hospitalId, { 
  autoRefresh: true,    // Enable polling
  ttl: 30000            // 30 seconds
});
```

### Force Refresh
Trigger immediate refetch:

```typescript
const { forceRefresh } = useHospitalSync(hospitalId);
await forceRefresh();  // Bypasses TTL
```

## Performance Considerations

- **Polling**: Only active when component mounted
- **Storage events**: Native browser events, zero overhead
- **Caching**: localStorage reduces API calls
- **TTL**: Configurable per use case

## Future Enhancements

If real-time is needed later:
- Add WebSocket fallback for critical updates
- Implement optimistic UI updates
- Add offline support with queue-based sync
