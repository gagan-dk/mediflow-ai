import React from 'react';
import { 
  Home, 
  MessageSquare, 
  FileText, 
  Hospital, 
  Calendar, 
  Clock, 
  Truck, 
  BarChart3, 
  Activity, 
  Navigation, 
  Shield, 
  ShieldAlert,
  Settings, 
  Plus, 
  Building2,
  X,
  LogOut,
  Pill
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  currentPath: string;
  navigate: (path: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  navigate,
  isMobileOpen,
  onCloseMobile
}) => {
  const { currentUser, logout } = useApp();

  const handleNav = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  const navItems = [
    { label: 'Home', path: '/', icon: Home, roles: ['patient', 'hospital_staff', 'admin'] },
    { label: 'Ask MediFlash', path: '/ask', icon: MessageSquare, roles: ['patient', 'hospital_staff', 'admin'] },
    { label: 'Emergency Triage', path: '/assessment', icon: ShieldAlert, roles: ['patient', 'hospital_staff', 'admin'] },
    { 
      label: currentUser.role === 'hospital_staff' ? 'Hospital Management' : 'Health records', 
      path: currentUser.role === 'hospital_staff' ? '/hospital' : '/finder', 
      icon: currentUser.role === 'hospital_staff' ? Building2 : FileText, 
      roles: ['patient', 'hospital_staff', 'admin'] 
    },
    { label: 'Medications', path: '/ambulances', icon: Pill, roles: ['patient', 'hospital_staff', 'admin'] },
    { label: 'Appointments', path: '/queue', icon: Calendar, roles: ['patient', 'hospital_staff', 'admin'] },
    ...(currentUser.role === 'patient' 
      ? [{ label: 'My Journey', path: '/journey', icon: Navigation, roles: ['patient'] }]
      : []
    ),
    ...(currentUser.role === 'hospital_staff' || currentUser.role === 'admin'
      ? [{ label: 'Command Center', path: '/command-center', icon: BarChart3, roles: ['hospital_staff', 'admin'] }]
      : []
    ),
    ...(currentUser.role === 'admin'
      ? [{ label: 'System Insights', path: '/insights', icon: Activity, roles: ['admin'] }]
      : []
    ),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#dce4e3] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:shadow-none'
        }`}
        aria-label="Sidebar navigation"
      >
        {/* Top: Brand Header & Main Nav */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Mark */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-transparent">
            <button
              onClick={() => handleNav('/')}
              className="flex items-center gap-3 text-left group"
              aria-label="MediFlash Home"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0f766e] text-white shadow-xs group-hover:bg-[#0b5f58] transition-colors">
                <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
              </div>
              <span className="font-bold text-xl text-[#14201f] tracking-tight">MediFlash</span>
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-[#4b5b5a] hover:bg-slate-100"
              aria-label="Close navigation sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Nav List */}
          <nav className="px-3 py-4 space-y-1" aria-label="Main navigation links">
            {navItems.map(item => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#e6f2f1] text-[#0b5f58] font-semibold'
                      : 'text-[#4b5b5a] hover:text-[#14201f] hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0b5f58]' : 'text-[#6b7c7a]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Settings & Privacy Links */}
        <div className="p-3 border-t border-[#dce4e3] space-y-1 bg-white">
          <button
            onClick={() => handleNav('/privacy')}
            aria-current={currentPath === '/privacy' ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              currentPath === '/privacy'
                ? 'bg-[#e6f2f1] text-[#0b5f58] font-semibold'
                : 'text-[#4b5b5a] hover:text-[#14201f] hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4 text-[#6b7c7a]" />
            <span>Privacy and data</span>
          </button>

          <button
            onClick={() => handleNav('/settings')}
            aria-current={currentPath === '/settings' ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              currentPath === '/settings'
                ? 'bg-[#e6f2f1] text-[#0b5f58] font-semibold'
                : 'text-[#4b5b5a] hover:text-[#14201f] hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4 text-[#6b7c7a]" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#b42318] hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-[#b42318]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
