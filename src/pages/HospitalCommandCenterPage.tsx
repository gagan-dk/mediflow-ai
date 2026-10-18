import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Users, 
  BedDouble, 
  Clock, 
  Truck, 
  ShieldAlert, 
  CheckCircle2, 
  UserCheck, 
  Plus, 
  Filter, 
  AlertTriangle, 
  Check, 
  Activity, 
  RefreshCw, 
  Eye, 
  DoorOpen, 
  Layers, 
  ArrowRight,
  TrendingUp,
  PieChart as PieChartIcon,
  MapPin,
  Loader2,
  Building2,
  Settings,
  X,
  Lock,
  Hospital as HospitalIcon,
  Edit3,
  Search,
  Sparkles,
  Stethoscope,
  SlidersHorizontal,
  HeartPulse
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { PreAlertModal } from '../components/PreAlertModal';
import { HospitalOperationalDataEditor } from '../components/HospitalOperationalDataEditor';
import { HospitalPreAlert } from '../types/preAlert';
import { QueueStatus } from '../types/queue';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { mapService } from '../services/map/mapService';
import { getAllQuotaStatuses } from '../services/map/apiQuotaService';
import type { QueueTokenView, BackendQueueStatus } from '../types/api';
import type { QueuePatient } from '../types/queue';
import type { SeverityLevel, Bed } from '../types/hospital';
import { NOT_AVAILABLE_MESSAGE } from '../services/mockData';

const mapBackendSeverity = (s: string | null): SeverityLevel => {
  if (s === 'CRITICAL' || s === 'HIGH' || s === 'MODERATE' || s === 'LOW') return s;
  return 'MODERATE';
};

const mapBackendQueueStatus = (s: BackendQueueStatus): QueueStatus => {
  switch (s) {
    case 'WAITING': return 'Waiting';
    case 'CALLED': return 'Under Assessment';
    case 'IN_PROGRESS': return 'Treatment';
    case 'COMPLETED': return 'Discharged';
    case 'CANCELLED': return 'Discharged';
    default: return 'Waiting';
  }
};

interface BedManagementModalProps {
  bed: Bed | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bedId: string, status: Bed['status'], patientName?: string, severity?: SeverityLevel, assignedDoctor?: string) => void;
}

const BedManagementModal: React.FC<BedManagementModalProps> = ({ bed, isOpen, onClose, onSave }) => {
  const [status, setStatus] = useState<Bed['status']>('Available');
  const [patientName, setPatientName] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('MODERATE');
  const [assignedDoctor, setAssignedDoctor] = useState('');

  useEffect(() => {
    if (bed) {
      setStatus(bed.status);
      setPatientName(bed.patientName || '');
      setSeverity(bed.severity || (bed.wardType === 'ICU' ? 'CRITICAL' : 'HIGH'));
      setAssignedDoctor(bed.assignedDoctor || '');
    }
  }, [bed]);

  if (!isOpen || !bed) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      bed.id,
      status,
      status === 'Occupied' || status === 'Reserved' ? patientName : undefined,
      status === 'Occupied' ? severity : undefined,
      assignedDoctor || undefined
    );
    onClose();
  };

  const handleQuickClear = () => {
    setStatus('Cleaning');
    setPatientName('');
    onSave(bed.id, 'Cleaning', undefined, undefined, undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Bed Allocation: {bed.bedNumber}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{bed.wardType} Ward</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bed Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Available', 'Occupied', 'Cleaning', 'Reserved'] as const).map(s => {
                const isSelected = status === s;
                const colors = {
                  Available: 'border-emerald-500 bg-emerald-50 text-emerald-800',
                  Occupied: 'border-red-500 bg-red-50 text-red-800',
                  Cleaning: 'border-amber-500 bg-amber-50 text-amber-800',
                  Reserved: 'border-purple-500 bg-purple-50 text-purple-800'
                };
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      isSelected ? `${colors[s]} shadow-xs` : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    <span>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {(status === 'Occupied' || status === 'Reserved') && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Assigned Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar or Emergency Inflow"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              {status === 'Occupied' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Triage Severity</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as SeverityLevel[]).map(sev => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                          severity === sev
                            ? sev === 'CRITICAL' ? 'bg-red-500 text-white border-red-600' :
                              sev === 'HIGH' ? 'bg-orange-500 text-white border-orange-600' :
                              sev === 'MODERATE' ? 'bg-yellow-500 text-slate-900 border-yellow-600' :
                              'bg-emerald-500 text-white border-emerald-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Attending Doctor / Bay Lead</label>
                <input
                  type="text"
                  value={assignedDoctor}
                  onChange={e => setAssignedDoctor(e.target.value)}
                  placeholder="e.g. Dr. A. Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {bed.status === 'Occupied' && (
              <button
                type="button"
                onClick={handleQuickClear}
                className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
              >
                Discharge &amp; Clean
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition"
              >
                Update Bed State
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface WardStateModalProps {
  wardType: Bed['wardType'] | null;
  hospitalName: string;
  bedsInWard: Bed[];
  isOpen: boolean;
  onClose: () => void;
  onApplyWardState: (wardType: Bed['wardType'], newBedStatus: Bed['status']) => void;
}

const WardStateModal: React.FC<WardStateModalProps> = ({
  wardType,
  hospitalName,
  bedsInWard,
  isOpen,
  onClose,
  onApplyWardState
}) => {
  if (!isOpen || !wardType) return null;

  const total = bedsInWard.length;
  const avail = bedsInWard.filter(b => b.status === 'Available').length;
  const occ = bedsInWard.filter(b => b.status === 'Occupied').length;
  const clean = bedsInWard.filter(b => b.status === 'Cleaning').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Manage {wardType} Ward Operational State
              </h3>
              <p className="text-xs text-slate-500 font-medium">{hospitalName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Ward Metrics */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Total Beds</div>
            <div className="text-base font-extrabold text-slate-900">{total}</div>
          </div>
          <div>
            <div className="text-[11px] text-emerald-600 font-medium">Available</div>
            <div className="text-base font-extrabold text-emerald-700">{avail}</div>
          </div>
          <div>
            <div className="text-[11px] text-red-600 font-medium">Occupied</div>
            <div className="text-base font-extrabold text-red-700">{occ}</div>
          </div>
          <div>
            <div className="text-[11px] text-amber-600 font-medium">Cleaning</div>
            <div className="text-base font-extrabold text-amber-700">{clean}</div>
          </div>
        </div>

        {/* Change Ward Operational State */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Click to Change {wardType} Ward State:
          </label>

          <div className="space-y-2">
            <button
              onClick={() => {
                onApplyWardState(wardType, 'Available');
                onClose();
              }}
              className="w-full text-left p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900 group-hover:text-emerald-950">
                    Accepting Patients (Set All Available)
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Set all {total} {wardType} beds to Available for immediate emergency intake.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 px-2.5 py-1 bg-white rounded-lg border border-emerald-200">
                Apply
              </span>
            </button>

            <button
              onClick={() => {
                onApplyWardState(wardType, 'Occupied');
                onClose();
              }}
              className="w-full text-left p-3 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100/80 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-900 group-hover:text-red-950">
                    Full Capacity / Divert Protocol
                  </div>
                  <div className="text-[11px] text-red-700">
                    Flag all {wardType} beds as Occupied to signal zero intake capacity.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-red-700 px-2.5 py-1 bg-white rounded-lg border border-red-200">
                Apply
              </span>
            </button>

            <button
              onClick={() => {
                onApplyWardState(wardType, 'Cleaning');
                onClose();
              }}
              className="w-full text-left p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900 group-hover:text-amber-950">
                    Ward Sanitization &amp; Turnover
                  </div>
                  <div className="text-[11px] text-amber-700">
                    Mark all {wardType} beds as Cleaning for housekeeping sanitation.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700 px-2.5 py-1 bg-white rounded-lg border border-amber-200">
                Apply
              </span>
            </button>

            <button
              onClick={() => {
                onApplyWardState(wardType, 'Reserved');
                onClose();
              }}
              className="w-full text-left p-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-900 group-hover:text-purple-950">
                    Emergency Surge Reservation
                  </div>
                  <div className="text-[11px] text-purple-700">
                    Reserve all {wardType} beds exclusively for inbound ambulances &amp; pre-alerts.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-700 px-2.5 py-1 bg-white rounded-lg border border-purple-200">
                Apply
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const HospitalCommandCenterPage: React.FC = () => {
  const { 
    currentUser, 
    hospitals, 
    selectedHospital,
    setSelectedHospital,
    beds, 
    toggleBedStatus, 
    updateBedStatus,
    updateWardBedStatus,
    queuePatients, 
    updateQueuePatientStatus, 
    preAlerts, 
    ambulances,
    fetchStaffQueue,
    updateQueueTokenStatusByStaff,
    addNotification
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'beds' | 'analytics'>('overview');
  const [selectedPreAlertForModal, setSelectedPreAlertForModal] = useState<HospitalPreAlert | null>(null);
  const [isBedEditModalOpen, setIsBedEditModalOpen] = useState(false);

  // Bed & Ward interactive matrix state
  const [selectedWardTab, setSelectedWardTab] = useState<'ALL' | 'ICU' | 'Emergency' | 'General' | 'Trauma' | 'Cardiac'>('ALL');
  const [bedStatusFilter, setBedStatusFilter] = useState<'ALL' | 'Available' | 'Occupied' | 'Cleaning' | 'Reserved'>('ALL');
  const [bedSearchQuery, setBedSearchQuery] = useState('');
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [wardActionTarget, setWardActionTarget] = useState<Bed['wardType'] | null>(null);

  // Backend queue state for staff
  const [backendQueue, setBackendQueue] = useState<QueueTokenView[]>([]);
  const [backendQueueLoading, setBackendQueueLoading] = useState(false);
  const [backendQueueError, setBackendQueueError] = useState<string | null>(null);

  const staffHospitalId = currentUser.hospitalId || selectedHospital?.id;

  const fetchBackendStaffQueue = useCallback(async () => {
    if (!staffHospitalId) return;
    setBackendQueueLoading(true);
    setBackendQueueError(null);
    try {
      const items = await fetchStaffQueue(staffHospitalId);
      setBackendQueue(items);
    } catch {
      setBackendQueueError('Unable to fetch queue from server. Showing local data.');
    } finally {
      setBackendQueueLoading(false);
    }
  }, [staffHospitalId, fetchStaffQueue]);

  useEffect(() => {
    if (staffHospitalId) {
      fetchBackendStaffQueue();
    }
  }, [staffHospitalId, fetchBackendStaffQueue]);

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
    status: mapBackendQueueStatus(token.status),
    assignedDoctor: token.status === 'IN_PROGRESS' ? 'Assigned' : undefined,
    assignedRoom: token.status === 'IN_PROGRESS' ? 'Treatment Bay' : undefined,
    hospitalId: token.hospital_id,
    queuePosition: token.queue_position,
  });

  const hasBackendQueue = backendQueue.length > 0;
  const displayQueue: QueuePatient[] = hasBackendQueue
    ? backendQueue.map(backendTokenToQueuePatient)
    : queuePatients;

  const handleBackendStatusUpdate = async (tokenId: string, newStatus: BackendQueueStatus) => {
    const success = await updateQueueTokenStatusByStaff(tokenId, newStatus);
    if (success) {
      fetchBackendStaffQueue();
    }
  };

  // RBAC: only hospital_staff and admin can manage pre-alerts
  const canManagePreAlerts = currentUser.role === 'hospital_staff' || currentUser.role === 'admin';

  // RBAC: hospital staff and admin can manage, all authenticated users can view
  const canManageOperations = currentUser.role === 'hospital_staff' || currentUser.role === 'admin';
  const canViewOperations = ['patient', 'hospital_staff', 'admin', 'paramedic'].includes(currentUser.role);

  const primaryHospital = selectedHospital || (currentUser.hospitalId ? hospitals.find(h => h.hospitalId === currentUser.hospitalId || h.id === currentUser.hospitalId) : null) || hospitals[0];
  const hospitalBeds = primaryHospital?.bedList && primaryHospital.bedList.length > 0
    ? primaryHospital.bedList
    : beds;

  const WARD_CONFIGS: Record<Bed['wardType'], { label: string; icon: any; color: string; badgeBg: string; border: string; desc: string }> = {
    'ICU': {
      label: 'ICU (Intensive Care Unit)',
      icon: Activity,
      color: 'text-red-700',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      border: 'border-red-200',
      desc: 'Critical care monitoring, mechanical ventilation & hemodynamic support'
    },
    'Emergency': {
      label: 'Emergency Department (ER / Resus)',
      icon: ShieldAlert,
      color: 'text-amber-700',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      border: 'border-amber-200',
      desc: 'High acuity acute triage & rapid stabilization bays'
    },
    'General': {
      label: 'General Inpatient Ward',
      icon: Building2,
      color: 'text-blue-700',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      border: 'border-blue-200',
      desc: 'Standard medical-surgical observation & recovery beds'
    },
    'Trauma': {
      label: 'Trauma & Resuscitation Center',
      icon: AlertTriangle,
      color: 'text-orange-700',
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
      border: 'border-orange-200',
      desc: 'Specialized trauma resuscitation & immediate surgical prep'
    },
    'Cardiac': {
      label: 'Cardiac Care Unit (CCU)',
      icon: HeartPulse,
      color: 'text-rose-700',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      border: 'border-rose-200',
      desc: 'Telemetry & acute cardiovascular intensive observation'
    }
  };

  const allAvailableWardTypes = Array.from(new Set(hospitalBeds.map(b => b.wardType))) as Bed['wardType'][];
  const defaultWardOrder: Bed['wardType'][] = ['ICU', 'Emergency', 'General', 'Trauma', 'Cardiac'];
  const orderedWards = [
    ...defaultWardOrder.filter(w => allAvailableWardTypes.includes(w)),
    ...allAvailableWardTypes.filter(w => !defaultWardOrder.includes(w))
  ];

  // Show hospital selection reminder for hospital staff if no hospital is selected
  const showHospitalSelectionReminder = currentUser.role === 'hospital_staff' && !selectedHospital;

  const opDataAvailable = primaryHospital?.operationalDataAvailable === true;

  // Aggregated Stats
  const totalBeds = primaryHospital?.beds?.total ?? primaryHospital?.totalBeds ?? hospitalBeds.length;
  const availableBeds = primaryHospital?.beds?.available ?? primaryHospital?.availableBeds ?? hospitalBeds.filter(b => b.status === 'Available').length;
  const totalICUBeds = primaryHospital?.icu?.total ?? primaryHospital?.totalICUBeds ?? hospitalBeds.filter(b => b.wardType === 'ICU').length;
  const availableICUBeds = primaryHospital?.icu?.available ?? primaryHospital?.availableICUBeds ?? hospitalBeds.filter(b => b.wardType === 'ICU' && b.status === 'Available').length;
  const avgWait = primaryHospital?.estimatedWaitTimeMinutes ?? 0;
  const activeEmergencyCases = displayQueue.filter(p => p.severity === 'CRITICAL' || p.severity === 'HIGH').length;
  const occupancyPercent = totalBeds > 0 ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 0;
  const reservedBeds = primaryHospital?.beds?.reserved ?? 0;
  const ambulancesEnRoute = ambulances.filter(a => a.status === 'En Route' || a.status === 'Dispatched').length;
  const criticalCount = displayQueue.filter(p => p.severity === 'CRITICAL').length;

  // Derive chart data from actual queue
  const hourlyArrivalData = [
    { time: '08:00', critical: 0, high: 0, moderate: 0, low: 0 },
    { time: '10:00', critical: 0, high: 0, moderate: 0, low: 0 },
    { time: '12:00', critical: 0, high: 0, moderate: 0, low: 0 },
    { time: '14:00', critical: 0, high: 0, moderate: 0, low: 0 },
    { time: '16:00', critical: 0, high: 0, moderate: 0, low: 0 },
    { time: '18:00', critical: 0, high: 0, moderate: 0, low: 0 },
    { time: '20:00', critical: 0, high: 0, moderate: 0, low: 0 },
  ];

  // Populate current time slot with actual queue data
  const now = new Date();
  const currentHour = `${now.getHours().toString().padStart(2, '0')}:00`;
  const currentSlot = hourlyArrivalData.find(d => d.time === currentHour) || hourlyArrivalData[hourlyArrivalData.length - 1];
  currentSlot.critical = displayQueue.filter(p => p.severity === 'CRITICAL').length;
  currentSlot.high = displayQueue.filter(p => p.severity === 'HIGH').length;
  currentSlot.moderate = displayQueue.filter(p => p.severity === 'MODERATE').length;
  currentSlot.low = displayQueue.filter(p => p.severity === 'LOW').length;

  const severityPieData = [
    { name: 'Critical', value: displayQueue.filter(p => p.severity === 'CRITICAL').length || 0, color: '#ef4444' },
    { name: 'High', value: displayQueue.filter(p => p.severity === 'HIGH').length || 0, color: '#f97316' },
    { name: 'Moderate', value: displayQueue.filter(p => p.severity === 'MODERATE').length || 0, color: '#eab308' },
    { name: 'Low', value: displayQueue.filter(p => p.severity === 'LOW').length || 0, color: '#22c55e' }
  ];

  const totalQueuePatients = displayQueue.length;

  // Derive bed occupancy from actual bed list
  const bedOccupancyData = (() => {
    if (hospitalBeds.length === 0) return [];
    const wards = ['Emergency', 'ICU', 'General', 'Trauma', 'Cardiac'];
    return wards.map(ward => {
      const wardBeds = hospitalBeds.filter(b => b.wardType === ward);
      const occupied = wardBeds.filter(b => b.status === 'Occupied' || b.status === 'Reserved').length;
      const available = wardBeds.filter(b => b.status === 'Available').length;
      return { ward, occupied, available };
    }).filter(w => w.occupied + w.available > 0);
  })();

  const N = NOT_AVAILABLE_MESSAGE;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-bold">
            <Activity className="w-3.5 h-3.5" />
            <span>Emergency Operations Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hospital Command Center — {primaryHospital?.name ?? N}
          </h1>
          <p className="text-xs text-slate-500">
            Real-time ER triage management, pre-arrival alert coordination, ICU allocation, and regional load balancing.
          </p>
        </div>

        {/* Hospital Selection Reminder for Staff */}
        {showHospitalSelectionReminder && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-w-md">
            <div className="flex items-center gap-2 text-xs text-amber-800">
              <MapPin className="w-4 h-4" />
              <span>Please select your hospital in the Hospital section for personalized dashboard.</span>
            </div>
          </div>
        )}

        {/* Hospital Selector for Patient & Staff */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
          <div className="flex items-center gap-1.5 px-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-semibold text-slate-500">Hospital:</span>
          </div>
          <select
            value={primaryHospital?.id || ''}
            onChange={(e) => {
              const target = hospitals.find(h => h.id === e.target.value || h.hospitalId === e.target.value);
              if (target) setSelectedHospital(target);
            }}
            className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            {hospitals.map(hosp => (
              <option key={hosp.id} value={hosp.id}>
                {hosp.name} {hosp.hospitalId === currentUser.hospitalId ? '(Your Assigned)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Top Action Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'overview' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'queue' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ER Queue ({displayQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('beds')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'beds' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bed Matrix ({hospitalBeds.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'analytics' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Patient View-Only Mode Banner */}
      {currentUser.role === 'patient' && (
        <div className="bg-gradient-to-r from-sky-50 via-brand-50 to-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-sky-950 flex items-center gap-2">
                <span>Patient Transparency Console</span>
                <span className="px-2 py-0.5 bg-sky-200 text-sky-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                  View-Only Mode
                </span>
              </div>
              <p className="text-slate-600 mt-0.5">
                Real-time visibility into bed occupancy matrix, emergency load, and active queues. Operational modifications are reserved for hospital staff.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-semibold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Controls Locked
            </span>
          </div>
        </div>
      )}

      <DisclaimerBanner compact />

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Total Patients
            <Users className="w-3.5 h-3.5 text-brand-600" />
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{opDataAvailable ? totalQueuePatients : N}</div>
          <span className="text-[10px] text-slate-500 font-semibold font-mono">{opDataAvailable ? `${totalQueuePatients} registered` : '—'}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Emergency Cases
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          </span>
          <div className="text-2xl font-extrabold text-red-600 font-mono">{activeEmergencyCases}</div>
          <span className="text-[10px] text-red-600 font-semibold font-mono">{opDataAvailable ? `${criticalCount} Critical Active` : '—'}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Available Beds
            <BedDouble className="w-3.5 h-3.5 text-brand-600" />
          </span>
          <div className="text-2xl font-extrabold text-brand-700 font-mono">{opDataAvailable ? `${availableBeds} / ${totalBeds}` : N}</div>
          <span className="text-[10px] text-slate-500">{opDataAvailable ? `${occupancyPercent}% Occupancy` : '—'}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            ICU Beds Open
            <BedDouble className="w-3.5 h-3.5 text-purple-600" />
          </span>
          <div className="text-2xl font-extrabold text-purple-700 font-mono">{opDataAvailable ? `${availableICUBeds} / ${totalICUBeds}` : N}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">{opDataAvailable ? `${reservedBeds} Reserved` : '—'}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Average Wait
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </span>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">{opDataAvailable ? `${avgWait}m` : N}</div>
          <span className="text-[10px] text-slate-500 font-semibold">—</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Ambulances Ready
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
          </span>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono">{ambulances.filter(a => a.status === 'Available').length}</div>
          <span className="text-[10px] text-slate-500 font-mono">{ambulancesEnRoute} En Route</span>
        </div>
      </div>

      {/* Regional Emergency Load Balancing Card */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-sm text-white">
              Regional Healthcare Load Balancing (Bangalore Metropolitan Emergency Network)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            * Simulated prototype telemetry
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {hospitals.map(hosp => {
            const isOverloaded = hosp.currentERLoadPercent > 85;
            const isModerate = hosp.currentERLoadPercent > 60 && hosp.currentERLoadPercent <= 85;

            return (
              <div key={hosp.id} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold truncate text-slate-200" title={hosp.name}>
                    {hosp.name.split(' ')[0]}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    isOverloaded ? 'bg-red-500 animate-ping' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400">ER Load:</span>
                  <span className="font-mono font-bold text-sm text-white">{hosp.currentERLoadPercent}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isOverloaded ? 'bg-red-500' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${hosp.currentERLoadPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>ICU: {hosp.availableICUBeds} Open</span>
                  <span>{hosp.travelTimeMinutes}m ETA</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Services Health — Admin + Dev Mode */}
      {(currentUser.role === 'admin' || import.meta.env.DEV) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-100 text-brand-700 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Map Services Health</h3>
                <p className="text-xs text-slate-500">Provider status, quota usage, and routing diagnostics</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
              DEV / ADMIN ONLY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getAllQuotaStatuses().map(q => (
              <div key={q.provider} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{q.provider}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    q.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    q.status === 'exhausted' ? 'bg-red-100 text-red-700' :
                    q.status === 'not_configured' ? 'bg-slate-100 text-slate-600' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {q.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requests used today</span>
                    <span className="font-mono font-bold text-slate-800">{q.used}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Safety limit</span>
                    <span className="font-mono font-bold text-slate-800">{q.safetyLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remaining</span>
                    <span className="font-mono font-bold text-slate-800">{Math.max(0, q.safetyLimit - q.used)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${q.exhausted ? 'bg-red-500' : q.used / q.safetyLimit > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (q.used / q.safetyLimit) * 100)}%` }}
                    />
                  </div>
                  {q.lastError && <div className="text-red-600 text-[10px]">Error: {q.lastError}</div>}
                  {q.lastSuccess && <div className="text-emerald-600 text-[10px]">Last success: {new Date(q.lastSuccess).toLocaleTimeString()}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-medium">Current Provider</span>
              <span className="text-xs font-bold text-slate-800 capitalize">{mapService.getStatus().primary}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-medium">GPS Status</span>
              <span className="text-xs font-bold text-slate-800">{navigator.geolocation ? 'Available' : 'Unavailable'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-medium">Routing</span>
              <span className="text-xs font-bold text-slate-800">OSRM (Free)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-medium">Map Tiles</span>
              <span className="text-xs font-bold text-slate-800 capitalize">{mapService.getTileSource()?.url ? 'Geoapify' : 'Unavailable'}</span>
            </div>
          </div>

          {mapService.getStatus().message && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs">
              {mapService.getStatus().message}
            </div>
          )}
        </div>
      )}

      {/* Main Section Content depending on active tab */}
      {/* 1. Pre-Alerts Tab / Section — only visible to hospital staff and admin */}
      {canManagePreAlerts && activeTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 text-red-700 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  🚨 Incoming Emergency Pre-Alerts ({preAlerts.length} Active)
                </h3>
                <p className="text-xs text-slate-500">
                  Pre-hospital telemetry feed. Coordinate ICU reservation and trauma room allocation prior to arrival.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preAlerts.map(pa => {
              const isCritical = pa.severity === 'CRITICAL';
              const prep = pa.preparation;

              return (
                <div
                  key={pa.id}
                  className={`p-5 rounded-2xl border transition space-y-4 relative ${
                    isCritical
                      ? 'bg-red-50/40 border-red-300 shadow-xs'
                      : 'bg-amber-50/40 border-amber-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          isCritical ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                        }`}>
                          {pa.severity}
                        </span>
                        <span className="font-mono text-xs text-slate-500">ID: {pa.patientId}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{pa.patientName}</h4>
                      <p className="text-xs text-slate-500">
                        {pa.age} yrs • {pa.gender} • Origin: {pa.originLocation}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-extrabold text-red-600 font-mono flex items-center justify-end gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{pa.etaMinutes}m ETA</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Ambulance: {pa.ambulanceVehicleNumber || N}
                      </span>
                    </div>
                  </div>

                  {/* Clinical Presentation & Vitals */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="font-semibold text-slate-800">
                      Symptoms: <span className="font-normal text-slate-600">{pa.symptoms.join(', ')}</span>
                    </div>
                    {pa.vitalsSummary && (
                      <div className="font-mono text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100">
                        {pa.vitalsSummary}
                      </div>
                    )}
                  </div>

                  {/* Preparation Checklist Summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                      prep.icuReserved ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' : 'bg-white border-slate-200 text-slate-500'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                      <span>ICU Bed Reserved</span>
                    </div>

                    <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                      prep.emergencyRoomAssigned ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' : 'bg-white border-slate-200 text-slate-500'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                      <span>Room Assigned</span>
                    </div>
                  </div>

                  {/* Actions — Manage Preparation only for staff/admin */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      Status: <span className="text-brand-600 font-medium">{pa.status}</span>
                    </span>

                    {canManagePreAlerts && (
                      <button
                        onClick={() => setSelectedPreAlertForModal(pa)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
                      >
                        Manage Preparation
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}





      {/* 2. Emergency Queue Management Table */}
      {(activeTab === 'overview' || activeTab === 'queue') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Emergency Department Active Triage Queue</h3>
              <p className="text-xs text-slate-500">
                {hasBackendQueue ? 'Live data from backend server.' : canManageOperations ? 'Staff controls for advancing patient care workflows and room assignment.' : 'View-only access to current queue status.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchBackendStaffQueue}
                disabled={backendQueueLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                {backendQueueLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>Refresh</span>
              </button>
              <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-semibold">
                {displayQueue.length} Active Patients Registered
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <th className="pb-2.5">Token #</th>
                  <th className="pb-2.5">Patient</th>
                  <th className="pb-2.5">Severity</th>
                  <th className="pb-2.5">Symptoms</th>
                  <th className="pb-2.5">Wait</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Doctor Assigned</th>
                  {canManageOperations && <th className="pb-2.5 text-right">Workflow Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayQueue.map(patient => {
                  const backendToken = hasBackendQueue ? backendQueue.find(t => t.id === patient.id) : null;
                  return (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 font-mono font-bold text-slate-900">
                      {patient.tokenNumber}
                    </td>
                    <td className="py-3 font-medium text-slate-800">
                      <div>{patient.patientName}</div>
                      <div className="text-[10px] text-slate-400">{patient.age}y • {patient.gender}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        patient.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        patient.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        patient.severity === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {patient.severity}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 max-w-xs truncate">
                      {patient.symptoms.join(', ')}
                    </td>
                    <td className="py-3 font-mono font-semibold text-slate-700">
                      {patient.estimatedWaitMinutes}m
                    </td>
                    <td className="py-3">
                      {backendToken && canManageOperations ? (
                        <select
                          value={backendToken.status}
                          onChange={(e) => handleBackendStatusUpdate(backendToken.id, e.target.value as BackendQueueStatus)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:outline-none"
                        >
                          <option value="WAITING">Waiting</option>
                          <option value="CALLED">Called</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      ) : canManageOperations ? (
                        <select
                          value={patient.status}
                          onChange={(e) => updateQueuePatientStatus(patient.id, e.target.value as QueueStatus)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:outline-none"
                        >
                          <option value="Waiting">Waiting</option>
                          <option value="Under Assessment">Under Assessment</option>
                          <option value="Treatment">Treatment</option>
                          <option value="Admitted">Admitted</option>
                          <option value="Discharged">Discharged</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          patient.status === 'Waiting' ? 'bg-slate-100 text-slate-700' :
                          patient.status === 'Under Assessment' ? 'bg-amber-100 text-amber-800' :
                          patient.status === 'Treatment' ? 'bg-brand-100 text-brand-800' :
                          patient.status === 'Admitted' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {patient.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-700">
                      {patient.assignedDoctor || 'Unassigned'}
                    </td>
                    {canManageOperations && (
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {backendToken ? (
                            <>
                              <button
                                onClick={() => handleBackendStatusUpdate(backendToken.id, 'CALLED')}
                                className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded font-semibold transition"
                                title="Call Patient"
                              >
                                Call
                              </button>
                              <button
                                onClick={() => handleBackendStatusUpdate(backendToken.id, 'IN_PROGRESS')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded font-semibold transition"
                                title="Start Treatment"
                              >
                                Treat
                              </button>
                              <button
                                onClick={() => handleBackendStatusUpdate(backendToken.id, 'COMPLETED')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold transition"
                                title="Mark Complete"
                              >
                                Done
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => updateQueuePatientStatus(patient.id, 'Treatment')}
                                className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded font-semibold transition"
                                title="Move to Treatment"
                              >
                                Treat
                              </button>
                              <button
                                onClick={() => updateQueuePatientStatus(patient.id, 'Discharged')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold transition"
                                title="Mark Discharged"
                              >
                                Discharge
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Interactive Bed & ICU Management Grid */}
      {(activeTab === 'overview' || activeTab === 'beds') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                      Visual Hospital Bed &amp; ICU Allocation Matrix
                    </h3>
                    {canManageOperations ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Staff Controls Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        View Only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {canManageOperations 
                      ? 'Click any ICU or ward state pill to change operational state, or click individual beds to cycle and reallocate.' 
                      : 'Live bed and intensive care unit allocation overview across all wards.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canManageOperations && (
                <button
                  onClick={() => setIsBedEditModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                  title="Configure total capacity and ward limits"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure Capacity</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <div className="text-[11px] font-semibold text-emerald-700">Total Available</div>
              <div className="text-xl font-extrabold text-emerald-900 flex items-center justify-between mt-0.5">
                <span>{hospitalBeds.filter(b => b.status === 'Available').length}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-50/60 border border-red-200">
              <div className="text-[11px] font-semibold text-red-700">Occupied</div>
              <div className="text-xl font-extrabold text-red-900 flex items-center justify-between mt-0.5">
                <span>{hospitalBeds.filter(b => b.status === 'Occupied').length}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
              <div className="text-[11px] font-semibold text-amber-700">Housekeeping</div>
              <div className="text-xl font-extrabold text-amber-900 flex items-center justify-between mt-0.5">
                <span>{hospitalBeds.filter(b => b.status === 'Cleaning').length}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
              <div className="text-[11px] font-semibold text-purple-700">Reserved</div>
              <div className="text-xl font-extrabold text-purple-900 flex items-center justify-between mt-0.5">
                <span>{hospitalBeds.filter(b => b.status === 'Reserved').length}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 sm:col-span-2 lg:col-span-2 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                  ICU Live Availability
                </div>
                <div className="text-lg font-black text-rose-950 mt-0.5">
                  {hospitalBeds.filter(b => b.wardType === 'ICU' && b.status === 'Available').length} / {hospitalBeds.filter(b => b.wardType === 'ICU').length} Beds Free
                </div>
              </div>
              {canManageOperations && (
                <button
                  onClick={() => setWardActionTarget('ICU')}
                  className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-white hover:bg-rose-100 rounded-lg border border-rose-300 transition shadow-xs active:scale-95 flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Change ICU State</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Toolbar: Ward Tabs, Status Filter, Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Ward Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setSelectedWardTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedWardTab === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Wards ({hospitalBeds.length})
              </button>
              {orderedWards.map(w => {
                const count = hospitalBeds.filter(b => b.wardType === w).length;
                const free = hospitalBeds.filter(b => b.wardType === w && b.status === 'Available').length;
                const isSelected = selectedWardTab === w;
                return (
                  <button
                    key={w}
                    onClick={() => setSelectedWardTab(w)}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{w} Ward</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      free === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {free}/{count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Status Filter & Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bedSearchQuery}
                  onChange={e => setBedSearchQuery(e.target.value)}
                  placeholder="Filter bed or patient..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-500 w-36 sm:w-44"
                />
                {bedSearchQuery && (
                  <button
                    onClick={() => setBedSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={bedStatusFilter}
                onChange={e => setBedStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Available">Available Only</option>
                <option value="Occupied">Occupied Only</option>
                <option value="Cleaning">Cleaning Only</option>
                <option value="Reserved">Reserved Only</option>
              </select>
            </div>
          </div>

          {/* Ward Sections */}
          <div className="space-y-6 pt-1">
            {orderedWards
              .filter(w => selectedWardTab === 'ALL' || selectedWardTab === w)
              .map(ward => {
                const meta = WARD_CONFIGS[ward] || {
                  label: `${ward} Ward`,
                  icon: Building2,
                  color: 'text-slate-700',
                  badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
                  border: 'border-slate-200',
                  desc: 'Clinical patient observation and management ward'
                };
                const WardIcon = meta.icon;

                const wardAllBeds = hospitalBeds.filter(b => b.wardType === ward);
                const wardFilteredBeds = wardAllBeds.filter(bed => {
                  if (bedStatusFilter !== 'ALL' && bed.status !== bedStatusFilter) return false;
                  if (bedSearchQuery.trim()) {
                    const q = bedSearchQuery.toLowerCase();
                    const mNum = bed.bedNumber.toLowerCase().includes(q);
                    const mPat = bed.patientName?.toLowerCase().includes(q);
                    const mDoc = bed.assignedDoctor?.toLowerCase().includes(q);
                    if (!mNum && !mPat && !mDoc) return false;
                  }
                  return true;
                });

                const wTotal = wardAllBeds.length;
                const wAvail = wardAllBeds.filter(b => b.status === 'Available').length;
                const wOcc = wardAllBeds.filter(b => b.status === 'Occupied').length;
                const wClean = wardAllBeds.filter(b => b.status === 'Cleaning').length;
                const wRes = wardAllBeds.filter(b => b.status === 'Reserved').length;
                const wOccPercent = wTotal > 0 ? Math.round(((wTotal - wAvail) / wTotal) * 100) : 0;

                // Determine Ward Operational State
                const wardState = wAvail === 0 && wTotal > 0
                  ? { label: 'Full Capacity', color: 'bg-red-500 text-white', border: 'border-red-600', pulse: true }
                  : wAvail === 1 && wTotal > 1
                  ? { label: 'Near Capacity', color: 'bg-amber-500 text-white', border: 'border-amber-600', pulse: false }
                  : wClean > wAvail && wClean > 0
                  ? { label: 'Turnover / Sanitizing', color: 'bg-yellow-500 text-slate-900', border: 'border-yellow-600', pulse: false }
                  : wRes === wTotal && wTotal > 0
                  ? { label: 'Surge Reserved', color: 'bg-purple-600 text-white', border: 'border-purple-700', pulse: false }
                  : { label: 'Accepting Patients', color: 'bg-emerald-500 text-white', border: 'border-emerald-600', pulse: false };

                return (
                  <div key={ward} className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-slate-50/40 space-y-4">
                    {/* Ward Header with Operational State Changer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs ${meta.color}`}>
                          <WardIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                              {meta.label}
                            </h4>
                            {/* Clickable Ward State Pill */}
                            {canManageOperations ? (
                              <button
                                onClick={() => setWardActionTarget(ward)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition shadow-xs cursor-pointer hover:brightness-105 active:scale-95 ${wardState.color}`}
                                title={`Click to change ${ward} Ward operational state`}
                              >
                                {wardState.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                                <span>{wardState.label}</span>
                                <SlidersHorizontal className="w-3 h-3 ml-0.5 opacity-80" />
                              </button>
                            ) : (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${wardState.color}`}>
                                {wardState.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{meta.desc}</p>
                        </div>
                      </div>

                      {/* Ward Statistics & Batch Actions */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">
                            <span className="text-emerald-600">{wAvail} Available</span> / {wTotal} Total
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-0.5">
                            <span>{wOccPercent}% Occupancy</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  wOccPercent >= 90 ? 'bg-red-500' : wOccPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${wOccPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {canManageOperations && (
                          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                            <button
                              onClick={() => {
                                updateWardBedStatus(ward, 'Available');
                                addNotification({
                                  title: `${ward} Ward Updated`,
                                  message: `All beds in ${ward} marked as Available`,
                                  type: 'system'
                                });
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold transition shadow-2xs active:scale-95"
                              title={`Set all ${ward} beds to Available`}
                            >
                              All Free
                            </button>
                            <button
                              onClick={() => {
                                updateWardBedStatus(ward, 'Occupied');
                                addNotification({
                                  title: `${ward} Ward Updated`,
                                  message: `All beds in ${ward} marked as Occupied`,
                                  type: 'system'
                                });
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-[10px] font-bold transition shadow-2xs active:scale-95"
                              title={`Mark all ${ward} beds as Occupied`}
                            >
                              All Full
                            </button>
                            <button
                              onClick={() => setWardActionTarget(ward)}
                              className="p-1 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                              title="More ward actions"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ward Beds Grid */}
                    {wardFilteredBeds.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        No beds found matching your current filter in {ward} Ward.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {wardFilteredBeds.map(bed => {
                          const isAvail = bed.status === 'Available';
                          const isOcc = bed.status === 'Occupied';
                          const isClean = bed.status === 'Cleaning';
                          const isRes = bed.status === 'Reserved';

                          const statusColors = isAvail
                            ? { bg: 'bg-emerald-50/70', border: 'border-emerald-300 hover:border-emerald-500', badge: 'bg-emerald-200 text-emerald-950', dot: 'bg-emerald-500' }
                            : isOcc
                            ? { bg: 'bg-red-50/70', border: 'border-red-300 hover:border-red-500', badge: 'bg-red-200 text-red-950', dot: 'bg-red-500' }
                            : isClean
                            ? { bg: 'bg-amber-50/70', border: 'border-amber-300 hover:border-amber-500', badge: 'bg-amber-200 text-amber-950', dot: 'bg-amber-500' }
                            : { bg: 'bg-purple-50/70', border: 'border-purple-300 hover:border-purple-500', badge: 'bg-purple-200 text-purple-950', dot: 'bg-purple-500' };

                          return (
                            <div
                              key={bed.id}
                              className={`p-3 rounded-xl border bg-white shadow-2xs transition-all duration-150 ${statusColors.border} ${
                                canManageOperations ? 'hover:shadow-md cursor-pointer' : ''
                              } space-y-2 relative group`}
                              onClick={() => {
                                if (canManageOperations) {
                                  toggleBedStatus(bed.id);
                                }
                              }}
                              title={
                                canManageOperations
                                  ? `Bed ${bed.bedNumber} (${bed.status}) — Click to toggle status`
                                  : `Bed ${bed.bedNumber} (${bed.status})`
                              }
                            >
                              {/* Top row: Bed Number & Status Badge */}
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="font-mono text-slate-900 tracking-tight flex items-center gap-1">
                                  {bed.bedNumber}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 ${statusColors.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                                  {bed.status}
                                </span>
                              </div>

                              {/* Patient or Bed Status Description */}
                              <div className="min-h-[28px] text-[11px]">
                                {isOcc ? (
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-slate-800 truncate">
                                      {bed.patientName || 'Assigned Patient'}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px]">
                                      <span className={`px-1 rounded font-extrabold ${
                                        bed.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                        bed.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {bed.severity || 'HIGH'}
                                      </span>
                                      {bed.assignedDoctor && (
                                        <span className="text-slate-500 truncate">{bed.assignedDoctor}</span>
                                      )}
                                    </div>
                                  </div>
                                ) : isRes ? (
                                  <div className="text-purple-700 font-medium text-[10px]">
                                    {bed.patientName || 'Pre-alert incoming'}
                                  </div>
                                ) : isClean ? (
                                  <div className="text-amber-700 font-medium text-[10px] flex items-center gap-1">
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    <span>Housekeeping bay</span>
                                  </div>
                                ) : (
                                  <div className="text-emerald-700 font-medium text-[10px]">
                                    Ready for intake
                                  </div>
                                )}
                              </div>

                              {/* Staff Quick Action Status Switcher Row */}
                              {canManageOperations && (
                                <div
                                  className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[9px] font-bold"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        updateBedStatus(bed.id, 'Available');
                                        addNotification({
                                          title: 'Bed Updated',
                                          message: `Bed ${bed.bedNumber} set to Available`,
                                          type: 'system'
                                        });
                                      }}
                                      className={`px-1 py-0.5 rounded ${
                                        isAvail
                                          ? 'bg-emerald-600 text-white font-extrabold shadow-2xs'
                                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                      }`}
                                      title="Set to Available"
                                    >
                                      Avail
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateBedStatus(bed.id, 'Occupied');
                                        addNotification({
                                          title: 'Bed Updated',
                                          message: `Bed ${bed.bedNumber} marked as Occupied`,
                                          type: 'system'
                                        });
                                      }}
                                      className={`px-1 py-0.5 rounded ${
                                        isOcc
                                          ? 'bg-red-600 text-white font-extrabold shadow-2xs'
                                          : 'bg-red-50 text-red-800 hover:bg-red-100'
                                      }`}
                                      title="Set to Occupied"
                                    >
                                      Occ
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateBedStatus(bed.id, 'Cleaning');
                                        addNotification({
                                          title: 'Bed Updated',
                                          message: `Bed ${bed.bedNumber} set to Cleaning`,
                                          type: 'system'
                                        });
                                      }}
                                      className={`px-1 py-0.5 rounded ${
                                        isClean
                                          ? 'bg-amber-600 text-white font-extrabold shadow-2xs'
                                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                      }`}
                                      title="Set to Cleaning"
                                    >
                                      Clean
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateBedStatus(bed.id, 'Reserved');
                                        addNotification({
                                          title: 'Bed Updated',
                                          message: `Bed ${bed.bedNumber} marked as Reserved`,
                                          type: 'system'
                                        });
                                      }}
                                      className={`px-1 py-0.5 rounded ${
                                        isRes
                                          ? 'bg-purple-600 text-white font-extrabold shadow-2xs'
                                          : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                                      }`}
                                      title="Set to Reserved"
                                    >
                                      Res
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => setEditingBed(bed)}
                                    className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                                    title="Edit patient assignment or bed details"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 4. Analytics & Charts */}
      {(activeTab === 'overview' || activeTab === 'analytics') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Inflow Chart */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                Hourly Emergency Inflow by Severity
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Live simulated 12h trend</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyArrivalData}>
                  <defs>
                    <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCrit)" name="Critical" />
                  <Area type="monotone" dataKey="high" stroke="#f97316" fillOpacity={1} fill="url(#colorHigh)" name="High Urgency" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Distribution Pie */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                Emergency Triage Severity Distribution
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">{totalQueuePatients} Patients Total</span>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Pre Alert Detail Modal */}
      <PreAlertModal
        preAlert={selectedPreAlertForModal}
        isOpen={!!selectedPreAlertForModal}
        onClose={() => setSelectedPreAlertForModal(null)}
      />

      {/* Quick Bed Capacity Editor Modal for Staff */}
      {isBedEditModalOpen && primaryHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-lg text-slate-900">
                  Edit Bed Capacity — {primaryHospital.name}
                </h3>
              </div>
              <button
                onClick={() => setIsBedEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <HospitalOperationalDataEditor
              hospital={primaryHospital}
              staffToken={currentUser.staffToken}
              onSuccess={() => setIsBedEditModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Individual Bed Management Modal for Staff */}
      <BedManagementModal
        bed={editingBed}
        isOpen={!!editingBed}
        onClose={() => setEditingBed(null)}
        onSave={(bedId, status, patientName, severity, assignedDoctor) => {
          updateBedStatus(bedId, status, patientName, severity);
          addNotification({
            title: 'Bed State Saved',
            message: `Bed allocation and status updated successfully.`,
            type: 'system'
          });
        }}
      />

      {/* Ward State Modal for Entire Ward Batch State Transition */}
      <WardStateModal
        wardType={wardActionTarget}
        hospitalName={primaryHospital?.name || 'Hospital'}
        bedsInWard={wardActionTarget ? hospitalBeds.filter(b => b.wardType === wardActionTarget) : []}
        isOpen={!!wardActionTarget}
        onClose={() => setWardActionTarget(null)}
        onApplyWardState={(wardType, newBedStatus) => {
          updateWardBedStatus(wardType, newBedStatus);
          addNotification({
            title: `${wardType} Ward State Changed`,
            message: `All beds in ${wardType} Ward set to ${newBedStatus}`,
            type: 'system'
          });
        }}
      />
    </div>
  );
};
