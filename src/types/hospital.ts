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

export interface Hospital {
  id: string;
  name: string;
  type: 'Trauma Center Level 1' | 'Super Specialty' | 'General Hospital' | 'Community Hospital' | 'Cardiac Center';
  address: string;
  distanceKm: number;
  travelTimeMinutes: number; // Simulated with traffic
  trafficCondition: 'Low' | 'Moderate' | 'Heavy';
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  isOpen: boolean;
  
  // Resource metrics
  totalBeds: number;
  availableBeds: number;
  totalICUBeds: number;
  availableICUBeds: number;
  totalEmergencyBeds: number;
  availableEmergencyBeds: number;
  currentERLoadPercent: number; // 0-100%
  estimatedWaitTimeMinutes: number;
  
  // Capabilities
  emergencyAvailable: boolean;
  icuAvailable: boolean;
  oxygenSupport: boolean;
  ventilatorAvailability: boolean;
  traumaLevel: 1 | 2 | 3 | 0; // 0 = no trauma
  cardiacCareAvailable: boolean;
  strokeUnitAvailable: boolean;
  orthopedicAvailable: boolean;
  pediatricAvailable: boolean;
  ambulanceAvailableCount: number;
  
  // Rating and metadata
  rating: number;
  specialties: string[];
}

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
