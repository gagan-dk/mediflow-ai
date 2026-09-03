import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Hospital, Bed, Doctor, Room } from '../types/hospital';
import { Ambulance, AmbulanceStatus } from '../types/ambulance';
import { QueuePatient, QueueStatus } from '../types/queue';
import { HospitalPreAlert, PreAlertStatus } from '../types/preAlert';
import { AssessmentResult, EmergencyAssessmentInput } from '../types/prioritization';
import { RankedHospital, rankHospitalsForPatient } from '../services/rankingEngine';
import { evaluateEmergencyPriority } from '../services/prioritizationEngine';
import {
  INITIAL_HOSPITALS,
  INITIAL_AMBULANCES,
  INITIAL_BEDS,
  INITIAL_QUEUE_PATIENTS,
  INITIAL_PRE_ALERTS,
  hospitalToBeds
} from '../services/mockData';
import { 
  UserGeoLocation, 
  fetchRealNearbyHospitals, 
  reverseGeocodeCoords,
  generateRealCalibratedHospitals
} from '../services/realHospitalService';
import { hospitalDiscoveryService } from '../services/hospitalDiscoveryService';
import { hospitalService } from '../services/hospitalService';
import { soundFX } from '../services/soundEffects';
import { SystemNotification } from '../types/notification';
import { UserRole, UserProfile } from '../types/user';

// ─── Demo credentials for prototype authentication ────────────────────────────
const DEMO_CREDENTIALS: Array<{
  email: string; password: string; role: UserRole;
  name: string; hospitalId?: string; hospitalName?: string; badgeNumber?: string;
}> = [
  {
    email: 'patient@mediflow.ai',
    password: 'patient123',
    role: 'patient',
    name: 'Rohan Verma',
  },
  {
    email: 'staff@mediflow.ai',
    password: 'staff123',
    role: 'hospital_staff',
    name: 'Dr. Priya Rao',
    hospitalId: 'hosp-citycare',
    hospitalName: 'CityCare Medical Center',
    badgeNumber: 'ER-7701',
  },
  {
    email: 'admin@mediflow.ai',
    password: 'admin123',
    role: 'admin',
    name: 'Director S. Menon',
    badgeNumber: 'ADMIN-001',
  },
];

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
  login: (email: string, password: string) => { success: boolean; error?: string; role?: UserRole };
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
  updateHospital: (hospital: Hospital) => Hospital;
  updateHospitalBeds: (hospitalId: string, data: Partial<Hospital['beds']>) => void;
  updateHospitalICU: (hospitalId: string, data: Partial<Hospital['icu']>) => void;
  updateHospitalEmergencyRooms: (hospitalId: string, data: Partial<Hospital['emergencyRooms']>) => void;
  updateHospitalQueue: (hospitalId: string, data: Partial<Hospital['queue']>) => void;
  updateHospitalDoctors: (hospitalId: string, data: Partial<Hospital['doctors']>) => void;
  updateHospitalAmbulances: (hospitalId: string, data: Partial<Hospital['ambulances']>) => void;
  updateHospitalCapabilities: (hospitalId: string, data: Partial<Hospital['facilities']>) => void;
  addDoctorToHospital: (hospitalId: string, doctor: Doctor) => Doctor;
  updateDoctorInHospital: (hospitalId: string, doctorId: string, updates: Partial<Doctor>) => Doctor | null;
  removeDoctorFromHospital: (hospitalId: string, doctorId: string) => void;
  addRoomToHospital: (hospitalId: string, room: Room) => Room;
  updateRoomInHospital: (hospitalId: string, roomId: string, updates: Partial<Room>) => Room | null;
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

  // Role & User
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'usr-1',
    name: 'Dr. Priya Rao',
    role: 'hospital_staff',
    hospitalId: 'hosp-citycare',
    hospitalName: 'CityCare Medical Center',
    badgeNumber: 'ER-7701',
    staffId: 'ER-7701',
    email: 'priya.rao@citycare.org',
    phone: '+91 80 4120 5501',
    department: 'Emergency Department',
    specialization: 'Emergency Medicine',
    experienceYears: 12,
    accountStatus: 'active',
    createdAt: 'Jan 2024',
    lastLogin: new Date().toISOString(),
    avatarInitials: 'PR'
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
  // Initialize from storage or use mock data as fallback
  const [hospitals, setHospitalsState] = useState<Hospital[]>(() => {
    const stored = hospitalService.getHospitals();
    if (stored.length > 0) return stored;
    // Save initial mock data to storage for persistence
    INITIAL_HOSPITALS.forEach(h => hospitalService.updateHospital(h));
    return INITIAL_HOSPITALS;
  });
  
  // Sync hospitals from storage on mount
  useEffect(() => {
    const stored = hospitalService.getHospitals();
    if (stored.length > 0) setHospitalsState(stored);
    
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: CustomEvent) => {
      if (e.detail) {
        const updated = hospitalService.getHospitals();
        setHospitalsState(updated);
      }
    };
    window.addEventListener('mediflow:hospitals-changed', handleStorageChange as EventListener);
    return () => window.removeEventListener('mediflow:hospitals-changed', handleStorageChange as EventListener);
  }, []);
  
  const setHospitals = useCallback((newHospitals: Hospital[]) => {
    newHospitals.forEach(h => hospitalService.updateHospital(h));
    setHospitalsState(hospitalService.getHospitals());
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
  
  const [ambulances, setAmbulances] = useState<Ambulance[]>(INITIAL_AMBULANCES);
  const [beds, setBedsState] = useState<Bed[]>(() => {
    const hosp = hospitals.find(h => h.hospitalId === currentUser.hospitalId) || hospitals[0];
    return hospitalToBeds(hosp);
  });
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>(INITIAL_QUEUE_PATIENTS);
  const [preAlerts, setPreAlerts] = useState<HospitalPreAlert[]>(INITIAL_PRE_ALERTS);
  
  // Active session state
  const [currentAssessmentInput, setCurrentAssessmentInput] = useState<EmergencyAssessmentInput | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [activePreAlert, setActivePreAlert] = useState<HospitalPreAlert | null>(INITIAL_PRE_ALERTS[0] || null);
  const [activeAmbulance, setActiveAmbulance] = useState<Ambulance | null>(INITIAL_AMBULANCES[0] || null);
  const [myQueueToken, setMyQueueToken] = useState<QueuePatient | null>(null);
  const [journeyStage, setJourneyStage] = useState<JourneyStage>('idle');

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
      } else {
        const initial = hospitalToBeds(hosp);
        setBedsState(initial);
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

          // Discovery: expand radius until we find >= 10 hospitals around the user's real position
          let nearbyHospitals: Hospital[] = [];
          try {
            const discovery = await hospitalDiscoveryService.discoverHospitals(latitude, longitude, {
              minHospitals: 10,
              initialRadiusKm: 10,
              maxRadiusKm: 30,
            });
            nearbyHospitals = discovery.hospitals;
            console.log('[Hospitals] Discovery found:', nearbyHospitals.length, 'within', discovery.searchRadiusKm, 'km');
          } catch (discoveryError) {
            console.warn('[Hospitals] Discovery error, falling back:', discoveryError);
          }

          // If discovery returned nothing useful, fall back to the direct OSM query
          if (nearbyHospitals.length === 0) {
            nearbyHospitals = await fetchRealNearbyHospitals(latitude, longitude, 15);
            console.log('[Hospitals] Direct OSM query found:', nearbyHospitals.length);
          }

          if (nearbyHospitals && nearbyHospitals.length > 0) {
            // Merge real location data with any staff-configured operational
            // data already stored in the centralized hospital record.
            const merged = hospitalService.mergeDiscoveredHospitals(nearbyHospitals);
            setHospitals(merged);
            setSelectedHospital(merged[0]);
            addNotification({
              title: '📍 Live GPS Location Acquired',
              message: `Current location: ${geoInfo.address}. Found ${nearbyHospitals.length} hospitals nearby.`,
              type: 'system'
            });
          } else {
            console.warn('[Hospitals] No hospitals found, using fallback hospitals');
            const fallbackHospitals = generateRealCalibratedHospitals(latitude, longitude);
            const merged = hospitalService.mergeDiscoveredHospitals(fallbackHospitals);
            setHospitals(merged);
            setSelectedHospital(merged[0]);
            addNotification({
              title: '📍 Location Found — Hospital Data Unavailable',
              message: `Using calibrated hospital estimates around ${geoInfo.address} since live hospital data could not be fetched.`,
              type: 'system'
            });
          }

          soundFX.playChime();
        } catch (e) {
          console.error('Error fetching real hospitals:', e);
          // Still replace the default mock hospitals with location-calibrated ones
          const fallbackHospitals = generateRealCalibratedHospitals(latitude, longitude);
          const merged = hospitalService.mergeDiscoveredHospitals(fallbackHospitals);
          setHospitals(merged);
          setSelectedHospital(merged[0]);
          addNotification({
            title: '⚠️ Location Error',
            message: 'Failed to fetch hospitals. Using fallback data.',
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
  const login = (email: string, password: string): { success: boolean; error?: string; role?: UserRole } => {
    const cred = DEMO_CREDENTIALS.find(
      c => c.email.toLowerCase() === email.toLowerCase() && c.password === password
    );
    if (!cred) {
      return { success: false, error: 'Invalid email or password. Please check your credentials.' };
    }
    const profile: UserProfile = {
      id: `usr-${cred.role}`,
      name: cred.name,
      role: cred.role,
      hospitalId: cred.hospitalId,
      hospitalName: cred.hospitalName,
      badgeNumber: cred.badgeNumber,
      email: cred.email,
      avatarInitials: cred.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      accountStatus: 'active',
      createdAt: 'Jan 2024',
      lastLogin: new Date().toISOString(),
    };

    // Add role-specific fields
    if (cred.role === 'patient') {
      profile.age = 48;
      profile.gender = 'male';
      profile.phone = '+91 98765 43210';
      profile.bloodGroup = 'O+';
      profile.location = 'Bangalore, India';
      profile.emergencyContact = '+91 98765 00000';
      profile.medicalInfo = 'No allergies reported. Hypertension, Type 2 Diabetes.';
    } else if (cred.role === 'hospital_staff') {
      profile.staffId = cred.badgeNumber;
      profile.phone = '+91 80 4120 5501';
      profile.department = 'Emergency Department';
      profile.specialization = 'Emergency Medicine';
      profile.experienceYears = 12;
    } else if (cred.role === 'admin') {
      profile.phone = '+91 80 4120 5500';
      profile.adminLevel = 'System Administrator';
    }

    setCurrentUser(profile);
    setIsAuthenticated(true);
    soundFX.playChime();
    return { success: true, role: cred.role };
  };

  const logout = () => {
    setIsAuthenticated(false);
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
  };

  const setUserRole = (role: UserRole) => {
    let name = 'Demo User';
    let hospitalName = undefined;
    let hospitalId = undefined;

    if (role === 'hospital_staff') {
      name = 'Dr. Priya Rao (ER Attending)';
      hospitalName = 'CityCare Medical Center';
      hospitalId = 'hosp-citycare';
    } else if (role === 'admin') {
      name = 'Director S. Menon (Regional Health Board)';
    } else if (role === 'paramedic') {
      name = 'Ananya Sharma (EMT-Paramedic #17)';
    } else {
      name = 'Rohan Verma (Patient)';
    }

    const profile: UserProfile = {
      id: `usr-${role}`,
      name,
      role,
      hospitalId,
      hospitalName,
      badgeNumber: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
      email: `${role}@mediflow.ai`,
      accountStatus: 'active',
      createdAt: 'Jan 2024',
      lastLogin: new Date().toISOString(),
    };

    if (role === 'patient') {
      profile.age = 48;
      profile.gender = 'male';
      profile.phone = '+91 98765 43210';
      profile.bloodGroup = 'O+';
    } else if (role === 'hospital_staff') {
      profile.phone = '+91 80 4120 5501';
      profile.department = 'Emergency Department';
      profile.experienceYears = 12;
    }

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
  };

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
      age: currentAssessmentInput?.age || 48,
      gender: currentAssessmentInput?.gender || 'male',
      severity,
      symptoms: currentAssessmentInput?.selectedSymptoms || ['Severe Chest Pain', 'Difficulty Breathing'],
      vitalsSummary: currentAssessmentInput?.vitals 
        ? `HR: ${currentAssessmentInput.vitals.heartRateBpm || 112} | SpO2: ${currentAssessmentInput.vitals.oxygenSaturationSpO2 || 91}% | BP: 155/95` 
        : 'SpO2: 91% | HR: 115 bpm (Tachycardia) | BP: 160/95 mmHg',
      etaMinutes: hospital.travelTimeMinutes || 8,
      requiredFacilities: assessmentResult?.requiredFacilities || {
        emergencyDepartment: true,
        icu: true,
        oxygenSupport: true,
        ventilator: true,
        traumaCare: false,
        cardiacCare: true,
        strokeUnit: false,
        orthopedicSurgeon: false,
        pediatricEmergency: false
      },
      ambulanceId: matchedAmbulance?.id,
      ambulanceVehicleNumber: matchedAmbulance?.vehicleNumber || 'KA-01-A17',
      originLocation: userLiveLocation.address || currentAssessmentInput?.location || 'Central Metro Hub',
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
      age: currentAssessmentInput?.age || 48,
      gender: currentAssessmentInput?.gender || 'male',
      severity,
      symptoms: currentAssessmentInput?.selectedSymptoms || ['Severe Chest Pain'],
      arrivalTime: new Date().toISOString(),
      estimatedWaitMinutes: waitTime,
      status: severity === 'CRITICAL' ? 'Under Assessment' : 'Waiting',
      assignedDoctor: severity === 'CRITICAL' ? 'Dr. Priya Rao' : undefined,
      assignedRoom: severity === 'CRITICAL' ? 'Resus Bay 1' : undefined,
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
    const currentBeds = hosp.bedList && hosp.bedList.length > 0 ? hosp.bedList : (beds.length > 0 ? beds : hospitalToBeds(hosp));
    
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
    const currentBeds = hosp.bedList && hosp.bedList.length > 0 ? hosp.bedList : (beds.length > 0 ? beds : hospitalToBeds(hosp));
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
    setHospitals(INITIAL_HOSPITALS);
    setBedsState(INITIAL_BEDS);
    setAmbulances(INITIAL_AMBULANCES);
    addNotification({
      title: 'Hospital Capacities Reset',
      message: 'All regional hospital beds and queue metrics restored to baseline.',
      type: 'system'
    });
    soundFX.playChime();
  };

  // 1-Click SIH Judge Demo Mode (2-minute complete golden flow)
  const triggerSIHDemoMode = () => {
    // 1. Reset state
    setHospitals(INITIAL_HOSPITALS);
    
    // 2. Set sample patient input
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

    // 3. Evaluate Triage
    const assessment = evaluateEmergencyPriority(demoInput);
    setAssessmentResult(assessment);

    // 4. Select top ranked hospital
    const cityCare = hospitals[0] || INITIAL_HOSPITALS[0];
    setSelectedHospital(cityCare);

    // 5. Send Pre-Alert
    const preAlert = sendHospitalPreAlert(cityCare, 'Patient with acute coronary syndrome & hypoxia SpO2 91%. Resuscitation bay and cath lab standby requested.');

    // 6. Generate Priority Queue Token
    const token = generatePatientToken('Ramesh Sundaram', 'CRITICAL', cityCare.id);
    setMyQueueToken(token);

    // 7. Update Journey stage
    setJourneyStage('ambulance_dispatched');

    // 8. Auto-reserve ICU Bed
    updatePreAlertPreparation(preAlert.id, 'icuReserved', true);
    updatePreAlertPreparation(preAlert.id, 'emergencyRoomAssigned', true);
    updatePreAlertPreparation(preAlert.id, 'assignedRoomNumber', 'Resus Bay 1 (Cath Lab Standby)');

    addNotification({
      title: '⚡ SIH Demo Mode Activated',
      message: `Golden emergency scenario loaded at ${userLiveLocation.address}: 48yo chest pain → Critical Prioritization → ${cityCare.name} Recommended → Pre-Alert Transmitted → Ambulance Dispatched → Token #A104 Assigned.`,
      type: 'system'
    });

    soundFX.playEmergencyAlert();
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
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
        getHospitalById: hospitalService.getHospitalById.bind(hospitalService),
        updateHospital: hospitalService.updateHospital.bind(hospitalService),
        updateHospitalBeds: hospitalService.updateBedsMetrics.bind(hospitalService),
        updateHospitalICU: hospitalService.updateICU.bind(hospitalService),
        updateHospitalEmergencyRooms: hospitalService.updateEmergencyRooms.bind(hospitalService),
        updateHospitalQueue: hospitalService.updateQueue.bind(hospitalService),
        updateHospitalDoctors: hospitalService.updateDoctors.bind(hospitalService),
        updateHospitalAmbulances: hospitalService.updateAmbulances.bind(hospitalService),
        updateHospitalCapabilities: hospitalService.updateCapabilities.bind(hospitalService),
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
