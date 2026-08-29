import { SeverityLevel } from './hospital';

export type QueueStatus = 'Waiting' | 'Under Assessment' | 'Treatment' | 'Admitted' | 'Discharged';

export interface QueuePatient {
  id: string;
  tokenNumber: string; // e.g. #A104
  patientName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  severity: SeverityLevel;
  symptoms: string[];
  arrivalTime: string; // ISO string
  estimatedWaitMinutes: number;
  status: QueueStatus;
  assignedDoctor?: string;
  assignedRoom?: string;
  isPreAlertPatient?: boolean;
  preAlertId?: string;
  hospitalId: string;
  queuePosition: number;
}

export interface QueueStats {
  hospitalId: string;
  totalWaiting: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  averageWaitTimeMinutes: number;
  currentTokenNumber: string;
}
