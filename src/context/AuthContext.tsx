import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { loginUser, registerUser, logoutUser, resetPassword, LoginPayload, RegisterPayload } from '../services/authService';
import { UserRole, UserProfile } from '../types/user';
import { apiClient } from '../services/api/apiClient';
import { authGetCurrentUser } from '../services/api/authApi';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string, selectedRole?: UserRole) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  register: (payload: RegisterPayload, selectedRole?: UserRole) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to determine default role when backend fetch fails (fallback to selected role, then email inference)
const determineDefaultRole = (email: string | null, selectedRole?: UserRole): UserRole => {
  if (selectedRole) return selectedRole;
  if (!email) return 'patient';
  const e = email.toLowerCase();
  if (e.includes('admin')) return 'admin';
  if (e.includes('staff') || e.includes('hospital')) return 'hospital_staff';
  return 'patient';
};

const mapFirebaseUserToProfile = (user: FirebaseUser, roleStr?: string, fallbackRole?: UserRole): UserProfile => {
  const role = roleStr ? (roleStr.toLowerCase() as UserRole) : determineDefaultRole(user.email, fallbackRole);
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          apiClient.setAccessToken(token);
          const backendProfile = await authGetCurrentUser();
          const mockRole = localStorage.getItem('demo_mock_role') as UserRole | null;
          const roleToUse = mockRole || backendProfile.role;
          setProfile(mapFirebaseUserToProfile(currentUser, roleToUse, mockRole || undefined));
        } catch (error) {
          console.error("Failed to fetch backend profile for role, falling back to email inference", error);
          const mockRole = localStorage.getItem('demo_mock_role') as UserRole | null;
          setProfile(mapFirebaseUserToProfile(currentUser, undefined, mockRole || undefined));
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, selectedRole?: UserRole) => {
    try {
      const fbUser = await loginUser({ email, password });
      try {
        const token = await fbUser.getIdToken();
        apiClient.setAccessToken(token);
        const backendProfile = await authGetCurrentUser();
        const roleToUse = selectedRole || backendProfile.role;
        if (selectedRole) localStorage.setItem('demo_mock_role', selectedRole);
        const mappedProfile = mapFirebaseUserToProfile(fbUser, roleToUse, selectedRole);
        setUser(fbUser);
        setProfile(mappedProfile);
        return { success: true, role: mappedProfile.role };
      } catch (error) {
        console.error("Failed to fetch backend profile during login", error);
        if (selectedRole) localStorage.setItem('demo_mock_role', selectedRole);
        const fallbackRole = determineDefaultRole(fbUser.email, selectedRole);
        const mappedProfile = mapFirebaseUserToProfile(fbUser, fallbackRole, selectedRole);
        setUser(fbUser);
        setProfile(mappedProfile);
        return { success: true, role: fallbackRole };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const register = async (payload: RegisterPayload, selectedRole?: UserRole) => {
    try {
      const fbUser = await registerUser(payload);
      try {
        const token = await fbUser.getIdToken();
        apiClient.setAccessToken(token);
        const backendProfile = await authGetCurrentUser();
        const roleToUse = selectedRole || backendProfile.role;
        if (selectedRole) localStorage.setItem('demo_mock_role', selectedRole);
        const mappedProfile = mapFirebaseUserToProfile(fbUser, roleToUse, selectedRole);
        setUser(fbUser);
        setProfile(mappedProfile);
        return { success: true, role: mappedProfile.role };
      } catch (error) {
        if (selectedRole) localStorage.setItem('demo_mock_role', selectedRole);
        const fallbackRole = determineDefaultRole(fbUser.email, selectedRole);
        const mappedProfile = mapFirebaseUserToProfile(fbUser, fallbackRole, selectedRole);
        setUser(fbUser);
        setProfile(mappedProfile);
        return { success: true, role: fallbackRole };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      apiClient.setAccessToken(null);
      localStorage.removeItem('demo_mock_role');
      setProfile(null);
    } catch (error: any) {
      console.error("Logout failed", error);
    }
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
