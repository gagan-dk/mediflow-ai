import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { loginUser, registerUser, logoutUser, resetPassword, LoginPayload, RegisterPayload } from '../services/authService';
import { UserRole, UserProfile } from '../types/user';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to determine role from email (or default to patient) since there's no backend role assignment here yet
const determineRoleFromEmail = (email: string | null): UserRole => {
  if (!email) return 'patient';
  if (email.includes('admin')) return 'admin';
  if (email.includes('staff') || email.includes('hospital')) return 'hospital_staff';
  return 'patient';
};

const mapFirebaseUserToProfile = (user: FirebaseUser): UserProfile => {
  const role = determineRoleFromEmail(user.email);
  return {
    id: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
    role: role,
    email: user.email || '',
    accountStatus: 'active',
    createdAt: user.metadata.creationTime || new Date().toISOString(),
    lastLogin: user.metadata.lastSignInTime || new Date().toISOString(),
    avatarInitials: (user.displayName || user.email || 'U').substring(0, 2).toUpperCase(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfile(mapFirebaseUserToProfile(currentUser));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const fbUser = await loginUser({ email, password });
      const mappedProfile = mapFirebaseUserToProfile(fbUser);
      return { success: true, role: mappedProfile.role };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      const fbUser = await registerUser(payload);
      const mappedProfile = mapFirebaseUserToProfile(fbUser);
      return { success: true, role: mappedProfile.role };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await logoutUser();
  };

  const resetPasswordHandler = async (email: string) => {
    try {
      await resetPassword(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, resetPassword: resetPasswordHandler }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
