import React from 'react';
import { AlertOctagon, ArrowRight, CheckCircle2, XCircle, Hospital as HospitalIcon, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReroutingAlertModal: React.FC = () => {
  const { isReroutingModalOpen, setIsReroutingModalOpen, rerouteData, setSelectedHospital } = useApp();

  if (!isReroutingModalOpen || !rerouteData) return null;

  const handleAcceptReroute = () => {
    setSelectedHospital(rerouteData.newHospital);
    setIsReroutingModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl animate-pulse">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-red-100">
                Automated Capacity Protection
              </div>
              <h3 className="text-lg font-bold">⚠️ Hospital Capacity Changed — Auto Re-Route</h3>
            </div>
          </div>
          <button
            onClick={() => setIsReroutingModalOpen(false)}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 leading-relaxed font-medium">
            {rerouteData.reason}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Previous Hospital (Saturated) */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-red-700">
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-500" /> Saturated Facility
                </span>
                <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded font-mono">ER Load: {rerouteData.previousHospital.currentERLoadPercent}%</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{rerouteData.previousHospital.name}</h4>
                <p className="text-xs text-slate-500">{rerouteData.previousHospital.address}</p>
              </div>
              <div className="text-xs space-y-1 text-slate-600 pt-2 border-t border-red-200/60">
                <div className="flex justify-between">
                  <span>Available ICU:</span>
                  <span className="font-bold text-red-600">0 Beds (FULL)</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Wait:</span>
                  <span className="font-bold text-red-600">{rerouteData.previousHospital.estimatedWaitTimeMinutes} mins</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-red-600">Capacity Critical ❌</span>
                </div>
              </div>
            </div>

            {/* New Recommended Hospital */}
            <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/30 space-y-3 relative shadow-md">
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                Recommended Alternative
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Optimal Routing
                </span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-mono">ER Load: {rerouteData.newHospital.currentERLoadPercent}%</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <HospitalIcon className="w-4 h-4 text-emerald-600" />
                  {rerouteData.newHospital.name}
                </h4>
                <p className="text-xs text-slate-500">{rerouteData.newHospital.address}</p>
              </div>
              <div className="text-xs space-y-1 text-slate-700 pt-2 border-t border-emerald-200/60">
                <div className="flex justify-between">
                  <span>Available ICU Beds:</span>
                  <span className="font-bold text-emerald-700">{rerouteData.newHospital.availableICUBeds} Beds Open ✓</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Travel Time:</span>
                  <span className="font-bold text-emerald-700">{rerouteData.newHospital.travelTimeMinutes} mins ETA</span>
                </div>
                <div className="flex justify-between">
                  <span>Emergency Wait Time:</span>
                  <span className="font-bold text-emerald-700">{rerouteData.newHospital.estimatedWaitTimeMinutes} mins</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic text-center">
            * Demonstration feature: Dynamic hospital re-routing prevents bottlenecking and ensures critical patients reach available ICU beds without detour delay.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsReroutingModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Dismiss
            </button>
            <button
              onClick={handleAcceptReroute}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
            >
              <span>Accept Reroute to {rerouteData.newHospital.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
