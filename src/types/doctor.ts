export type DoctorSpecialization = 
  | 'Cardiologist'
  | 'Cardiothoracic Surgeon'
  | 'Neurologist'
  | 'Neurosurgeon'
  | 'Nephrologist'
  | 'Urologist'
  | 'Gastroenterologist'
  | 'Hepatologist'
  | 'Pulmonologist'
  | 'Endocrinologist'
  | 'Diabetologist'
  | 'Rheumatologist'
  | 'Orthopedic Surgeon'
  | 'General Surgeon'
  | 'Plastic Surgeon'
  | 'Dermatologist'
  | 'Ophthalmologist'
  | 'ENT Specialist'
  | 'Gynecologist'
  | 'Obstetrician'
  | 'Pediatrician'
  | 'Neonatologist'
  | 'Psychiatrist'
  | 'Psychologist'
  | 'Oncologist'
  | 'Hematologist'
  | 'Infectious Disease Specialist'
  | 'Allergist/Immunologist'
  | 'Anesthesiologist'
  | 'Emergency Medicine Specialist'
  | 'Radiologist'
  | 'Pathologist'
  | 'Geriatrician'
  | 'Physician/Internist'
  | 'Family Medicine Doctor'
  | 'Vascular Surgeon'
  | 'Colorectal Surgeon'
  | 'Bariatric Surgeon'
  | 'Surgical Oncologist'
  | 'Interventional Cardiologist'
  | 'Electrophysiologist'
  | 'Cardiac Electrophysiologist';

export type DoctorStatus = 'Available' | 'Busy' | 'Unavailable' | 'Off Duty';
export type DutyStatus = 'On Duty' | 'Off Duty';

export interface Doctor {
  id: string;
  name: string;
  specialization: DoctorSpecialization;
  department: string;
  experience: number; // years
  status: DoctorStatus;
  dutyStatus: DutyStatus;
  room: string;
  emergencyAvailable: boolean;
  consultationHours?: string;
  email?: string;
  phone?: string;
}

export const SPECIALIZATION_DESCRIPTIONS: Record<DoctorSpecialization, string> = {
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