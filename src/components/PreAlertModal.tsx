import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  Clock, 
  UserCheck, 
  BedDouble, 
  DoorOpen, 
  X, 
  PhoneCall, 
  ShieldAlert 
} from 'lucide-react';
import { HospitalPreAlert } from '../types/preAlert';
import { useApp } from '../context/AppContext';

interface PreAlertModalProps {
  preAlert: HospitalPreAlert | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PreAlertModal: React.FC<PreAlertModalProps> = ({ preAlert, isOpen, onClose }) => {
  const { updatePreAlertPreparation, updatePreAlertStatus } = useApp();

  if (!isOpen || !preAlert) return null;

  const prep = preAlert.preparation;
  const isCritical = preAlert.severity === 'CRITICAL';

  const handleTogglePrep = (key: keyof HospitalPreAlert['preparation']) => {
    const nextVal = !prep[key];
    updatePreAlertPreparation(preAlert.id, key, nextVal);
  };

  const handleMarkArrived = () => {
    updatePreAlertStatus(preAlert.id, 'Patient Arrived');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Banner Header */}
        <div className={`px-6 py-4 text-white flex items-center justify-between ${
          isCritical ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-amber-600 to-orange-600'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl animate-pulse">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-red-100 flex items-center gap-2">
                <span>🚨 INCOMING {preAlert.severity} PATIENT</span>
                <span className="px-2 py-0.5 bg-white/25 text-white rounded text-[10px]">
                  ID: {preAlert.patientId}
                </span>
              </div>
              <h3 className="text-lg font-bold">Hospital Pre-Arrival Alert & Resource Booking</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium">Patient</span>
              <div className="font-bold text-slate-900 truncate">{preAlert.patientName}</div>
              <div className="text-[10px] text-slate-500">{preAlert.age} yrs • {preAlert.gender}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium">Estimated Arrival</span>
              <div className="font-bold text-red-600 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {preAlert.etaMinutes} mins
              </div>
              <div className="text-[10px] text-slate-500">Live GPS tracking</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium">Assigned Ambulance</span>
              <div className="font-bold text-brand-700 font-mono text-xs">{preAlert.ambulanceVehicleNumber || 'KA-01-A17'}</div>
              <div className="text-[10px] text-emerald-600 font-medium">ALS + Oxygen Ready</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium">Preparation Status</span>
              <div className="font-bold text-slate-900 text-xs">
                {prep.readyForArrival ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> READY FOR ARRIVAL
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> In Progress
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500">{preAlert.status}</div>
            </div>
          </div>

          {/* Vitals & Presentation */}
          <div className="p-4 bg-red-50/50 border border-red-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-red-800 uppercase tracking-wider">Clinical Presentation</span>
              <span className="text-slate-500 font-mono text-[11px]">Sent: {new Date(preAlert.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preAlert.symptoms.map((sym, i) => (
                <span key={i} className="px-2.5 py-1 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-semibold">
                  {sym.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            {preAlert.vitalsSummary && (
              <div className="text-xs text-slate-700 bg-white/70 p-2 rounded border border-red-100 font-mono">
                <strong>Vitals Telemetry:</strong> {preAlert.vitalsSummary}
              </div>
            )}
            {preAlert.notes && (
              <p className="text-xs text-slate-600 italic">
                "{preAlert.notes}"
              </p>
            )}
          </div>

          {/* Required Facilities checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Required Facilities Detected
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(preAlert.requiredFacilities)
                .filter(([, v]) => v)
                .map(([key]) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Hospital Staff Action Checklist */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Hospital Command Preparation Checklist
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">Click to confirm action</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Alert Received */}
              <button
                onClick={() => handleTogglePrep('alertReceived')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                  prep.alertReceived ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {prep.alertReceived ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-400" />}
                  <span className="font-semibold">1. Pre-Alert Received & Triage Team Notified</span>
                </div>
                <span className="text-[10px] font-bold">{prep.alertReceived ? 'DONE' : 'PENDING'}</span>
              </button>

              {/* ICU Bed Reserved */}
              <button
                onClick={() => handleTogglePrep('icuReserved')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                  prep.icuReserved ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BedDouble className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold">2. Reserve Emergency / ICU Bed (Bed #ICU-06 Locked)</span>
                </div>
                <span className="text-[10px] font-bold">{prep.icuReserved ? 'RESERVED ✓' : 'CLICK TO RESERVE'}</span>
              </button>

              {/* ER Room Assigned */}
              <button
                onClick={() => handleTogglePrep('emergencyRoomAssigned')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                  prep.emergencyRoomAssigned ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DoorOpen className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold">3. Assign Emergency Resuscitation Room (Resus Bay 1)</span>
                </div>
                <span className="text-[10px] font-bold">{prep.emergencyRoomAssigned ? 'ASSIGNED ✓' : 'ASSIGN ROOM'}</span>
              </button>

              {/* Doctor Notified */}
              <button
                onClick={() => handleTogglePrep('doctorNotified')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                  prep.doctorNotified ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold">4. Page Attending Physician (Dr. Priya Rao)</span>
                </div>
                <span className="text-[10px] font-bold">{prep.doctorNotified ? 'NOTIFIED ✓' : 'PAGE DOCTOR'}</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <a
                href="tel:112"
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                <PhoneCall className="w-3.5 h-3.5 text-brand-600" />
                <span>Call Paramedic</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close View
              </button>
              <button
                onClick={handleMarkArrived}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Patient Arrival</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
