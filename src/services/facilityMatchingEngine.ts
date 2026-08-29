import { Hospital, RequiredFacilities } from '../types/hospital';

export interface HospitalFacilityMatchResult {
  hospital: Hospital;
  isEligible: boolean;
  matchedRequirements: string[];
  missingRequirements: string[];
  facilityScoreRatio: number; // 0 to 1
  disqualificationReason?: string;
}

/**
 * Facility Matching Engine
 * Eliminates hospitals that cannot satisfy essential clinical requirements.
 */
export function matchHospitalsByFacilityRequirements(
  hospitals: Hospital[],
  requirements: RequiredFacilities
): HospitalFacilityMatchResult[] {
  return hospitals.map(hospital => {
    const matchedRequirements: string[] = [];
    const missingRequirements: string[] = [];
    let isEligible = true;
    let disqualificationReason = '';

    // Check Open status
    if (!hospital.isOpen) {
      isEligible = false;
      disqualificationReason = 'Hospital emergency intake is currently closed.';
      missingRequirements.push('Hospital Status (Closed)');
    }

    // Check Emergency Department
    if (requirements.emergencyDepartment) {
      if (hospital.emergencyAvailable && hospital.availableEmergencyBeds > 0) {
        matchedRequirements.push('Emergency Department Available');
      } else {
        isEligible = false;
        disqualificationReason = 'Emergency department is currently saturated or unavailable.';
        missingRequirements.push('Available Emergency Bed');
      }
    }

    // Check ICU Requirement
    if (requirements.icu) {
      if (hospital.icuAvailable && hospital.availableICUBeds > 0) {
        matchedRequirements.push(`ICU Available (${hospital.availableICUBeds} beds open)`);
      } else {
        isEligible = false;
        disqualificationReason = 'No available ICU capacity / ICU beds full (0 available).';
        missingRequirements.push('Available ICU Bed');
      }
    }

    // Check Oxygen Support
    if (requirements.oxygenSupport) {
      if (hospital.oxygenSupport) {
        matchedRequirements.push('High-flow Oxygen Support');
      } else {
        isEligible = false;
        disqualificationReason = 'High-flow oxygen infrastructure unavailable.';
        missingRequirements.push('Oxygen Support');
      }
    }

    // Check Ventilator Support
    if (requirements.ventilator) {
      if (hospital.ventilatorAvailability) {
        matchedRequirements.push('Mechanical Ventilator Support');
      } else {
        isEligible = false;
        disqualificationReason = 'Ventilator capacity unavailable.';
        missingRequirements.push('Ventilator Support');
      }
    }

    // Check Trauma Care
    if (requirements.traumaCare) {
      if (hospital.traumaLevel > 0) {
        matchedRequirements.push(`Trauma Center Level ${hospital.traumaLevel}`);
      } else {
        isEligible = false;
        disqualificationReason = 'Trauma surgery and resuscitation team not equipped.';
        missingRequirements.push('Trauma Center Capability');
      }
    }

    // Check Cardiac Care
    if (requirements.cardiacCare) {
      if (hospital.cardiacCareAvailable) {
        matchedRequirements.push('Cardiac Care / Cath Lab');
      } else {
        isEligible = false;
        disqualificationReason = 'Interventional cardiac catheterization unit not available.';
        missingRequirements.push('Cardiac Care Unit');
      }
    }

    // Check Stroke Unit
    if (requirements.strokeUnit) {
      if (hospital.strokeUnitAvailable) {
        matchedRequirements.push('Dedicated Stroke & Neuro Team');
      } else {
        isEligible = false;
        disqualificationReason = 'Hyperacute stroke thrombolysis team unavailable.';
        missingRequirements.push('Stroke Unit');
      }
    }

    // Check Orthopedic Surgeon
    if (requirements.orthopedicSurgeon) {
      if (hospital.orthopedicAvailable) {
        matchedRequirements.push('On-call Orthopedic Trauma Surgeon');
      } else {
        isEligible = false;
        disqualificationReason = 'Emergency orthopedic surgeon on duty unavailable.';
        missingRequirements.push('Orthopedic Trauma Team');
      }
    }

    // Check Pediatric Emergency
    if (requirements.pediatricEmergency) {
      if (hospital.pediatricAvailable) {
        matchedRequirements.push('Pediatric Emergency Unit');
      } else {
        isEligible = false;
        disqualificationReason = 'Specialized pediatric emergency unit unavailable.';
        missingRequirements.push('Pediatric Emergency Care');
      }
    }

    const totalDemanded = matchedRequirements.length + missingRequirements.length;
    const facilityScoreRatio = totalDemanded === 0 ? 1 : matchedRequirements.length / totalDemanded;

    return {
      hospital,
      isEligible,
      matchedRequirements,
      missingRequirements,
      facilityScoreRatio,
      disqualificationReason: disqualificationReason || undefined
    };
  });
}
