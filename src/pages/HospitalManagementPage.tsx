import React, { useState } from 'react';
import { 
  Hospital, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  UserPlus, 
  Building2, 
  BedDouble, 
  Stethoscope, 
  Layers, 
  Info, 
  ChevronRight,
  ShieldAlert,
  Navigation
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InteractiveMap } from '../components/InteractiveMap';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { DoctorManagement } from '../components/DoctorManagement';
import { RoomManagement } from '../components/RoomManagement';
import { Doctor, DoctorSpecialization, DoctorStatus, DutyStatus } from '../types/doctor';
import { Room, RoomType, RoomStatus } from '../types/room';

interface HospitalManagementPageProps {
  navigate: (path: string) => void;
}

export const HospitalManagementPage: React.FC<HospitalManagementPageProps> = ({ navigate }) => {
  const { 
    hospitals, 
    selectedHospital, 
    setSelectedHospital, 
    userLiveLocation, 
    detectUserLiveLocation,
    currentUser,
    doctors,
    setDoctors,
    rooms,
    setRooms
  } = useApp();

  const [activeSection, setActiveSection] = useState<'selection' | 'profile' | 'doctors' | 'rooms' | 'beds' | 'icu' | 'emergency'>('selection');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospitalForProfile, setSelectedHospitalForProfile] = useState<typeof selectedHospital>(null);

  // Filter hospitals based on search
  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectHospital = (hospital: any) => {
    setSelectedHospital(hospital);
    setSelectedHospitalForProfile(hospital);
    setActiveSection('profile');
  };

  const handleBackToSelection = () => {
    setActiveSection('selection');
    setSelectedHospitalForProfile(null);
  };

  const handleAddDoctor = (doctor: Omit<Doctor, 'id'>) => {
    const newDoctor: Doctor = {
      ...doctor,
      id: `doc-${Date.now()}`
    };
    setDoctors([...doctors, newDoctor]);
  };

  const handleUpdateDoctor = (id: string, updates: Partial<Doctor>) => {
    setDoctors(doctors.map(doc => doc.id === id ? { ...doc, ...updates } : doc));
  };

  const handleRemoveDoctor = (id: string) => {
    setDoctors(doctors.filter(doc => doc.id !== id));
  };

  const handleAddRoom = (room: Omit<Room, 'id'>) => {
    const newRoom: Room = {
      ...room,
      id: `room-${Date.now()}`
    };
    setRooms([...rooms, newRoom]);
  };

  const handleUpdateRoom = (id: string, updates: Partial<Room>) => {
    setRooms(rooms.map(room => room.id === id ? { ...room, ...updates, lastUpdated: new Date().toISOString() } : room));
  };

  const handleRemoveRoom = (id: string) => {
    setRooms(rooms.filter(room => room.id !== id));
  };

  const handleAssignPatient = (roomId: string, patientId: string) => {
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? { ...room, assignedPatient: patientId, status: 'Occupied', currentOccupancy: room.currentOccupancy + 1, lastUpdated: new Date().toISOString() }
        : room
    ));
  };

  // Hospital staff should only see this page
  if (currentUser.role !== 'hospital_staff') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-slate-600">Hospital Management is only available to Hospital Staff.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-bold">
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeSection === 'selection' ? 'Select Your Hospital' : 
             selectedHospitalForProfile?.name || 'Hospital Profile'}
          </h1>
          <p className="text-xs text-slate-500">
            {activeSection === 'selection' 
              ? 'Select and configure your hospital to manage emergency resources, doctors, rooms and patient care.'
              : 'Manage hospital information, doctors, beds, rooms and emergency facilities.'}
          </p>
        </div>

        {activeSection !== 'selection' && (
          <button
            onClick={handleBackToSelection}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            <MapPin className="w-4 h-4" />
            <span>Change Hospital</span>
          </button>
        )}
      </div>

      <DisclaimerBanner compact />

      {/* Hospital Selection Section */}
      {activeSection === 'selection' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search hospital by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Map Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-semibold text-slate-900">
                  Current Location: {userLiveLocation.address || 'Detecting...'}
                </span>
              </div>
              <button
                onClick={detectUserLiveLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Detect Location</span>
              </button>
            </div>
            
            <div className="h-96 relative">
              <InteractiveMap
                hospitals={filteredHospitals}
                onSelectHospital={handleSelectHospital}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Hospital List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Hospital className="w-4 h-4 text-brand-600" />
              Nearby Hospitals ({filteredHospitals.length})
            </h3>
            
            <div className="space-y-3">
              {filteredHospitals.map((hospital) => {
                const distance = hospital.travelTimeMinutes ? `${hospital.travelTimeMinutes} min away` : 'Unknown distance';
                
                return (
                  <div
                    key={hospital.id}
                    onClick={() => handleSelectHospital(hospital)}
                    className="p-4 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-xl cursor-pointer transition group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Hospital className="w-4 h-4 text-brand-600" />
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition">
                            {hospital.name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{hospital.address || 'Address not available'}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {distance}
                          </span>
                          <span className="flex items-center gap-1">
                            <BedDouble className="w-3 h-3" />
                            {hospital.availableBeds} beds available
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 transition" />
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredHospitals.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No hospitals found matching your search.</p>
              </div>
            )}
          </div>

          {/* Data Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold mb-1">Important Note</p>
                <p className="leading-relaxed">
                  Hospital operational data shown in this prototype may be simulated or staff-entered. 
                  It should not be interpreted as verified real-time clinical capacity unless connected to an authorized hospital information system.
                  The map is used for hospital identification and location selection only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Profile Section */}
      {activeSection === 'profile' && selectedHospitalForProfile && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <BedDouble className="w-3.5 h-3.5" />
                <span>Total Beds</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{selectedHospitalForProfile.totalBeds}</div>
              <div className="text-xs text-emerald-600 font-medium">{selectedHospitalForProfile.availableBeds} available</div>
            </div>
            
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>ICU Beds</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{selectedHospitalForProfile.totalICUBeds}</div>
              <div className="text-xs text-emerald-600 font-medium">{selectedHospitalForProfile.availableICUBeds} available</div>
            </div>
            
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Wait Time</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{selectedHospitalForProfile.estimatedWaitTimeMinutes}m</div>
              <div className="text-xs text-slate-500">average wait</div>
            </div>
            
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ER Load</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{selectedHospitalForProfile.currentERLoadPercent}%</div>
              <div className="text-xs text-slate-500">capacity</div>
            </div>
          </div>

          {/* Management Sections */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Hospital Management</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              <button
                onClick={() => setActiveSection('doctors')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900">Doctors & Specialists</div>
                    <div className="text-xs text-slate-500">Manage medical staff and availability</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
              
              <button
                onClick={() => setActiveSection('rooms')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900">Room Management</div>
                    <div className="text-xs text-slate-500">Manage rooms, beds and assignments</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
              
              <button
                onClick={() => setActiveSection('beds')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <BedDouble className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900">Bed Management</div>
                    <div className="text-xs text-slate-500">Monitor and update bed availability</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
              
              <button
                onClick={() => setActiveSection('icu')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900">ICU Management</div>
                    <div className="text-xs text-slate-500">Critical care bed and ventilator management</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
              
              <button
                onClick={() => setActiveSection('emergency')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900">Emergency Department</div>
                    <div className="text-xs text-slate-500">Emergency room and triage management</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Basic Hospital Information */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Hospital Name</label>
                <div className="text-sm font-medium text-slate-900">{selectedHospitalForProfile.name}</div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Address</label>
                <div className="text-sm font-medium text-slate-900">{selectedHospitalForProfile.address || 'Not specified'}</div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Emergency Phone</label>
                <div className="text-sm font-medium text-slate-900">108 / 112</div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Coordinates</label>
                <div className="text-sm font-medium text-slate-900 font-mono">
                  {selectedHospitalForProfile.coordinates?.lat?.toFixed(4)}, {selectedHospitalForProfile.coordinates?.lng?.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Management Section */}
      {activeSection === 'doctors' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setActiveSection('profile')}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span>Back to Hospital Profile</span>
            </button>
          </div>
          <DoctorManagement
            doctors={doctors}
            onAddDoctor={handleAddDoctor}
            onUpdateDoctor={handleUpdateDoctor}
            onRemoveDoctor={handleRemoveDoctor}
          />
        </div>
      )}

      {/* Room Management Section */}
      {activeSection === 'rooms' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setActiveSection('profile')}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span>Back to Hospital Profile</span>
            </button>
          </div>
          <RoomManagement
            rooms={rooms}
            onAddRoom={handleAddRoom}
            onUpdateRoom={handleUpdateRoom}
            onRemoveRoom={handleRemoveRoom}
            onAssignPatient={handleAssignPatient}
          />
        </div>
      )}

      {/* Placeholder for other sections */}
      {(activeSection === 'beds' || activeSection === 'icu' || activeSection === 'emergency') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
            <Layers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Coming Soon</h3>
          <p className="text-sm text-slate-500 mb-4">
            The {activeSection} management section is under development.
          </p>
          <button
            onClick={() => setActiveSection('profile')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Back to Hospital Profile
          </button>
        </div>
      )}
    </div>
  );
};