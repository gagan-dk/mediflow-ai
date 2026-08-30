export type UserRole = 'patient' | 'hospital_staff' | 'admin' | 'paramedic';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  hospitalId?: string;
  hospitalName?: string;
  badgeNumber?: string;
  email: string;
  avatarInitials?: string;
}

export interface DemoCredential {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  hospitalId?: string;
  hospitalName?: string;
  badgeNumber?: string;
  description: string;
}
