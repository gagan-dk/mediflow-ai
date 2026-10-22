import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Globe, 
  User, 
  Menu, 
  Bell, 
  PhoneCall, 
  ShieldAlert, 
  X,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AppHeaderProps {
  onOpenMobileMenu: () => void;
  navigate: (path: string) => void;
  onOpenNotifications?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenMobileMenu, navigate, onOpenNotifications }) => {
  const { currentUser, notifications, logout } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (
        searchQuery.toLowerCase().includes('hospital') ||
        searchQuery.toLowerCase().includes('bed') ||
        searchQuery.toLowerCase().includes('icu')
      ) {
        navigate('/finder');
      } else {
        navigate('/ask?q=' + encodeURIComponent(searchQuery));
      }
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-[#dce4e3] h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Global Search */}
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          {/* Mobile hamburger */}
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-[#4b5b5a] hover:bg-slate-100 focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search bar matching Screenshot 3 */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-[#6b7c7a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations and records"
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dce4e3] rounded-lg text-sm text-[#14201f] placeholder:text-[#6b7c7a] focus:border-[#0f766e] focus:outline-none focus:ring-1 focus:ring-[#0f766e] transition-colors"
            />
          </form>
        </div>

        {/* Right: Language, Emergency Hotline, Notifications & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language selector */}
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#dce4e3] rounded-lg text-xs font-medium text-[#14201f] hover:bg-slate-50 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[#6b7c7a]" />
            <span>English</span>
          </button>

          {/* Emergency Hotline Button */}
          <button
            onClick={() => setIsSosOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#fdecea] hover:bg-red-100 border border-red-200 text-[#b42318] rounded-lg text-xs font-semibold transition-colors"
            title="Emergency National Assistance"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Emergency 112</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-[#4b5b5a] hover:bg-slate-100 transition-colors"
            aria-label="Open notifications"
          >
            <Bell className="w-4 h-4 text-[#6b7c7a]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#b42318]" />
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              aria-label="User account menu"
              aria-expanded={isProfileOpen}
            >
              <div className="w-8 h-8 rounded-full bg-[#e6f2f1] text-[#0b5f58] font-semibold text-xs flex items-center justify-center border border-[#c3e3e0]">
                {getInitials(currentUser?.name)}
              </div>
              <span className="hidden xl:inline text-xs font-medium text-[#14201f]">
                {currentUser?.name || 'User'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#6b7c7a] hidden xl:inline" />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#dce4e3] rounded-xl shadow-lg py-1.5 z-50 text-xs">
                <div className="px-4 py-2 border-b border-[#dce4e3]">
                  <div className="font-semibold text-[#14201f] truncate">{currentUser?.name}</div>
                  <div className="text-[#4b5b5a] text-[11px] truncate">{currentUser?.email}</div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#e6f2f1] text-[#0b5f58] capitalize">
                    {currentUser?.role?.replace('_', ' ')}
                  </span>
                </div>

                <button
                  onClick={() => { setIsProfileOpen(false); navigate('/profile'); }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 text-[#14201f] flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-[#6b7c7a]" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => { setIsProfileOpen(false); navigate('/settings'); }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 text-[#14201f] flex items-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5 text-[#6b7c7a]" />
                  <span>Preferences</span>
                </button>

                <div className="border-t border-[#dce4e3] my-1" />

                <button
                  onClick={() => { setIsProfileOpen(false); logout(); }}
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-[#b42318] flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Emergency Hotline Modal */}
      {isSosOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#dce4e3] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-[#b42318]">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="font-bold text-lg text-[#14201f]">Emergency Healthcare Helplines</h3>
              </div>
              <button onClick={() => setIsSosOpen(false)} className="text-[#6b7c7a] hover:text-[#14201f]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#4b5b5a] leading-relaxed">
              If you or someone near you is experiencing severe symptoms, call national emergency response immediately:
            </p>
            <div className="space-y-2">
              <a
                href="tel:112"
                className="flex items-center justify-between p-3.5 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 text-[#b42318] font-bold text-sm transition-colors"
              >
                <span>National Emergency Response</span>
                <span className="font-mono text-base">112</span>
              </a>
              <a
                href="tel:108"
                className="flex items-center justify-between p-3.5 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 text-[#5a3b00] font-bold text-sm transition-colors"
              >
                <span>National Ambulance Service</span>
                <span className="font-mono text-base">108</span>
              </a>
            </div>
            <div className="pt-2 text-center">
              <button
                onClick={() => setIsSosOpen(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#14201f] font-semibold text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
