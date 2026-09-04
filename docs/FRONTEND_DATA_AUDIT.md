# MediFlow AI — Frontend Hardcoded Data Audit
## PARI Phase 1: Complete Frontend Operational-Data Source Identification

**Date:** 2026-09-04  
**Project:** P:\mediflow\mediflow-ai  
**Scope:** Full React/Vite project source audit  
**Status:** READ-ONLY AUDIT — No files modified

---

## Executive Summary

This audit identified **all hardcoded operational and geographic data** in the MediFlow AI frontend. The project stores hospital, doctor, bed, ambulance, queue, and patient data primarily through:

1. **`src/services/mockData.ts`** — The single largest source of seed/hardcoded operational data
2. **`src/context/AppContext.tsx`** — Hardcoded demo credentials, default user profile, demo patient records, notification seed data, and initial state fallbacks
3. **`src/services/hospitalDiscoveryService.ts`** — Default operational values for map-discovered hospitals
4. **Individual page/component files** — Hardcoded test data, chart data, demo scenario presets, and UI placeholder values

**All operational data currently lives in the frontend** (`localStorage` via `hospitalService`). No backend API exists for CRUD operations. The `hospitalService` class (`src/services/hospitalService.ts`) provides the centralized write path but persists to `localStorage` only.

---

## 1. HARDCODED DATA INVENTORY

### 1.1 HOSPITAL RECORDS

| # | File | Variable/Function | Data Type | Purpose | Geographic? | Operational? | Move to Backend? | Dependencies/Consumers |
|---|------|-------------------|-----------|---------|-------------|--------------|------------------|------------------------|
| 1 | `src/services/mockData.ts:258` | `INITIAL_HOSPITALS` | `Hospital[]` | Seed hospitals for demo | YES | YES | **YES** | All hospital-consuming pages |
| 2 | `src/services/hospitalDiscoveryService.ts:157` | `mapLocationToHospital()` | `Hospital` | Default template | YES | YES | **YES** | `HospitalFinderPage.tsx`, `AppContext.tsx` |
| 3 | `src/services/hospitalService.ts:163` | `mergeDiscoveredHospital()` | `Hospital` | Merges discovered/stored | YES | YES | **YES** | `AppContext.tsx`, `hospitalDiscoveryService.ts` |
| 4 | `src/context/AppContext.tsx:236` | `useState<Hospital[]>(INITIAL_HOSPITALS)` | `Hospital[]` | Initial state | YES | YES | **YES** | All hospital-consuming pages |
| 5 | `src/context/AppContext.tsx:1029` | `resetHospitalCapacities()` | `Hospital[]` | Resets to `INITIAL_HOSPITALS` | YES | YES | **YES** | `AppContext.tsx`, `HospitalCommandCenterPage.tsx` |
| 6 | `src/pages/HospitalCommandCenterPage.tsx:118` | `primaryHospital.name` | `string` | Display name | NO | NO | NO | `HospitalCommandCenterPage.tsx` |
| 7 | `src/pages/LandingPage.tsx:121` | KPI strings | `string[]` | Marketing KPI cards | NO | YES | **YES** | `LandingPage.tsx` |

### 1.2 DOCTORS

| # | File | Variable/Function | Data Type | Purpose | Geographic? | Operational? | Move to Backend? | Dependencies/Consumers |
|---|------|-------------------|-----------|---------|-------------|--------------|------------------|------------------------|
| 8 | `src/services/mockData.ts:424` | `INITIAL_DOCTORS` | `Doctor[]` | Seed doctors | NO | YES | **YES** | `DoctorManagement.tsx`, `AppContext.tsx` |
| 9 | `src/context/AppContext.tsx:306` | `doctors` state initializer | `Doctor[]` | Initial doctors | NO | YES | **YES** | `DoctorManagement.tsx` |
| 10 | `src/services/mockData.ts:810` | `SPECIALIZATION_DESCRIPTIONS` | `Record<string, string>` | Lookup table | NO | NO | NO | `DoctorManagement.tsx` |
| 11 | `src/context/AppContext.tsx:509-526` | `login()` profile builder | `UserProfile` | Hardcoded staff | NO | YES | **YES** | `AppContext.tsx`, `ProfilePage.tsx` |

### 1.3 BEDS & ROOMS

| # | File | Variable/Function | Data Type | Purpose | Geographic? | Operational? | Move to Backend? | Dependencies/Consumers |
|---|------|-------------------|-----------|---------|-------------|--------------|------------------|------------------------|
| 12 | `src/services/mockData.ts:376` | `hospitalToBeds()` | `Bed[]` generator | Bed records | NO | YES | **YES** | `AppContext.tsx`, `RoomManagement.tsx` |
| 13 | `src/services/mockData.ts:512` | `INITIAL_ROOMS` | `Room[]` | Seed rooms | NO | YES | **YES** | `RoomManagement.tsx`, `AppContext.tsx` |

### 1.4 AMBULANCE RECORDS

| # | File | Variable/Function | Data Type | Purpose | Geographic? | Operational? | Move to Backend? | Dependencies/Consumers |
|---|------|-------------------|-----------|---------|-------------|--------------|------------------|------------------------|
| 14 | `src/services/mockData.ts:592` | `INITIAL_AMBULANCES` | `Ambulance[]` | Seed fleet | YES | YES | **YES** | `AppContext.tsx`, `EmergencyTransportPage.tsx`, `InteractiveMap.tsx` |

### 1.5 QUEUE / TOKEN RECORDS

| # | File | Variable/Function | Data Type | Purpose | Geographic? | Operational? | Move to Backend? | Dependencies/Consumers |
|---|------|-------------------|-----------|---------|-------------|--------------|------------------|------------------------|
| 15 | `src/services/mockData.ts:677` | `INITIAL_QUEUE_PATIENTS` | `QueuePatient[]` | Seed queue | NO | YES | **YES** | `AppContext.tsx`, `LiveQueuePage.tsx` |

---

## 2. APPCONTEXT STATE INVENTORY
- **Authentication:** `currentUser` (hardcoded default), `DEMO_CREDENTIALS` (hardcoded).
- **Hospital State:** `hospitals` (hardcoded fallback), `selectedHospital` (dynamic).
- **Operational State:** `doctors`, `rooms`, `beds`, `ambulances`, `queuePatients`, `preAlerts`, `notifications` (all seeded hardcoded).
- **Assessment/Journey State:** `currentAssessmentInput`, `assessmentResult`, `journeyStage`, `myQueueToken` (all dynamic/user-driven).

---

## 3. SERVICE LAYER ANALYSIS

### 3.1 Data Managers
- **`hospitalService.ts`**: Centralized manager; persists to `localStorage`. **Needs backend migration.**
- **`hospitalDiscoveryService.ts`**: Map-based discovery. Populates with zeroed operational defaults. **Needs backend migration for operational data.**

### 3.2 Utilities
- **`rankingEngine.ts`**, **`prioritizationEngine.ts`**, **`simulationEngine.ts`**, **`facilityMatchingEngine.ts`**: Pure logic engines. Frontend-safe, but consume backend-backed data.

---

## 4. PAGES/COMPONENTS CONSUMING HOSPITAL DATA

| Page / Component | Data Source |
|------------------|-------------|
| `HospitalFinderPage.tsx` | `useApp()` → `hospitals`, `rankedHospitals`, `ambulances` |
| `HospitalManagementPage.tsx` | `useApp()` → `hospitals`, `selectedHospital`, `getHospitalById` |
| `HospitalCommandCenterPage.tsx` | `useApp()` → `hospitals`, `beds`, `queuePatients`, `preAlerts`, `ambulances` |
| `AssessmentResultPage.tsx` | `useApp()` → `rankedHospitals`, `selectedHospital` |
| `LiveQueuePage.tsx` | `useApp()` → `queuePatients`, `myQueueToken`, `hospitals` |
| `PatientJourneyPage.tsx` | `useApp()` → `selectedHospital`, `activePreAlert`, `activeAmbulance`, `myQueueToken`, `journeyStage` |
| `EmergencyTransportPage.tsx` | `useApp()` → `ambulances`, `hospitals` |
| `EmergencyAssessmentPage.tsx` | `INITIAL_SYMPTOMS` from `mockData.ts` |
| `InteractiveMap.tsx` | `useApp()` → `hospitals`, `ambulances` |
| `Navbar.tsx` | `useApp()` → `selectedHospital` |

---

## Conclusion
The frontend is heavily reliant on hardcoded initial data in `src/services/mockData.ts` and `src/context/AppContext.tsx`. Operational data is managed in `localStorage` through `hospitalService.ts`. To move toward a production-ready application, all `INITIAL_*` data sets and localStorage-based persistence must be migrated to a backend API.
