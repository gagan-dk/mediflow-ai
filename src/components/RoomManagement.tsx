import React, { useState } from 'react';
import {
  Building2,
  BedDouble,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  User,
  MapPin,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Droplets
} from 'lucide-react';
import { Room, RoomType, RoomStatus, ROOM_STATUS_COLORS } from '../types/room';

interface RoomManagementProps {
  rooms: Room[];
  onAddRoom: (room: Omit<Room, 'id'>) => void;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  onRemoveRoom: (id: string) => void;
  onAssignPatient: (roomId: string, patientId: string) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  rooms,
  onAddRoom,
  onUpdateRoom,
  onRemoveRoom,
  onAssignPatient
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | RoomType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | RoomStatus>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [assigningRoom, setAssigningRoom] = useState<Room | null>(null);
  const [patientIdInput, setPatientIdInput] = useState('');

  // Filter rooms based on search, type, and status
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = 
      room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'All' || room.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || room.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Summary stats
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(r => r.status === 'Available').length;
  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const cleaningRooms = rooms.filter(r => r.status === 'Cleaning').length;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const roomData: Omit<Room, 'id'> = {
      roomNumber: formData.get('roomNumber') as string,
      type: formData.get('type') as RoomType,
      floor: formData.get('floor') as string,
      department: formData.get('department') as string,
      capacity: parseInt(formData.get('capacity') as string),
      currentOccupancy: parseInt(formData.get('currentOccupancy') as string),
      status: formData.get('status') as RoomStatus,
      assignedPatient: formData.get('assignedPatient') as string || undefined,
      lastUpdated: new Date().toISOString()
    };

    if (editingRoom) {
      onUpdateRoom(editingRoom.id, roomData);
      setEditingRoom(null);
    } else {
      onAddRoom(roomData);
    }
    
    setShowAddForm(false);
    e.currentTarget.reset();
  };

  const handleAssignPatient = () => {
    if (assigningRoom && patientIdInput.trim()) {
      onAssignPatient(assigningRoom.id, patientIdInput.trim());
      setAssigningRoom(null);
      setPatientIdInput('');
    }
  };

  const getStatusBadge = (status: RoomStatus) => {
    const colors = ROOM_STATUS_COLORS[status];
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
        {colors.icon} {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Total Rooms</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalRooms}</div>
        </div>
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Available</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{availableRooms}</div>
        </div>
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <User className="w-3.5 h-3.5 text-red-600" />
            <span>Occupied</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{occupiedRooms}</div>
        </div>
        
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
            <span>Cleaning</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{cleaningRooms}</div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search room number, department or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'All' | RoomType)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="All">All Types</option>
            <option value="Emergency Room">Emergency Room</option>
            <option value="ICU">ICU</option>
            <option value="General Ward">General Ward</option>
            <option value="Private Room">Private Room</option>
            <option value="Operation Theatre">Operation Theatre</option>
            <option value="Consultation Room">Consultation Room</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | RoomStatus)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="All">All Status</option>
            <option value="Available">Available</option>
            <option value="Reserved">Reserved</option>
            <option value="Occupied">Occupied</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Maintenance">Maintenance</option>
          </select>
          
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingRoom(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Add/Edit Room Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            {editingRoom ? 'Edit Room' : 'Add New Room'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Room Number</label>
                <input
                  name="roomNumber"
                  type="text"
                  required
                  defaultValue={editingRoom?.roomNumber}
                  placeholder="ER-01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Room Type</label>
                <select
                  name="type"
                  required
                  defaultValue={editingRoom?.type}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="Emergency Room">Emergency Room</option>
                  <option value="ICU">ICU</option>
                  <option value="General Ward">General Ward</option>
                  <option value="Private Room">Private Room</option>
                  <option value="Semi-Private Room">Semi-Private Room</option>
                  <option value="Operation Theatre">Operation Theatre</option>
                  <option value="Consultation Room">Consultation Room</option>
                  <option value="Isolation Room">Isolation Room</option>
                  <option value="Observation Room">Observation Room</option>
                  <option value="Procedure Room">Procedure Room</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Floor</label>
                <input
                  name="floor"
                  type="text"
                  required
                  defaultValue={editingRoom?.floor}
                  placeholder="Ground Floor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Department</label>
                <input
                  name="department"
                  type="text"
                  required
                  defaultValue={editingRoom?.department}
                  placeholder="Emergency Department"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Capacity</label>
                <input
                  name="capacity"
                  type="number"
                  required
                  min="1"
                  defaultValue={editingRoom?.capacity}
                  placeholder="1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Current Occupancy</label>
                <input
                  name="currentOccupancy"
                  type="number"
                  required
                  min="0"
                  defaultValue={editingRoom?.currentOccupancy}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Status</label>
                <select
                  name="status"
                  required
                  defaultValue={editingRoom?.status || 'Available'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Assigned Patient (Optional)</label>
                <input
                  name="assignedPatient"
                  type="text"
                  defaultValue={editingRoom?.assignedPatient}
                  placeholder="P-1042"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
              >
                {editingRoom ? 'Update Room' : 'Add Room'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingRoom(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Patient Assignment Modal */}
      {assigningRoom && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Assign Patient to {assigningRoom.roomNumber}
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">Room Details</div>
              <div className="text-sm font-semibold text-slate-900">{assigningRoom.type}</div>
              <div className="text-xs text-slate-600">Floor: {assigningRoom.floor} • Dept: {assigningRoom.department}</div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Patient ID</label>
              <input
                type="text"
                value={patientIdInput}
                onChange={(e) => setPatientIdInput(e.target.value)}
                placeholder="Enter patient ID (e.g., P-1042)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleAssignPatient}
                disabled={!patientIdInput.trim()}
                className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition"
              >
                Assign Room
              </button>
              <button
                onClick={() => {
                  setAssigningRoom(null);
                  setPatientIdInput('');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rooms List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Rooms ({filteredRooms.length})
          </h3>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredRooms.map((room) => (
            <div key={room.id} className="p-4 hover:bg-slate-50 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-brand-600" />
                    <h4 className="text-sm font-bold text-slate-900">{room.roomNumber}</h4>
                    {getStatusBadge(room.status)}
                  </div>
                  
                  <p className="text-xs text-slate-600 mb-2">{room.type}</p>
                  
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {room.floor}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {room.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {room.currentOccupancy}/{room.capacity}
                    </span>
                    {room.assignedPatient && (
                      <span className="flex items-center gap-1 text-brand-600">
                        <User className="w-3 h-3" />
                        {room.assignedPatient}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {room.status === 'Available' && (
                    <button
                      onClick={() => setAssigningRoom(room)}
                      className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold transition"
                      title="Assign Patient"
                    >
                      Assign Patient
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingRoom(room);
                      setShowAddForm(true);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Room"
                  >
                    <Edit className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => onRemoveRoom(room.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition"
                    title="Remove Room"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredRooms.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No rooms found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};