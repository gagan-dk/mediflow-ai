/**
 * MediFlow API Types
 * Centralized type definitions for backend API requests and responses.
 *
 * Map provider APIs (Geoapify / LocationIQ) are SEPARATE and remain in
 * src/services/map/*. These types cover the MediFlow backend only.
 */

import type { Hospital, Doctor, Bed, Room, SeverityLevel } from './hospital';
import type { Ambulance } from './ambulance';

// ============================================================================
// API Error
// ============================================================================

/** Consistent error shape thrown / returned by every API method. */
export interface ApiError {
  /** Machine-readable code, e.g. "UNAUTHORIZED", "NOT_FOUND", "VALIDATION". */
  code: string;
  /** Human-readable message safe to display. */
  message: string;
  /** HTTP status code when available. */
  statusCode?: number;
  /** Optional provider / field-level detail payload. */
  details?: unknown;
}

/**
 * Typed error class so callers can `catch (e) { if (e instanceof ApiErrorResponse) … }`.
 */
export class ApiErrorResponse extends Error implements ApiError {
  code: string;
  statusCode?: number;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Authentication
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'PATIENT' | 'HOSPITAL_STAFF' | 'ADMIN';
  hospitalId?: string;
  phone?: string;
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'PATIENT' | 'HOSPITAL_STAFF';
  phone?: string;
  hospitalId?: string;
}

export interface RegisterResponse {
  token: string;
  user: UserProfile;
}

// ============================================================================
// Hospitals
// ============================================================================

export interface GetHospitalsQuery {
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
  hasICU?: boolean;
  hasEmergency?: boolean;
}

export interface GetHospitalsResponse {
  hospitals: Hospital[];
  total: number;
}

export interface GetHospitalResponse {
  hospital: Hospital;
}

export interface UpdateHospitalRequest {
  operationalData?: Partial<Hospital>;
  beds?: Partial<Hospital['beds']>;
  icu?: Partial<Hospital['icu']>;
  emergencyRooms?: Partial<Hospital['emergencyRooms']>;
  ambulances?: Partial<Hospital['ambulances']>;
  queue?: Partial<Hospital['queue']>;
}

export interface UpdateHospitalResponse {
  hospital: Hospital;
  message: string;
}

// ============================================================================
// Doctors
// ============================================================================

export interface GetDoctorsQuery {
  hospitalId: string;
  specialization?: string;
  status?: Doctor['status'];
  department?: string;
}

export interface GetDoctorsResponse {
  doctors: Doctor[];
  total: number;
}

export interface CreateDoctorRequest {
  hospitalId: string;
  name: string;
  specialization: Doctor['specialization'];
  department: string;
  experience: number;
  status: Doctor['status'];
  dutyStatus: Doctor['dutyStatus'];
  room?: string;
  emergencyAvailable: boolean;
  consultationHours?: string;
  email?: string;
  phone?: string;
}

export interface CreateDoctorResponse {
  doctor: Doctor;
  message: string;
}

export interface UpdateDoctorRequest {
  name?: string;
  specialization?: Doctor['specialization'];
  department?: string;
  experience?: number;
  status?: Doctor['status'];
  dutyStatus?: Doctor['dutyStatus'];
  room?: string;
  emergencyAvailable?: boolean;
  consultationHours?: string;
  email?: string;
  phone?: string;
}

export interface UpdateDoctorResponse {
  doctor: Doctor;
  message: string;
}

export interface DeleteDoctorResponse {
  message: string;
}

// ============================================================================
// Beds
// ============================================================================

export interface GetBedsQuery {
  hospitalId: string;
  wardType?: Bed['wardType'];
  status?: Bed['status'];
}

export interface GetBedsResponse {
  beds: Bed[];
  total: number;
}

export interface UpdateBedRequest {
  status?: Bed['status'];
  patientId?: string;
  patientName?: string;
  severity?: SeverityLevel;
  assignedDoctor?: string;
}

export interface UpdateBedResponse {
  bed: Bed;
  message: string;
}

// ============================================================================
// Rooms
// ============================================================================

export interface GetRoomsQuery {
  hospitalId: string;
  type?: Room['type'];
  status?: Room['status'];
  floor?: string;
  department?: string;
}

export interface GetRoomsResponse {
  rooms: Room[];
  total: number;
}

export interface CreateRoomRequest {
  hospitalId: string;
  roomNumber: string;
  type: Room['type'];
  floor: string;
  department: string;
  capacity: number;
  status: Room['status'];
}

export interface CreateRoomResponse {
  room: Room;
  message: string;
}

export interface UpdateRoomRequest {
  roomNumber?: string;
  type?: Room['type'];
  floor?: string;
  department?: string;
  capacity?: number;
  currentOccupancy?: number;
  status?: Room['status'];
  assignedPatient?: string;
}

export interface UpdateRoomResponse {
  room: Room;
  message: string;
}

export interface DeleteRoomResponse {
  message: string;
}

// ============================================================================
// Ambulances
// ============================================================================

export interface GetAmbulancesQuery {
  hospitalId?: string;
  status?: Ambulance['status'];
  vehicleNumber?: string;
}

export interface GetAmbulancesResponse {
  ambulances: Ambulance[];
  total: number;
}

export interface UpdateAmbulanceRequest {
  status?: Ambulance['status'];
  currentLocation?: { lat: number; lng: number };
  currentPatientId?: string;
  assignedDriver?: string;
  assignedParamedic?: string;
}

export interface UpdateAmbulanceResponse {
  ambulance: Ambulance;
  message: string;
}

// ============================================================================
// Emergency (aligned with backend /api/emergency-cases)
// ============================================================================

export type BackendSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type BackendEmergencyCaseStatus = 'REPORTED' | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'TREATING' | 'RESOLVED' | 'CANCELLED';
export type BackendQueueStatus = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CreateEmergencyRequest {
  reported_symptoms: string;
  age?: number;
  latitude: number;
  longitude: number;
  severity: BackendSeverity;
}

export interface EmergencyCaseRead {
  id: string;
  patient_id: string;
  reported_symptoms: string;
  age: number | null;
  latitude: number;
  longitude: number;
  severity: BackendSeverity;
  priority_score: number | null;
  status: BackendEmergencyCaseStatus;
  created_at: string;
  updated_at: string;
}

export interface SelectHospitalRequest {
  emergencyId: string;
  hospitalId: string;
}

export interface QueueTokenView {
  id: string;
  hospital_id: string;
  emergency_case_id: string | null;
  token_number: string;
  priority_level: number;
  queue_position: number;
  status: BackendQueueStatus;
  patient_name: string | null;
  case_severity: string | null;
  case_age: number | null;
  reported_symptoms: string | null;
  called_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueResponse {
  hospital_id: string;
  view: string;
  items: QueueTokenView[];
}

export interface SelectHospitalResponse {
  emergency_id: string;
  queue_token: QueueTokenView;
}

// ============================================================================
// Queue
// ============================================================================

export interface GetQueueQuery {
  hospitalId: string;
}

export interface GetQueueResponse {
  hospitalId: string;
  view: string;
  items: QueueTokenView[];
}

export interface UpdateQueueStatusRequest {
  status: BackendQueueStatus;
}

export interface UpdateQueueStatusResponse {
  token: QueueTokenView;
  message: string;
}

// ============================================================================
// API Request Config
// ============================================================================

export interface ApiRequestConfig {
  timeout?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}
