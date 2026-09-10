import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Hospital, Bed, Doctor, Room } from '../types/hospital';
import { Ambulance, AmbulanceStatus } from '../types/ambulance';
import { QueuePatient, QueueStatus } from '../types/queue';
import { HospitalPreAlert, PreAlertStatus } from '../types/preAlert';
import { AssessmentResult, EmergencyAssessmentInput } from '../types/prioritization';
import { RankedHospital, rankHospitalsForPatient } from '../services/rankingEngine';
import { evaluateEmergencyPriority } from '../services/prioritizationEngine';
import {
  NOT_AVAILABLE_MESSAGE
} from '../services/mockData';
import {
  UserGeoLocation,
  reverseGeocodeCoords
} from '../services/realHospitalService';
import { mapService } from '../services/map/mapService';
import { hospitalDiscoveryService } from '../services/hospitalDiscoveryService';
import { hospitalService } from '../services/hospitalService';
import { soundFX } from '../services/soundEffects';
import { SystemNotification } from '../types/notification';
import { UserRole, UserProfile } from '../types/user';
import { authLogin, authGetCurrentUser, type AuthUser } from '../services/api/authApi';
import { apiClient } from '../services/api/apiClient';
import {
  createEmergencyCase,
  getEmergencyCase,
  selectHospitalForCase,
  getQueueForHospital,
  updateQueueTokenStatus as updateQueueTokenStatusApi,
} from '../services/api/emergencyApi';
import type { EmergencyCaseRead, QueueTokenView, BackendQueueStatus } from '../types/api';

export type JourneyStage = 
  | 'idle'
  | 'assessed'
  | 'pre_alert_sent'
  | 'ambulance_dispatched'
  | 'patient_enroute'
  | 'arrived_hospital'
  | 'in_queue'
  | 'under_doctor_assessment'
  | 'treatment'
  | 'completed';

interface RerouteEventData {
  previousHospital: Hospital;
  newHospital: Hospital;
  reason: string;
}

interface AppContextType {
  // Authentication
  isAuthenticated: boolean;
  authLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;

  // User & Role
  currentUser: UserProfile;
  setUserRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Live User Location & Geolocation
  userLiveLocation: UserGeoLocation;
  detectUserLiveLocation: () => Promise<void>;
  isLocatingUser: boolean;

  // Hospital state
  hospitals: Hospital[];
  setHospitals: (hospitals: Hospital[]) => void;
  addDiscoveredHospitals: (newHospitals: Hospital[]) => void;
  selectedHospital: Hospital | null;
  setSelectedHospital: (hospital: Hospital | null) => void;
  rankedHospitals: RankedHospital[];

  // Hospital Staff Management
  doctors: Doctor[];
  setDoctors: (doctors: Doctor[]) => void;
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  
  // Assessment & Triage
  currentAssessmentInput: EmergencyAssessmentInput | null;
  assessmentResult: AssessmentResult | null;
  runEmergencyAssessment: (input: EmergencyAssessmentInput) => AssessmentResult;
  clearAssessment: () => void;

  // Emergency Backend Integration
  currentEmergencyCase: EmergencyCaseRead | null;
  currentQueueToken: QueueTokenView | null;
  emergencyLoading: boolean;
  emergencyError: string | null;
  submitEmergencyCase: (input: EmergencyAssessmentInput) => Promise<boolean>;
  selectHospitalAndCreateToken: (hospitalId: string) => Promise<boolean>;
  refreshQueueToken: () => Promise<void>;
  refreshQueueForHospital: (hospitalId: string) => Promise<QueueTokenView[]>;
  fetchStaffQueue: (hospitalId: string) => Promise<QueueTokenView[]>;
  updateQueueTokenStatusByStaff: (tokenId: string, status: BackendQueueStatus) => Promise<boolean>;
  clearEmergencyError: () => void;

  // Pre-Alert Workflow
  preAlerts: HospitalPreAlert[];
  activePreAlert: HospitalPreAlert | null;
  sendHospitalPreAlert: (hospital: Hospital, customNotes?: string) => HospitalPreAlert;
  updatePreAlertStatus: (preAlertId: string, status: PreAlertStatus) => void;
  updatePreAlertPreparation: (preAlertId: string, prepKey: keyof HospitalPreAlert['preparation'], value: boolean | string) => void;
  
  // Ambulance Management
  ambulances: Ambulance[];
  activeAmbulance: Ambulance | null;
  dispatchAmbulanceForPatient: (ambulanceId: string, patientName: string, hospitalId: string) => void;
  
  // Queue Management
  queuePatients: QueuePatient[];
  myQueueToken: QueuePatient | null;
  generatePatientToken: (patientName: string, severity: AssessmentResult['severity'], hospitalId: string) => QueuePatient;
  updateQueuePatientStatus: (patientId: string, status: QueueStatus, assignedDoctor?: string, assignedRoom?: string) => void;
  
  // Bed Management
  beds: Bed[];
  toggleBedStatus: (bedId: string) => void;
  updateBedStatus: (bedId: string, status: Bed['status'], patientName?: string) => void;

  // Centralized Hospital Service
  getHospitalById: (hospitalId: string) => Hospital | null;
  updateHospital: (hospital: Hospital) => Promise<Hospital>;
  updateHospitalBeds: (hospitalId: string, data: Partial<Hospital['beds']>) => Promise<void>;
  updateHospitalICU: (hospitalId: string, data: Partial<Hospital['icu']>) => Promise<void>;
  updateHospitalEmergencyRooms: (hospitalId: string, data: Partial<Hospital['emergencyRooms']>) => Promise<void>;
  updateHospitalQueue: (hospitalId: string, data: Partial<Hospital['queue']>) => Promise<void>;
  updateHospitalDoctors: (hospitalId: string, data: Partial<Hospital['doctors']>) => void;
  updateHospitalAmbulances: (hospitalId: string, data: Partial<Hospital['ambulances']>) => Promise<void>;
  updateHospitalCapabilities: (hospitalId: string, data: Partial<Hospital['facilities']>) => Promise<void>;
  addDoctorToHospital: (hospitalId: string, doctor: Doctor) => Promise<Doctor>;
  updateDoctorInHospital: (hospitalId: string, doctorId: string, updates: Partial<Doctor>) => Promise<Doctor | null>;
  removeDoctorFromHospital: (hospitalId: string, doctorId: string) => Promise<void>;
  addRoomToHospital: (hospitalId: string, room: Room) => Promise<Room>;
  updateRoomInHospital: (hospitalId: string, roomId: string, updates: Partial<Room>) => Promise<Room | null>;
  resyncHospitalDoctors: (hospitalId: string) => void;
  
  // Patient Journey
  journeyStage: JourneyStage;
  setJourneyStage: (stage: JourneyStage) => void;
  advanceJourneyStage: () => void;

  // Notifications
  notifications: SystemNotification[];
  addNotification: (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Dynamic Re-Routing & Capacity Simulation
  isReroutingModalOpen: boolean;
  setIsReroutingModalOpen: (open: boolean) => void;
  rerouteData: RerouteEventData | null;
  simulateHospitalBecomingFull: (hospitalId?: string) => void;
  resetHospitalCapacities: () => void;

  // SIH Golden Demo Mode
  triggerSIHDemoMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  // Role & User — starts as guest; restored from backend on mount
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'usr-guest',
    name: 'Guest',
    role: 'patient',
    email: 'guest@mediflow.ai',
    accountStatus: 'active',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  });

  // Theme preference (light/dark), applied to <html> root
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('mediflow-theme');
    return stored === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('mediflow-theme', theme);
    setCurrentUser(prev => ({ ...prev, theme }));
  }, [theme]);

  const setTheme = (next: 'light' | 'dark') => {
    setThemeState(next);
    soundFX.playChime();
  };

  // ─── Role mapping: backend uppercase → frontend lowercase ──────────────────
  const mapBackendRole = (backendRole: string): UserRole => {
    switch (backendRole) {
      case 'PATIENT': return 'patient';
      case 'HOSPITAL_STAFF': return 'hospital_staff';
      case 'ADMIN': return 'admin';
      default: return 'patient';
    }
  };

  // ─── Map backend user response to frontend UserProfile ─────────────────────
  const mapUserFromBackend = (backendUser: AuthUser, token: string, expiresIn: number): UserProfile => {
    const role = mapBackendRole(backendUser.role);
    const profile: UserProfile = {
      id: backendUser.id,
      name: backendUser.full_name,
      role,
      email: backendUser.email,
      phone: backendUser.phone || undefined,
      avatarInitials: backendUser.full_name
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      accessToken: token,
      tokenExpiresAt: Date.now() + expiresIn * 1000,
      accountStatus: 'active',
      createdAt: backendUser.created_at,
      lastLogin: new Date().toISOString(),
    };

    if (role === 'patient') {
      profile.age = backendUser.age;
      profile.gender = backendUser.gender;
      profile.bloodGroup = backendUser.blood_group;
      profile.location = backendUser.location;
    } else if (role === 'hospital_staff') {
      profile.staffId = backendUser.staff_id;
      profile.department = backendUser.department;
      profile.experienceYears = backendUser.experience_years;
      profile.hospitalId = backendUser.hospital_id;
      profile.hospitalName = backendUser.hospital_name;
    } else if (role === 'admin') {
      profile.adminLevel = 'System Administrator';
    }

    return profile;
  };

  // ─── Token expiration check ───────────────────────────────────────────────
  const isTokenExpired = (): boolean => {
    const expiresAt = localStorage.getItem('auth_token_expires_at');
    if (!expiresAt) return true;
    return Date.now() > parseInt(expiresAt, 10);
  };

  // ─── Session restoration on mount ─────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken || isTokenExpired()) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expires_at');
        setAuthLoading(false);
        return;
      }

      try {
        apiClient.setAccessToken(storedToken);
        const backendUser = await authGetCurrentUser();
        const expiresAt = localStorage.getItem('auth_token_expires_at');
        const expiresInMs = expiresAt ? parseInt(expiresAt, 10) - Date.now() : 28800 * 1000;
        const expiresInSec = Math.max(0, Math.floor(expiresInMs / 1000));
        const profile = mapUserFromBackend(backendUser, storedToken, expiresInSec);
        setCurrentUser(profile);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expires_at');
        apiClient.setAccessToken(null);
        setSessionExpired(true);
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Live Location state - will be updated with real GPS coordinates
  const [userLiveLocation, setUserLiveLocation] = useState<UserGeoLocation>({
    lat: 0,
    lng: 0,
    address: 'Detecting your location...',
    isLiveGps: false,
    city: ''
  });
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [locationAttempted, setLocationAttempted] = useState<boolean>(false);

  // Centralized hospital data from hospitalService
  // Initialize from storage (sync) - API sync happens in background
  const [hospitals, setHospitalsState] = useState<Hospital[]>([]);
  
  // Sync hospitals from storage on mount and optionally from API
  useEffect(() => {
    (async () => {
      const stored = hospitalService.getHospitalsSync();
      if (stored.length > 0) setHospitalsState(stored);
      
      // Optionally sync from API in background (non-blocking)
      try {
        const apiHospitals = await hospitalService.syncAllHospitalsFromBackend();
        if (apiHospitals.length > 0) {
          setHospitalsState(apiHospitals);
        }
      } catch {
        // Silently fail - localStorage fallback is already loaded
      }
    })();
    
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: CustomEvent) => {
      if (e.detail) {
        const updated = hospitalService.getHospitalsSync();
        setHospitalsState(updated);
      }
    };
    window.addEventListener('mediflow:hospitals-changed', handleStorageChange as EventListener);
    return () => window.removeEventListener('mediflow:hospitals-changed', handleStorageChange as EventListener);
  }, []);
  
  const setHospitals = useCallback(async (newHospitals: Hospital[]) => {
    for (const h of newHospitals) {
      await hospitalService.updateHospital(h);
    }
    setHospitalsState(hospitalService.getHospitalsSync());
  }, []);

  const addDiscoveredHospitals = useCallback((newHospitals: Hospital[]) => {
    if (!newHospitals || newHospitals.length === 0) return;
    setHospitalsState(prev => {
      const merged = [...prev];
      for (const nh of newHospitals) {
        const existingIdx = merged.findIndex(h => 
          h.id === nh.id || 
          h.hospitalId === nh.hospitalId ||
          (Math.abs(h.coordinates.lat - nh.coordinates.lat) < 0.003 && Math.abs(h.coordinates.lng - nh.coordinates.lng) < 0.003)
        );
        if (existingIdx >= 0) {
          merged[existingIdx] = { ...merged[existingIdx], ...nh };
        } else {
          // Prepend newly searched hospital so it's prioritized
          merged.unshift(nh);
        }
      }
      return merged;
    });
  }, []);
  
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [beds, setBedsState] = useState<Bed[]>([]);
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);
  const [preAlerts, setPreAlerts] = useState<HospitalPreAlert[]>([]);
  
  // Active session state
  const [currentAssessmentInput, setCurrentAssessmentInput] = useState<EmergencyAssessmentInput | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [activePreAlert, setActivePreAlert] = useState<HospitalPreAlert | null>(null);
  const [activeAmbulance, setActiveAmbulance] = useState<Ambulance | null>(null);
  const [myQueueToken, setMyQueueToken] = useState<QueuePatient | null>(null);
  const [journeyStage, setJourneyStage] = useState<JourneyStage>('idle');

  // Emergency backend integration state
  const [currentEmergencyCase, setCurrentEmergencyCase] = useState<EmergencyCaseRead | null>(null);
  const [currentQueueToken, setCurrentQueueToken] = useState<QueueTokenView | null>(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const emergencySubmittingRef = useRef(false);
  const emergencyTokenCreatingRef = useRef(false);

  // Hospital Staff Management state — derived from the SELECTED hospital's
  // single shared record (doctorList / roomsList) so staff writes are
  // immediately visible to patients via the centralized store.
  const [doctors, setDoctorsState] = useState<Doctor[]>(() => {
    const hosp = selectedHospital || hospitals.find(h => h.hospitalId === currentUser.hospitalId) || hospitals[0];
    return hosp?.doctorList || [];
  });
  const [rooms, setRoomsState] = useState<Room[]>(() => {
    const hosp = selectedHospital || hospitals.find(h => h.hospitalId === currentUser.hospitalId) || hospitals[0];
    return hosp?.roomsList || [];
  });

  // Keep in sync whenever the selected hospital or the shared store changes
  useEffect(() => {
    const hosp = selectedHospital || hospitals.find(h => h.hospitalId === currentUser.hospitalId) || hospitals[0];
    if (hosp) {
      setDoctorsState(hosp.doctorList || []);
      setRoomsState(hosp.roomsList || []);
      if (hosp.bedList && hosp.bedList.length > 0) {
        setBedsState(hosp.bedList);
      }
    }
  }, [selectedHospital, hospitals, currentUser.hospitalId]);

  const setDoctors = (newDoctors: Doctor[]) => {
    setDoctorsState(newDoctors);
    const hosp = selectedHospital || hospitals.find(h => h.hospitalId === currentUser.hospitalId) || hospitals[0];
    if (hosp) {
      hospitalService.updateHospital({ ...hosp, doctorList: newDoctors, operationalDataAvailable: true });
    }
  };

  const setRooms = (newRooms: Room[]) => {
    setRoomsState(newRooms);
    const hosp = selectedHospital || hospitals.find(h => h.hospitalId === currentUser.hospitalId) || hospitals[0];
    if (hosp) {
      hospitalService.updateHospital({ ...hosp, roomsList: newRooms, operationalDataAvailable: true });
    }
  };

  // Notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'notif-1',
      title: 'MediFlow AI System Initialized',
      message: 'Emergency routing and capacity tracking systems active.',
      type: 'system',
      timestamp: '2 min ago',
      read: false
    }
  ]);

  // Re-routing Modal
  const [isReroutingModalOpen, setIsReroutingModalOpen] = useState<boolean>(false);
  const [rerouteData, setRerouteData] = useState<RerouteEventData | null>(null);

  // Function to detect live GPS location and fetch real existing nearby hospitals
  const detectUserLiveLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.warn('Geolocation not supported by this browser.');
      addNotification({
        title: '❌ Location Error',
        message: 'Geolocation is not supported by this browser.',
        type: 'system'
      });
      return;
    }

    setIsLocatingUser(true);

    // Log provider configuration in dev mode
    if (import.meta.env.DEV) {
      const { isConfigured } = await import('../services/map/apiQuotaService');
      console.log('[Config] Geoapify configured:', isConfigured('geoapify'));
      console.log('[Config] LocationIQ configured:', isConfigured('locationiq'));
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const geoInfo = await reverseGeocodeCoords(latitude, longitude);
          
          setUserLiveLocation({
            lat: latitude,
            lng: longitude,
            address: geoInfo.address,
            city: geoInfo.city,
            isLiveGps: true,
            accuracyMeters: Math.round(accuracy)
          });

          console.log('[GPS] User location:', { lat: latitude, lng: longitude, accuracy });
          console.log('[GPS] Reverse geocoded address:', geoInfo.address);

          let nearbyHospitals: Hospital[] = [];
          let discoverySource: string = 'none';
          let providerMessage: string | undefined;
          try {
            const discovery = await hospitalDiscoveryService.discoverHospitals(latitude, longitude, {
              minHospitals: 5,
              initialRadiusKm: 10,
              maxRadiusKm: 30,
            });
            nearbyHospitals = discovery.hospitals;
            discoverySource = discovery.source;
            providerMessage = discovery.providerMessage;
            console.log('[Hospitals] Discovery found:', nearbyHospitals.length, 'within', discovery.searchRadiusKm, 'km via', discoverySource);
            if (providerMessage) {
              console.log('[Hospitals] Provider message:', providerMessage);
            }
          } catch (discoveryError) {
            console.warn('[Hospitals] Discovery error:', discoveryError);
          }

          if (nearbyHospitals.length > 0) {
            const merged = await hospitalService.mergeDiscoveredHospitals(nearbyHospitals);
            setHospitals(merged);
            setSelectedHospital(merged[0]);
            addNotification({
              title: '📍 Live GPS Location Acquired',
              message: `Current location: ${geoInfo.address}. Found ${nearbyHospitals.length} hospitals nearby (${discoverySource}).`,
              type: 'system'
            });
          } else {
            const status = mapService.getStatus();
            let message = 'No hospitals found in the selected radius.';
            if (providerMessage) {
              message = providerMessage;
            } else if (status.message) {
              message = status.message;
            }
            addNotification({
              title: '📍 Location Acquired — No Hospitals Found',
              message: `${message} Try searching by hospital name.`,
              type: 'system'
            });
          }

        } catch (e) {
          console.error('Error fetching real hospitals:', e);
          addNotification({
            title: '⚠️ Location Error',
            message: 'Failed to fetch hospital data. Please try again.',
            type: 'system'
          });
        } finally {
          setIsLocatingUser(false);
        }
      },
      (err) => {
        console.warn('GPS location permission denied or timed out:', err.message);
        setIsLocatingUser(false);
        addNotification({
          title: '⚠️ Location Permission Denied',
          message: 'Please enable location access to find nearby hospitals.',
          type: 'system'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Attempt live GPS auto-detect immediately on app load with High Accuracy
  useEffect(() => {
    if (!locationAttempted) {
      setLocationAttempted(true);
      detectUserLiveLocation();
    }
  }, [locationAttempted]);

  // Calculate ranked hospitals dynamically whenever assessment or hospitals change
  const rankedHospitals = React.useMemo(() => {
    return rankHospitalsForPatient(hospitals, assessmentResult);
  }, [hospitals, assessmentResult]);

  // ─── Authentication ──────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    try {
      const response = await authLogin({ email, password });
      const { access_token, expires_in, user } = response;

      apiClient.setAccessToken(access_token);
      localStorage.setItem('auth_token_expires_at', String(Date.now() + expires_in * 1000));

      const profile = mapUserFromBackend(user, access_token, expires_in);
      setCurrentUser(profile);
      setIsAuthenticated(true);
      setSessionExpired(false);

      return { success: true, role: profile.role };
    } catch (err: any) {
      const message = err?.message || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token_expires_at');
    apiClient.setAccessToken(null);
    setIsAuthenticated(false);
    setSessionExpired(false);
    setCurrentUser({
      id: 'usr-guest',
      name: 'Guest',
      role: 'patient',
      email: 'guest@mediflow.ai',
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    });
    // Reset session state
    setAssessmentResult(null);
    setCurrentAssessmentInput(null);
    setMyQueueToken(null);
    setJourneyStage('idle');
    setCurrentEmergencyCase(null);
    setCurrentQueueToken(null);
    setEmergencyError(null);
  };

  const setUserRole = (role: UserRole) => {
    let name = 'Demo User';

    const profile: UserProfile = {
      id: `usr-${role}`,
      name,
      role,
      badgeNumber: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
      email: `${role}@mediflow.ai`,
      accountStatus: 'active',
      createdAt: 'Jan 2024',
      lastLogin: new Date().toISOString(),
    };

    setCurrentUser(profile);

    addNotification({
      title: `Switched View: ${role.replace('_', ' ').toUpperCase()}`,
      message: `Active dashboard role adjusted for demonstration.`,
      type: 'system'
    });
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setCurrentUser(prev => {
      const updated = { ...prev, ...updates };
      // Keep avatar initials in sync with the new name
      if (updates.name) {
        updated.avatarInitials = updates.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      }
      return updated;
    });
    addNotification({
      title: 'Profile Updated',
      message: 'Your profile information has been saved successfully.',
      type: 'system'
    });
  };

  const addNotification = (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: SystemNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Run Prioritization
  const runEmergencyAssessment = (input: EmergencyAssessmentInput): AssessmentResult => {
    setCurrentAssessmentInput(input);
    const result = evaluateEmergencyPriority(input);
    setAssessmentResult(result);
    setJourneyStage('assessed');

    if (result.severity === 'CRITICAL') {
      soundFX.playEmergencyAlert();
    } else {
      soundFX.playChime();
    }

    const requiredFacsList = Object.entries(result.requiredFacilities)
      .filter(([, val]) => Boolean(val))
      .map(([key]) => key)
      .join(', ');

    addNotification({
      title: `Emergency Assessment Completed: ${result.severity}`,
      message: `Risk score: ${result.riskScore}/100. Key facilities required: ${requiredFacsList || 'Emergency Department'}`,
      type: 'emergency'
    });

    return result;
  };

  const clearAssessment = () => {
    setCurrentAssessmentInput(null);
    setAssessmentResult(null);
    setSelectedHospital(null);
    setMyQueueToken(null);
    setJourneyStage('idle');
    setCurrentEmergencyCase(null);
    setCurrentQueueToken(null);
    setEmergencyError(null);
  };

  // ─── Backend Emergency Case Submission ────────────────────────────────────
  const submitEmergencyCase = async (input: EmergencyAssessmentInput): Promise<boolean> => {
    if (emergencySubmittingRef.current) return false;
    emergencySubmittingRef.current = true;
    setEmergencyLoading(true);
    setEmergencyError(null);

    const symptomsText = input.selectedSymptoms.join(', ');
    const severityFromEngine = (() => {
      const r = evaluateEmergencyPriority(input);
      return r.severity;
    })();

    const lat = input.coordinates?.lat ?? userLiveLocation.lat ?? 0;
    const lng = input.coordinates?.lng ?? userLiveLocation.lng ?? 0;

    try {
      const backendCase = await createEmergencyCase({
        reported_symptoms: symptomsText,
        age: input.age,
        latitude: lat,
        longitude: lng,
        severity: severityFromEngine,
      });

      setCurrentEmergencyCase(backendCase);
      setCurrentAssessmentInput(input);

      const localResult = evaluateEmergencyPriority(input);
      setAssessmentResult(localResult);
      setJourneyStage('assessed');

      soundFX.playEmergencyAlert();
      addNotification({
        title: `Emergency Case Created: ${backendCase.severity}`,
        message: `Case ${backendCase.id.slice(0, 8)}… registered. Priority: ${backendCase.priority_score ?? 'N/A'}/100.`,
        type: 'emergency',
      });

      return true;
    } catch (err: any) {
      console.error('[EmergencyAPI] Failed to create case:', err);
      const msg = err?.message || 'Failed to submit emergency case. Please try again.';
      setEmergencyError(msg);

      const localResult = evaluateEmergencyPriority(input);
      setAssessmentResult(localResult);
      setCurrentAssessmentInput(input);
      setJourneyStage('assessed');

      addNotification({
        title: 'Emergency Case — Offline Mode',
        message: `${msg} Using local prioritization.`,
        type: 'emergency',
      });

      return false;
    } finally {
      setEmergencyLoading(false);
      emergencySubmittingRef.current = false;
    }
  };

  const selectHospitalAndCreateToken = async (hospitalId: string): Promise<boolean> => {
    if (emergencyTokenCreatingRef.current) return false;
    if (!currentEmergencyCase) return false;

    emergencyTokenCreatingRef.current = true;
    setEmergencyLoading(true);
    setEmergencyError(null);

    try {
      const response = await selectHospitalForCase({
        emergencyId: currentEmergencyCase.id,
        hospitalId,
      });

      setCurrentQueueToken(response.queue_token);
      const hosp = hospitals.find(h => h.id === hospitalId);
      if (hosp) setSelectedHospital(hosp);
      setJourneyStage('in_queue');

      soundFX.playChime();
      addNotification({
        title: `Hospital Selected: ${hosp?.name || hospitalId}`,
        message: `Queue token ${response.queue_token.token_number} assigned. Position: ${response.queue_token.queue_position}.`,
        type: 'queue',
      });

      return true;
    } catch (err: any) {
      console.error('[EmergencyAPI] Failed to select hospital:', err);
      const msg = err?.message || 'Failed to select hospital. Please try again.';
      setEmergencyError(msg);
      return false;
    } finally {
      setEmergencyLoading(false);
      emergencyTokenCreatingRef.current = false;
    }
  };

  const refreshQueueToken = async () => {
    if (!currentQueueToken) return;
    try {
      const queueData = await getQueueForHospital(currentQueueToken.hospital_id);
      const updated = queueData.items.find(t => t.id === currentQueueToken.id);
      if (updated) setCurrentQueueToken(updated);
    } catch {
      // Silent fail — stale token data is acceptable
    }
  };

  const refreshQueueForHospital = async (hospitalId: string): Promise<QueueTokenView[]> => {
    try {
      const queueData = await getQueueForHospital(hospitalId);
      return queueData.items;
    } catch {
      return [];
    }
  };

  const fetchStaffQueue = async (hospitalId: string): Promise<QueueTokenView[]> => {
    try {
      const queueData = await getQueueForHospital(hospitalId);
      return queueData.items;
    } catch {
      return [];
    }
  };

  const updateQueueTokenStatusByStaff = async (tokenId: string, status: BackendQueueStatus): Promise<boolean> => {
    try {
      await updateQueueTokenStatusApi(tokenId, status);
      soundFX.playChime();
      addNotification({
        title: 'Queue Token Updated',
        message: `Token status changed to ${status}.`,
        type: 'queue',
      });
      return true;
    } catch (err: any) {
      console.error('[EmergencyAPI] Failed to update token:', err);
      setEmergencyError(err?.message || 'Failed to update token status.');
      return false;
    }
  };

  const clearEmergencyError = () => setEmergencyError(null);

  // Pre-Alert Workflow
  const sendHospitalPreAlert = (hospital: Hospital, customNotes?: string): HospitalPreAlert => {
    const preAlertId = `PA-${Math.floor(1000 + Math.random() * 9000)}`;
    const patientName = currentAssessmentInput?.patientName || 'Emergency Patient';
    const severity = assessmentResult?.severity || 'HIGH';

    // Find best ambulance with matching oxygen capability
    const matchedAmbulance = ambulances.find(a => a.status === 'Available' && a.oxygenSupport) || ambulances[0];

    const newPreAlert: HospitalPreAlert = {
      id: preAlertId,
      patientId: assessmentResult?.patientId || `P-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName,
      age: currentAssessmentInput?.age || 0,
      gender: currentAssessmentInput?.gender || 'other',
      severity,
      symptoms: currentAssessmentInput?.selectedSymptoms || [],
      vitalsSummary: currentAssessmentInput?.vitals 
        ? `HR: ${currentAssessmentInput.vitals.heartRateBpm || 'N/A'} | SpO2: ${currentAssessmentInput.vitals.oxygenSaturationSpO2 || 'N/A'}% | BP: ${currentAssessmentInput.vitals.bloodPressureSystolic || 'N/A'}/${currentAssessmentInput.vitals.bloodPressureDiastolic || 'N/A'}` 
        : NOT_AVAILABLE_MESSAGE,
      etaMinutes: hospital.travelTimeMinutes || 0,
      requiredFacilities: assessmentResult?.requiredFacilities || {
        emergencyDepartment: true,
        icu: false,
        oxygenSupport: false,
        ventilator: false,
        traumaCare: false,
        cardiacCare: false,
        strokeUnit: false,
        orthopedicSurgeon: false,
        pediatricEmergency: false
      },
      ambulanceId: matchedAmbulance?.id,
      ambulanceVehicleNumber: matchedAmbulance?.vehicleNumber || undefined,
      originLocation: userLiveLocation.address || currentAssessmentInput?.location || NOT_AVAILABLE_MESSAGE,
      destinationHospitalId: hospital.id,
      destinationHospitalName: hospital.name,
      status: 'Alert Sent',
      createdAt: new Date().toISOString(),
      preparation: {
        alertReceived: true,
        icuReserved: false,
        emergencyRoomAssigned: false,
        doctorNotified: true,
        readyForArrival: false
      },
      notes: customNotes
    };

    setPreAlerts(prev => [newPreAlert, ...prev]);
    setActivePreAlert(newPreAlert);
    setSelectedHospital(hospital);
    setJourneyStage('pre_alert_sent');

    soundFX.playEmergencyAlert();

    addNotification({
      title: `🚨 PRE-ALERT TRANSMITTED: ${hospital.name}`,
      message: `Emergency pre-alert for ${patientName} (${severity}) sent to ${hospital.name}. ETA: ${hospital.travelTimeMinutes}m.`,
      type: 'emergency'
    });

    // Automatically update matched ambulance to dispatched
    if (matchedAmbulance) {
      setAmbulances(prev => prev.map(a => a.id === matchedAmbulance.id ? {
        ...a,
        status: 'Dispatched',
        destinationHospitalId: hospital.id,
        destinationHospitalName: hospital.name,
        assignedPatientId: newPreAlert.patientId,
        assignedPatientName: patientName,
        patientSeverity: severity,
        etaMinutes: hospital.travelTimeMinutes
      } : a));
      setActiveAmbulance({
        ...matchedAmbulance,
        status: 'Dispatched',
        destinationHospitalId: hospital.id,
        destinationHospitalName: hospital.name,
        assignedPatientId: newPreAlert.patientId,
        assignedPatientName: patientName,
        patientSeverity: severity
      });
    }

    return newPreAlert;
  };

  const updatePreAlertStatus = (preAlertId: string, status: PreAlertStatus) => {
    setPreAlerts(prev => prev.map(pa => pa.id === preAlertId ? { ...pa, status } : pa));
    if (activePreAlert && activePreAlert.id === preAlertId) {
      setActivePreAlert(prev => prev ? { ...prev, status } : null);
    }
    soundFX.playChime();
  };

  const updatePreAlertPreparation = (preAlertId: string, prepKey: keyof HospitalPreAlert['preparation'], value: boolean | string) => {
    setPreAlerts(prev => prev.map(pa => {
      if (pa.id !== preAlertId) return pa;
      const updatedPrep = { ...pa.preparation, [prepKey]: value };
      const allReady = updatedPrep.alertReceived && updatedPrep.icuReserved && updatedPrep.emergencyRoomAssigned && updatedPrep.doctorNotified;
      if (allReady) updatedPrep.readyForArrival = true;

      return {
        ...pa,
        preparation: updatedPrep,
        status: allReady ? 'Resources Preparing' : pa.status
      };
    }));

    if (activePreAlert && activePreAlert.id === preAlertId) {
      setActivePreAlert(prev => {
        if (!prev) return null;
        const updatedPrep = { ...prev.preparation, [prepKey]: value };
        const allReady = updatedPrep.alertReceived && updatedPrep.icuReserved && updatedPrep.emergencyRoomAssigned && updatedPrep.doctorNotified;
        if (allReady) updatedPrep.readyForArrival = true;
        return {
          ...prev,
          preparation: updatedPrep,
          status: allReady ? 'Resources Preparing' : prev.status
        };
      });
    }
    soundFX.playChime();
  };

  // Ambulance Dispatch
  const dispatchAmbulanceForPatient = (ambulanceId: string, patientName: string, hospitalId: string) => {
    const hosp = hospitals.find(h => h.id === hospitalId) || hospitals[0];
    setAmbulances(prev => prev.map(a => {
      if (a.id === ambulanceId) {
        const updated: Ambulance = {
          ...a,
          status: 'En Route',
          destinationHospitalId: hosp.id,
          destinationHospitalName: hosp.name,
          assignedPatientName: patientName,
          etaMinutes: hosp.travelTimeMinutes
        };
        setActiveAmbulance(updated);
        return updated;
      }
      return a;
    }));
    setJourneyStage('patient_enroute');
    soundFX.playEmergencyAlert();

    addNotification({
      title: '🚑 Ambulance Dispatched',
      message: `Ambulance assigned for ${patientName}. En route to ${hosp.name}.`,
      type: 'ambulance'
    });
  };

  // Queue Management
  const generatePatientToken = (patientName: string, severity: AssessmentResult['severity'], hospitalId: string): QueuePatient => {
    const tokenNumber = `#A${Math.floor(104 + Math.random() * 20)}`;
    const hosp = hospitals.find(h => h.id === hospitalId) || hospitals[0];
    
    // Critical patients jump queue
    const queuePosition = severity === 'CRITICAL' ? 1 : severity === 'HIGH' ? 3 : 6;
    const waitTime = severity === 'CRITICAL' ? 0 : severity === 'HIGH' ? 8 : hosp.estimatedWaitTimeMinutes;

    const newPatient: QueuePatient = {
      id: `q-${Date.now()}`,
      tokenNumber,
      patientName,
      age: currentAssessmentInput?.age || 0,
      gender: currentAssessmentInput?.gender || 'other',
      severity,
      symptoms: currentAssessmentInput?.selectedSymptoms || [],
      arrivalTime: new Date().toISOString(),
      estimatedWaitMinutes: waitTime,
      status: severity === 'CRITICAL' ? 'Under Assessment' : 'Waiting',
      assignedDoctor: undefined,
      assignedRoom: undefined,
      hospitalId,
      queuePosition
    };

    setQueuePatients(prev => [newPatient, ...prev]);
    setMyQueueToken(newPatient);
    setJourneyStage('in_queue');
    soundFX.playChime();

    addNotification({
      title: `🎫 Priority Queue Token Assigned: ${tokenNumber}`,
      message: `Token ${tokenNumber} registered at ${hosp.name}. Priority: ${severity}. Position: ${queuePosition}.`,
      type: 'queue'
    });

    return newPatient;
  };

  const updateQueuePatientStatus = (patientId: string, status: QueueStatus, assignedDoctor?: string, assignedRoom?: string) => {
    setQueuePatients(prev => prev.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          status,
          assignedDoctor: assignedDoctor || p.assignedDoctor,
          assignedRoom: assignedRoom || p.assignedRoom
        };
      }
      return p;
    }));

    if (myQueueToken && myQueueToken.id === patientId) {
      setMyQueueToken(prev => prev ? {
        ...prev,
        status,
        assignedDoctor: assignedDoctor || prev.assignedDoctor,
        assignedRoom: assignedRoom || prev.assignedRoom
      } : null);
    }
    soundFX.playChime();
  };

  // Bed status updater - updates ONLY the targeted bed/room and recalculates metrics accurately
  const updateBedStatus = (bedId: string, status: Bed['status'], patientName?: string) => {
    const hosp = selectedHospital || hospitals.find(h => h.hospitalId === currentUser.hospitalId) || hospitals[0];
    if (!hosp) {
      soundFX.playChime();
      return;
    }
    
    // Get current bed list without re-randomizing or resetting other beds
    const currentBeds = hosp.bedList && hosp.bedList.length > 0 ? hosp.bedList : beds;
    
    // Modify ONLY the selected bed, preserving all other rooms/beds
    const newBeds = currentBeds.map(b => {
      if (b.id !== bedId) return b;
      return {
        ...b,
        status,
        patientName: status === 'Occupied' ? (patientName || b.patientName || 'Assigned Patient') : (status === 'Available' ? undefined : b.patientName),
        updatedAt: 'Just now'
      };
    });
    
    setBedsState(newBeds);

    // Accurately recalculate metrics from actual beds
    const availableBeds = newBeds.filter(b => b.status === 'Available').length;
    const occupiedBeds = newBeds.filter(b => b.status === 'Occupied').length;
    const reservedBeds = newBeds.filter(b => b.status === 'Reserved').length;
    const icuAvailable = newBeds.filter(b => b.wardType === 'ICU' && b.status === 'Available').length;
    const erAvailable = newBeds.filter(b => b.wardType === 'Emergency' && b.status === 'Available').length;

    const updatedHosp: Hospital = {
      ...hosp,
      bedList: newBeds,
      availableBeds,
      beds: {
        ...hosp.beds,
        total: newBeds.length,
        available: availableBeds,
        occupied: occupiedBeds,
        reserved: reservedBeds
      },
      availableICUBeds: icuAvailable,
      icu: {
        ...hosp.icu,
        available: icuAvailable,
        occupied: newBeds.filter(b => b.wardType === 'ICU' && b.status === 'Occupied').length
      },
      availableEmergencyBeds: erAvailable,
      emergencyRooms: {
        ...hosp.emergencyRooms,
        available: erAvailable,
        occupied: newBeds.filter(b => b.wardType === 'Emergency' && b.status === 'Occupied').length
      }
    };

    hospitalService.updateHospital(updatedHosp);
    setHospitalsState(prev => prev.map(h => (h.id === updatedHosp.id || h.hospitalId === updatedHosp.hospitalId ? updatedHosp : h)));
    soundFX.playChime();
  };

  // Bed status toggle - 1-click cycle: Available -> Occupied -> Cleaning -> Reserved -> Available
  const toggleBedStatus = (bedId: string) => {
    const hosp = selectedHospital || hospitals.find(h => h.hospitalId === currentUser.hospitalId) || hospitals[0];
    if (!hosp) return;
    const currentBeds = hosp.bedList && hosp.bedList.length > 0 ? hosp.bedList : beds;
    const targetBed = currentBeds.find(b => b.id === bedId);
    if (!targetBed) return;

    let nextStatus: Bed['status'] = 'Available';
    if (targetBed.status === 'Available') nextStatus = 'Occupied';
    else if (targetBed.status === 'Occupied') nextStatus = 'Cleaning';
    else if (targetBed.status === 'Cleaning') nextStatus = 'Reserved';
    else if (targetBed.status === 'Reserved') nextStatus = 'Available';

    updateBedStatus(bedId, nextStatus);
  };

  // Advance journey timeline
  const advanceJourneyStage = () => {
    const order: JourneyStage[] = [
      'idle',
      'assessed',
      'pre_alert_sent',
      'ambulance_dispatched',
      'patient_enroute',
      'arrived_hospital',
      'in_queue',
      'under_doctor_assessment',
      'treatment',
      'completed'
    ];
    const currentIndex = order.indexOf(journeyStage);
    if (currentIndex >= 0 && currentIndex < order.length - 1) {
      const next = order[currentIndex + 1];
      setJourneyStage(next);
      soundFX.playChime();
    }
  };

  // Dynamic Hospital Capacity Simulation & Auto-Reroute
  const simulateHospitalBecomingFull = (targetHospitalId?: string) => {
    const targetHosp = targetHospitalId ? (hospitals.find(h => h.id === targetHospitalId) || hospitals[0]) : hospitals[0];

    // Alter capacity: 0 ICU beds, 96% ER Load
    const updatedHospitals = hospitals.map(h => {
      if (h.id === targetHosp.id) {
        return {
          ...h,
          availableICUBeds: 0,
          icuAvailable: false,
          availableEmergencyBeds: 0,
          currentERLoadPercent: 96,
          estimatedWaitTimeMinutes: 52
        };
      }
      return h;
    });
    setHospitals(updatedHospitals);

    // Find next best hospital with capacity
    const nextBestHosp = hospitals.find(h => h.id !== targetHosp.id && h.availableICUBeds > 0) || hospitals[1] || hospitals[0];

    setRerouteData({
      previousHospital: { ...targetHosp, availableICUBeds: 0, currentERLoadPercent: 96 },
      newHospital: nextBestHosp,
      reason: `${targetHosp.name} has reached maximum ICU capacity (0 beds available) and ER load spiked to 96%. System has dynamically rerouted incoming patients to ${nextBestHosp.name} (${nextBestHosp.availableICUBeds} ICU beds, ${nextBestHosp.currentERLoadPercent}% load).`
    });

    setIsReroutingModalOpen(true);
    soundFX.playWarningTone();

    addNotification({
      title: '⚠️ Dynamic Hospital Re-Routing Triggered',
      message: `${targetHosp.name} saturated. Automated reroute to ${nextBestHosp.name} initiated.`,
      type: 'reroute'
    });
  };

  const resetHospitalCapacities = () => {
    addNotification({
      title: 'Hospital Capacities Reset',
      message: 'Operational data reset. Re-fetch from backend to restore current state.',
      type: 'system'
    });
    soundFX.playChime();
  };

  // 1-Click SIH Judge Demo Mode (2-minute complete golden flow)
  const triggerSIHDemoMode = () => {
    // 1. Set sample patient input
    const demoInput: EmergencyAssessmentInput = {
      patientName: 'Ramesh Sundaram',
      age: 48,
      gender: 'male',
      location: userLiveLocation.address || 'MG Road Metro Station Junction, Bangalore',
      selectedSymptoms: ['chest_pain', 'difficulty_breathing'],
      duration: 'less_than_30min',
      painScale: 9,
      existingConditions: ['Hypertension', 'Type 2 Diabetes'],
      consciousness: 'alert',
      vitals: {
        heartRateBpm: 118,
        bloodPressureSystolic: 165,
        bloodPressureDiastolic: 98,
        oxygenSaturationSpO2: 91,
        respiratoryRate: 26
      },
      notes: 'Sudden onset substernal crushing chest pain radiating to left arm with cold diaphoresis.'
    };

    setCurrentAssessmentInput(demoInput);

    // 2. Evaluate Triage
    const assessment = evaluateEmergencyPriority(demoInput);
    setAssessmentResult(assessment);

    // 3. Select top ranked hospital from available state
    const cityCare = hospitals[0];
    if (cityCare) {
      setSelectedHospital(cityCare);

      // 4. Send Pre-Alert
      const preAlert = sendHospitalPreAlert(cityCare, 'Patient with acute coronary syndrome & hypoxia SpO2 91%. Resuscitation bay and cath lab standby requested.');

      // 5. Generate Priority Queue Token
      const token = generatePatientToken('Ramesh Sundaram', 'CRITICAL', cityCare.id);
      setMyQueueToken(token);

      // 6. Update Journey stage
      setJourneyStage('ambulance_dispatched');

      // 7. Auto-reserve ICU Bed
      updatePreAlertPreparation(preAlert.id, 'icuReserved', true);
      updatePreAlertPreparation(preAlert.id, 'emergencyRoomAssigned', true);
      updatePreAlertPreparation(preAlert.id, 'assignedRoomNumber', NOT_AVAILABLE_MESSAGE);

      addNotification({
        title: 'SIH Demo Mode Activated',
        message: `Golden emergency scenario loaded at ${userLiveLocation.address}: 48yo chest pain → Critical Prioritization → ${cityCare.name} Recommended → Pre-Alert Transmitted → Ambulance Dispatched.`,
        type: 'system'
      });
    } else {
      addNotification({
        title: 'SIH Demo Mode — No Hospitals Available',
        message: 'No hospitals loaded from backend. Please search for hospitals first.',
        type: 'emergency'
      });
    }

    soundFX.playEmergencyAlert();
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        sessionExpired,
        login,
        logout,
        currentUser,
        setUserRole,
        updateProfile,
        theme,
        setTheme,
        userLiveLocation,
        detectUserLiveLocation,
        isLocatingUser,
        hospitals,
        setHospitals,
        addDiscoveredHospitals,
        selectedHospital,
        setSelectedHospital,
        rankedHospitals,
        currentAssessmentInput,
        assessmentResult,
        runEmergencyAssessment,
        clearAssessment,
        currentEmergencyCase,
        currentQueueToken,
        emergencyLoading,
        emergencyError,
        submitEmergencyCase,
        selectHospitalAndCreateToken,
        refreshQueueToken,
        refreshQueueForHospital,
        fetchStaffQueue,
        updateQueueTokenStatusByStaff,
        clearEmergencyError,
        preAlerts,
        activePreAlert,
        sendHospitalPreAlert,
        updatePreAlertStatus,
        updatePreAlertPreparation,
        ambulances,
        activeAmbulance,
        dispatchAmbulanceForPatient,
        queuePatients,
        myQueueToken,
        generatePatientToken,
        updateQueuePatientStatus,
        beds,
        toggleBedStatus,
        updateBedStatus,
        getHospitalById: hospitalService.getHospitalByIdSync.bind(hospitalService),
        updateHospital: hospitalService.updateHospital.bind(hospitalService),
        updateHospitalBeds: hospitalService.updateHospitalBeds.bind(hospitalService),
        updateHospitalICU: hospitalService.updateHospitalICU.bind(hospitalService),
        updateHospitalEmergencyRooms: hospitalService.updateHospitalEmergencyRooms.bind(hospitalService),
        updateHospitalQueue: hospitalService.updateHospitalQueue.bind(hospitalService),
        updateHospitalDoctors: hospitalService.resyncDoctors.bind(hospitalService),
        updateHospitalAmbulances: hospitalService.updateHospitalAmbulances.bind(hospitalService),
        updateHospitalCapabilities: hospitalService.updateHospitalCapabilities.bind(hospitalService),
        addDoctorToHospital: hospitalService.addDoctor.bind(hospitalService),
        updateDoctorInHospital: hospitalService.updateDoctor.bind(hospitalService),
        removeDoctorFromHospital: hospitalService.removeDoctor.bind(hospitalService),
        addRoomToHospital: hospitalService.addRoom.bind(hospitalService),
        updateRoomInHospital: hospitalService.updateRoom.bind(hospitalService),
        resyncHospitalDoctors: hospitalService.resyncDoctors.bind(hospitalService),
        journeyStage,
        setJourneyStage,
        advanceJourneyStage,
        notifications,
        addNotification,
        markNotificationAsRead,
        clearAllNotifications,
        isReroutingModalOpen,
        setIsReroutingModalOpen,
        rerouteData,
        simulateHospitalBecomingFull,
        resetHospitalCapacities,
        triggerSIHDemoMode,
        doctors,
        setDoctors,
        rooms,
        setRooms
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
