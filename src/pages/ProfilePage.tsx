import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Edit2,
  Save,
  Camera,
  Heart,
  Briefcase,
  Award,
  Hospital,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
  Activity,
  FileText,
  LocateFixed,
  Droplet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types/user';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone || '',
    emergencyContact: currentUser.emergencyContact || '',
    medicalInfo: currentUser.medicalInfo || '',
  });

  const handleSave = () => {
    const updates: Partial<UserProfile> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
    };
    if (currentUser.role === 'patient') {
      updates.emergencyContact = formData.emergencyContact;
      updates.medicalInfo = formData.medicalInfo;
    }
    updateProfile(updates);
    setIsEditing(false);
  };

  // Sync form data when the user profile changes externally (e.g. after save)
  useEffect(() => {
    if (!isEditing) {
      setFormData({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || '',
        emergencyContact: currentUser.emergencyContact || '',
        medicalInfo: currentUser.medicalInfo || '',
      });
    }
  }, [currentUser.name, currentUser.email, currentUser.phone, currentUser.emergencyContact, currentUser.medicalInfo, isEditing]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'patient':
        return {
          label: 'Patient',
          icon: User,
          color: 'bg-sky-100 text-sky-700 border-sky-300',
        };
      case 'hospital_staff':
        return {
          label: 'Hospital Staff',
          icon: Stethoscope,
          color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        };
      case 'admin':
        return {
          label: 'System Administrator',
          icon: Shield,
          color: 'bg-purple-100 text-purple-700 border-purple-300',
        };
      default:
        return {
          label: 'User',
          icon: User,
          color: 'bg-slate-100 text-slate-700 border-slate-300',
        };
    }
  };

  const roleBadge = getRoleBadge();
  const RoleIcon = roleBadge.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account information and preferences</p>
        </div>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md transition"
        >
          {isEditing ? (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Quick Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Avatar Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()
                )}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-200 hover:bg-slate-50 transition">
                  <Camera className="w-4 h-4 text-slate-600" />
                </button>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
              <p className="text-sm text-slate-500">{currentUser.email}</p>
            </div>

            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm ${roleBadge.color}`}>
              <RoleIcon className="w-4 h-4" />
              {roleBadge.label}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Account Status:</span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Member Since:</span>
                <span className="text-slate-700 font-medium">{currentUser.createdAt || 'Jan 2026'}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {currentUser.role === 'patient' && (
            <div className="bg-gradient-to-br from-brand-50 to-sky-50 rounded-2xl border border-brand-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-600" />
                Emergency Profile
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <span className="text-slate-600">Blood Group:</span>
                  <span className="font-bold text-red-600">{currentUser.bloodGroup || 'O+'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <span className="text-slate-600">Age:</span>
                  <span className="font-bold text-slate-900">{currentUser.age || '48'} years</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-600" />
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                ) : (
                  <p className="text-sm text-slate-900 font-medium">{currentUser.name}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                ) : (
                  <p className="text-sm text-slate-900 font-medium">{currentUser.email}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                ) : (
                  <p className="text-sm text-slate-900 font-medium">{currentUser.phone || '+91 98765 43210'}</p>
                )}
              </div>

              {currentUser.role === 'patient' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Age</label>
                    <p className="text-sm text-slate-900 font-medium">{currentUser.age || '48'} years</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Gender</label>
                    <p className="text-sm text-slate-900 font-medium capitalize">{currentUser.gender || 'Male'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Blood Group</label>
                    <p className="text-sm text-red-600 font-bold flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5" />
                      {currentUser.bloodGroup || 'O+'}
                    </p>
                  </div>
                </>
              )}

              {currentUser.role === 'hospital_staff' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Staff ID</label>
                    <p className="text-sm text-slate-900 font-mono font-medium">{currentUser.staffId || currentUser.badgeNumber}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Department</label>
                    <p className="text-sm text-slate-900 font-medium">{currentUser.department || 'Emergency Department'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Specialization</label>
                    <p className="text-sm text-slate-900 font-medium">{currentUser.specialization || 'Emergency Medicine'}</p>
                  </div>
                </>
              )}

              {currentUser.role === 'admin' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Admin ID</label>
                  <p className="text-sm text-slate-900 font-mono font-medium">{currentUser.badgeNumber || 'ADMIN-001'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Emergency Information */}
          {currentUser.role === 'patient' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-brand-600" />
                Emergency Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Emergency Contact</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.emergencyContact}
                      onChange={e => handleChange('emergencyContact', e.target.value)}
                      placeholder="+91 98765 00000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  ) : (
                    <p className="text-sm text-slate-900 font-medium">{currentUser.emergencyContact || '+91 98765 00000'}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Medical Information / Allergies</label>
                  {isEditing ? (
                    <textarea
                      value={formData.medicalInfo}
                      onChange={e => handleChange('medicalInfo', e.target.value)}
                      placeholder="Any allergies, chronic conditions, or important medical information..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  ) : (
                    <p className="text-sm text-slate-900">{currentUser.medicalInfo || 'No allergies reported. Hypertension, Type 2 Diabetes.'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Professional Information */}
          {currentUser.role === 'hospital_staff' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-brand-600" />
                Professional Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Assigned Hospital</label>
                  <p className="text-sm text-slate-900 font-medium flex items-center gap-2">
                    <Hospital className="w-4 h-4 text-emerald-600" />
                    {currentUser.hospitalName || 'CityCare Medical Center'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Experience</label>
                  <p className="text-sm text-slate-900 font-medium">{currentUser.experienceYears || '12'} years</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Hospital ID</label>
                  <p className="text-sm text-slate-900 font-mono font-medium">{currentUser.hospitalId || 'hosp-citycare'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Location & Permissions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-600" />
              Location & Permissions
            </h3>

            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-900">Location Access</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Enabled
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  MediFlow AI uses your location to find nearby hospitals and provide accurate routing.
                </p>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-emerald-200 rounded-lg text-xs font-semibold text-slate-700 transition">
                  <LocateFixed className="w-3.5 h-3.5" />
                  Refresh Location
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">Current Location:</span>
                  <span className="text-slate-900 font-medium">{currentUser.location || 'Bangalore, India'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block mb-0.5">Accuracy:</span>
                  <span className="text-slate-900 font-medium">±18 m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
