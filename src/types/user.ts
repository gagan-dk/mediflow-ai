export type UserRole = 'patient' | 'hospital_staff' | 'admin' | 'paramedic';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  hospitalId?: string;
  hospitalName?: string;
  badgeNumber?: string;
  email: string;
}
