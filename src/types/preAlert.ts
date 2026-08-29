import { SeverityLevel, RequiredFacilities } from './hospital';

export type PreAlertStatus = 
  | 'Alert Sent'
  | 'Hospital Acknowledged'
  | 'Resources Preparing'
  | 'Patient En Route'
  | 'Patient Arrived';

export interface PreAlertPreparation {
  alertReceived: boolean;
  icuReserved: boolean;
  emergencyRoomAssigned: boolean;
  assignedRoomNumber?: string;
  doctorNotified: boolean;
  assignedDoctorName?: string;
  bloodBankAlerted?: boolean;
  readyForArrival: boolean;
}

export interface HospitalPreAlert {
  id: string; // e.g. PA-1042
  patientId: string;
  patientName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  severity: SeverityLevel;
  symptoms: string[];
  vitalsSummary?: string;
  etaMinutes: number;
  requiredFacilities: RequiredFacilities;
  ambulanceId?: string;
  ambulanceVehicleNumber?: string;
  originLocation: string;
  destinationHospitalId: string;
  destinationHospitalName: string;
  status: PreAlertStatus;
  createdAt: string;
  preparation: PreAlertPreparation;
  notes?: string;
}
