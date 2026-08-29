import { Hospital, HospitalScoreBreakdown, RequiredFacilities } from '../types/hospital';
import { AssessmentResult } from '../types/prioritization';
import { matchHospitalsByFacilityRequirements } from './facilityMatchingEngine';

export interface RankedHospital {
  hospital: Hospital;
  suitabilityScore: number; // 0 to 100
  isEligible: boolean;
  scoreBreakdown: HospitalScoreBreakdown;
  recommendationReason: string;
  whyThisHospitalExplanation: string;
  matchedFacilities: string[];
  missingFacilities: string[];
  disqualificationReason?: string;
  rank: number;
}

/**
 * Transparent Hospital Ranking Engine
 * Evaluates Multi-Criteria Decision Analysis (MCDA) factors with full explainability.
 */
export function rankHospitalsForPatient(
  hospitals: Hospital[],
  assessment: AssessmentResult | null,
  customRequirements?: RequiredFacilities
): RankedHospital[] {
  const reqs = customRequirements || assessment?.requiredFacilities || {
    emergencyDepartment: true,
    icu: false,
    oxygenSupport: false,
    ventilator: false,
    traumaCare: false,
    cardiacCare: false,
    strokeUnit: false,
    orthopedicSurgeon: false,
    pediatricEmergency: false
  };

  // 1. First pass: Filter and evaluate facility eligibility
  const facilityMatches = matchHospitalsByFacilityRequirements(hospitals, reqs);

  const rankedList: RankedHospital[] = facilityMatches.map(match => {
    const h = match.hospital;

    // --- Component 1: Emergency Capability (Max 25 pts) ---
    let capScore = 0;
    if (h.emergencyAvailable) capScore += 10;
    if (h.traumaLevel === 1) capScore += 8;
    else if (h.traumaLevel === 2) capScore += 6;
    else if (h.traumaLevel === 3) capScore += 4;
    if (h.ventilatorAvailability) capScore += 4;
    if (h.cardiacCareAvailable || h.strokeUnitAvailable) capScore += 3;
    capScore = Math.min(25, capScore);

    // --- Component 2: Required Facilities Matching (Max 20 pts) ---
    // If not eligible, heavily penalize this component
    const reqScore = match.isEligible ? Math.round(match.facilityScoreRatio * 20) : Math.round(match.facilityScoreRatio * 5);

    // --- Component 3: Bed Availability Score (Max 20 pts) ---
    // Proportion of emergency + ICU beds available
    const erBedRatio = h.totalEmergencyBeds > 0 ? h.availableEmergencyBeds / h.totalEmergencyBeds : 0;
    const icuBedRatio = h.totalICUBeds > 0 ? h.availableICUBeds / h.totalICUBeds : 0;
    let bedScore = Math.round((erBedRatio * 0.6 + icuBedRatio * 0.4) * 20);
    bedScore = Math.min(20, Math.max(0, bedScore));

    // --- Component 4: Waiting Time Score (Max 20 pts) ---
    // 0-10 min = 20 pts, 10-20 min = 15 pts, 20-30 min = 10 pts, >40 min = 2 pts
    let waitScore = Math.max(2, Math.round(20 - (h.estimatedWaitTimeMinutes / 45) * 18));
    waitScore = Math.min(20, waitScore);

    // --- Component 5: Travel Time Score (Max 20 pts) ---
    // Considers simulated traffic ETA rather than straight line distance
    let travelScore = Math.max(2, Math.round(20 - (h.travelTimeMinutes / 30) * 18));
    travelScore = Math.min(20, travelScore);

    // --- Component 6: Ambulance Availability Score (Max 5 pts) ---
    const ambScore = Math.min(5, h.ambulanceAvailableCount * 2);

    // --- Component 7: Healthcare Load Balancing Factor ---
    // Penalize hospitals with ER load > 80% to avoid bottlenecking
    let loadBalancingPenalty = 0;
    if (h.currentERLoadPercent > 85) {
      loadBalancingPenalty = 15;
    } else if (h.currentERLoadPercent > 75) {
      loadBalancingPenalty = 8;
    }

    // Total Suitability Score
    let totalScore = capScore + reqScore + bedScore + waitScore + travelScore + ambScore - loadBalancingPenalty;
    
    // Ineligible hospitals capped at lower ceiling so they never outrank an eligible hospital
    if (!match.isEligible) {
      totalScore = Math.min(48, totalScore);
    }
    totalScore = Math.max(10, Math.min(99, totalScore));

    const scoreBreakdown: HospitalScoreBreakdown = {
      emergencyCapability: { score: capScore, max: 25 },
      requiredFacilities: { score: reqScore, max: 20 },
      bedAvailability: { score: bedScore, max: 20 },
      waitingTime: { score: waitScore, max: 20 },
      travelTime: { score: travelScore, max: 20 },
      ambulanceAvailability: { score: ambScore, max: 5 },
      loadBalancingPenalty,
      totalScore
    };

    // Generate explainable 'Why this hospital?' reasoning
    let whyExplanation = '';
    if (match.isEligible) {
      whyExplanation = `${h.name} is recommended with a suitability score of ${totalScore}/100 because it currently satisfies all ${match.matchedRequirements.length} required emergency facilities (including ${h.availableICUBeds} available ICU beds and ${h.availableEmergencyBeds} ER beds), has a low ER load of ${h.currentERLoadPercent}%, and an estimated travel ETA of only ${h.travelTimeMinutes} minutes in current traffic conditions.`;
    } else {
      whyExplanation = `${h.name} is disqualified from top ranking: ${match.disqualificationReason || 'Does not meet essential facility requirements'}.`;
    }

    return {
      hospital: h,
      suitabilityScore: totalScore,
      isEligible: match.isEligible,
      scoreBreakdown,
      recommendationReason: match.isEligible 
        ? `${h.travelTimeMinutes}m ETA • ${h.availableEmergencyBeds} ER Beds • ${h.estimatedWaitTimeMinutes}m Wait` 
        : `Ineligible: ${match.missingRequirements[0] || 'Lacks Capacity'}`,
      whyThisHospitalExplanation: whyExplanation,
      matchedFacilities: match.matchedRequirements,
      missingFacilities: match.missingRequirements,
      disqualificationReason: match.disqualificationReason,
      rank: 0
    };
  });

  // Sort by: Eligible first, then highest suitability score, then lowest travel time
  rankedList.sort((a, b) => {
    if (a.isEligible !== b.isEligible) {
      return a.isEligible ? -1 : 1;
    }
    if (b.suitabilityScore !== a.suitabilityScore) {
      return b.suitabilityScore - a.suitabilityScore;
    }
    return a.hospital.travelTimeMinutes - b.hospital.travelTimeMinutes;
  });

  // Assign ranks
  rankedList.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return rankedList;
}
