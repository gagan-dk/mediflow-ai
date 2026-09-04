import React, { useState } from 'react';
import {
  BedDouble,
  Activity,
  HeartPulse,
  Ambulance,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Save,
  RotateCcw
} from 'lucide-react';
import { Hospital } from '../types/hospital';
import { useApp } from '../context/AppContext';

interface HospitalOperationalDataEditorProps {
  hospital: Hospital;
}

interface MetricFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  accent?: string;
  hint?: string;
}

const MetricField: React.FC<MetricFieldProps> = ({ label, value, onChange, min = 0, max = 999, accent = 'text-slate-900', hint }) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
    <label className="text-[11px] font-semibold text-slate-500 block mb-1">{label}</label>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
      className={`w-full text-lg font-bold font-mono ${accent} bg-transparent focus:outline-none`}
    />
    {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
  </div>
);

/**
 * Hospital Staff → Operational Data editor.
 *
 * Every value written here goes through the centralized hospital record
 * (hospitalService) so the Patient Find Hospital view and the AI ranking
 * re-compute from the exact same numbers, live, without a page refresh.
 */
export const HospitalOperationalDataEditor: React.FC<HospitalOperationalDataEditorProps> = ({ hospital }) => {
  const {
    updateHospital,
    updateHospitalICU,
    updateHospitalBeds,
    updateHospitalEmergencyRooms,
    updateHospitalQueue,
    updateHospitalAmbulances,
    updateHospitalCapabilities,
    getHospitalById,
    addNotification
  } = useApp();

  const [icuTotal, setIcuTotal] = useState(hospital.icu?.total ?? hospital.totalICUBeds ?? 0);
  const [icuAvailable, setIcuAvailable] = useState(hospital.icu?.available ?? hospital.availableICUBeds ?? 0);
  const [bedTotal, setBedTotal] = useState(hospital.beds?.total ?? hospital.totalBeds ?? 0);
  const [bedAvailable, setBedAvailable] = useState(hospital.beds?.available ?? hospital.availableBeds ?? 0);
  const [erTotal, setErTotal] = useState(hospital.emergencyRooms?.total ?? hospital.totalEmergencyBeds ?? 0);
  const [erAvailable, setErAvailable] = useState(hospital.emergencyRooms?.available ?? hospital.availableEmergencyBeds ?? 0);
  const [waitMinutes, setWaitMinutes] = useState(hospital.queue?.estimatedWaitTimeMinutes ?? hospital.estimatedWaitTimeMinutes ?? 0);
  const [erLoad, setErLoad] = useState(hospital.queue?.currentERLoadPercent ?? hospital.currentERLoadPercent ?? 0);
  const [ambulancesAvailable, setAmbulancesAvailable] = useState(hospital.ambulances?.available ?? hospital.ambulanceAvailableCount ?? 0);
  const [facilities, setFacilities] = useState({
    emergencyDepartment: hospital.emergencyAvailable ?? false,
    icu: hospital.icuAvailable ?? false,
    oxygenSupport: hospital.oxygenSupport ?? false,
    ventilator: hospital.ventilatorAvailability ?? false,
    traumaCare: (hospital.traumaLevel ?? 0) > 0,
    cardiacCare: hospital.cardiacCareAvailable ?? false,
    strokeUnit: hospital.strokeUnitAvailable ?? false,
    orthopedicSurgeon: hospital.orthopedicAvailable ?? false,
    pediatricEmergency: hospital.pediatricAvailable ?? false,
  });

  const toggleFacility = (key: keyof typeof facilities) => {
    setFacilities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    // ICU
    updateHospitalICU(hospital.hospitalId, {
      total: icuTotal,
      available: Math.min(icuAvailable, icuTotal),
      occupied: Math.max(0, icuTotal - icuAvailable),
      reserved: 0,
    });
    // General beds
    updateHospitalBeds(hospital.hospitalId, {
      total: bedTotal,
      available: Math.min(bedAvailable, bedTotal),
      occupied: Math.max(0, bedTotal - bedAvailable),
      reserved: 0,
    });
    // Emergency rooms
    updateHospitalEmergencyRooms(hospital.hospitalId, {
      total: erTotal,
      available: Math.min(erAvailable, erTotal),
      occupied: Math.max(0, erTotal - erAvailable),
      cleaning: 0,
    });
    // Queue / wait time / ER load
    updateHospitalQueue(hospital.hospitalId, {
      estimatedWaitTimeMinutes: waitMinutes,
      currentERLoadPercent: Math.min(100, erLoad),
      totalPatients: Math.max(0, Math.round((erLoad / 100) * (erTotal + icuTotal))),
    });
    // Ambulances
    updateHospitalAmbulances(hospital.hospitalId, {
      available: ambulancesAvailable,
      total: Math.max(ambulancesAvailable, hospital.ambulances?.total ?? ambulancesAvailable),
    });
    // Facilities
    updateHospitalCapabilities(hospital.hospitalId, facilities);
    // Ensure the record is flagged as staff-verified operational data
    const latest = updateHospital({
      ...hospital,
      operationalDataAvailable: true,
    });

    addNotification({
      title: '✅ Hospital Operational Data Saved',
      message: `${latest.name}: ${icuAvailable} ICU beds, ${bedAvailable} general beds, ${erAvailable} emergency rooms — now live for patients & AI ranking.`,
      type: 'system',
    });
  };

  const handleResetToEmpty = () => {
    setIcuAvailable(0);
    setBedAvailable(0);
    setErAvailable(0);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          These values are written to the single centralized hospital record for <strong>{hospital.name}</strong>.
          Patients at &quot;Find Hospital&quot; and the AI ranking engine read the exact same numbers instantly.
        </span>
      </div>

      {/* Beds & ICU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <BedDouble className="w-4 h-4 text-brand-600" />
          Beds &amp; ICU Capacity
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricField label="Total ICU Beds" value={icuTotal} onChange={setIcuTotal} accent="text-purple-700" />
          <MetricField label="Available ICU Beds" value={icuAvailable} onChange={setIcuAvailable} accent="text-purple-700" hint="Shown to patients" />
          <MetricField label="Total General Beds" value={bedTotal} onChange={setBedTotal} accent="text-emerald-700" />
          <MetricField label="Available General Beds" value={bedAvailable} onChange={setBedAvailable} accent="text-emerald-700" hint="Shown to patients" />
        </div>
      </div>

      {/* Emergency Rooms */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <HeartPulse className="w-4 h-4 text-red-600" />
          Emergency Rooms
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricField label="Total ER Rooms" value={erTotal} onChange={setErTotal} accent="text-red-700" />
          <MetricField label="Available ER Rooms" value={erAvailable} onChange={setErAvailable} accent="text-red-700" hint="Shown to patients" />
        </div>
      </div>

      {/* Queue & Ambulances */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Clock className="w-4 h-4 text-amber-600" />
          Queue &amp; Ambulances
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricField label="Est. Wait (mins)" value={waitMinutes} onChange={setWaitMinutes} accent="text-amber-700" />
          <MetricField label="ER Load (%)" value={erLoad} onChange={setErLoad} min={0} max={100} accent="text-amber-700" />
          <MetricField label="Ambulances Available" value={ambulancesAvailable} onChange={setAmbulancesAvailable} accent="text-sky-700" />
        </div>
      </div>

      {/* Emergency Facilities */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Activity className="w-4 h-4 text-emerald-600" />
          Emergency Facilities
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(facilities) as Array<keyof typeof facilities>).map(key => (
            <button
              key={key}
              onClick={() => toggleFacility(key)}
              className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                facilities[key]
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <CheckCircle2 className={`w-4 h-4 ${facilities[key] ? 'text-emerald-600' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleResetToEmpty}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Zero Out Availability
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-600/20 transition"
        >
          <Save className="w-4 h-4" />
          Save &amp; Publish to Patients
        </button>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 flex items-center gap-2">
        <Ambulance className="w-4 h-4 text-sky-600 shrink-0" />
        <span>
          Live sync: after saving, patients immediately see {icuAvailable} ICU, {bedAvailable} beds, {erAvailable} ER rooms,
          {waitMinutes}m wait and {ambulancesAvailable} ambulances for this hospital.
        </span>
      </div>
    </div>
  );
};