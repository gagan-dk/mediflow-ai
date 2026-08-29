export type AmbulanceStatus = 'Available' | 'Dispatched' | 'En Route' | 'At Hospital' | 'Unavailable';

export interface Ambulance {
  id: string;
  vehicleNumber: string; // e.g. KA-01-A17
  driverName: string;
  driverPhone: string;
  paramedicName: string;
  status: AmbulanceStatus;
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  destinationHospitalId?: string;
  destinationHospitalName?: string;
  assignedPatientId?: string;
  assignedPatientName?: string;
  patientSeverity?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  etaMinutes: number;
  
  // Equipment & capabilities
  oxygenSupport: boolean;
  ventilatorSupport: boolean;
  defibrillator: boolean;
  advancedLifeSupport: boolean; // ALS vs BLS
  traumaKit: boolean;
  
  routeCoordinates?: Array<[number, number]>;
}
