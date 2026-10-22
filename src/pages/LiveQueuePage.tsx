import React, { useState, useEffect, useCallback } from 'react';
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
  Ticket,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { soundFX } from '../services/soundEffects';
import type { QueueTokenView, BackendQueueStatus } from '../types/api';
import type { QueuePatient, QueueStatus } from '../types/queue';
import type { SeverityLevel } from '../types/hospital';

interface LiveQueuePageProps {
  navigate: (path: string) => void;
}

const mapBackendSeverity = (s: string | null): SeverityLevel => {
  if (s === 'CRITICAL' || s === 'HIGH' || s === 'MODERATE' || s === 'LOW') return s;
  return 'MODERATE';
};

const mapBackendStatus = (s: BackendQueueStatus): QueueStatus => {
  switch (s) {
    case 'WAITING': return 'Waiting';
    case 'CALLED': return 'Under Assessment';
    case 'IN_PROGRESS': return 'Treatment';
    case 'COMPLETED': return 'Discharged';
    case 'CANCELLED': return 'Discharged';
    default: return 'Waiting';
  }
};

const backendTokenToQueuePatient = (token: QueueTokenView): QueuePatient => ({
  id: token.id,
  tokenNumber: token.token_number,
  patientName: token.patient_name || 'Unknown Patient',
  age: token.case_age || 0,
  gender: 'male',
  severity: mapBackendSeverity(token.case_severity),
  symptoms: token.reported_symptoms ? token.reported_symptoms.split(',').map(s => s.trim()) : [],
  arrivalTime: token.created_at,
  estimatedWaitMinutes: 0,
  status: mapBackendStatus(token.status),
  assignedDoctor: token.status === 'IN_PROGRESS' ? 'Assigned' : undefined,
  assignedRoom: token.status === 'IN_PROGRESS' ? 'Treatment Bay' : undefined,
  hospitalId: token.hospital_id,
  queuePosition: token.queue_position,
});

export const LiveQueuePage: React.FC<LiveQueuePageProps> = ({ navigate }) => {
  const { 
    queuePatients, 
    myQueueToken, 
    selectedHospital, 
    hospitals, 
    updateQueuePatientStatus,
    currentQueueToken,
    refreshQueueForHospital
  } = useApp();

  const [backendQueue, setBackendQueue] = useState<QueueTokenView[]>([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const currentHospital = selectedHospital || hospitals[0];
  const hospitalId = currentQueueToken?.hospital_id || currentHospital?.id;

  const fetchBackendQueue = useCallback(async () => {
    if (!hospitalId) return;
    setBackendLoading(true);
    setBackendError(null);
    try {
      const items = await refreshQueueForHospital(hospitalId);
      setBackendQueue(items);
      setLastRefresh(new Date());
    } catch {
      setBackendError('Unable to fetch queue from server. Showing local data.');
    } finally {
      setBackendLoading(false);
    }
  }, [hospitalId, refreshQueueForHospital]);

  useEffect(() => {
    if (hospitalId) {
      fetchBackendQueue();
    }
  }, [hospitalId, fetchBackendQueue]);

  const hasBackendData = backendQueue.length > 0;
  const displayQueue: QueuePatient[] = hasBackendData
    ? backendQueue.map(backendTokenToQueuePatient)
    : queuePatients;

  const userBackendToken = currentQueueToken
    ? backendQueue.find(t => t.id === currentQueueToken.id)
    : null;
  const userToken = myQueueToken || displayQueue.find(p => p.severity === 'CRITICAL' || p.severity === 'HIGH') || displayQueue[0];
  const activeServing = displayQueue.find(p => p.status === 'Treatment' || p.status === 'Under Assessment') || displayQueue[0];

  const criticalCount = displayQueue.filter(p => p.severity === 'CRITICAL').length;
  const highCount = displayQueue.filter(p => p.severity === 'HIGH').length;
  const moderateCount = displayQueue.filter(p => p.severity === 'MODERATE').length;
  const lowCount = displayQueue.filter(p => p.severity === 'LOW').length;

  const handleAdvanceQueue = () => {
    soundFX.playChime();
    if (activeServing) {
      updateQueuePatientStatus(activeServing.id, 'Discharged');
    }
  };

  if (displayQueue.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
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
              {hasBackendData ? 'No queue tokens found for this hospital.' : 'No patients are currently registered in the queue.'}
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
            Emergency department real-time patient queue for <strong>{currentHospital?.name || 'Hospital'}</strong>.
            {hasBackendData && <span className="text-emerald-600 ml-1">Backend connected</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBackendQueue}
            disabled={backendLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#dce4e3] text-[#14201f] font-semibold rounded-lg text-xs shadow-2xs transition-colors"
          >
            {backendLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-[#0f766e] animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[#0f766e]" />
            )}
            <span>Refresh Queue</span>
          </button>
          <button
            onClick={handleAdvanceQueue}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#dce4e3] text-[#14201f] font-semibold rounded-lg text-xs shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0f766e]" />
            <span>Simulate Token Call</span>
          </button>
          <button
            onClick={() => navigate('/command-center')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0f766e] hover:bg-[#0b5f58] text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
          >
            <span>Staff Queue Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <DisclaimerBanner compact />

      {/* Backend Error Banner */}
      {backendError && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 flex-1">{backendError}</p>
          <button onClick={() => setBackendError(null)} className="text-amber-500 hover:text-amber-700">
            <span className="sr-only">Dismiss</span>×
          </button>
        </div>
      )}

      {/* Patient Token Spotlight Banner */}
      {userToken && (
        <div className="bg-white text-[#14201f] rounded-xl p-6 sm:p-7 shadow-xs border border-[#dce4e3] relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Your Token Block */}
            <div className="p-5 bg-[#e6f2f1] rounded-lg border border-[#dce4e3] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#0b5f58]">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Ticket className="w-4 h-4 text-[#0f766e]" /> Your Assigned Token
                </span>
                <span className="px-2 py-0.5 bg-[#b42318] text-white rounded text-[10px] font-bold">
                  {userToken.severity} PRIORITY
                </span>
              </div>
              <div className="text-4xl font-extrabold font-mono tracking-tight text-[#0f766e]">
                {userToken.tokenNumber}
              </div>
              <div className="text-xs text-[#4b5b5a]">
                Patient: <strong className="text-[#14201f]">{userToken.patientName}</strong> ({userToken.age}y)
              </div>
              {hasBackendData && userBackendToken && (
                <div className="text-[10px] text-[#4b5b5a] mt-1">
                  Backend Status: <span className="text-[#1b6e3c] font-semibold">{userBackendToken.status}</span>
                </div>
              )}
            </div>

            {/* Current Serving & Position */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#4b5b5a] font-medium">Currently Serving in Resus/ER:</span>
                <span className="font-mono text-[#1b6e3c] font-extrabold text-lg">
                  {activeServing?.tokenNumber || '—'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#f7f9f9] rounded-lg border border-[#dce4e3] text-center">
                  <span className="text-[10px] text-[#4b5b5a] uppercase tracking-wider block">Patients Ahead</span>
                  <span className="text-2xl font-extrabold text-[#5a3b00] font-mono">
                    {userToken.queuePosition}
                  </span>
                </div>
                <div className="p-3 bg-[#f7f9f9] rounded-lg border border-[#dce4e3] text-center">
                  <span className="text-[10px] text-[#4b5b5a] uppercase tracking-wider block">Estimated Wait</span>
                  <span className="text-2xl font-extrabold text-[#0f766e] font-mono">
                    {userToken.estimatedWaitMinutes}m
                  </span>
                </div>
              </div>
            </div>

            {/* Status Progression Card */}
            <div className="p-4 bg-[#f7f9f9] rounded-lg border border-[#dce4e3] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#14201f] uppercase tracking-wider">Queue Status</span>
                <span className="px-2 py-0.5 bg-[#0f766e] text-white rounded text-[10px] font-bold">
                  {userToken.status}
                </span>
              </div>
              <p className="text-xs text-[#4b5b5a] leading-relaxed">
                {userToken.severity === 'CRITICAL' 
                  ? 'High-priority emergency bypass. Staff alerted for immediate resuscitation bay transfer.'
                  : 'Your place in the emergency triage queue is dynamically secured with live telemetry.'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#1b6e3c] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1b6e3c]" />
                <span>Assigned Room: {userToken.assignedRoom || 'Triage Waiting'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Severity Breakdown Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-red-800">
            <span>Critical (ESI-1)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-700">{criticalCount} Patients</div>
          <div className="text-[11px] text-red-600 font-medium">Immediate admission</div>
        </div>

        <div className="p-4 bg-[#fff4db] border border-[#dce4e3] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-[#5a3b00]">
            <span>High Urgency (ESI-2)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#5a3b00]">{highCount} Patients</div>
          <div className="text-[11px] text-[#5a3b00] font-medium">&lt; 15 min wait</div>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-yellow-900">
            <span>Moderate (ESI-3)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-yellow-800">{moderateCount} Patients</div>
          <div className="text-[11px] text-yellow-700 font-medium">~30 min evaluation</div>
        </div>

        <div className="p-4 bg-[#eef7ee] border border-[#1b6e3c]/20 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-[#1b6e3c]">
            <span>Low Acuity (ESI-4/5)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#1b6e3c]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#1b6e3c]">{lowCount} Patients</div>
          <div className="text-[11px] text-[#1b6e3c] font-medium">Stable routine queue</div>
        </div>
      </div>

      {/* Real-time Queue Board Table */}
      <div className="bg-white rounded-xl border border-[#dce4e3] shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Active Emergency Intake Queue</h3>
            <p className="text-xs text-slate-500">
              {hasBackendData ? 'Live priority order from backend server.' : 'Live priority order updated per clinical risk scoring.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-[10px] text-slate-400 font-mono">
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-semibold">
              {displayQueue.length} Active Patients Registered
            </span>
          </div>
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
              {displayQueue.map((p) => {
                const isUser = myQueueToken?.id === p.id || (currentQueueToken && p.id === currentQueueToken.id);
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
                      {p.symptoms.join(', ') || 'Not reported'}
                    </td>
                    <td className="py-3 font-mono font-semibold text-slate-700">
                      {p.estimatedWaitMinutes} mins
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        p.status === 'Waiting' ? 'bg-slate-100 text-slate-700' :
                        p.status === 'Under Assessment' ? 'bg-amber-100 text-amber-800' :
                        p.status === 'Treatment' ? 'bg-brand-100 text-brand-800' :
                        p.status === 'Admitted' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
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
