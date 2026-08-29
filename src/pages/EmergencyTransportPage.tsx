import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Wind, 
  Activity, 
  Zap, 
  CheckCircle2, 
  PhoneCall, 
  AlertTriangle,
  Play,
  Navigation2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InteractiveMap } from '../components/InteractiveMap';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface EmergencyTransportPageProps {
  navigate: (path: string) => void;
}

export const EmergencyTransportPage: React.FC<EmergencyTransportPageProps> = ({ navigate }) => {
  const { ambulances, hospitals, dispatchAmbulanceForPatient } = useApp();
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>(ambulances[0]?.id || '');
  const [targetPatientName, setTargetPatientName] = useState('Ramesh Sundaram (Critical Cardiac)');
  const [targetHospitalId, setTargetHospitalId] = useState('hosp-citycare');

  const selectedAmbulance = ambulances.find(a => a.id === selectedAmbulanceId) || ambulances[0];

  const handleDispatch = (ambId: string) => {
    dispatchAmbulanceForPatient(ambId, targetPatientName, targetHospitalId);
    navigate('/journey');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            <Truck className="w-3.5 h-3.5" />
            <span>Emergency Transport &amp; Telemetry Fleet</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ambulance Fleet Dispatch &amp; Capability Matching
          </h1>
          <p className="text-xs text-slate-500">
            Matching patients to ALS/BLS ambulances equipped with high-flow oxygen, ventilators, and telemetry.
          </p>
        </div>
      </div>

      <DisclaimerBanner compact />

      {/* Ambulance Capability Matching Highlight */}
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-600 text-white rounded-xl">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sky-900">Ambulance Capability Match Protocol</div>
            <p className="text-slate-600">
              Patients with acute respiratory failure or cardiac arrest are paired exclusively with Advanced Life Support (ALS) units featuring certified paramedics and oxygen.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-white border border-sky-300 text-sky-800 rounded-lg font-bold font-mono">
          5 / 5 Fleet Active
        </span>
      </div>

      {/* Main Grid: Ambulance Fleet List + Interactive GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Fleet List */}
        <div className="lg:col-span-5 space-y-4">
          {ambulances.map(amb => {
            const isSelected = selectedAmbulance?.id === amb.id;
            const isAvailable = amb.status === 'Available';
            const isEnRoute = amb.status === 'En Route' || amb.status === 'Dispatched';

            return (
              <div
                key={amb.id}
                onClick={() => setSelectedAmbulanceId(amb.id)}
                className={`p-5 rounded-2xl border transition cursor-pointer space-y-3.5 ${
                  isSelected
                    ? 'bg-white border-2 border-brand-500 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-slate-900">
                        {amb.vehicleNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isAvailable ? 'bg-emerald-100 text-emerald-800' :
                        isEnRoute ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {amb.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{amb.currentLocation.address}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900 font-mono flex items-center justify-end gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>{amb.etaMinutes}m ETA</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Standby ETA</span>
                  </div>
                </div>

                {/* Paramedic & Driver */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Paramedic</span>
                    <span className="font-semibold text-slate-800">{amb.paramedicName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Driver</span>
                    <span className="font-semibold text-slate-800">{amb.driverName}</span>
                  </div>
                </div>

                {/* Capability Badges */}
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    amb.advancedLifeSupport ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {amb.advancedLifeSupport ? 'ALS Advanced' : 'BLS Basic'}
                  </span>
                  {amb.oxygenSupport && (
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-semibold flex items-center gap-1">
                      <Wind className="w-3 h-3 text-sky-600" /> Oxygen Support
                    </span>
                  )}
                  {amb.ventilatorSupport && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold">
                      Ventilator Onboard
                    </span>
                  )}
                  {amb.defibrillator && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold">
                      Defibrillator
                    </span>
                  )}
                </div>

                {/* Dispatch Button */}
                {isAvailable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDispatch(amb.id);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    Dispatch {amb.vehicleNumber} for Emergency
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Interactive Map */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveMap
            hospitals={hospitals}
            ambulances={ambulances}
            className="h-full min-h-[520px]"
          />
        </div>
      </div>
    </div>
  );
};
