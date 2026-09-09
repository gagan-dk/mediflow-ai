import React from 'react';
import { 
  Navigation, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Hospital as HospitalIcon, 
  Truck, 
  UserCheck, 
  Activity, 
  MapPin, 
  PhoneCall, 
  ArrowRight,
  Sparkles,
  ChevronRight,
  Ticket
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { useHospitalSync } from '../hooks/useHospitalSync';

interface PatientJourneyPageProps {
  navigate: (path: string) => void;
}

export const PatientJourneyPage: React.FC<PatientJourneyPageProps> = ({ navigate }) => {
  const { 
    currentAssessmentInput, 
    assessmentResult, 
    selectedHospital, 
    hospitals, 
    activePreAlert, 
    activeAmbulance, 
    myQueueToken, 
    journeyStage, 
    advanceJourneyStage 
  } = useApp();

  const hosp = selectedHospital || hospitals[0];
  const hospId = hosp?.id || hosp?.hospitalId;
  
  const { hospital: syncedHospital, loading, lastUpdated, refetch } = useHospitalSync(hospId, { 
    autoRefresh: true, 
    ttl: 30000 
  });
  
  const displayHospital = syncedHospital || hosp;
  const patientName = currentAssessmentInput?.patientName || 'Ramesh Sundaram';
  const tokenNumber = myQueueToken?.tokenNumber || '#A104';

  const stages = [
    {
      id: 'assessed',
      title: 'Emergency Urgency Assessed',
      desc: 'AI Prioritization classified as CRITICAL (ESI Level 1). Required ICU & Oxygen detected.',
      time: '12 min ago',
      icon: ShieldAlert,
      done: true
    },
    {
      id: 'pre_alert_sent',
      title: '🚨 Hospital Pre-Alert Transmitted',
      desc: `Live telemetry sent to ${hosp.name}. Resuscitation bay & ICU Bed #ICU-06 reserved.`,
      time: '8 min ago',
      icon: HospitalIcon,
      done: journeyStage !== 'idle' && journeyStage !== 'assessed'
    },
    {
      id: 'ambulance_dispatched',
      title: 'Ambulance Dispatched & En Route',
      desc: `Unit ${activeAmbulance?.vehicleNumber || 'KA-01-A17'} with certified Paramedic Ananya Sharma en route.`,
      time: '5 min ago',
      icon: Truck,
      done: ['ambulance_dispatched', 'patient_enroute', 'arrived_hospital', 'in_queue', 'under_doctor_assessment', 'treatment', 'completed'].includes(journeyStage)
    },
    {
      id: 'arrived_hospital',
      title: 'Hospital Arrival & Handover',
      desc: `${hosp.name} triage team stationed at ambulance bay for rapid resuscitation handover.`,
      time: 'Est. in 6 mins',
      icon: MapPin,
      done: ['arrived_hospital', 'in_queue', 'under_doctor_assessment', 'treatment', 'completed'].includes(journeyStage)
    },
    {
      id: 'in_queue',
      title: `Priority Queue Token Assigned (${tokenNumber})`,
      desc: 'Patient registered in Emergency Intake System. Bypassed non-urgent queue.',
      time: 'Queue Position: #1',
      icon: Ticket,
      done: ['in_queue', 'under_doctor_assessment', 'treatment', 'completed'].includes(journeyStage)
    },
    {
      id: 'under_doctor_assessment',
      title: 'Attending Physician Evaluation',
      desc: 'Dr. Priya Rao (ER Specialist) initiated emergency cardiac diagnostic protocol.',
      time: 'Standby',
      icon: UserCheck,
      done: ['under_doctor_assessment', 'treatment', 'completed'].includes(journeyStage)
    },
    {
      id: 'treatment',
      title: 'Active Resuscitation & Treatment',
      desc: 'Cath Lab transfer / Stabilization in progress.',
      time: 'Final Stage',
      icon: Activity,
      done: journeyStage === 'treatment' || journeyStage === 'completed'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-bold">
            <Navigation className="w-3.5 h-3.5" />
            <span>Real-Time Patient Journey Protocol</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Emergency Journey
          </h1>
          <p className="text-xs text-slate-500">
            Live patient coordination tracking from first symptom assessment to hospital admission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={advanceJourneyStage}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white font-bold rounded-xl text-xs shadow-md transition transform active:scale-95"
          >
            <span>Simulate Advance Stage</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DisclaimerBanner compact />

      {/* Top Journey Summary Spotlight Card */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Active Patient Case</span>
            <h2 className="text-xl font-bold text-white">{patientName} (48y)</h2>
          </div>

            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Assigned Hospital</span>
                  <button
                    onClick={() => refetch()}
                    disabled={loading}
                    className="text-[9px] font-medium text-brand-400 hover:text-brand-300 flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <span className={loading ? 'animate-spin' : ''}>↻ Refresh</span>
                  </button>
                </div>
                <span className="font-bold text-sm text-brand-300">{displayHospital.name}</span>
                {lastUpdated && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] text-slate-500">
                      Last updated: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-center font-mono min-w-[80px]">
                <span className="text-[9px] text-slate-400 block">EST. ARRIVAL</span>
                <span className="text-xl font-extrabold text-emerald-400">{displayHospital.travelTimeMinutes} mins</span>
              </div>
            </div>
        </div>

        {/* Quick Driver / Paramedic Dispatch Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <span className="text-slate-400 text-[10px] font-medium block">Ambulance Vehicle</span>
            <div className="font-mono font-bold text-sm text-white">
              {activeAmbulance?.vehicleNumber || 'KA-01-A17'}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">ALS + High-flow Oxygen</span>
          </div>

          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <span className="text-slate-400 text-[10px] font-medium block">Assigned Paramedic</span>
            <div className="font-bold text-sm text-white">
              {activeAmbulance?.paramedicName || 'Ananya Sharma (EMT-P)'}
            </div>
            <span className="text-[10px] text-slate-400">Telemetry feed synced</span>
          </div>

          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] font-medium block">Direct Contact</span>
              <span className="font-mono font-bold text-xs text-white">+91 98450 12345</span>
            </div>
            <a
              href="tel:112"
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition"
              title="Call Ambulance Driver"
            >
              <PhoneCall className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* 7-Stage Step Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
          Emergency Care Progression Timeline
        </h3>

        <div className="space-y-6">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = stage.done;

            return (
              <div key={stage.id} className="relative flex items-start gap-4">
                {/* Vertical Line */}
                {idx < stages.length - 1 && (
                  <div className={`absolute left-5 top-10 bottom-0 w-0.5 -mb-6 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />
                )}

                {/* Node Icon */}
                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 shadow-sm border-2 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>

                {/* Stage Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className={`text-sm font-bold ${isCompleted ? 'text-slate-900' : 'text-slate-500'}`}>
                      {stage.title}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">{stage.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('/queue')}
          className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
        >
          <Ticket className="w-4 h-4 text-brand-600" />
          <span>View Live Queue Token</span>
        </button>

        <button
          onClick={() => navigate('/command-center')}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          <span>Hospital Staff View</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
