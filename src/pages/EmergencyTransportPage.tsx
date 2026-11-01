import React, { useState, useEffect } from 'react';
import {
  Truck,
  Clock,
  Wind,
  Zap,
  Phone,
  User,
  Shield,
  Info,
  Siren,
  Settings2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InteractiveMap } from '../components/InteractiveMap';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { AmbulanceManagement, AmbulanceFleetEntry } from '../components/AmbulanceManagement';

interface EmergencyTransportPageProps {
  navigate: (path: string) => void;
}

const loadFleet = (hospitalId: string): AmbulanceFleetEntry[] => {
  try {
    const raw = localStorage.getItem(`mediflow_ambulance_fleet_${hospitalId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const EmergencyTransportPage: React.FC<EmergencyTransportPageProps> = ({ navigate }) => {
  const { ambulances, hospitals, dispatchAmbulanceForPatient, currentUser, selectedHospital } = useApp();
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>(ambulances[0]?.id || '');
  const [targetPatientName, setTargetPatientName] = useState('');
  const [targetHospitalId, setTargetHospitalId] = useState(hospitals[0]?.id || '');

  const isStaff = currentUser.role === 'hospital_staff' || currentUser.role === 'admin';
  const staffHospitalId = currentUser.hospitalId || selectedHospital?.hospitalId || selectedHospital?.id || '';
  const [staffFleet, setStaffFleet] = useState<AmbulanceFleetEntry[]>([]);

  useEffect(() => {
    if (staffHospitalId) setStaffFleet(loadFleet(staffHospitalId));
    const onStorage = () => setStaffFleet(loadFleet(staffHospitalId));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [staffHospitalId]);

  useEffect(() => {
    if (!staffHospitalId) return;
    const id = setInterval(() => setStaffFleet(loadFleet(staffHospitalId)), 1500);
    return () => clearInterval(id);
  }, [staffHospitalId]);

  const selectedAmbulance = ambulances.find(a => a.id === selectedAmbulanceId) || ambulances[0];

  const handleDispatch = (ambId: string) => {
    dispatchAmbulanceForPatient(ambId, targetPatientName, targetHospitalId);
    navigate('/journey');
  };

  const STATUS_COLOR: Record<string, string> = {
    'Available':   'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Dispatched':  'bg-amber-50 text-amber-700 border-amber-200',
    'En Route':    'bg-blue-50 text-blue-700 border-blue-200',
    'At Hospital': 'bg-slate-100 text-slate-600 border-slate-200',
    'Unavailable': 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
          <Truck className="w-3.5 h-3.5" />
          <span>Emergency Transport &amp; Telemetry Fleet</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Ambulance Fleet &amp; Driver Details
        </h1>
        <p className="text-xs text-slate-500">
          {isStaff
            ? 'Register ambulances with driver and contact details. Patients see this when an ambulance is dispatched.'
            : 'Track ambulance fleet, driver details, and dispatch status for your emergency response.'}
        </p>
      </div>

      <DisclaimerBanner compact />

      {/* ── HOSPITAL STAFF: Fleet Management Panel ── */}
      {isStaff && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white">
            <div className="w-9 h-9 bg-brand-100 text-brand-700 rounded-xl flex items-center justify-center shrink-0">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Manage Ambulance Fleet</h2>
              <p className="text-xs text-slate-500">Add vehicle numbers, driver names &amp; phone numbers for your hospital</p>
            </div>
          </div>
          <div className="p-5">
            <AmbulanceManagement
              hospitalId={staffHospitalId}
              hospitalName={currentUser.hospitalName || selectedHospital?.name}
            />
          </div>
        </div>
      )}

      {/* ── Registered Fleet — Driver Cards (visible to all) ── */}
      {staffFleet.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Siren className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Hospital Ambulance Fleet</h2>
            <span className="text-xs text-slate-500">— Driver &amp; Contact Details</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {staffFleet.map(entry => {
              const statusCls = STATUS_COLOR[entry.status] || 'bg-slate-100 text-slate-600 border-slate-200';
              return (
                <div key={entry.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-brand-200 transition">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-brand-700" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 font-mono tracking-wider">{entry.vehicleNumber}</span>
                        <p className="text-[10px] text-slate-500">{entry.type} Unit</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCls}`}>{entry.status}</span>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Driver</p>
                        <p className="text-sm font-semibold text-slate-900">{entry.driverName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-emerald-50 rounded-md flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Contact</p>
                        <a href={`tel:${entry.driverPhone}`} className="text-sm font-bold text-emerald-700 hover:underline">{entry.driverPhone}</a>
                      </div>
                    </div>
                    {entry.paramedicName && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 bg-blue-50 rounded-md flex items-center justify-center shrink-0">
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Paramedic</p>
                          <p className="text-sm font-semibold text-slate-900">{entry.paramedicName}</p>
                        </div>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-2">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Live Dispatch Fleet (mock/context data) ── */}
      {ambulances.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900">Live Dispatch Fleet</h2>
            </div>
            <span className="text-xs px-3 py-1 bg-white border border-[#dce4e3] text-[#0b5f58] rounded-lg font-bold font-mono">
              {ambulances.filter(a => a.status === 'Available').length} / {ambulances.length} Active
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              {ambulances.map(amb => {
                const isSelected = selectedAmbulance?.id === amb.id;
                const isAvailable = amb.status === 'Available';
                const isEnRoute = amb.status === 'En Route' || amb.status === 'Dispatched';
                return (
                  <div
                    key={amb.id}
                    onClick={() => setSelectedAmbulanceId(amb.id)}
                    className={`p-5 rounded-xl border transition cursor-pointer space-y-3.5 ${
                      isSelected
                        ? 'border-[#0f766e] bg-[#e6f2f1]/30 shadow-md ring-2 ring-[#0f766e]/20'
                        : 'border-[#dce4e3] bg-white hover:border-[#0f766e]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-[#14201f]">{amb.vehicleNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isAvailable
                              ? 'bg-[#e6f2f1] text-[#0b5f58]'
                              : isEnRoute
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>{amb.status}</span>
                        </div>
                        <p className="text-xs text-[#4b5b5a]">{amb.currentLocation.address}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold text-[#14201f] font-mono flex items-center justify-end gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#0f766e]" />
                          <span>{amb.etaMinutes}m ETA</span>
                        </div>
                        <span className="text-[10px] text-[#4b5b5a] font-medium">Standby ETA</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#dce4e3]">
                      <div>
                        <span className="text-[10px] text-[#4b5b5a] block font-medium">Paramedic</span>
                        <span className="font-semibold text-[#14201f]">{amb.paramedicName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#4b5b5a] block font-medium">Driver</span>
                        <span className="font-semibold text-[#14201f]">{amb.driverName}</span>
                      </div>
                      {amb.driverPhone && (
                        <div className="col-span-2">
                          <span className="text-[10px] text-[#4b5b5a] block font-medium">Driver Phone</span>
                          <a href={`tel:${amb.driverPhone}`} onClick={e => e.stopPropagation()} className="font-semibold text-emerald-700 hover:underline">{amb.driverPhone}</a>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        amb.advancedLifeSupport ? 'bg-[#0f766e] text-white' : 'bg-slate-100 text-[#14201f]'
                      }`}>
                        {amb.advancedLifeSupport ? 'ALS Advanced' : 'BLS Basic'}
                      </span>
                      {amb.oxygenSupport && <span className="px-2 py-0.5 bg-[#e6f2f1] text-[#0b5f58] rounded font-semibold flex items-center gap-1"><Wind className="w-3 h-3" /> Oxygen</span>}
                      {amb.ventilatorSupport && <span className="px-2 py-0.5 bg-slate-100 text-[#14201f] rounded font-semibold">Ventilator</span>}
                      {amb.defibrillator && <span className="px-2 py-0.5 bg-red-100 text-[#b42318] rounded font-semibold">Defibrillator</span>}
                    </div>
                    {isAvailable && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDispatch(amb.id); }}
                        className="w-full py-2 bg-[#0f766e] hover:bg-[#0b5f58] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        Dispatch {amb.vehicleNumber} for Emergency
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="lg:col-span-7">
              <InteractiveMap hospitals={hospitals} ambulances={ambulances} className="h-full min-h-[520px]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
