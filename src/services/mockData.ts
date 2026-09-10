import { SymptomOption } from '../types/prioritization';

// Symptom options for prioritization (clinical reference data, not operational)
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

export const NOT_AVAILABLE_MESSAGE = 'Operational data not available';
