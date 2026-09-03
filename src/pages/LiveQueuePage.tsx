import React, { useState } from 'react';
import { 
  Clock, 
  UserCheck, 
  Users, 
  ArrowUpRight, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Bell, 
  RefreshCw, 
  Sparkles,
  ArrowRight,
  Ticket
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { soundFX } from '../services/soundEffects';

interface LiveQueuePageProps {
  navigate: (path: string) => void;
}

export const LiveQueuePage: React.FC<LiveQueuePageProps> = ({ navigate }) => {
  const { 
    queuePatients, 
    myQueueToken, 
    selectedHospital, 
    hospitals, 
    updateQueuePatientStatus 
  } = useApp();

  const currentHospital = selectedHospital || hospitals[0];

  // Active Token data
  const userToken = myQueueToken || queuePatients.find(p => p.severity === 'CRITICAL' || p.severity === 'HIGH') || queuePatients[0];
  const activeServing = queuePatients.find(p => p.status === 'Treatment') || queuePatients[0];

  const criticalCount = queuePatients.filter(p => p.severity === 'CRITICAL').length;
  const highCount = queuePatients.filter(p => p.severity === 'HIGH').length;
  const moderateCount = queuePatients.filter(p => p.severity === 'MODERATE').length;
  const lowCount = queuePatients.filter(p => p.severity === 'LOW').length;

  const handleAdvanceQueue = () => {
    soundFX.playChime();
    if (activeServing) {
      updateQueuePatientStatus(activeServing.id, 'Discharged');
    }
  };

  if (queuePatients.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Live Emergency Queue &amp; Token Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Live Hospital Queue Tracker
            </h1>
            <p className="text-xs text-slate-500">
              No patients are currently registered in the queue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/assessment')}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Start Emergency Assessment</span>
            </button>
          </div>
        </div>

        <DisclaimerBanner compact />

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Active Queue</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Complete an emergency assessment to receive your priority queue token and view live wait times.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Live Emergency Queue &amp; Token Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Live Hospital Queue Tracker
          </h1>
          <p className="text-xs text-slate-500">
            Emergency department real-time patient queue for <strong>{currentHospital.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAdvanceQueue}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs shadow-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
            <span>Simulate Token Call</span>
          </button>
          <button
            onClick={() => navigate('/command-center')}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition"
          >
            <span>Staff Queue Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <DisclaimerBanner compact />

      {/* Patient Token Spotlight Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Your Token Block */}
          <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-xs text-brand-200">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Ticket className="w-4 h-4 text-brand-400" /> Your Assigned Token
              </span>
              <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-bold">
                {userToken.severity} PRIORITY
              </span>
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-tight text-white">
              {userToken.tokenNumber}
            </div>
            <div className="text-xs text-slate-300">
              Patient: <strong>{userToken.patientName}</strong> ({userToken.age}y)
            </div>
          </div>

          {/* Current Serving & Position */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Currently Serving in Resus/ER:</span>
              <span className="font-mono text-emerald-400 font-extrabold text-lg">
                {activeServing.tokenNumber}
              </span>
            </div>

            {/* Position and Wait Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Patients Ahead</span>
                <span className="text-2xl font-extrabold text-amber-400 font-mono">
                  {userToken.queuePosition}
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Estimated Wait</span>
                <span className="text-2xl font-extrabold text-sky-400 font-mono">
                  {userToken.estimatedWaitMinutes}m
                </span>
              </div>
            </div>
          </div>

          {/* Status Progression Card */}
          <div className="p-4 bg-brand-600/20 backdrop-blur-md rounded-2xl border border-brand-400/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-200 uppercase tracking-wider">Queue Status</span>
              <span className="px-2 py-0.5 bg-brand-500 text-white rounded text-[10px] font-bold animate-pulse">
                {userToken.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {userToken.severity === 'CRITICAL' 
                ? 'High-priority emergency bypass. Staff alerted for immediate resuscitation bay transfer.'
                : 'Your place in the emergency triage queue is dynamically secured with live telemetry.'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assigned Room: {userToken.assignedRoom || 'Resus Bay 1 Standby'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Severity Breakdown Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-red-800">
            <span>Critical (ESI-1)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-700">{criticalCount} Patients</div>
          <div className="text-[11px] text-red-600 font-medium">Immediate admission</div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>High Urgency (ESI-2)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-700">{highCount} Patients</div>
          <div className="text-[11px] text-amber-600 font-medium">&lt; 15 min wait</div>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-yellow-900">
            <span>Moderate (ESI-3)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-yellow-800">{moderateCount} Patients</div>
          <div className="text-[11px] text-yellow-700 font-medium">~30 min evaluation</div>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Low Acuity (ESI-4/5)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700">{lowCount} Patients</div>
          <div className="text-[11px] text-emerald-600 font-medium">Stable routine queue</div>
        </div>
      </div>

      {/* Real-time Queue Board Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Active Emergency Intake Queue</h3>
            <p className="text-xs text-slate-500">Live priority order updated per clinical risk scoring.</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-semibold">
            {queuePatients.length} Active Patients Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                <th className="pb-2.5">Token #</th>
                <th className="pb-2.5">Patient Name</th>
                <th className="pb-2.5">Severity</th>
                <th className="pb-2.5">Symptoms Presentation</th>
                <th className="pb-2.5">Wait Time</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">Assigned Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queuePatients.map((p) => {
                const isUser = myQueueToken?.id === p.id || p.tokenNumber === '#A104';
                return (
                  <tr key={p.id} className={`transition ${isUser ? 'bg-brand-50/80 font-semibold' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {isUser && <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />}
                        <span>{p.tokenNumber}</span>
                      </div>
                    </td>
                    <td className="py-3 font-medium text-slate-800">
                      {p.patientName} ({p.age}y)
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        p.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : p.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : p.severity === 'MODERATE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.severity}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 truncate max-w-xs">
                      {p.symptoms.join(', ')}
                    </td>
                    <td className="py-3 font-mono font-semibold text-slate-700">
                      {p.estimatedWaitMinutes} mins
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 font-mono">
                      {p.assignedRoom || 'Triage Waiting'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
