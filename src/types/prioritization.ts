import { SeverityLevel, RequiredFacilities } from './hospital';

export interface SymptomOption {
  id: string;
  label: string;
  category: 'cardiovascular' | 'respiratory' | 'neurological' | 'trauma' | 'gastrointestinal' | 'general';
  baselineSeverity: SeverityLevel;
  iconName: string;
  commonCombinations?: string[];
  requiredFacilities: Partial<RequiredFacilities>;
}

export interface PatientVitals {
  heartRateBpm?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturationSpO2?: number;
  temperatureCelsius?: number;
  respiratoryRate?: number;
}

export interface EmergencyAssessmentInput {
  patientName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  location: string;
  coordinates?: { lat: number; lng: number };
  selectedSymptoms: string[];
  duration: 'less_than_30min' | '1_to_3_hours' | 'today' | 'several_days';
  painScale: number; // 0 to 10
  existingConditions: string[];
  consciousness: 'alert' | 'voice_responsive' | 'pain_responsive' | 'unresponsive';
  vitals?: PatientVitals;
  uploadedDocumentName?: string;
  notes?: string;
}

export interface AssessmentResult {
  id: string;
  patientId: string;
  timestamp: string;
  severity: SeverityLevel;
  riskScore: number; // 0 - 100 risk score
  recommendedResponseTimeMinutes: number;
  esiLevel: 1 | 2 | 3 | 4 | 5; // Emergency Severity Index level
  reasoningSummary: string;
  keyRiskFactors: string[];
  requiredFacilities: RequiredFacilities;
  disclaimer: string;
}
