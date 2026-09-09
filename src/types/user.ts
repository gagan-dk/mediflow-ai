export type UserRole = 'patient' | 'hospital_staff' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  hospitalId?: string;
  hospitalName?: string;
  badgeNumber?: string;
  staffId?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  avatarInitials?: string;

  // Backend JWT token (stored for API requests)
  accessToken?: string;
  tokenExpiresAt?: number;

  // Patient-specific fields
  age?: number;
  gender?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  location?: string;
  medicalInfo?: string;

  // Staff-specific fields
  specialization?: string;
  department?: string;
  experienceYears?: number;
  assignedHospital?: string;
  staffToken?: string | null;

  // Admin-specific fields
  adminLevel?: string;

  // Common fields
  accountStatus: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  lastLogin: string;
  theme?: 'light' | 'dark';
}

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  emergencyContact?: string;
  medicalInfo?: string;
  // Staff fields
  specialization?: string;
  department?: string;
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
