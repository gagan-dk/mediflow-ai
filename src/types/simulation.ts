import { SeverityLevel } from './hospital';

export interface SyntheticScenario {
  id: string;
  patientName: string;
  age: number;
  symptoms: string[];
  severity: SeverityLevel;
  requiredFacilities: string[];
  recommendedHospitalId: string;
  recommendedHospitalName: string;
  assignedAmbulanceId?: string;
  estimatedWaitMinutes: number;
  travelTimeMinutes: number;
  rerouteOccurred: boolean;
  status: 'Completed' | 'In Progress';
}

export interface SimulationResultMetrics {
  totalScenariosRun: number;
  averageSimulatedWaitTimeMinutes: number;
  simulatedHospitalUtilizationPercent: number;
  simulatedAmbulanceEtaMinutes: number;
  criticalCasesSuccessfullyRoutedPercent: number;
  reroutesTriggeredCount: number;
  queueDistribution: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  hospitalLoadDistribution: Array<{
    hospitalName: string;
    loadPercent: number;
    patientsRouted: number;
  }>;
  facilityMatchingAccuracyPercent: number;
  timestamp: string;
}
