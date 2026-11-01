import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  Phone,
  User,
  Hash,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Save,
  X,
  Shield,
  Siren,
  Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AmbulanceFleetStatus = 'Available' | 'Dispatched' | 'En Route' | 'At Hospital' | 'Unavailable';
export type AmbulanceFleetType = 'BLS' | 'ALS' | 'ACL';

export interface AmbulanceFleetEntry {
  id: string;
  vehicleNumber: string;     // e.g. KA-01-A-1234
  driverName: string;
  driverPhone: string;
  paramedicName: string;
  type: AmbulanceFleetType;
  status: AmbulanceFleetStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Local Storage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = (hospitalId: string) => `mediflow_ambulance_fleet_${hospitalId}`;

const loadFleet = (hospitalId: string): AmbulanceFleetEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(hospitalId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveFleet = (hospitalId: string, fleet: AmbulanceFleetEntry[]) => {
  try {
    localStorage.setItem(STORAGE_KEY(hospitalId), JSON.stringify(fleet));
  } catch {}
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<AmbulanceFleetStatus, { bg: string; text: string; dot: string }> = {
  'Available':   { bg: 'bg-emerald-50 border-emerald-200',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Dispatched':  { bg: 'bg-amber-50  border-amber-200',    text: 'text-amber-700',   dot: 'bg-amber-500'   },
  'En Route':    { bg: 'bg-blue-50   border-blue-200',      text: 'text-blue-700',    dot: 'bg-blue-500'    },
  'At Hospital': { bg: 'bg-slate-50  border-slate-200',    text: 'text-slate-700',   dot: 'bg-slate-400'   },
  'Unavailable': { bg: 'bg-red-50    border-red-200',       text: 'text-red-700',     dot: 'bg-red-400'     },
};

const TYPE_LABELS: Record<AmbulanceFleetType, string> = {
  BLS: 'Basic Life Support',
  ALS: 'Advanced Life Support',
  ACL: 'Advanced Cardiac Life',
};

// ─── Empty form state ─────────────────────────────────────────────────────────
const emptyForm = (): Omit<AmbulanceFleetEntry, 'id' | 'createdAt' | 'updatedAt'> => ({
  vehicleNumber: '',
  driverName: '',
  driverPhone: '',
  paramedicName: '',
  type: 'BLS',
  status: 'Available',
  notes: '',
});

// ─── Component ────────────────────────────────────────────────────────────────
interface AmbulanceManagementProps {
  hospitalId: string;
  hospitalName?: string;
}

export const AmbulanceManagement: React.FC<AmbulanceManagementProps> = ({ hospitalId, hospitalName }) => {
  const [fleet, setFleet] = useState<AmbulanceFleetEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load on mount / hospitalId change
  useEffect(() => {
    if (hospitalId) setFleet(loadFleet(hospitalId));
  }, [hospitalId]);

  const persistFleet = (updated: AmbulanceFleetEntry[]) => {
    setFleet(updated);
    saveFleet(hospitalId, updated);
  };

  const handleOpenAdd = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEdit = (entry: AmbulanceFleetEntry) => {
    setForm({
      vehicleNumber: entry.vehicleNumber,
      driverName: entry.driverName,
      driverPhone: entry.driverPhone,
      paramedicName: entry.paramedicName,
      type: entry.type,
      status: entry.status,
      notes: entry.notes || '',
    });
    setEditingId(entry.id);
    setFormError('');
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError('');
  };

  const handleSave = () => {
    const v = form.vehicleNumber.trim();
    const d = form.driverName.trim();
    const p = form.driverPhone.trim();

    if (!v) { setFormError('Vehicle number is required.'); return; }
    if (!d) { setFormError('Driver name is required.'); return; }
    if (!p) { setFormError('Driver phone is required.'); return; }
    if (!/^[\d\s\+\-\(\)]{7,15}$/.test(p)) {
      setFormError('Enter a valid phone number (7–15 digits).');
      return;
    }

    const now = new Date().toISOString();
    if (editingId) {
      const updated = fleet.map(e =>
        e.id === editingId
          ? { ...e, ...form, vehicleNumber: v, driverName: d, driverPhone: p, updatedAt: now }
          : e
      );
      persistFleet(updated);
    } else {
      const newEntry: AmbulanceFleetEntry = {
        ...form,
        vehicleNumber: v,
        driverName: d,
        driverPhone: p,
        id: `amb-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      persistFleet([...fleet, newEntry]);
    }

    setShowForm(false);
    setEditingId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id: string) => {
    persistFleet(fleet.filter(e => e.id !== id));
    setDeleteConfirm(null);
  };

  const handleStatusChange = (id: string, status: AmbulanceFleetStatus) => {
    const updated = fleet.map(e =>
      e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
    );
    persistFleet(updated);
  };

  const available = fleet.filter(e => e.status === 'Available').length;
  const dispatched = fleet.filter(e => e.status === 'Dispatched' || e.status === 'En Route').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Siren className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Ambulance Fleet</h2>
            {hospitalName && (
              <span className="text-xs text-slate-500">— {hospitalName}</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Manage ambulance vehicles, driver details and availability. Patients and dispatchers can see this information.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Ambulance
        </button>
      </div>

      {/* Summary Pills */}
      {fleet.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
            <Truck className="w-3.5 h-3.5" />
            {fleet.length} Total
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {available} Available
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {dispatched} Active
          </span>
        </div>
      )}

      {/* Success toast */}
      {saved && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Ambulance details saved successfully.
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white border border-brand-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-brand-50">
            <h3 className="text-sm font-bold text-brand-900 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {editingId ? 'Edit Ambulance Details' : 'Add New Ambulance'}
            </h3>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-brand-100 rounded-lg text-brand-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vehicle Number */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  Vehicle / Ambulance Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))}
                  placeholder="e.g. KA-01-A-1234"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition font-mono"
                />
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Ambulance Type
                </label>
                <div className="relative">
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as AmbulanceFleetType }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition pr-8"
                  >
                    {(Object.keys(TYPE_LABELS) as AmbulanceFleetType[]).map(t => (
                      <option key={t} value={t}>{t} — {TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Driver Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Driver Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.driverName}
                  onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
                />
              </div>

              {/* Driver Phone */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Driver Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.driverPhone}
                  onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
                />
              </div>

              {/* Paramedic Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Paramedic / EMT Name
                </label>
                <input
                  type="text"
                  value={form.paramedicName}
                  onChange={e => setForm(f => ({ ...f, paramedicName: e.target.value }))}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Current Status
                </label>
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as AmbulanceFleetStatus }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition pr-8"
                  >
                    {(Object.keys(STATUS_STYLES) as AmbulanceFleetStatus[]).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Equipped with cardiac monitor. Night shift vehicle."
                rows={2}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition resize-none"
              />
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {formError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update' : 'Save'} Ambulance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fleet List */}
      {fleet.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Truck className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Ambulances Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mb-5">
            Add your hospital's ambulance fleet with driver and contact details so patients can see who's coming to their aid.
          </p>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Add First Ambulance
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {fleet.map(entry => {
            const ss = STATUS_STYLES[entry.status];
            return (
              <div
                key={entry.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-brand-200 transition group"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-100 text-brand-700 rounded-xl flex items-center justify-center shrink-0">
                      <Truck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 font-mono tracking-wide">
                          {entry.vehicleNumber}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                          {entry.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{TYPE_LABELS[entry.type]}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status quick-change */}
                    <div className="relative">
                      <select
                        value={entry.status}
                        onChange={e => handleStatusChange(entry.id, e.target.value as AmbulanceFleetStatus)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer appearance-none pr-6 focus:outline-none ${ss.bg} ${ss.text}`}
                      >
                        {(Object.keys(STATUS_STYLES) as AmbulanceFleetStatus[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${ss.text}`} />
                    </div>

                    <button
                      onClick={() => handleOpenEdit(entry)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(entry.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body — driver details */}
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Driver</p>
                      <p className="text-sm font-semibold text-slate-900">{entry.driverName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Driver Phone</p>
                      <a
                        href={`tel:${entry.driverPhone}`}
                        className="text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        {entry.driverPhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Paramedic / EMT</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.paramedicName || <span className="text-slate-400 font-normal">Not assigned</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {entry.notes && (
                  <div className="px-5 pb-4">
                    <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {entry.notes}
                    </div>
                  </div>
                )}

                {/* Delete Confirm */}
                {deleteConfirm === entry.id && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <p className="text-xs text-red-700 font-medium flex-1">
                        Remove ambulance <strong>{entry.vehicleNumber}</strong>?
                      </p>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info note at bottom */}
      {fleet.length > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Ambulance and driver details entered here are visible to patients who have been assigned that ambulance.
            Keep contact information up to date to ensure proper coordination.
          </span>
        </div>
      )}
    </div>
  );
};
