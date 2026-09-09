import React, { useState } from 'react';
import { 
  ShieldAlert, 
  HeartPulse, 
  Activity, 
  Wind, 
  Droplets, 
  Brain, 
  Bone, 
  AlertCircle, 
  Thermometer, 
  Flame, 
  HelpCircle, 
  Bandage, 
  Smile, 
  Upload, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Clock, 
  MapPin, 
  User, 
  Zap,
  ChevronRight,
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmergencyAssessmentInput } from '../types/prioritization';
import { INITIAL_SYMPTOMS } from '../services/mockData';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface EmergencyAssessmentPageProps {
  navigate: (path: string) => void;
}

export const EmergencyAssessmentPage: React.FC<EmergencyAssessmentPageProps> = ({ navigate }) => {
  const { submitEmergencyCase, emergencyLoading, emergencyError, clearEmergencyError, currentEmergencyCase } = useApp();

  // Form State
  const [patientName, setPatientName] = useState('Ramesh Sundaram');
  const [age, setAge] = useState<number>(48);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [location, setLocation] = useState('MG Road Metro Station Junction, Bangalore');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['chest_pain', 'difficulty_breathing']);
  const [duration, setDuration] = useState<EmergencyAssessmentInput['duration']>('less_than_30min');
  const [painScale, setPainScale] = useState<number>(9);
  const [consciousness, setConsciousness] = useState<EmergencyAssessmentInput['consciousness']>('alert');
  const [existingConditions, setExistingConditions] = useState<string[]>(['Hypertension']);
  const [notes, setNotes] = useState('Sudden onset crushing retrosternal chest pain with cold sweats.');

  // Vitals State (optional, defaults to zero)
  const [showVitals, setShowVitals] = useState(false);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [bpSystolic, setBpSystolic] = useState<number>(0);
  const [bpDiastolic, setBpDiastolic] = useState<number>(0);
  const [spO2, setSpO2] = useState<number>(0);
  const [temp, setTemp] = useState<number>(0);
  const [uploadedFile, setUploadedFile] = useState<string>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Quick Preset Handlers
  const applyPreset = (type: 'cardiac' | 'asthma' | 'stroke' | 'trauma' | 'fever' | 'minor') => {
    // Presets include vitals, so show the vitals section
    setShowVitals(true);
    if (type === 'cardiac') {
      setPatientName('Ramesh Sundaram');
      setAge(48);
      setGender('male');
      setSelectedSymptoms(['chest_pain', 'difficulty_breathing']);
      setPainScale(9);
      setDuration('less_than_30min');
      setConsciousness('alert');
      setHeartRate(118);
      setBpSystolic(165);
      setBpDiastolic(98);
      setSpO2(91);
      setExistingConditions(['Hypertension', 'Type 2 Diabetes']);
      setNotes('Severe crushing chest pain radiating to left arm with diaphoresis.');
    } else if (type === 'asthma') {
      setPatientName('Priya Nambiar');
      setAge(26);
      setGender('female');
      setSelectedSymptoms(['difficulty_breathing']);
      setPainScale(6);
      setDuration('1_to_3_hours');
      setConsciousness('alert');
      setHeartRate(125);
      setBpSystolic(130);
      setBpDiastolic(85);
      setSpO2(88);
      setExistingConditions(['Asthma']);
      setNotes('Acute severe broncho-spasm unresponsive to rescue inhaler.');
    } else if (type === 'stroke') {
      setPatientName('Devdas Kulkarni');
      setAge(68);
      setGender('male');
      setSelectedSymptoms(['stroke_symptoms', 'unconsciousness']);
      setPainScale(5);
      setDuration('less_than_30min');
      setConsciousness('voice_responsive');
      setHeartRate(92);
      setBpSystolic(195);
      setBpDiastolic(110);
      setSpO2(96);
      setExistingConditions(['Hypertension', 'Previous TIA']);
      setNotes('Sudden right-sided facial droop and dense hemiplegia.');
    } else if (type === 'trauma') {
      setPatientName('Arun Verma');
      setAge(29);
      setGender('male');
      setSelectedSymptoms(['fracture_injury', 'severe_bleeding']);
      setPainScale(10);
      setDuration('less_than_30min');
      setConsciousness('alert');
      setHeartRate(115);
      setBpSystolic(110);
      setBpDiastolic(70);
      setSpO2(97);
      setExistingConditions([]);
      setNotes('Motorcycle collision with open femoral compound fracture.');
    } else if (type === 'fever') {
      setPatientName('Shreya Sen');
      setAge(22);
      setGender('female');
      setSelectedSymptoms(['high_fever', 'persistent_vomiting']);
      setPainScale(4);
      setDuration('today');
      setConsciousness('alert');
      setHeartRate(98);
      setBpSystolic(115);
      setBpDiastolic(75);
      setSpO2(98);
      setExistingConditions([]);
      setNotes('High grade fever 103F with persistent nausea and dehydration.');
    } else if (type === 'minor') {
      setPatientName('Kavita Rao');
      setAge(31);
      setGender('female');
      setSelectedSymptoms(['minor_sprain']);
      setPainScale(3);
      setDuration('several_days');
      setConsciousness('alert');
      setHeartRate(76);
      setBpSystolic(120);
      setBpDiastolic(80);
      setSpO2(99);
      setExistingConditions([]);
      setNotes('Mild twisting injury of the right lateral ankle while jogging.');
    }
  };

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || emergencyLoading) return;

    if (selectedSymptoms.length === 0) {
      alert('Please select at least one symptom for emergency prioritization.');
      return;
    }

    if (currentEmergencyCase && currentEmergencyCase.status === 'REPORTED') {
      setSubmitError('An active emergency case is already open. Please wait for it to be resolved before submitting a new one.');
      return;
    }

    const hasVitalsData = showVitals && (heartRate > 0 || bpSystolic > 0 || bpDiastolic > 0 || spO2 > 0 || temp > 0);

    const inputData: EmergencyAssessmentInput = {
      patientName,
      age,
      gender,
      location,
      selectedSymptoms,
      duration,
      painScale,
      consciousness,
      existingConditions,
      vitals: hasVitalsData ? {
        heartRateBpm: heartRate,
        bloodPressureSystolic: bpSystolic,
        bloodPressureDiastolic: bpDiastolic,
        oxygenSaturationSpO2: spO2,
        temperatureCelsius: temp
      } : undefined,
      uploadedDocumentName: uploadedFile !== 'none' ? uploadedFile : undefined,
      notes
    };

    setIsSubmitting(true);
    setSubmitError(null);
    clearEmergencyError();

    try {
      await submitEmergencyCase(inputData);
      navigate('/assessment-result');
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || emergencyLoading;
  const activeError = submitError || emergencyError;

  const getIcon = (name: string) => {
    switch (name) {
      case 'HeartPulse': return <HeartPulse className="w-4 h-4" />;
      case 'Wind': return <Wind className="w-4 h-4" />;
      case 'Activity': return <Activity className="w-4 h-4" />;
      case 'Droplets': return <Droplets className="w-4 h-4" />;
      case 'Brain': return <Brain className="w-4 h-4" />;
      case 'Bone': return <Bone className="w-4 h-4" />;
      case 'AlertCircle': return <AlertCircle className="w-4 h-4" />;
      case 'Thermometer': return <Thermometer className="w-4 h-4" />;
      case 'Flame': return <Flame className="w-4 h-4" />;
      case 'Bandage': return <Bandage className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>AI-Assisted Emergency Prioritization</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Emergency Assessment & Triage
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Evaluate acute urgency, detect essential facility requirements (ICU, Oxygen, Trauma), and discover the fastest hospital route.
        </p>
      </div>

      {/* Safety Notice */}
      <DisclaimerBanner />

      {/* 1-Click Scenario Presets Bar */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-brand-950 text-white rounded-2xl shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Fast Demo Presets (1-Click Fill)
          </span>
          <span className="text-[11px] text-slate-400">Click to autofill clinical scenarios</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => applyPreset('cardiac')}
            className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition"
          >
            🫀 48yo Cardiac Arrest / Chest Pain
          </button>
          <button
            type="button"
            onClick={() => applyPreset('asthma')}
            className="px-3 py-1.5 bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition"
          >
            🫁 26yo Severe Hypoxia (SpO2 88%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('stroke')}
            className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition"
          >
            🧠 68yo Acute Stroke (FAST)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('trauma')}
            className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition"
          >
            🦴 29yo Open Fracture Trauma
          </button>
          <button
            type="button"
            onClick={() => applyPreset('fever')}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition"
          >
            🌡️ 22yo High Fever / Moderate
          </button>
        </div>
      </div>

      {/* Main Assessment Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
        {/* Section 1: Patient Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-brand-600" />
            1. Patient Demographics & Location
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Patient Full Name</label>
              <input
                type="text"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Age (Years)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={e => setAge(parseInt(e.target.value) || 0)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as 'male' | 'female' | 'other')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              Current Patient Location / Landmark
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
          </div>
        </div>

        {/* Section 2: Symptoms Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-600" />
              2. Select Presenting Symptoms & Acuity Signs
            </h3>
            <span className="text-xs text-brand-600 font-bold">
              {selectedSymptoms.length} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {INITIAL_SYMPTOMS.map(sym => {
              const isSelected = selectedSymptoms.includes(sym.id);
              const isCritical = sym.baselineSeverity === 'CRITICAL';
              const isHigh = sym.baselineSeverity === 'HIGH';

              return (
                <button
                  key={sym.id}
                  type="button"
                  onClick={() => toggleSymptom(sym.id)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition transform active:scale-98 ${
                    isSelected
                      ? isCritical
                        ? 'bg-red-50/80 border-red-400 text-red-950 shadow-xs'
                        : 'bg-brand-50 border-brand-400 text-brand-950 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected
                      ? isCritical ? 'bg-red-500 text-white' : 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {getIcon(sym.iconName)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="font-semibold text-xs leading-tight">{sym.label}</div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        isCritical ? 'bg-red-100 text-red-800' : isHigh ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sym.baselineSeverity}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Duration, Pain & Consciousness */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-brand-600" />
            3. Onset, Severity & Neurological State
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Symptom Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value as EmergencyAssessmentInput['duration'])}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="less_than_30min">Acute Sudden (&lt; 30 minutes)</option>
                <option value="1_to_3_hours">1 to 3 hours ago</option>
                <option value="today">Earlier today</option>
                <option value="several_days">Multiple days</option>
              </select>
            </div>

            {/* Pain Scale */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Pain Severity Scale</label>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded font-mono ${
                  painScale >= 8 ? 'bg-red-100 text-red-700' : painScale >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {painScale} / 10
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={painScale}
                onChange={e => setPainScale(parseInt(e.target.value))}
                className="w-full accent-brand-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 (No Pain)</span>
                <span>5 (Moderate)</span>
                <span>10 (Severe Agony)</span>
              </div>
            </div>

            {/* Consciousness */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Consciousness Level (AVPU)</label>
              <select
                value={consciousness}
                onChange={e => setConsciousness(e.target.value as EmergencyAssessmentInput['consciousness'])}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="alert">Alert & Oriented (A)</option>
                <option value="voice_responsive">Responds to Voice (V)</option>
                <option value="pain_responsive">Responds to Pain (P)</option>
                <option value="unresponsive">Unresponsive / Comatose (U)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Optional Vitals Telemetry */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-brand-600" />
                4. Patient Vitals Telemetry <span className="text-amber-600 font-semibold normal-case">(Optional)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowVitals(!showVitals)}
                className="text-xs text-brand-600 font-semibold hover:underline"
              >
                {showVitals ? 'Hide Vitals' : 'Add Vitals'}
              </button>
            </div>

            {showVitals && (
              <>
                <p className="text-[11px] text-slate-500">
                  Enter vitals if available. Leave values at 0 to skip. Vitals are not required for prioritization.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">Heart Rate (BPM)</span>
                  <input
                    type="number"
                    value={heartRate || ''}
                    onChange={e => setHeartRate(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-base font-bold font-mono text-slate-900 mt-1 focus:outline-none placeholder:text-slate-300"
                  />
                  <span className="text-[9px] text-slate-400">Normal: 60-100</span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">BP (Systolic / Diastolic)</span>
                  <div className="flex items-center gap-1 mt-1 font-mono text-base font-bold text-slate-900">
                    <input
                      type="number"
                      value={bpSystolic || ''}
                      onChange={e => setBpSystolic(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-12 focus:outline-none placeholder:text-slate-300"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={bpDiastolic || ''}
                      onChange={e => setBpDiastolic(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-12 focus:outline-none placeholder:text-slate-300"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">Normal: 120/80</span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">Oxygen SpO2 (%)</span>
                  <input
                    type="number"
                    value={spO2 || ''}
                    onChange={e => setSpO2(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className={`w-full text-base font-bold font-mono mt-1 focus:outline-none placeholder:text-slate-300 ${
                      spO2 > 0 && spO2 < 92 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400">Normal: 95-100%</span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">Temp (°C)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={temp || ''}
                    onChange={e => setTemp(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-base font-bold font-mono text-slate-900 mt-1 focus:outline-none placeholder:text-slate-300"
                  />
                  <span className="text-[9px] text-slate-400">Normal: 36.5-37.5</span>
                </div>
              </div>
              </>
            )}
          </div>

        {/* Section 5: Clinical Notes & Document Upload */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-700">Clinical Observations / EMS Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Additional symptoms, known allergies, medications..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />

          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <Upload className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="font-medium">Attached Medical Record/ECG:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
              {uploadedFile}
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {activeError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-800">Emergency Submission Error</p>
              <p className="text-xs text-red-700 mt-0.5">{activeError}</p>
            </div>
            <button
              type="button"
              onClick={() => { setSubmitError(null); clearEmergencyError(); }}
              className="p-1 text-red-500 hover:text-red-700 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Submit Action Button */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            * Evaluates urgency risk (0-100) &amp; determines essential emergency facility requirements.
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 font-extrabold rounded-xl text-sm shadow-xl transition transform ${
              isLoading
                ? 'bg-slate-400 text-white cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white shadow-red-600/30 active:scale-95'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Emergency Case…</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Analyze Emergency Prioritization</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
