import React, { useState } from 'react';
import { ShieldAlert, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PreAlertModal } from './PreAlertModal';

export const PreAlertBanner: React.FC = () => {
  const { activePreAlert } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!activePreAlert || activePreAlert.status === 'Patient Arrived') {
    return null;
  }

  const isCritical = activePreAlert.severity === 'CRITICAL';
  const prep = activePreAlert.preparation;

  return (
    <>
      <div className={`w-full px-4 py-2.5 text-white shadow-md transition-all ${
        isCritical 
          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 animate-pulse-slow' 
          : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-lg animate-ping-slow">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2 font-bold tracking-wide">
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase">
                  🚨 PRE-ALERT: {activePreAlert.severity}
                </span>
                <span>{activePreAlert.patientName} ({activePreAlert.age}y)</span>
                <span className="hidden sm:inline text-white/80">• {activePreAlert.destinationHospitalName}</span>
              </div>
              <div className="text-[11px] text-white/90 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> ETA: <strong>{activePreAlert.etaMinutes} mins</strong>
                </span>
                <span className="hidden md:inline">
                  Ambulance: <strong>{activePreAlert.ambulanceVehicleNumber || 'KA-01-A17'}</strong>
                </span>
                <span className="hidden lg:inline">
                  Status: <strong className="underline">{activePreAlert.status}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {prep.readyForArrival ? (
              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-emerald-500/30 border border-emerald-300 text-white rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" /> Resources Ready
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-white/20 text-white rounded-lg text-xs font-medium">
                Preparation Pending
              </span>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white text-red-700 hover:bg-red-50 text-xs font-bold rounded-lg shadow transition transform active:scale-95"
            >
              <span>Manage Pre-Alert</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <PreAlertModal
        preAlert={activePreAlert}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
