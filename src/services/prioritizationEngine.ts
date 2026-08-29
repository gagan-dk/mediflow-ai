import { EmergencyAssessmentInput, AssessmentResult } from '../types/prioritization';
import { SeverityLevel, RequiredFacilities } from '../types/hospital';
import { INITIAL_SYMPTOMS } from './mockData';

export const SAFETY_DISCLAIMER = "AI-assisted prioritization — not a medical diagnosis. This prototype does not replace professional medical evaluation.";
export const COMPREHENSIVE_SAFETY_NOTICE = "MediFlow AI is an AI-assisted emergency prioritization and hospital coordination prototype. It does not diagnose medical conditions or replace qualified medical professionals. In a real emergency, users should seek immediate professional medical assistance.";

/**
 * Emergency Prioritization Engine (formerly AI Triage Service)
 * Evaluates urgency and prioritizes patient flow without claiming medical diagnosis.
 */
export function evaluateEmergencyPriority(input: EmergencyAssessmentInput): AssessmentResult {
  const patientId = `P-${Math.floor(1000 + Math.random() * 9000)}`;
  const keyRiskFactors: string[] = [];
  
  // 1. Identify matched symptoms and baseline severities
  const matchedSymptoms = INITIAL_SYMPTOMS.filter(s => input.selectedSymptoms.includes(s.id));
  
  let baseSeverityScore = 20; // Default Low
  let highestSymptomSeverity: SeverityLevel = 'LOW';
  
  const requiredFacilities: RequiredFacilities = {
    emergencyDepartment: false,
    icu: false,
    oxygenSupport: false,
    ventilator: false,
    traumaCare: false,
    cardiacCare: false,
    strokeUnit: false,
    orthopedicSurgeon: false,
    pediatricEmergency: input.age < 16
  };

  for (const sym of matchedSymptoms) {
    // Map required facilities
    if (sym.requiredFacilities.emergencyDepartment) requiredFacilities.emergencyDepartment = true;
    if (sym.requiredFacilities.icu) requiredFacilities.icu = true;
    if (sym.requiredFacilities.oxygenSupport) requiredFacilities.oxygenSupport = true;
    if (sym.requiredFacilities.ventilator) requiredFacilities.ventilator = true;
    if (sym.requiredFacilities.traumaCare) requiredFacilities.traumaCare = true;
    if (sym.requiredFacilities.cardiacCare) requiredFacilities.cardiacCare = true;
    if (sym.requiredFacilities.strokeUnit) requiredFacilities.strokeUnit = true;
    if (sym.requiredFacilities.orthopedicSurgeon) requiredFacilities.orthopedicSurgeon = true;

    if (sym.baselineSeverity === 'CRITICAL') {
      highestSymptomSeverity = 'CRITICAL';
      baseSeverityScore = Math.max(baseSeverityScore, 85);
      keyRiskFactors.push(`Critical symptom present: ${sym.label}`);
    } else if (sym.baselineSeverity === 'HIGH' && highestSymptomSeverity !== 'CRITICAL') {
      highestSymptomSeverity = 'HIGH';
      baseSeverityScore = Math.max(baseSeverityScore, 65);
      keyRiskFactors.push(`High acuity symptom: ${sym.label}`);
    } else if (sym.baselineSeverity === 'MODERATE' && highestSymptomSeverity === 'LOW') {
      highestSymptomSeverity = 'MODERATE';
      baseSeverityScore = Math.max(baseSeverityScore, 45);
      keyRiskFactors.push(`Moderate acuity: ${sym.label}`);
    }
  }

  // 2. Consciousness & Neurological Red Flags
  if (input.consciousness === 'unresponsive') {
    highestSymptomSeverity = 'CRITICAL';
    baseSeverityScore = 98;
    requiredFacilities.emergencyDepartment = true;
    requiredFacilities.icu = true;
    requiredFacilities.ventilator = true;
    requiredFacilities.oxygenSupport = true;
    keyRiskFactors.push('Unresponsive / Altered mental state (Immediate resuscitation needed)');
  } else if (input.consciousness === 'pain_responsive' || input.consciousness === 'voice_responsive') {
    highestSymptomSeverity = 'CRITICAL';
    baseSeverityScore = Math.max(baseSeverityScore, 88);
    requiredFacilities.emergencyDepartment = true;
    requiredFacilities.icu = true;
    keyRiskFactors.push('Decreased level of consciousness');
  }

  // 3. Vitals Analysis (if provided)
  if (input.vitals) {
    if (input.vitals.oxygenSaturationSpO2 && input.vitals.oxygenSaturationSpO2 < 90) {
      highestSymptomSeverity = 'CRITICAL';
      baseSeverityScore = Math.max(baseSeverityScore, 92);
      requiredFacilities.oxygenSupport = true;
      requiredFacilities.icu = true;
      keyRiskFactors.push(`Severe Hypoxemia (SpO2: ${input.vitals.oxygenSaturationSpO2}%)`);
    } else if (input.vitals.oxygenSaturationSpO2 && input.vitals.oxygenSaturationSpO2 < 94) {
      baseSeverityScore = Math.max(baseSeverityScore, 70);
      requiredFacilities.oxygenSupport = true;
      keyRiskFactors.push(`Mild-Moderate Hypoxia (SpO2: ${input.vitals.oxygenSaturationSpO2}%)`);
    }

    if (input.vitals.heartRateBpm && (input.vitals.heartRateBpm > 130 || input.vitals.heartRateBpm < 45)) {
      baseSeverityScore = Math.max(baseSeverityScore, 80);
      requiredFacilities.cardiacCare = true;
      keyRiskFactors.push(`Severe Arrhythmia / Tachy-Bradycardia (HR: ${input.vitals.heartRateBpm} bpm)`);
    }

    if (input.vitals.bloodPressureSystolic && (input.vitals.bloodPressureSystolic > 190 || input.vitals.bloodPressureSystolic < 85)) {
      baseSeverityScore = Math.max(baseSeverityScore, 82);
      keyRiskFactors.push(`Critical Blood Pressure (Systolic: ${input.vitals.bloodPressureSystolic} mmHg)`);
    }
  }

  // 4. Pain Scale & Age & Duration modifiers
  if (input.painScale >= 8) {
    baseSeverityScore += 5;
    keyRiskFactors.push(`Severe pain rating (${input.painScale}/10)`);
  }
  if (input.age >= 65 || input.age <= 2) {
    baseSeverityScore += 4;
    keyRiskFactors.push(`Age-related clinical vulnerability (${input.age} years)`);
  }
  if (input.duration === 'less_than_30min' && (highestSymptomSeverity === 'CRITICAL' || highestSymptomSeverity === 'HIGH')) {
    baseSeverityScore += 4;
    keyRiskFactors.push('Acute hyper-sudden onset (< 30 minutes)');
  }

  // Clamp Risk/Priority score between 5 and 99
  const riskScore = Math.min(99, Math.max(12, Math.round(baseSeverityScore)));

  // Final severity level classification
  let finalSeverity: SeverityLevel = 'LOW';
  let esiLevel: 1 | 2 | 3 | 4 | 5 = 5;
  let recommendedResponseTime = 60; // minutes

  if (riskScore >= 80 || highestSymptomSeverity === 'CRITICAL') {
    finalSeverity = 'CRITICAL';
    esiLevel = riskScore >= 92 ? 1 : 2;
    recommendedResponseTime = 0; // Immediate
    requiredFacilities.emergencyDepartment = true;
  } else if (riskScore >= 60 || highestSymptomSeverity === 'HIGH') {
    finalSeverity = 'HIGH';
    esiLevel = 2;
    recommendedResponseTime = 15;
    requiredFacilities.emergencyDepartment = true;
  } else if (riskScore >= 40 || highestSymptomSeverity === 'MODERATE') {
    finalSeverity = 'MODERATE';
    esiLevel = 3;
    recommendedResponseTime = 30;
    requiredFacilities.emergencyDepartment = true;
  } else {
    finalSeverity = 'LOW';
    esiLevel = 4;
    recommendedResponseTime = 60;
  }

  // Generate explainable reasoning summary
  let reasoningSummary = '';
  if (finalSeverity === 'CRITICAL') {
    reasoningSummary = `High-urgency emergency profile detected based on ${input.selectedSymptoms.length > 0 ? input.selectedSymptoms.join(', ').replace(/_/g, ' ') : 'acute physiological presentation'}. Requires immediate resuscitation bay, active oxygen support, and critical care capability.`;
  } else if (finalSeverity === 'HIGH') {
    reasoningSummary = `Urgent medical evaluation recommended. Patient presents with high-acuity indicators requiring priority emergency department admission and specialist review within 15 minutes.`;
  } else if (finalSeverity === 'MODERATE') {
    reasoningSummary = `Moderate severity presentation. Stable vitals expected but requires supervised emergency assessment and diagnostic workup to prevent decompensation.`;
  } else {
    reasoningSummary = `Low acute risk profile detected. Symptoms indicate stable condition suitable for routine emergency triage or urgent care consultation.`;
  }

  return {
    id: `eval-${Date.now()}`,
    patientId,
    timestamp: new Date().toISOString(),
    severity: finalSeverity,
    riskScore,
    recommendedResponseTimeMinutes: recommendedResponseTime,
    esiLevel,
    reasoningSummary,
    keyRiskFactors,
    requiredFacilities,
    disclaimer: SAFETY_DISCLAIMER
  };
}

// Backward compatibility export
export const evaluateEmergencyTriage = evaluateEmergencyPriority;
