import React, { createContext, useContext, useState, useEffect } from 'react';
import { Hospital, Bed } from '../types/hospital';
import { Ambulance } from '../types/ambulance';
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
  INITIAL_PRE_ALERTS
} from '../services/mockData';
import { 
  UserGeoLocation, 
  fetchRealNearbyHospitals, 
  reverseGeocodeCoords 
} from '../services/realHospitalService';
import { soundFX } from '../services/soundEffects';
import { SystemNotification } from '../types/notification';
import { UserRole, UserProfile } from '../types/user';
import { Doctor } from '../types/doctor';
import { Room } from '../types/room';

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

  // Live User Location & Geolocation
  userLiveLocation: UserGeoLocation;
  detectUserLiveLocation: () => Promise<void>;
  isLocatingUser: boolean;

  // Hospital state
  hospitals: Hospital[];
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
    email: 'priya.rao@citycare.org'
  });

  // Live Location state (Defaulting to user's metropolitan center)
  const [userLiveLocation, setUserLiveLocation] = useState<UserGeoLocation>({
    lat: 12.9716,
    lng: 77.5946,
    address: 'Central Metro Hub (Detecting GPS...)',
    isLiveGps: false,
    city: 'Bangalore'
  });
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);

  // Base state collections
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [ambulances, setAmbulances] = useState<Ambulance[]>(INITIAL_AMBULANCES);
  const [beds, setBeds] = useState<Bed[]>(INITIAL_BEDS);
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>(INITIAL_QUEUE_PATIENTS);
  const [preAlerts, setPreAlerts] = useState<HospitalPreAlert[]>(INITIAL_PRE_ALERTS);
  
  // Hospital Staff Management state
  const [doctors, setDoctors] = useState<Doctor[]>([
    {
      id: 'doc-1',
      name: 'Dr. Anil Kumar',
      specialization: 'Cardiologist',
      department: 'Cardiology',
      experience: 12,
      status: 'Available',
      dutyStatus: 'On Duty',
      room: 'Room 301',
      emergencyAvailable: true,
      consultationHours: '9 AM - 5 PM',
      email: 'anil.kumar@hospital.com',
      phone: '+91 9876543210'
    },
    {
      id: 'doc-2',
      name: 'Dr. Priya Sharma',
      specialization: 'Neurologist',
      department: 'Neurology',
      experience: 8,
      status: 'Busy',
      dutyStatus: 'On Duty',
      room: 'Room 205',
      emergencyAvailable: true,
      consultationHours: '10 AM - 6 PM',
      email: 'priya.sharma@hospital.com',
      phone: '+91 9876543211'
    }
  ]);
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: 'room-1',
      roomNumber: 'ER-01',
      type: 'Emergency Room',
      floor: 'Ground Floor',
      department: 'Emergency Department',
      capacity: 1,
      currentOccupancy: 1,
      status: 'Occupied',
      assignedPatient: 'P-1042',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'room-2',
      roomNumber: 'ER-02',
      type: 'Emergency Room',
      floor: 'Ground Floor',
      department: 'Emergency Department',
      capacity: 1,
      currentOccupancy: 0,
      status: 'Available',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'room-3',
      roomNumber: 'ICU-01',
      type: 'ICU',
      floor: 'First Floor',
      department: 'Critical Care',
      capacity: 1,
      currentOccupancy: 0,
      status: 'Available',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'room-4',
      roomNumber: 'ICU-02',
      type: 'ICU',
      floor: 'First Floor',
      department: 'Critical Care',
      capacity: 1,
      currentOccupancy: 1,
      status: 'Occupied',
      assignedPatient: 'P-1043',
      lastUpdated: new Date().toISOString()
    }
  ]);

  // Active session state
  const [currentAssessmentInput, setCurrentAssessmentInput] = useState<EmergencyAssessmentInput | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [activePreAlert, setActivePreAlert] = useState<HospitalPreAlert | null>(INITIAL_PRE_ALERTS[0] || null);
  const [activeAmbulance, setActiveAmbulance] = useState<Ambulance | null>(INITIAL_AMBULANCES[0] || null);
  const [myQueueToken, setMyQueueToken] = useState<QueuePatient | null>(null);
  const [journeyStage, setJourneyStage] = useState<JourneyStage>('idle');

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

          // Fetch real nearby existing hospitals around user's live position
          const realNearby = await fetchRealNearbyHospitals(latitude, longitude, 15);
          if (realNearby && realNearby.length > 0) {
            setHospitals(realNearby);
            setSelectedHospital(realNearby[0]);
          }

          addNotification({
            title: '📍 Live GPS Location Acquired',
            message: `Current location: ${geoInfo.address} (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°). Querying real verified hospitals nearby.`,
            type: 'system'
          });

          soundFX.playChime();
        } catch (e) {
          console.error('Error fetching real hospitals:', e);
        } finally {
          setIsLocatingUser(false);
        }
      },
      (err) => {
        console.warn('GPS location permission denied or timed out:', err.message);
        setIsLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Attempt live GPS auto-detect on initial load
  useEffect(() => {
    detectUserLiveLocation();
  }, []);

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
    setCurrentUser({
      id: `usr-${cred.role}`,
      name: cred.name,
      role: cred.role,
      hospitalId: cred.hospitalId,
      hospitalName: cred.hospitalName,
      badgeNumber: cred.badgeNumber,
      email: cred.email,
      avatarInitials: cred.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    });
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

    setCurrentUser({
      id: `usr-${role}`,
      name,
      role,
      hospitalId,
      hospitalName,
      badgeNumber: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
      email: `${role}@mediflow.ai`
    });

    addNotification({
      title: `Switched View: ${role.replace('_', ' ').toUpperCase()}`,
      message: `Active dashboard role adjusted for demonstration.`,
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

  // Bed status toggle
  const toggleBedStatus = (bedId: string) => {
    setBeds(prev => prev.map(b => {
      if (b.id !== bedId) return b;
      let nextStatus: Bed['status'] = 'Available';
      if (b.status === 'Available') nextStatus = 'Occupied';
      else if (b.status === 'Occupied') nextStatus = 'Cleaning';
      else if (b.status === 'Cleaning') nextStatus = 'Available';
      else if (b.status === 'Reserved') nextStatus = 'Occupied';

      return {
        ...b,
        status: nextStatus,
        updatedAt: 'Just now'
      };
    }));
    soundFX.playChime();
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
    setHospitals(prev => prev.map(h => {
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
    }));

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
    setBeds(INITIAL_BEDS);
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
        userLiveLocation,
        detectUserLiveLocation,
        isLocatingUser,
        hospitals,
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
