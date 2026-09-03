import { Hospital, Bed } from '../types/hospital';
import { SymptomOption } from '../types/prioritization';
import { Ambulance } from '../types/ambulance';
import { QueuePatient } from '../types/queue';
import { HospitalPreAlert } from '../types/preAlert';

// Symptom options for prioritization
export const INITIAL_SYMPTOMS: SymptomOption[] = [
  {
    id: 'chest_pain',
    label: 'Severe Chest Pain / Pressure',
    category: 'cardiovascular',
    baselineSeverity: 'CRITICAL',
    iconName: 'HeartPulse',
    commonCombinations: ['difficulty_breathing', 'sweating', 'dizziness'],
    requiredFacilities: { emergencyDepartment: true, icu: true, cardiacCare: true, oxygenSupport: true }
  },
  {
    id: 'difficulty_breathing',
    label: 'Severe Difficulty Breathing / Shortness of Breath',
    category: 'respiratory',
    baselineSeverity: 'CRITICAL',
    iconName: 'Wind',
    commonCombinations: ['chest_pain', 'cough', 'cyanosis'],
    requiredFacilities: { emergencyDepartment: true, icu: true, oxygenSupport: true, ventilator: true }
  },
  {
    id: 'unconsciousness',
    label: 'Unconsciousness / Fainting / Altered Mental State',
    category: 'neurological',
    baselineSeverity: 'CRITICAL',
    iconName: 'Activity',
    commonCombinations: ['head_injury', 'seizure'],
    requiredFacilities: { emergencyDepartment: true, icu: true, oxygenSupport: true, ventilator: true }
  },
  {
    id: 'severe_bleeding',
    label: 'Severe Uncontrolled Bleeding',
    category: 'trauma',
    baselineSeverity: 'CRITICAL',
    iconName: 'Droplets',
    commonCombinations: ['fracture_injury', 'dizziness'],
    requiredFacilities: { emergencyDepartment: true, traumaCare: true, icu: true }
  },
  {
    id: 'stroke_symptoms',
    label: 'Facial Droop / Arm Weakness / Slurred Speech (FAST)',
    category: 'neurological',
    baselineSeverity: 'CRITICAL',
    iconName: 'Brain',
    commonCombinations: ['confusion', 'headache'],
    requiredFacilities: { emergencyDepartment: true, strokeUnit: true, icu: true }
  },
  {
    id: 'head_injury',
    label: 'Head Injury / Traumatic Concussion',
    category: 'trauma',
    baselineSeverity: 'HIGH',
    iconName: 'ShieldAlert',
    commonCombinations: ['unconsciousness', 'vomiting'],
    requiredFacilities: { emergencyDepartment: true, traumaCare: true, icu: true }
  },
  {
    id: 'fracture_injury',
    label: 'Severe Fracture / Deformity / Major Trauma',
    category: 'trauma',
    baselineSeverity: 'HIGH',
    iconName: 'Bone',
    commonCombinations: ['severe_pain', 'swelling'],
    requiredFacilities: { emergencyDepartment: true, orthopedicSurgeon: true, traumaCare: true }
  },
  {
    id: 'severe_abdominal_pain',
    label: 'Acute Severe Abdominal Pain',
    category: 'gastrointestinal',
    baselineSeverity: 'HIGH',
    iconName: 'AlertCircle',
    commonCombinations: ['high_fever', 'vomiting'],
    requiredFacilities: { emergencyDepartment: true }
  },
  {
    id: 'high_fever',
    label: 'High Fever (> 103°F / 39.4°C) with Chills',
    category: 'general',
    baselineSeverity: 'MODERATE',
    iconName: 'Thermometer',
    commonCombinations: ['cough', 'body_pain'],
    requiredFacilities: { emergencyDepartment: true }
  },
  {
    id: 'moderate_burn',
    label: 'Thermal Burn / Scald Injury',
    category: 'trauma',
    baselineSeverity: 'MODERATE',
    iconName: 'Flame',
    commonCombinations: ['pain', 'blisters'],
    requiredFacilities: { emergencyDepartment: true, traumaCare: true }
  },
  {
    id: 'persistent_vomiting',
    label: 'Persistent Vomiting / Dehydration',
    category: 'gastrointestinal',
    baselineSeverity: 'MODERATE',
    iconName: 'HelpCircle',
    commonCombinations: ['abdominal_pain', 'fever'],
    requiredFacilities: { emergencyDepartment: true }
  },
  {
    id: 'minor_sprain',
    label: 'Minor Sprain / Cut / Mild Bruising',
    category: 'general',
    baselineSeverity: 'LOW',
    iconName: 'Bandage',
    commonCombinations: ['mild_pain'],
    requiredFacilities: { emergencyDepartment: false }
  },
  {
    id: 'mild_cough_cold',
    label: 'Mild Cough, Cold or Sore Throat',
    category: 'respiratory',
    baselineSeverity: 'LOW',
    iconName: 'Smile',
    commonCombinations: ['sneezing'],
    requiredFacilities: { emergencyDepartment: false }
  }
];

// Helper to create a Hospital in the new format
function createHospital(
  id: string,
  name: string,
  type: Hospital['type'],
  address: string,
  lat: number,
  lng: number,
  distanceKm: number,
  travelTimeMinutes: number,
  trafficCondition: Hospital['trafficCondition'],
  totalBeds: number,
  availableBeds: number,
  totalICUBeds: number,
  availableICUBeds: number,
  totalEmergencyBeds: number,
  availableEmergencyBeds: number,
  currentERLoadPercent: number,
  estimatedWaitTimeMinutes: number,
  phone: string,
  rating: number,
  specialties: string[],
  emergencyAvailable = true,
  oxygenSupport = true,
  ventilatorAvailability = true,
  traumaLevel: 1 | 2 | 3 | 0 = 1,
  cardiacCareAvailable = true,
  strokeUnitAvailable = true,
  orthopedicAvailable = true,
  pediatricAvailable = true,
  ambulanceAvailableCount = 3,
  isOpen = true
): Hospital {
  const hospitalId = id.replace('hosp-', 'hospital-') + '-001';
  const lastUpdated = new Date().toISOString();
  const occupiedBeds = totalBeds - availableBeds;
  const occupiedICU = totalICUBeds - availableICUBeds;
  const occupiedEmergency = totalEmergencyBeds - availableEmergencyBeds;
  
  return {
    hospitalId,
    id,
    name,
    type,
    address,
    coordinates: { lat, lng },
    phone,
    isOpen,
    rating,
    specialties,
    emergencyAvailable,
    icuAvailable: availableICUBeds > 0,
    oxygenSupport,
    ventilatorAvailability,
    traumaLevel,
    cardiacCareAvailable,
    strokeUnitAvailable,
    orthopedicAvailable,
    pediatricAvailable,
    ambulanceAvailableCount,
    distanceKm,
    travelTimeMinutes,
    trafficCondition,
    beds: {
      total: totalBeds,
      available: availableBeds,
      occupied: occupiedBeds,
      reserved: 0,
    },
    icu: {
      total: totalICUBeds,
      available: availableICUBeds,
      occupied: occupiedICU,
      reserved: 0,
    },
    emergencyRooms: {
      total: totalEmergencyBeds,
      available: availableEmergencyBeds,
      occupied: occupiedEmergency,
      cleaning: 0,
    },
    queue: {
      totalPatients: Math.round(currentERLoadPercent * (totalEmergencyBeds + totalICUBeds) / 100),
      criticalCount: Math.round(currentERLoadPercent / 4),
      highCount: Math.round(currentERLoadPercent / 3),
      moderateCount: Math.round(currentERLoadPercent / 2),
      lowCount: Math.round(currentERLoadPercent / 4),
      estimatedWaitTimeMinutes,
      currentERLoadPercent,
    },
    ambulances: {
      total: Math.max(1, ambulanceAvailableCount + 1),
      available: ambulanceAvailableCount,
      dispatched: 0,
      enRoute: 0,
      atHospital: 0,
    },
    doctors: {
      total: 20,
      available: 18,
      onDuty: 16,
      bySpecialization: {},
    },
    facilities: {
      emergencyDepartment: emergencyAvailable,
      icu: availableICUBeds > 0,
      oxygenSupport,
      ventilator: ventilatorAvailability,
      traumaCare: traumaLevel > 0,
      cardiacCare: cardiacCareAvailable,
      strokeUnit: strokeUnitAvailable,
      orthopedicSurgeon: orthopedicAvailable,
      pediatricEmergency: pediatricAvailable,
    },
    lastUpdated,
    updatedBy: 'system',
    configComplete: true,
    operationalDataAvailable: true,
    // Alias properties for backward compatibility
    availableICUBeds,
    availableEmergencyBeds,
    availableBeds,
    totalBeds,
    totalICUBeds,
    totalEmergencyBeds,
    currentERLoadPercent,
    estimatedWaitTimeMinutes,
  };
}

export const INITIAL_HOSPITALS: Hospital[] = [
  createHospital(
    'hosp-citycare',
    'CityCare Medical Center',
    'Super Specialty',
    '84 Metro Health Blvd, Central District',
    12.9716, 77.5946,
    3.2, 8, 'Low',
    220, 42,
    24, 5,
    35, 9,
    42, 8,
    '+91 80 4120 5500',
    4.8,
    ['Cardiology', 'Emergency Medicine', 'Neurology', 'Pulmonology', 'Trauma Surgery']
  ),
  createHospital(
    'hosp-metro-trauma',
    'Metro Trauma & Apex Institute',
    'Trauma Center Level 1',
    '12 Expressway Junction, North Ring Rd',
    12.9850, 77.6050,
    2.1, 22, 'Heavy',
    310, 18,
    30, 0,
    45, 2,
    94, 38,
    '+91 80 2299 8800',
    4.6,
    ['Trauma & Orthopedics', 'Neurosurgery', 'Critical Care', 'Burn Unit'],
    true, true, true, 1, true, true, true, false
  ),
  createHospital(
    'hosp-lifeline',
    'LifeLine Super Specialty Hospital',
    'Super Specialty',
    '405 Tech Park East Corridor',
    12.9560, 77.6250,
    5.4, 12, 'Low',
    180, 36,
    18, 4,
    25, 7,
    48, 11,
    '+91 80 6700 1122',
    4.7,
    ['Cardiac Sciences', 'Neurology', 'Internal Medicine', 'Pediatrics']
  ),
  createHospital(
    'hosp-st-jude',
    'St. Jude Memorial Hospital',
    'General Hospital',
    '19 Heritage Road, West Extension',
    12.9420, 77.5800,
    4.8, 14, 'Moderate',
    140, 28,
    12, 2,
    20, 5,
    62, 16,
    '+91 80 2555 4321',
    4.5,
    ['General Surgery', 'Obstetrics', 'Orthopedics', 'General Emergency']
  ),
  createHospital(
    'hosp-apollo-apex',
    'Apex Heart & Vascular Institute',
    'Cardiac Center',
    '100 South Boulevard, Medical Square',
    12.9250, 77.5920,
    6.2, 15, 'Low',
    160, 30,
    20, 6,
    22, 6,
    51, 10,
    '+91 80 4999 0000',
    4.9,
    ['Interventional Cardiology', 'Cardiothoracic Surgery', 'Vascular Care', 'CCU'],
    true, true, true, 2, true, true, false, false
  ),
  createHospital(
    'hosp-community-west',
    'Westside Community Hospital',
    'Community Hospital',
    '56 Green Avenue, West Park',
    12.9600, 77.5450,
    7.0, 18, 'Moderate',
    90, 22,
    6, 1,
    14, 4,
    71, 20,
    '+91 80 2341 9090',
    4.2,
    ['Family Medicine', 'Basic Emergency', 'Pediatrics', 'Minor Trauma'],
    true, true, false, 3, false, false, true, true
  ),
];

// Attach the seeded doctor/room records to the primary demo hospital so the
// patient-facing pages read the exact same doctor/room lists that staff manage.
function attachSeedOperationalData() {
  const cityCareSeed = INITIAL_HOSPITALS.find(h => h.id === 'hosp-citycare');
  if (!cityCareSeed) return;
  cityCareSeed.doctorList = INITIAL_DOCTORS as any;
  cityCareSeed.roomsList = INITIAL_ROOMS as any;
  cityCareSeed.doctors = {
    total: INITIAL_DOCTORS.length,
    available: INITIAL_DOCTORS.filter((d: any) => d.status === 'Available').length,
    onDuty: INITIAL_DOCTORS.filter((d: any) => d.dutyStatus === 'On Duty').length,
    bySpecialization: {},
  };
  cityCareSeed.emergencyRooms = {
    total: INITIAL_ROOMS.filter((r: any) => r.type === 'Emergency Room').length,
    available: INITIAL_ROOMS.filter((r: any) => r.type === 'Emergency Room' && r.status === 'Available').length,
    occupied: INITIAL_ROOMS.filter((r: any) => r.type === 'Emergency Room' && r.status === 'Occupied').length,
    cleaning: 0,
  };
}

// Helper to convert Hospital to Bed[] for backward compatibility
export function hospitalToBeds(hospital: Hospital): Bed[] {
  if (hospital.bedList && hospital.bedList.length > 0) {
    return hospital.bedList;
  }
  const beds: Bed[] = [];
  const bedPrefix = hospital.name.split(' ').join('-').toLowerCase().slice(0, 8);
  // ICU beds
  for (let i = 1; i <= hospital.icu.total; i++) {
    beds.push({
      id: `bed-icu-${hospital.hospitalId}-${i}`,
      hospitalId: hospital.hospitalId,
      bedNumber: `${bedPrefix}-ICU-${i.toString().padStart(2, '0')}`,
      wardType: 'ICU',
      status: i <= hospital.icu.available ? 'Available' : i <= hospital.icu.available + hospital.icu.occupied ? 'Occupied' : 'Cleaning',
      severity: i <= hospital.icu.available + hospital.icu.occupied ? 'CRITICAL' : undefined,
      assignedDoctor: i <= 5 ? `Dr. Staff${i}` : undefined,
      updatedAt: hospital.lastUpdated,
    });
  }
  // General/Emergency beds
  for (let i = 1; i <= hospital.beds.total; i++) {
    beds.push({
      id: `bed-gen-${hospital.hospitalId}-${i}`,
      hospitalId: hospital.hospitalId,
      bedNumber: `${bedPrefix}-B${i.toString().padStart(2, '0')}`,
      wardType: i <= hospital.emergencyRooms.total ? 'Emergency' : 'General',
      status: i <= hospital.beds.available ? 'Available' : i <= hospital.beds.available + hospital.beds.occupied ? 'Occupied' : 'Cleaning',
      severity: i <= hospital.beds.available + hospital.beds.occupied ? 'HIGH' : undefined,
      updatedAt: hospital.lastUpdated,
    });
  }
  return beds;
}

export const INITIAL_BEDS: Bed[] = [];

// Seed doctors & rooms for the primary demo hospital (CityCare). These live
// INSIDE the hospital record (doctorList / roomsList) so Hospital Staff edits
// and Patient reads share the exact same source of truth.
export const INITIAL_DOCTORS = [
  {
    id: 'doc-1',
    hospitalId: 'hospital-hosp-citycare-001',
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
    phone: '+91 9876543210',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'doc-2',
    hospitalId: 'hospital-hosp-citycare-001',
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
    phone: '+91 9876543211',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'doc-3',
    hospitalId: 'hospital-hosp-citycare-001',
    name: 'Dr. Rohit Sen',
    specialization: 'Emergency Medicine Specialist',
    department: 'Emergency Department',
    experience: 10,
    status: 'Available',
    dutyStatus: 'On Duty',
    room: 'Resus Bay 1',
    emergencyAvailable: true,
    consultationHours: '24x7',
    email: 'rohit.sen@hospital.com',
    phone: '+91 9876543212',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'doc-4',
    hospitalId: 'hospital-hosp-citycare-001',
    name: 'Dr. Kavitha Nair',
    specialization: 'Pulmonologist',
    department: 'Pulmonology',
    experience: 7,
    status: 'Available',
    dutyStatus: 'On Duty',
    room: 'Room 108',
    emergencyAvailable: true,
    consultationHours: '9 AM - 5 PM',
    email: 'kavitha.nair@hospital.com',
    phone: '+91 9876543213',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'doc-5',
    hospitalId: 'hospital-hosp-citycare-001',
    name: 'Dr. Meera Iyer',
    specialization: 'Internist',
    department: 'Internal Medicine',
    experience: 15,
    status: 'Available',
    dutyStatus: 'On Duty',
    room: 'Room 401',
    emergencyAvailable: true,
    consultationHours: '9 AM - 5 PM',
    email: 'meera.iyer@hospital.com',
    phone: '+91 9876543214',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
] as any[];

export const INITIAL_ROOMS = [
  {
    id: 'room-1',
    hospitalId: 'hospital-hosp-citycare-001',
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
    hospitalId: 'hospital-hosp-citycare-001',
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
    hospitalId: 'hospital-hosp-citycare-001',
    roomNumber: 'ER-03',
    type: 'Emergency Room',
    floor: 'Ground Floor',
    department: 'Emergency Department',
    capacity: 1,
    currentOccupancy: 0,
    status: 'Available',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'room-4',
    hospitalId: 'hospital-hosp-citycare-001',
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
    id: 'room-5',
    hospitalId: 'hospital-hosp-citycare-001',
    roomNumber: 'ICU-02',
    type: 'ICU',
    floor: 'First Floor',
    department: 'Critical Care',
    capacity: 1,
    currentOccupancy: 1,
    status: 'Occupied',
    assignedPatient: 'P-1043',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'room-6',
    hospitalId: 'hospital-hosp-citycare-001',
    roomNumber: 'W-101',
    type: 'General Ward',
    floor: 'Second Floor',
    department: 'General Medicine',
    capacity: 4,
    currentOccupancy: 2,
    status: 'Available',
    lastUpdated: new Date().toISOString()
  }
] as any[];

// Seed the primary demo hospital with the shared doctor/room records.
attachSeedOperationalData();

export const INITIAL_AMBULANCES: Ambulance[] = [
  {
    id: 'amb-1',
    vehicleNumber: 'KA-01-A17',
    driverName: 'Rajesh Kumar',
    driverPhone: '+91 98450 12345',
    paramedicName: 'Ananya Sharma (EMT-P)',
    status: 'Available',
    currentLocation: { lat: 12.9680, lng: 77.5900, address: 'Central Station Standby Bay 2' },
    etaMinutes: 6,
    oxygenSupport: true,
    ventilatorSupport: true,
    defibrillator: true,
    advancedLifeSupport: true,
    traumaKit: true,
  },
  {
    id: 'amb-2',
    vehicleNumber: 'KA-01-A22',
    driverName: 'Vikram Singh',
    driverPhone: '+91 98450 67890',
    paramedicName: 'David Paul (EMT-B)',
    status: 'Available',
    currentLocation: { lat: 12.9550, lng: 77.6100, address: 'Indiranagar Hub Standby' },
    etaMinutes: 9,
    oxygenSupport: true,
    ventilatorSupport: false,
    defibrillator: true,
    advancedLifeSupport: false,
    traumaKit: true,
  },
  {
    id: 'amb-3',
    vehicleNumber: 'KA-01-A09',
    driverName: 'Farhan Akhtar',
    driverPhone: '+91 98450 33445',
    paramedicName: 'Pooja Reddy (EMT-P)',
    status: 'En Route',
    currentLocation: { lat: 12.9810, lng: 77.6020, address: 'En route to Metro Trauma' },
    destinationHospitalId: 'hosp-metro-trauma',
    destinationHospitalName: 'Metro Trauma & Apex Institute',
    assignedPatientId: 'P-1039',
    assignedPatientName: 'Suresh Menon',
    patientSeverity: 'HIGH',
    etaMinutes: 14,
    oxygenSupport: true,
    ventilatorSupport: true,
    defibrillator: true,
    advancedLifeSupport: true,
    traumaKit: true,
  },
  {
    id: 'amb-4',
    vehicleNumber: 'KA-01-A35',
    driverName: 'Suresh Patil',
    driverPhone: '+91 98450 88991',
    paramedicName: 'Sneha Patel (EMT-P)',
    status: 'Available',
    currentLocation: { lat: 12.9300, lng: 77.5850, address: 'Jayanagar Emergency Standby' },
    etaMinutes: 11,
    oxygenSupport: true,
    ventilatorSupport: true,
    defibrillator: true,
    advancedLifeSupport: true,
    traumaKit: true,
  },
  {
    id: 'amb-5',
    vehicleNumber: 'KA-01-A44',
    driverName: 'Manoj Hegde',
    driverPhone: '+91 98450 55667',
    paramedicName: 'Ramesh Naik (EMT-B)',
    status: 'At Hospital',
    currentLocation: { lat: 12.9716, lng: 77.5946, address: 'CityCare ER Bay 1' },
    destinationHospitalId: 'hosp-citycare',
    destinationHospitalName: 'CityCare Medical Center',
    etaMinutes: 0,
    oxygenSupport: true,
    ventilatorSupport: false,
    defibrillator: true,
    advancedLifeSupport: false,
    traumaKit: true,
  }
];

export const INITIAL_QUEUE_PATIENTS: QueuePatient[] = [
  {
    id: 'q-1',
    tokenNumber: '#A098',
    patientName: 'Ramanathan G.',
    age: 62,
    gender: 'male',
    severity: 'CRITICAL',
    symptoms: ['Acute Chest Pain', 'Diaphoresis'],
    arrivalTime: new Date(Date.now() - 35 * 60000).toISOString(),
    estimatedWaitMinutes: 0,
    status: 'Treatment',
    assignedDoctor: 'Dr. Priya Rao',
    assignedRoom: 'Resus Bay 1',
    hospitalId: 'hosp-citycare',
    queuePosition: 0
  },
  {
    id: 'q-2',
    tokenNumber: '#A099',
    patientName: 'Deepa Verma',
    age: 34,
    gender: 'female',
    severity: 'HIGH',
    symptoms: ['Compound Wrist Fracture', 'Severe Pain'],
    arrivalTime: new Date(Date.now() - 25 * 60000).toISOString(),
    estimatedWaitMinutes: 2,
    status: 'Under Assessment',
    assignedDoctor: 'Dr. Rohit Sen',
    assignedRoom: 'ER Room 3',
    hospitalId: 'hosp-citycare',
    queuePosition: 0
  },
  {
    id: 'q-3',
    tokenNumber: '#A100',
    patientName: 'Amitava Bose',
    age: 51,
    gender: 'male',
    severity: 'HIGH',
    symptoms: ['Acute Abdominal Pain', 'Vomiting'],
    arrivalTime: new Date(Date.now() - 18 * 60000).toISOString(),
    estimatedWaitMinutes: 5,
    status: 'Waiting',
    hospitalId: 'hosp-citycare',
    queuePosition: 1
  },
  {
    id: 'q-4',
    tokenNumber: '#A101',
    patientName: 'Shalini Nair',
    age: 28,
    gender: 'female',
    severity: 'MODERATE',
    symptoms: ['High Fever (103.5°F)', 'Dehydration'],
    arrivalTime: new Date(Date.now() - 14 * 60000).toISOString(),
    estimatedWaitMinutes: 8,
    status: 'Waiting',
    hospitalId: 'hosp-citycare',
    queuePosition: 2
  },
  {
    id: 'q-5',
    tokenNumber: '#A102',
    patientName: 'Harish Chandra',
    age: 45,
    gender: 'male',
    severity: 'MODERATE',
    symptoms: ['Laceration on Left Forearm', 'Bleeding Controlled'],
    arrivalTime: new Date(Date.now() - 10 * 60000).toISOString(),
    estimatedWaitMinutes: 12,
    status: 'Waiting',
    hospitalId: 'hosp-citycare',
    queuePosition: 3
  },
  {
    id: 'q-6',
    tokenNumber: '#A103',
    patientName: 'Lavanya M.',
    age: 22,
    gender: 'female',
    severity: 'LOW',
    symptoms: ['Mild Ankle Sprain'],
    arrivalTime: new Date(Date.now() - 5 * 60000).toISOString(),
    estimatedWaitMinutes: 18,
    status: 'Waiting',
    hospitalId: 'hosp-citycare',
    queuePosition: 4
  }
];

export const INITIAL_PRE_ALERTS: HospitalPreAlert[] = [
  {
    id: 'PA-1038',
    patientId: 'P-1038',
    patientName: 'Tanvi Joshi',
    age: 55,
    gender: 'female',
    severity: 'HIGH',
    symptoms: ['Suspected TIA / Transient Slurred Speech'],
    vitalsSummary: 'BP: 165/95 | HR: 88 | SpO2: 97%',
    etaMinutes: 7,
    requiredFacilities: {
      emergencyDepartment: true,
      icu: true,
      oxygenSupport: true,
      ventilator: false,
      traumaCare: false,
      cardiacCare: false,
      strokeUnit: true,
      orthopedicSurgeon: false,
      pediatricEmergency: false
    },
    ambulanceId: 'amb-1',
    ambulanceVehicleNumber: 'KA-01-A17',
    originLocation: 'Koramangala 4th Block',
    destinationHospitalId: 'hosp-citycare',
    destinationHospitalName: 'CityCare Medical Center',
    status: 'Resources Preparing',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    preparation: {
      alertReceived: true,
      icuReserved: true,
      emergencyRoomAssigned: true,
      assignedRoomNumber: 'Stroke Bay 2',
      doctorNotified: true,
      assignedDoctorName: 'Dr. Priya Rao (Emergency Physician)',
      bloodBankAlerted: true,
      readyForArrival: true
    }
  }
];

export const SPECIALIZATION_DESCRIPTIONS: Record<string, string> = {
  'Cardiologist': 'Heart diseases',
  'Cardiothoracic Surgeon': 'Surgery of heart, lungs & chest',
  'Neurologist': 'Brain, spinal cord & nerves',
  'Neurosurgeon': 'Surgery of brain & nervous system',
  'Nephrologist': 'Kidneys',
  'Urologist': 'Urinary system & male reproductive system',
  'Gastroenterologist': 'Stomach, intestine, liver & digestive system',
  'Hepatologist': 'Liver diseases',
  'Pulmonologist': 'Lungs & respiratory diseases',
  'Endocrinologist': 'Hormones, thyroid, diabetes',
  'Diabetologist': 'Diabetes',
  'Rheumatologist': 'Arthritis & autoimmune joint diseases',
  'Orthopedic Surgeon': 'Bones, joints & muscles',
  'General Surgeon': 'General surgical conditions',
  'Plastic Surgeon': 'Reconstruction & cosmetic surgery',
  'Dermatologist': 'Skin, hair & nails',
  'Ophthalmologist': 'Eyes & eye surgery',
  'ENT Specialist': 'Ear, nose & throat',
  'Gynecologist': 'Female reproductive system',
  'Obstetrician': 'Pregnancy & childbirth',
  'Pediatrician': 'Children',
  'Neonatologist': 'Newborn babies, especially critically ill/preterm babies',
  'Psychiatrist': 'Mental health & psychiatric disorders',
  'Psychologist': 'Mental health assessment & therapy',
  'Oncologist': 'Cancer',
  'Hematologist': 'Blood disorders',
  'Infectious Disease Specialist': 'Infections',
  'Allergist/Immunologist': 'Allergies & immune-system disorders',
  'Anesthesiologist': 'Anesthesia, pain management & perioperative care',
  'Emergency Medicine Specialist': 'Medical emergencies',
  'Radiologist': 'CT, MRI, X-ray, ultrasound & image-guided procedures',
  'Pathologist': 'Diagnosis using blood, tissue & laboratory tests',
  'Geriatrician': 'Health of older adults',
  'Physician/Internist': 'Adult medical conditions without surgery',
  'Family Medicine Doctor': 'Comprehensive care for individuals/families',
  'Vascular Surgeon': 'Blood vessels/arteries & veins',
  'Colorectal Surgeon': 'Colon, rectum & anus',
  'Bariatric Surgeon': 'Weight-loss/metabolic surgery',
  'Surgical Oncologist': 'Cancer surgery',
  'Interventional Cardiologist': 'Angioplasty, stents, cardiac catheterization',
  'Electrophysiologist': 'Heart rhythm disorders',
  'Cardiac Electrophysiologist': 'Arrhythmias, ablation & pacemakers'
};

export const ROOM_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'Available': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: '🟢' },
  'Reserved': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: '🟡' },
  'Occupied': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: '🔴' },
  'Cleaning': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: '🔵' },
  'Maintenance': { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200', icon: '⚫' }
};