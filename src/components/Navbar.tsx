import React, { useState } from 'react';
import { 
  Activity, 
  Sparkles, 
  AlertOctagon, 
  Bell, 
  PhoneCall, 
  ChevronDown, 
  Menu, 
  X, 
  ShieldAlert,
  Hospital,
  MapPin,
  Clock,
  Navigation,
  FileText,
  Lock,
  BarChart3,
  Truck,
  User,
  LogOut,
  Settings
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/user';
import { NotificationDrawer } from './NotificationDrawer';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const { 
    currentUser, 
    setUserRole, 
    simulateHospitalBecomingFull, 
    notifications,
    isAuthenticated,
    logout,
    login
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isEmergencyCallModalOpen, setIsEmergencyCallModalOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navLinks = [
    { label: 'Home', path: '/', icon: Activity },
    { label: 'Emergency Prioritization', path: '/assessment', icon: ShieldAlert },
    ...(currentUser.role === 'hospital_staff' 
      ? [{ label: 'Hospital', path: '/hospital', icon: Hospital }] 
      : [{ label: 'Find Hospital', path: '/finder', icon: Hospital }]
    ),
    { label: 'Live Queue', path: '/queue', icon: Clock },
    { label: 'My Journey', path: '/journey', icon: Navigation },
    { label: 'Command Center', path: '/command-center', icon: BarChart3 },
    { label: 'Ambulances', path: '/ambulances', icon: Truck },
    { label: 'System Insights', path: '/insights', icon: Sparkles },
    { label: 'Privacy & Safety', path: '/privacy', icon: Lock }
  ];

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    setIsRoleDropdownOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => handleNavClick('/')}>
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white shadow-md shadow-brand-500/30">
                <Activity className="w-5 h-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">MediFlow</span>
                  <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                    AI
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium tracking-tight -mt-0.5">
                  Smart Hospital Queue & Emergency Routing
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = currentPath === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Action Bar */}
            <div className="flex items-center gap-2">
              {/* Dynamic Capacity Crash Button */}
              <button
                onClick={() => simulateHospitalBecomingFull('hosp-citycare')}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-semibold transition shrink-0"
                title="Simulate primary hospital reaching capacity to demonstrate automated dynamic rerouting"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden lg:inline">Simulate Full ER</span>
              </button>

              {/* User Info + Logout — shown when authenticated */}
               {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-2">
                   {/* Profile Dropdown */}
                   <div className="relative">
                     <button
                       onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                       className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                     >
                       <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">
                         {currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()}
                       </div>
                       <div className="hidden lg:block">
                         <div className="text-[11px] font-bold text-slate-800 truncate max-w-[90px]">{currentUser.name.split(' ')[0]}</div>
                         <div className="text-[9px] text-slate-500 capitalize">{currentUser.role.replace('_', ' ')}</div>
                       </div>
                       <ChevronDown className="w-3 h-3 text-slate-400 hidden lg:inline" />
                     </button>

                     {isProfileDropdownOpen && (
                       <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in">
                         <button
                           onClick={() => {
                             handleNavClick('/profile');
                             setIsProfileDropdownOpen(false);
                           }}
                           className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50"
                         >
                           <span className="flex items-center gap-2">
                             <User className="w-3.5 h-3.5 text-slate-500" />
                             Profile
                           </span>
                         </button>
                         <button
                           onClick={() => {
                             handleNavClick('/settings');
                             setIsProfileDropdownOpen(false);
                           }}
                           className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50"
                         >
                           <span className="flex items-center gap-2">
                             <Settings className="w-3.5 h-3.5 text-slate-500" />
                             Settings
                           </span>
                         </button>
                         <div className="border-t border-slate-100 my-1" />
                         <button
                           onClick={() => {
                             logout();
                             setIsProfileDropdownOpen(false);
                           }}
                           className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                         >
                           <LogOut className="w-3.5 h-3.5" />
                           Logout
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
               ) : (
                /* Role Switcher (demo purposes only) */
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="capitalize text-[11px] max-w-[90px] truncate">{currentUser.role.replace('_', ' ')}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isRoleDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in">
                      <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                        Switch Demo Perspective
                      </div>
                      <button
                        onClick={() => handleRoleSelect('patient')}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${currentUser.role === 'patient' ? 'font-bold text-brand-600' : 'text-slate-700'}`}
                      >
                        <span>👤 Patient / Caregiver</span>
                        {currentUser.role === 'patient' && <span className="text-[10px] text-brand-600">Active</span>}
                      </button>
                      <button
                        onClick={() => handleRoleSelect('hospital_staff')}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${currentUser.role === 'hospital_staff' ? 'font-bold text-brand-600' : 'text-slate-700'}`}
                      >
                        <span>🩺 ER Doctor / Triage Nurse</span>
                        {currentUser.role === 'hospital_staff' && <span className="text-[10px] text-brand-600">Active</span>}
                      </button>
                      <button
                        onClick={() => handleRoleSelect('paramedic')}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${currentUser.role === 'paramedic' ? 'font-bold text-brand-600' : 'text-slate-700'}`}
                      >
                        <span>🚑 EMS Paramedic</span>
                        {currentUser.role === 'paramedic' && <span className="text-[10px] text-brand-600">Active</span>}
                      </button>
                      <button
                        onClick={() => handleRoleSelect('admin')}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${currentUser.role === 'admin' ? 'font-bold text-brand-600' : 'text-slate-700'}`}
                      >
                        <span>🏢 Hospital Admin / Director</span>
                        {currentUser.role === 'admin' && <span className="text-[10px] text-brand-600">Active</span>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notification Bell */}
              <button
                onClick={() => setIsNotificationDrawerOpen(true)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                title="System Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-red-500 text-white rounded-full text-[9px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Emergency SOS Button */}
              <button
                onClick={() => setIsEmergencyCallModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition transform active:scale-95"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SOS 112</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="xl:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{link.label}</span>
                </button>
              );
            })}
            
            {/* Mobile Profile Section */}
            {isAuthenticated && (
              <div className="pt-3 border-t border-slate-200 space-y-1">
                <button
                  onClick={() => handleNavClick('/profile')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => handleNavClick('/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
            
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => simulateHospitalBecomingFull('hosp-citycare')}
                className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200"
              >
                <AlertOctagon className="w-4 h-4" />
                Simulate Full ER (Auto-Reroute)
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />

      {/* Emergency Call Quick Modal */}
      {isEmergencyCallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-xl">
                <PhoneCall className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Emergency Services Dispatch</h3>
                <p className="text-xs text-slate-500">Immediate Direct Calling Service</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If you or someone nearby is experiencing a life-threatening emergency (such as cardiac arrest, severe trauma, or acute breathing cessation), contact emergency response immediately.
            </p>

            <div className="space-y-2">
              <a
                href="tel:112"
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-600/30 transition"
              >
                <PhoneCall className="w-4 h-4" /> Call National Emergency (112)
              </a>
              <a
                href="tel:108"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                <PhoneCall className="w-4 h-4" /> Call National Ambulance (108)
              </a>
            </div>

            <button
              onClick={() => setIsEmergencyCallModalOpen(false)}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition text-center"
            >
              Cancel / Return to MediFlow AI
            </button>
          </div>
        </div>
      )}
    </>
  );
};
