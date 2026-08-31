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

export interface Room {
  id: string;
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

export const ROOM_STATUS_COLORS: Record<RoomStatus, { bg: string; text: string; border: string; icon: string }> = {
  'Available': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: '🟢' },
  'Reserved': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: '🟡' },
  'Occupied': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: '🔴' },
  'Cleaning': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: '🔵' },
  'Maintenance': { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200', icon: '⚫' }
};