export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface RequiredFacilities {
  emergencyDepartment: boolean;
  icu: boolean;
  oxygenSupport: boolean;
  ventilator: boolean;
  traumaCare: boolean;
  cardiacCare: boolean;
  strokeUnit: boolean;
  orthopedicSurgeon: boolean;
  pediatricEmergency: boolean;
}

export interface HospitalScoreBreakdown {
  emergencyCapability: { score: number; max: number };
  requiredFacilities: { score: number; max: number };
  bedAvailability: { score: number; max: number };
  waitingTime: { score: number; max: number };
  travelTime: { score: number; max: number };
  ambulanceAvailability: { score: number; max: number };
  loadBalancingPenalty: number;
  totalScore: number;
}

export type DoctorSpecialization = 
  | 'Cardiologist'
  | 'Cardiothoracic Surgeon'
  | 'Neurologist'
  | 'Neurosurgeon'
  | 'Nephrologist'
  | 'Urologist'
  | 'Gastroenterologist'
  | 'Hepatologist'
  | 'Pulmonologist'
  | 'Endocrinologist'
  | 'Diabetologist'
  | 'Rheumatologist'
  | 'Orthopedic Surgeon'
  | 'General Surgeon'
  | 'Plastic Surgeon'
  | 'Dermatologist'
  | 'Ophthalmologist'
  | 'ENT Specialist'
  | 'Gynecologist'
  | 'Obstetrician'
  | 'Pediatrician'
  | 'Neonatologist'
  | 'Psychiatrist'
  | 'Psychologist'
  | 'Oncologist'
  | 'Hematologist'
  | 'Infectious Disease Specialist'
  | 'Allergist/Immunologist'
  | 'Anesthesiologist'
  | 'Emergency Medicine Specialist'
  | 'Radiologist'
  | 'Pathologist'
  | 'Geriatrician'
  | 'Physician/Internist'
  | 'Family Medicine Doctor'
  | 'Vascular Surgeon'
  | 'Colorectal Surgeon'
  | 'Bariatric Surgeon'
  | 'Surgical Oncologist'
  | 'Interventional Cardiologist'
  | 'Electrophysiologist'
  | 'Cardiac Electrophysiologist';

export type DoctorStatus = 'Available' | 'Busy' | 'Unavailable' | 'Off Duty';
export type DutyStatus = 'On Duty' | 'Off Duty';

// Doctor type for centralized hospital staff
export interface Doctor {
  id: string;
  hospitalId: string;
  name: string;
  specialization: DoctorSpecialization;
  department: string;
  experience: number;
  status: DoctorStatus;
  dutyStatus: DutyStatus;
  room?: string;
  emergencyAvailable: boolean;
  consultationHours?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export type RoomType = 
  | 'Emergency Room'
  | 'ICU'
  | 'General Ward'
  | 'Private Room'
  | 'Semi-Private Room'
  | 'Operation Theatre'
  | 'Consultation Room'
  | 'Isolation Room'
  | 'Observation Room'
  | 'Procedure Room';

export type RoomStatus = 'Available' | 'Reserved' | 'Occupied' | 'Cleaning' | 'Maintenance';

// Room type for centralized hospital rooms
export interface Room {
  id: string;
  hospitalId: string;
  roomNumber: string;
  type: RoomType;
  floor: string;
  department: string;
  capacity: number;
  currentOccupancy: number;
  status: RoomStatus;
  assignedPatient?: string;
  lastUpdated?: string;
}

// Bed type for centralized hospital beds
export interface Bed {
  id: string;
  hospitalId: string;
  bedNumber: string;
  wardType: 'Emergency' | 'ICU' | 'General' | 'Trauma' | 'Cardiac';
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Reserved';
  patientId?: string;
  patientName?: string;
  severity?: SeverityLevel;
  assignedDoctor?: string;
  updatedAt: string;
}

// Centralized hospital operational data
export interface HospitalOperationalData {
  hospitalId: string;
  name: string;
  type: 'Trauma Center Level 1' | 'Super Specialty' | 'General Hospital' | 'Community Hospital' | 'Cardiac Center';
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  isOpen: boolean;
  rating: number;
  specialties: string[];
  
  // Capabilities
  emergencyAvailable: boolean;
  icuAvailable: boolean;
  oxygenSupport: boolean;
  ventilatorAvailability: boolean;
  traumaLevel: 1 | 2 | 3 | 0;
  cardiacCareAvailable: boolean;
  strokeUnitAvailable: boolean;
  orthopedicAvailable: boolean;
  pediatricAvailable: boolean;
  ambulanceAvailableCount: number;
  
  // Bed metrics
  beds: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
  };
  
  // ICU metrics
  icu: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
  };
  
  // Emergency room metrics
  emergencyRooms: {
    total: number;
    available: number;
    occupied: number;
    cleaning: number;
  };
  
  // Queue metrics
  queue: {
    totalPatients: number;
    criticalCount: number;
    highCount: number;
    moderateCount: number;
    lowCount: number;
    estimatedWaitTimeMinutes: number;
    currentERLoadPercent: number;
  };
  
  // Ambulance metrics
  ambulances: {
    total: number;
    available: number;
    dispatched: number;
    enRoute: number;
    atHospital: number;
  };
  
  // Doctor counts by specialization
  doctors: {
    total: number;
    available: number;
    onDuty: number;
    bySpecialization: Record<string, { total: number; available: number }>;
  };
  
  // Facilities
  facilities: {
    emergencyDepartment: boolean;
    icu: boolean;
    oxygenSupport: boolean;
    ventilator: boolean;
    traumaCare: boolean;
    cardiacCare: boolean;
    strokeUnit: boolean;
    orthopedicSurgeon: boolean;
    pediatricEmergency: boolean;
  };
  
  // Doctor, room, and bed records managed by Hospital Staff (source of truth)
  doctorList?: Doctor[];
  roomsList?: Room[];
  bedList?: Bed[];

  // Whether this hospital has staff-entered / verified operational data.
  // Map-discovered hospitals without MediFlow operational data are false.
  operationalDataAvailable: boolean;

  // Metadata
  lastUpdated: string;
  updatedBy: string;
  configComplete: boolean;
}

// Hospital record combining geographic + operational data
export interface Hospital extends HospitalOperationalData {
  id: string;
  distanceKm: number;
  travelTimeMinutes: number;
  trafficCondition: 'Low' | 'Moderate' | 'Heavy';
  
  // Computed/derived fields
  availableICUBeds: number; // alias for icu.available
  availableEmergencyBeds: number; // alias for emergencyRooms.available
  availableBeds: number; // alias for beds.available
  totalBeds: number; // alias for beds.total
  totalICUBeds: number; // alias for icu.total
  totalEmergencyBeds: number; // alias for emergencyRooms.total
  currentERLoadPercent: number; // alias for queue.currentERLoadPercent
  estimatedWaitTimeMinutes: number; // alias for queue.estimatedWaitTimeMinutes
  ambulanceAvailableCount: number; // alias for ambulances.available
  isDirectSearchMatch?: boolean; // Flag indicating this hospital was explicitly matched via search
}
