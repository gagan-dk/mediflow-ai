import React, { useState } from 'react';
import {
  Stethoscope,
  UserPlus,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield
} from 'lucide-react';
import { Doctor, DoctorSpecialization, DoctorStatus, DutyStatus, SPECIALIZATION_DESCRIPTIONS } from '../types/doctor';

interface DoctorManagementProps {
  doctors: Doctor[];
  onAddDoctor: (doctor: Omit<Doctor, 'id'>) => void;
  onUpdateDoctor: (id: string, updates: Partial<Doctor>) => void;
  onRemoveDoctor: (id: string) => void;
}

export const DoctorManagement: React.FC<DoctorManagementProps> = ({
  doctors,
  onAddDoctor,
  onUpdateDoctor,
  onRemoveDoctor
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | DoctorStatus>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<DoctorSpecialization | ''>('');

  // Filter doctors based on search and status
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = 
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || doctor.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Summary stats
  const totalDoctors = doctors.length;
  const availableDoctors = doctors.filter(d => d.status === 'Available').length;
  const emergencyDoctors = doctors.filter(d => d.emergencyAvailable).length;
  const busyDoctors = doctors.filter(d => d.status === 'Busy').length;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const doctorData: Omit<Doctor, 'id'> = {
      name: formData.get('name') as string,
      specialization: formData.get('specialization') as DoctorSpecialization,
      department: formData.get('department') as string,
      experience: parseInt(formData.get('experience') as string),
      status: formData.get('status') as DoctorStatus,
      dutyStatus: formData.get('dutyStatus') as DutyStatus,
      room: formData.get('room') as string,
      emergencyAvailable: formData.get('emergencyAvailable') === 'true',
      consultationHours: formData.get('consultationHours') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string
    };

    if (editingDoctor) {
      onUpdateDoctor(editingDoctor.id, doctorData);
      setEditingDoctor(null);
    } else {
      onAddDoctor(doctorData);
    }
    
    setShowAddForm(false);
    e.currentTarget.reset();
  };

  const getStatusColor = (status: DoctorStatus) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Busy': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Unavailable': return 'bg-red-100 text-red-800 border-red-200';
      case 'Off Duty': return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: DoctorStatus) => {
    switch (status) {
      case 'Available': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Busy': return <Clock className="w-3.5 h-3.5" />;
      case 'Unavailable': return <XCircle className="w-3.5 h-3.5" />;
      case 'Off Duty': return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Total Doctors</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalDoctors}</div>
        </div>
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Available Now</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{availableDoctors}</div>
        </div>
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Shield className="w-3.5 h-3.5 text-red-600" />
            <span>Emergency Available</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{emergencyDoctors}</div>
        </div>
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Currently Busy</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{busyDoctors}</div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctor or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | DoctorStatus)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="All">All Status</option>
            <option value="Available">Available</option>
            <option value="Busy">Busy</option>
            <option value="Emergency Available">Emergency Available</option>
            <option value="Off Duty">Off Duty</option>
          </select>
          
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingDoctor(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
        </div>
      </div>

      {/* Add/Edit Doctor Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Doctor Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingDoctor?.name}
                  placeholder="Dr. John Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Specialization</label>
                <select
                  name="specialization"
                  required
                  defaultValue={editingDoctor?.specialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value as DoctorSpecialization)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select Specialization</option>
                  {Object.entries(SPECIALIZATION_DESCRIPTIONS).map(([spec, desc]) => (
                    <option key={spec} value={spec}>
                      {spec} - {desc}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedSpecialization && (
                <div className="md:col-span-2 p-3 bg-brand-50 border border-brand-200 rounded-lg">
                  <p className="text-xs text-brand-800">
                    <strong>{selectedSpecialization}:</strong> {SPECIALIZATION_DESCRIPTIONS[selectedSpecialization]}
                  </p>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Department</label>
                <input
                  name="department"
                  type="text"
                  required
                  defaultValue={editingDoctor?.department}
                  placeholder="Cardiology"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Experience (years)</label>
                <input
                  name="experience"
                  type="number"
                  required
                  min="0"
                  defaultValue={editingDoctor?.experience}
                  placeholder="10"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Status</label>
                <select
                  name="status"
                  required
                  defaultValue={editingDoctor?.status || 'Available'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Duty Status</label>
                <select
                  name="dutyStatus"
                  required
                  defaultValue={editingDoctor?.dutyStatus || 'On Duty'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="On Duty">On Duty</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Room/Department</label>
                <input
                  name="room"
                  type="text"
                  required
                  defaultValue={editingDoctor?.room}
                  placeholder="Room 301"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Consultation Hours</label>
                <input
                  name="consultationHours"
                  type="text"
                  defaultValue={editingDoctor?.consultationHours}
                  placeholder="9 AM - 5 PM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingDoctor?.email}
                  placeholder="doctor@hospital.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={editingDoctor?.phone}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  name="emergencyAvailable"
                  type="checkbox"
                  id="emergencyAvailable"
                  defaultChecked={editingDoctor?.emergencyAvailable || false}
                  className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="emergencyAvailable" className="text-xs font-semibold text-slate-700">
                  Available for Emergency Cases
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
              >
                {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingDoctor(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Doctors List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Doctors ({filteredDoctors.length})
          </h3>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredDoctors.map((doctor) => (
            <div key={doctor.id} className="p-4 hover:bg-slate-50 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="w-4 h-4 text-brand-600" />
                    <h4 className="text-sm font-bold text-slate-900">{doctor.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(doctor.status)}`}>
                      {doctor.status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-600 mb-2">{doctor.specialization}</p>
                  
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {doctor.room}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {doctor.experience} years exp
                    </span>
                    {doctor.emergencyAvailable && (
                      <span className="flex items-center gap-1 text-red-600">
                        <Shield className="w-3 h-3" />
                        Emergency
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingDoctor(doctor);
                      setShowAddForm(true);
                      setSelectedSpecialization(doctor.specialization);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Doctor"
                  >
                    <Edit className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => onRemoveDoctor(doctor.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition"
                    title="Remove Doctor"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredDoctors.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Stethoscope className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No doctors found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};