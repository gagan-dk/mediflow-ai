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
  items: Hospital[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface GetHospitalResponse {
  id: string;
  name: string;
  registration_number: string | null;
  address: string;
  city: string;
  state: string;
  postal_code: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  emergency_available: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
  created_at: string;
  updated_at: string;
}

export interface UpdateHospitalRequest {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  emergency_available?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
}

export interface UpdateHospitalResponse {
  hospital: GetHospitalResponse;
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
  items: Doctor[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DoctorRead {
  id: string;
  hospital_id: string;
  name: string;
  specialty: string;
  registration_number: string | null;
  phone: string | null;
  email: string | null;
  status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'OFF_DUTY';
  created_at: string;
  updated_at: string;
}

export interface CreateDoctorRequest {
  name: string;
  specialty: string;
  registration_number?: string;
  phone?: string;
  email?: string;
  status?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'OFF_DUTY';
}

export interface CreateDoctorResponse {
  doctor: DoctorRead;
  message: string;
}

export interface UpdateDoctorRequest {
  name?: string;
  specialty?: string;
  registration_number?: string;
  phone?: string;
  email?: string;
  status?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'OFF_DUTY';
}

export interface UpdateDoctorResponse {
  doctor: DoctorRead;
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
  items: Bed[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface BedRead {
  id: string;
  hospital_id: string;
  room_id: string | null;
  bed_number: string;
  bed_type: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  created_at: string;
  updated_at: string;
}

export interface UpdateBedRequest {
  bed_number?: string;
  bed_type?: string;
  room_id?: string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
}

export interface UpdateBedResponse {
  bed: BedRead;
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
  items: Room[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface RoomRead {
  id: string;
  hospital_id: string;
  room_number: string;
  room_type: string;
  floor: string | null;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  created_at: string;
  updated_at: string;
}

export interface CreateRoomRequest {
  room_number: string;
  room_type: string;
  floor?: string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
}

export interface CreateRoomResponse {
  room: RoomRead;
  message: string;
}

export interface UpdateRoomRequest {
  room_number?: string;
  room_type?: string;
  floor?: string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
}

export interface UpdateRoomResponse {
  room: RoomRead;
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
  items: Ambulance[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface AmbulanceRead {
  id: string;
  hospital_id: string;
  vehicle_number: string;
  type: 'BLS' | 'ALS' | 'ACL';
  status: 'AVAILABLE' | 'DISPATCHED' | 'IN_TRANSIT' | 'AT_HOSPITAL';
  latitude: number | null;
  longitude: number | null;
  current_assignment: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAmbulanceRequest {
  vehicle_number: string;
  type?: 'BLS' | 'ALS' | 'ACL';
  status?: 'AVAILABLE' | 'DISPATCHED' | 'IN_TRANSIT' | 'AT_HOSPITAL';
  latitude?: number;
  longitude?: number;
  current_assignment?: string;
}

export interface CreateAmbulanceResponse {
  ambulance: AmbulanceRead;
  message: string;
}

export interface UpdateAmbulanceRequest {
  vehicle_number?: string;
  type?: 'BLS' | 'ALS' | 'ACL';
  status?: 'AVAILABLE' | 'DISPATCHED' | 'IN_TRANSIT' | 'AT_HOSPITAL';
  latitude?: number;
  longitude?: number;
  current_assignment?: string;
}

export interface UpdateAmbulanceResponse {
  ambulance: AmbulanceRead;
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
