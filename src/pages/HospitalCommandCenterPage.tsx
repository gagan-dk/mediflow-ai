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
  Loader2
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
import { HospitalPreAlert } from '../types/preAlert';
import { QueueStatus } from '../types/queue';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { mapService } from '../services/map/mapService';
import { getAllQuotaStatuses } from '../services/map/apiQuotaService';
import type { QueueTokenView, BackendQueueStatus } from '../types/api';
import type { QueuePatient } from '../types/queue';
import type { SeverityLevel } from '../types/hospital';

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

export const HospitalCommandCenterPage: React.FC = () => {
  const { 
    currentUser, 
    hospitals, 
    selectedHospital,
    beds, 
    toggleBedStatus, 
    queuePatients, 
    updateQueuePatientStatus, 
    preAlerts, 
    ambulances,
    fetchStaffQueue,
    updateQueueTokenStatusByStaff
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'beds' | 'analytics'>('overview');
  const [selectedPreAlertForModal, setSelectedPreAlertForModal] = useState<HospitalPreAlert | null>(null);

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

  const primaryHospital = selectedHospital || hospitals[0]; // Use selected hospital or fallback to first

  // Show hospital selection reminder for hospital staff if no hospital is selected
  const showHospitalSelectionReminder = currentUser.role === 'hospital_staff' && !selectedHospital;

  // Aggregated Stats
  const totalBeds = primaryHospital.totalBeds;
  const availableBeds = primaryHospital.availableBeds;
  const totalICUBeds = primaryHospital.totalICUBeds;
  const availableICUBeds = primaryHospital.availableICUBeds;
  const avgWait = primaryHospital.estimatedWaitTimeMinutes;
  const activeEmergencyCases = displayQueue.filter(p => p.severity === 'CRITICAL' || p.severity === 'HIGH').length;

  // Chart Mock Telemetry Data
  const hourlyArrivalData = [
    { time: '08:00', critical: 2, high: 4, moderate: 7, low: 10 },
    { time: '10:00', critical: 3, high: 6, moderate: 11, low: 14 },
    { time: '12:00', critical: 5, high: 8, moderate: 14, low: 18 },
    { time: '14:00', critical: 4, high: 7, moderate: 12, low: 16 },
    { time: '16:00', critical: 3, high: 9, moderate: 15, low: 20 },
    { time: '18:00', critical: 6, high: 11, moderate: 16, low: 22 },
    { time: '20:00', critical: 4, high: 8, moderate: 13, low: 17 }
  ];

  const severityPieData = [
    { name: 'Critical', value: 18, color: '#ef4444' },
    { name: 'High', value: 34, color: '#f97316' },
    { name: 'Moderate', value: 48, color: '#eab308' },
    { name: 'Low', value: 28, color: '#22c55e' }
  ];

  const bedOccupancyData = [
    { ward: 'Emergency', occupied: 26, available: 9 },
    { ward: 'ICU', occupied: 19, available: 5 },
    { ward: 'Trauma', occupied: 14, available: 4 },
    { ward: 'Cardiac', occupied: 20, available: 6 }
  ];

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
            Hospital Command Center — {primaryHospital.name}
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
            Bed Matrix ({beds.length})
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

      <DisclaimerBanner compact />

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Total Patients
            <Users className="w-3.5 h-3.5 text-brand-600" />
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">128</div>
          <span className="text-[10px] text-emerald-600 font-semibold font-mono">+12 last hour</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Emergency Cases
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          </span>
          <div className="text-2xl font-extrabold text-red-600 font-mono">{activeEmergencyCases}</div>
          <span className="text-[10px] text-red-600 font-semibold font-mono">3 Critical Active</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Available Beds
            <BedDouble className="w-3.5 h-3.5 text-brand-600" />
          </span>
          <div className="text-2xl font-extrabold text-brand-700 font-mono">{availableBeds} <span className="text-xs text-slate-400 font-normal">/ {totalBeds}</span></div>
          <span className="text-[10px] text-slate-500">81% Occupancy</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            ICU Beds Open
            <BedDouble className="w-3.5 h-3.5 text-purple-600" />
          </span>
          <div className="text-2xl font-extrabold text-purple-700 font-mono">{availableICUBeds} <span className="text-xs text-slate-400 font-normal">/ {totalICUBeds}</span></div>
          <span className="text-[10px] text-emerald-600 font-semibold">1 Reserved</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Average Wait
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </span>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">{avgWait}m</div>
          <span className="text-[10px] text-emerald-600 font-semibold">-5m vs target</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            Ambulances Ready
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
          </span>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono">{ambulances.filter(a => a.status === 'Available').length}</div>
          <span className="text-[10px] text-slate-500 font-mono">2 En Route</span>
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
                        Ambulance: {pa.ambulanceVehicleNumber || 'KA-01-A17'}
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
                                onClick={() => updateQueuePatientStatus(patient.id, 'Treatment', 'Dr. Priya Rao', 'Resus Bay 1')}
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Visual Hospital Bed &amp; ICU Allocation Matrix</h3>
              <p className="text-xs text-slate-500">
                {canManageOperations ? 'Click any bed to toggle state: Available → Occupied → Cleaning → Available' : 'Current bed allocation status (read-only)'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Occupied</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> Cleaning</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500" /> Reserved</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {beds.map(bed => {
              const isAvail = bed.status === 'Available';
              const isOcc = bed.status === 'Occupied';
              const isClean = bed.status === 'Cleaning';
              const isRes = bed.status === 'Reserved';

              const bedContent = (
                <>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="font-mono text-slate-900">{bed.bedNumber}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                      isAvail ? 'bg-emerald-200 text-emerald-900' :
                      isOcc ? 'bg-red-200 text-red-900' :
                      isClean ? 'bg-amber-200 text-amber-900' :
                      'bg-purple-200 text-purple-900'
                    }`}>
                      {bed.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{bed.wardType} Ward</div>
                  {bed.patientName && (
                    <div className="text-[10px] font-bold text-slate-700 truncate">
                      {bed.patientName}
                    </div>
                  )}
                </>
              );

              const bedClasses = `p-3.5 rounded-xl border text-left transition transform active:scale-95 space-y-1.5 ${
                isAvail ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400' :
                isOcc ? 'bg-red-50/50 border-red-200 hover:border-red-400' :
                isClean ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400' :
                'bg-purple-50/50 border-purple-200 hover:border-purple-400'
              } ${!canManageOperations ? 'cursor-default' : 'cursor-pointer'}`;

              if (canManageOperations) {
                return (
                  <button
                    key={bed.id}
                    onClick={() => toggleBedStatus(bed.id)}
                    className={bedClasses}
                  >
                    {bedContent}
                  </button>
                );
              } else {
                return (
                  <div key={bed.id} className={bedClasses}>
                    {bedContent}
                  </div>
                );
              }
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
              <span className="text-[11px] text-slate-400 font-mono">128 Patients Total</span>
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
    </div>
  );
};
