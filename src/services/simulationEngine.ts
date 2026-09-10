import { Hospital } from '../types/hospital';
import { SeverityLevel } from '../types/hospital';
import { SimulationResultMetrics, SyntheticScenario } from '../types/simulation';
import { evaluateEmergencyPriority } from './prioritizationEngine';
import { rankHospitalsForPatient } from './rankingEngine';

const SAMPLE_NAMES = [
  'Aarav Sharma', 'Diya Patel', 'Rajesh Nair', 'Sunita Rao', 'Vikramaditya Sengupta',
  'Meera Iyer', 'Rohan Gupta', 'Kavita Verma', 'Farhan Qureshi', 'Ananya Deshmukh',
  'Gopal Krishna', 'Deepak Joshi', 'Pooja Hegde', 'Manish Malhotra', 'Bhavna Chawla'
];

const SAMPLE_SYMPTOM_SETS: Array<{ symptoms: string[]; baseSeverity: SeverityLevel; pain: number; age: number }> = [
  { symptoms: ['chest_pain', 'difficulty_breathing'], baseSeverity: 'CRITICAL', pain: 9, age: 52 },
  { symptoms: ['unconsciousness', 'head_injury'], baseSeverity: 'CRITICAL', pain: 10, age: 34 },
  { symptoms: ['stroke_symptoms'], baseSeverity: 'CRITICAL', pain: 8, age: 67 },
  { symptoms: ['severe_bleeding', 'fracture_injury'], baseSeverity: 'HIGH', pain: 9, age: 29 },
  { symptoms: ['fracture_injury'], baseSeverity: 'HIGH', pain: 8, age: 22 },
  { symptoms: ['severe_abdominal_pain'], baseSeverity: 'HIGH', pain: 7, age: 41 },
  { symptoms: ['high_fever'], baseSeverity: 'MODERATE', pain: 4, age: 19 },
  { symptoms: ['persistent_vomiting'], baseSeverity: 'MODERATE', pain: 5, age: 38 },
  { symptoms: ['moderate_burn'], baseSeverity: 'MODERATE', pain: 6, age: 45 },
  { symptoms: ['mild_sprain'], baseSeverity: 'LOW', pain: 3, age: 26 },
  { symptoms: ['mild_cough_cold'], baseSeverity: 'LOW', pain: 1, age: 31 }
];

/**
 * Monte Carlo Emergency Simulation Engine
 * Runs N synthetic emergency cases through the full pipeline to generate transparent prototype metrics.
 */
export function runBatchEmergencySimulation(hospitals: Hospital[], scenarioCount: number = 100): {
  metrics: SimulationResultMetrics;
  scenarios: SyntheticScenario[];
} {
  const scenarios: SyntheticScenario[] = [];
  const hospitalPatientCounts: Record<string, number> = {};
  
  // Initialize counters
  hospitals.forEach(h => {
    hospitalPatientCounts[h.name] = 0;
  });

  let totalWaitTime = 0;
  let totalAmbulanceEta = 0;
  let criticalCount = 0;
  let highCount = 0;
  let moderateCount = 0;
  let lowCount = 0;
  let rerouteCount = 0;
  let successfulCriticalRoutings = 0;

  for (let i = 1; i <= scenarioCount; i++) {
    const patientName = `${SAMPLE_NAMES[i % SAMPLE_NAMES.length]} #${i}`;
    const preset = SAMPLE_SYMPTOM_SETS[i % SAMPLE_SYMPTOM_SETS.length];
    
    // Simulate assessment
    const assessment = evaluateEmergencyPriority({
      patientName,
      age: preset.age,
      gender: i % 2 === 0 ? 'male' : 'female',
      location: `Zone ${((i * 3) % 8) + 1}, Metro Area`,
      selectedSymptoms: preset.symptoms,
      duration: 'less_than_30min',
      painScale: preset.pain,
      existingConditions: preset.age > 50 ? ['Hypertension'] : [],
      consciousness: preset.baseSeverity === 'CRITICAL' && preset.symptoms.includes('unconsciousness') ? 'unresponsive' : 'alert'
    });

    if (assessment.severity === 'CRITICAL') criticalCount++;
    else if (assessment.severity === 'HIGH') highCount++;
    else if (assessment.severity === 'MODERATE') moderateCount++;
    else lowCount++;

    // Rank hospitals
    const ranked = rankHospitalsForPatient(hospitals, assessment);
    const topRecommended = ranked.find(r => r.isEligible) || ranked[0];

    // Check if closest hospital was rejected due to lack of facilities (a reroute)
    const closestHospital = [...hospitals].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const rerouteOccurred = topRecommended.hospital.id !== closestHospital.id && !ranked.find(r => r.hospital.id === closestHospital.id)?.isEligible;
    if (rerouteOccurred) {
      rerouteCount++;
    }

    if (assessment.severity === 'CRITICAL' && topRecommended.isEligible) {
      successfulCriticalRoutings++;
    }

    // Accumulate metrics
    const simulatedWait = topRecommended.hospital.estimatedWaitTimeMinutes + (i % 5);
    const simulatedEta = topRecommended.hospital.travelTimeMinutes;
    totalWaitTime += simulatedWait;
    totalAmbulanceEta += simulatedEta;
    hospitalPatientCounts[topRecommended.hospital.name] = (hospitalPatientCounts[topRecommended.hospital.name] || 0) + 1;

    scenarios.push({
      id: `SIM-${1000 + i}`,
      patientName,
      age: preset.age,
      symptoms: preset.symptoms.map(s => s.replace(/_/g, ' ')),
      severity: assessment.severity,
      requiredFacilities: Object.entries(assessment.requiredFacilities)
        .filter(([, v]) => v)
        .map(([k]) => k),
      recommendedHospitalId: topRecommended.hospital.id,
      recommendedHospitalName: topRecommended.hospital.name,
      estimatedWaitMinutes: simulatedWait,
      travelTimeMinutes: simulatedEta,
      rerouteOccurred: !!rerouteOccurred,
      status: 'Completed'
    });
  }

  const hospitalLoadDistribution = hospitals.map(h => {
    const routed = hospitalPatientCounts[h.name] || 0;
    const loadPercent = Math.min(95, Math.round((routed / (scenarioCount / hospitals.length)) * h.currentERLoadPercent * 0.9));
    return {
      hospitalName: h.name,
      loadPercent,
      patientsRouted: routed
    };
  });

  const avgWait = Math.round(totalWaitTime / scenarioCount);
  const avgEta = Math.round(totalAmbulanceEta / scenarioCount);
  const criticalSuccessRate = criticalCount > 0 ? Math.round((successfulCriticalRoutings / criticalCount) * 100) : 100;

  const totalCapacity = hospitals.reduce((sum, h) => sum + (h.totalBeds ?? 0), 0);
  const totalOccupied = hospitals.reduce((sum, h) => sum + ((h.availableBeds ?? 0) ? (h.totalBeds ?? 0) - (h.availableBeds ?? 0) : 0), 0);
  const simulatedHospitalUtilizationPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const metrics: SimulationResultMetrics = {
    totalScenariosRun: scenarioCount,
    averageSimulatedWaitTimeMinutes: avgWait,
    simulatedHospitalUtilizationPercent,
    simulatedAmbulanceEtaMinutes: avgEta,
    criticalCasesSuccessfullyRoutedPercent: criticalSuccessRate,
    reroutesTriggeredCount: rerouteCount,
    queueDistribution: {
      critical: criticalCount,
      high: highCount,
      moderate: moderateCount,
      low: lowCount
    },
    hospitalLoadDistribution,
    facilityMatchingAccuracyPercent: criticalSuccessRate,
    timestamp: new Date().toISOString()
  };

  return { metrics, scenarios };
}
