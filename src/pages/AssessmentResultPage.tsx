import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  BedDouble, 
  Truck, 
  ArrowRight, 
  PhoneCall, 
  Hospital as HospitalIcon, 
  Sparkles, 
  Info, 
  Activity, 
  Layers, 
  ChevronRight, 
  Check, 
  X, 
  Share2, 
  AlertTriangle 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface AssessmentResultPageProps {
  navigate: (path: string) => void;
}

export const AssessmentResultPage: React.FC<AssessmentResultPageProps> = ({ navigate }) => {
  const { 
    assessmentResult, 
    currentAssessmentInput, 
    rankedHospitals, 
    selectedHospital, 
    setSelectedHospital, 
    sendHospitalPreAlert, 
    generatePatientToken 
  } = useApp();

  const [preAlertSentSuccess, setPreAlertSentSuccess] = useState(false);

  // If no assessment exists yet, use top ranked hospital as default
  const topRanked = rankedHospitals.find(r => r.isEligible) || rankedHospitals[0];
  const recommendedHospital = selectedHospital || topRanked?.hospital;
  const currentRankedItem = rankedHospitals.find(r => r.hospital.id === recommendedHospital?.id) || topRanked;

  const severity = assessmentResult?.severity || 'CRITICAL';
  const riskScore = assessmentResult?.riskScore || 94;
  const esiLevel = assessmentResult?.esiLevel || 1;

  const handleSendPreAlert = () => {
    if (recommendedHospital) {
      sendHospitalPreAlert(recommendedHospital);
      setPreAlertSentSuccess(true);
    }
  };

  const handleGetQueueToken = () => {
    if (recommendedHospital) {
      generatePatientToken(
        currentAssessmentInput?.patientName || 'Emergency Patient',
        severity,
        recommendedHospital.id
      );
      navigate('/queue');
    }
  };

  const handleNavigateToJourney = () => {
    if (recommendedHospital) {
      if (!preAlertSentSuccess) {
        sendHospitalPreAlert(recommendedHospital);
      }
      navigate('/journey');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Banner with Severity Indicator */}
      <div className="space-y-4">
        <div className={`p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden ${
          severity === 'CRITICAL'
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700'
            : severity === 'HIGH'
            ? 'bg-gradient-to-r from-orange-500 to-amber-600'
            : severity === 'MODERATE'
            ? 'bg-gradient-to-r from-amber-500 to-yellow-600'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600'
        }`}>
          {/* Subtle background graphics */}
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-white">
                  Emergency Urgency Classification
                </span>
                <span className="px-2.5 py-1 bg-white/30 backdrop-blur-md rounded-full text-xs font-mono font-bold">
                  ESI Level {esiLevel}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                <span>{severity === 'CRITICAL' ? '🔴 CRITICAL' : severity === 'HIGH' ? '🟠 HIGH URGENCY' : severity === 'MODERATE' ? '🟡 MODERATE' : '🟢 LOW RISK'}</span>
              </h1>
              <p className="text-xs sm:text-sm text-white/90 max-w-xl leading-relaxed">
                {assessmentResult?.reasoningSummary || 'Immediate emergency resuscitation and critical care admission recommended.'}
              </p>
            </div>

            {/* Risk Score Pill */}
            <div className="p-4 bg-white/15 backdrop-blur-md rounded-2xl border border-white/25 text-center shrink-0 min-w-[140px]">
              <span className="text-[11px] uppercase tracking-wider text-white/80 font-semibold block">
                Priority/Risk Score
              </span>
              <div className="text-4xl font-extrabold font-mono text-white mt-0.5">
                {riskScore}<span className="text-lg font-normal text-white/70">/100</span>
              </div>
              <span className="text-[10px] text-white/80 font-medium">
                {severity === 'CRITICAL' ? 'Immediate Response' : '< 15 min Response'}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Disclaimer Banner */}
        <DisclaimerBanner />
      </div>

      {/* Patient Summary & Detected Required Facilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Details */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-brand-600" />
            Patient Assessment Profile
          </h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Patient:</span>
              <span className="font-bold text-slate-900">{currentAssessmentInput?.patientName || 'Ramesh Sundaram'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Age & Gender:</span>
              <span className="font-medium text-slate-800">{currentAssessmentInput?.age || 48} yrs • {currentAssessmentInput?.gender || 'male'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Pain Scale:</span>
              <span className="font-bold text-red-600 font-mono">{currentAssessmentInput?.painScale || 9}/10 (Severe)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Location:</span>
              <span className="font-medium text-slate-800 truncate max-w-[140px]" title={currentAssessmentInput?.location}>
                {currentAssessmentInput?.location || 'Bangalore Central'}
              </span>
            </div>
          </div>
        </div>

        {/* Required Facilities Detected */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 md:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            Required Hospital Facilities Detected
          </h3>
          <p className="text-xs text-slate-500">
            The facility matching engine automatically filters out any hospital that lacks these essential capabilities:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {assessmentResult?.requiredFacilities ? (
              Object.entries(assessmentResult.requiredFacilities)
                .filter(([, req]) => req)
                .map(([key]) => (
                  <div key={key} className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))
            ) : (
              <>
                <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Emergency Department</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ICU Available</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Oxygen Support</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Hospital Spotlight Card */}
      {recommendedHospital && currentRankedItem && (
        <div className="bg-white rounded-3xl border-2 border-brand-500 shadow-xl overflow-hidden space-y-6">
          {/* Spotlight Header */}
          <div className="bg-gradient-to-r from-brand-600 to-sky-600 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-sky-100 block">
                  Top Ranked Recommendation (#1 Suitability Match)
                </span>
                <h2 className="text-xl font-extrabold">{recommendedHospital.name}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-white text-brand-900 rounded-xl text-xs font-extrabold font-mono shadow">
                Suitability Score: {currentRankedItem.suitabilityScore}/100
              </div>
            </div>
          </div>

          {/* Core Hospital Details & Telemetry */}
          <div className="px-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" /> Distance &amp; ETA
                </span>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {recommendedHospital.distanceKm} km
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold font-mono">
                  {recommendedHospital.travelTimeMinutes} mins (Low Traffic)
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> ER Wait Time
                </span>
                <div className="text-lg font-bold text-amber-600 font-mono">
                  {recommendedHospital.estimatedWaitTimeMinutes} mins
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Queue: 4 ahead
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-purple-600" /> ICU Capacity
                </span>
                <div className="text-lg font-bold text-purple-700 font-mono">
                  {recommendedHospital.availableICUBeds} Beds Open
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold">
                  ICU Bed Ready ✓
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" /> Ambulance Ready
                </span>
                <div className="text-lg font-bold text-emerald-700 font-mono">
                  {recommendedHospital.ambulanceAvailableCount} Available
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold">
                  ALS Oxygen Ready
                </div>
              </div>
            </div>

            {/* Explainable AI: Why This Hospital? */}
            <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-sky-600 text-white rounded">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                  Explainable AI Recommendation: Why this hospital?
                </h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {currentRankedItem.whyThisHospitalExplanation}
              </p>
            </div>

            {/* Transparent MCDA Score Breakdown */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Transparent Multi-Criteria Decision Breakdown (MCDA)
              </h4>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 divide-y divide-slate-200 text-xs">
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-slate-600">Emergency Capability (Trauma/Ventilator/Cath)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentRankedItem.scoreBreakdown.emergencyCapability.score} / {currentRankedItem.scoreBreakdown.emergencyCapability.max}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-slate-600">Required Facilities Matching</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentRankedItem.scoreBreakdown.requiredFacilities.score} / {currentRankedItem.scoreBreakdown.requiredFacilities.max}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-slate-600">Bed &amp; ICU Availability</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentRankedItem.scoreBreakdown.bedAvailability.score} / {currentRankedItem.scoreBreakdown.bedAvailability.max}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-slate-600">Waiting Time Factor (Shortest Queue)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentRankedItem.scoreBreakdown.waitingTime.score} / {currentRankedItem.scoreBreakdown.waitingTime.max}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-slate-600">Travel Time Score (Traffic Telemetry)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentRankedItem.scoreBreakdown.travelTime.score} / {currentRankedItem.scoreBreakdown.travelTime.max}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-slate-600">Ambulance Readiness</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentRankedItem.scoreBreakdown.ambulanceAvailability.score} / {currentRankedItem.scoreBreakdown.ambulanceAvailability.max}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-bold text-sm bg-brand-50/50 px-2 rounded-lg mt-1 text-brand-900">
                  <span>Overall Suitability Index</span>
                  <span className="font-mono text-base">{currentRankedItem.suitabilityScore} / 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer Bar */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <a
                href="tel:112"
                className="flex items-center gap-2 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl transition"
              >
                <PhoneCall className="w-4 h-4 text-red-600" />
                <span>Call Emergency 112</span>
              </a>

              <button
                onClick={() => navigate('/finder')}
                className="px-4 py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Compare All Hospitals
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSendPreAlert}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-xl shadow-md transition transform active:scale-95 ${
                  preAlertSentSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white'
                }`}
              >
                {preAlertSentSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Pre-Alert Transmitted ✓</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 animate-pulse" />
                    <span>🚨 Send Hospital Pre-Alert</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNavigateToJourney}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 transition transform active:scale-95"
              >
                <span>Navigate &amp; Track Journey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
