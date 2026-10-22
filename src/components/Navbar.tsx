import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  AlertOctagon,
  Bell,
  PhoneCall,
  ChevronDown,
  Menu,
  X,
  ShieldAlert,
  Hospital,
  Clock,
  Navigation,
  Lock,
  BarChart3,
  Truck,
  User,
  LogOut,
  Settings,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NotificationDrawer } from './NotificationDrawer';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const {
    currentUser,
    simulateHospitalBecomingFull,
    notifications,
    isAuthenticated,
    logout,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isEmergencyCallModalOpen, setIsEmergencyCallModalOpen] = useState(false);

  // Refs for focus management (ACC-04, ACC-05)
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const sosModalFirstFocusRef = useRef<HTMLAnchorElement>(null);
  const sosTriggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navLinks = [
    { label: 'Home', path: '/', icon: Activity, roles: ['patient', 'hospital_staff', 'admin'] },
    { label: 'Emergency Prioritization', path: '/assessment', icon: ShieldAlert, roles: ['patient', 'hospital_staff', 'admin'] },
    ...(currentUser.role === 'hospital_staff'
      ? [{ label: 'Hospital', path: '/hospital', icon: Hospital, roles: ['hospital_staff'] }]
      : [{ label: 'Find Hospital', path: '/finder', icon: Hospital, roles: ['patient', 'admin'] }]
    ),
    { label: 'Live Queue', path: '/queue', icon: Clock, roles: ['patient', 'hospital_staff', 'admin'] },
    { label: 'My Journey', path: '/journey', icon: Navigation, roles: ['patient'] },
    { label: 'Command Center', path: '/command-center', icon: BarChart3, roles: ['hospital_staff', 'admin'] },
    { label: 'Ambulances', path: '/ambulances', icon: Truck, roles: ['hospital_staff', 'admin'] },
    { label: 'System Insights', path: '/insights', icon: Activity, roles: ['admin'] },
    { label: 'Privacy & Safety', path: '/privacy', icon: Lock, roles: ['patient', 'hospital_staff', 'admin'] },
  ].filter(link => (link.roles as string[]).includes(currentUser.role));

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  // ACC-04: Close profile dropdown on Escape and outside click
  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileDropdownOpen(false);
        profileBtnRef.current?.focus();
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node) &&
        !profileBtnRef.current?.contains(e.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isProfileDropdownOpen]);

  // ACC-05: Focus trap and Escape close for SOS modal
  useEffect(() => {
    if (!isEmergencyCallModalOpen) return;
    // Focus first element when modal opens
    setTimeout(() => sosModalFirstFocusRef.current?.focus(), 0);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEmergencyCallModalOpen(false);
        sosTriggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isEmergencyCallModalOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm dark:bg-slate-900/90 dark:border-slate-700">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16 gap-2">

            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer shrink-0"
              onClick={() => handleNavClick('/')}
              role="link"
              tabIndex={0}
              aria-label="MediFlash AI — go to home"
              onKeyDown={e => e.key === 'Enter' && handleNavClick('/')}
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white shadow-md shadow-brand-500/25">
                <Activity className="w-5 h-5" aria-hidden="true" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">MediFlash</span>
                  <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                    AI
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-semibold rounded-md">
                    Beta
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium tracking-tight -mt-0.5 hidden lg:block">
                  Emergency Routing & Hospital Queue
                </div>
              </div>
            </div>

            {/* Desktop Navigation — visible at lg (1024px+), fixes A-22 */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
              {navLinks.map((link) => {
                const isActive = currentPath === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link.path)}
                    aria-current={isActive ? 'page' : undefined}  /* ACC-02 */
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/60 shadow-sm dark:bg-brand-950 dark:text-brand-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Action Bar */}
            <div className="flex items-center gap-2">

              {/* Simulate Full ER — DEV only (A-03, A-23, DD-05) */}
              {import.meta.env.DEV && (
                <button
                  onClick={() => simulateHospitalBecomingFull()}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-semibold transition shrink-0"
                  title="[DEV] Simulate primary hospital reaching capacity"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />
                  <span className="hidden xl:inline">Simulate Full ER</span>
                </button>
              )}

              {/* Profile Dropdown — shown when authenticated */}
              {isAuthenticated && (
                <div className="hidden sm:block relative">
                  <button
                    ref={profileBtnRef}
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    aria-haspopup="true"
                    aria-expanded={isProfileDropdownOpen}
                    aria-label={`User menu for ${currentUser.name}`}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">
                      {currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="hidden lg:block">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">{currentUser.name.split(' ')[0]}</div>
                      <div className="text-[9px] text-slate-500 capitalize">{currentUser.role.replace('_', ' ')}</div>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden lg:inline" aria-hidden="true" />
                  </button>

                  {isProfileDropdownOpen && (
                    <div
                      ref={profileDropdownRef}
                      role="menu"
                      aria-label="User menu"
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-fade-in"
                    >
                      <button
                        role="menuitem"
                        onClick={() => handleNavClick('/profile')}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                        Profile
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => handleNavClick('/settings')}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                        Settings
                      </button>
                      <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                      <button
                        role="menuitem"
                        onClick={() => { logout(); setIsProfileDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notification Bell */}
              <button
                onClick={() => setIsNotificationDrawerOpen(true)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-red-500 text-white rounded-full text-[9px] font-bold"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Emergency SOS Button */}
              <button
                ref={sosTriggerRef}
                onClick={() => setIsEmergencyCallModalOpen(true)}
                aria-label="Emergency SOS — open emergency call options"
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-colors active:scale-95"
              >
                <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">SOS 112</span>
              </button>

              {/* Mobile Menu Toggle — ACC-03 */}
              <button
                ref={mobileMenuBtnRef}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav-menu"
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                {isMobileMenuOpen
                  ? <X className="w-5 h-5" aria-hidden="true" />
                  : <Menu className="w-5 h-5" aria-hidden="true" />
                }
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            role="navigation"
            aria-label="Mobile navigation"
            className="lg:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavClick(link.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold dark:bg-brand-950 dark:text-brand-300'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                  <span>{link.label}</span>
                </button>
              );
            })}

            {/* Mobile Profile Section */}
            {isAuthenticated && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
                <button
                  onClick={() => handleNavClick('/profile')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => handleNavClick('/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {/* Simulate Full ER — DEV only, mobile */}
            {import.meta.env.DEV && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => simulateHospitalBecomingFull()}
                  className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200"
                >
                  <AlertOctagon className="w-4 h-4" aria-hidden="true" />
                  [DEV] Simulate Full ER
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />

      {/* Emergency SOS Modal — ACC-05: role=dialog, aria-modal, focus trap, Escape close */}
      {isEmergencyCallModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsEmergencyCallModalOpen(false); sosTriggerRef.current?.focus(); } }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sos-modal-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-red-200 dark:border-red-900 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950 rounded-xl shrink-0">
                <PhoneCall className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <div>
                <h3 id="sos-modal-title" className="font-bold text-lg text-slate-900 dark:text-slate-100">
                  Emergency Services
                </h3>
                <p className="text-xs text-slate-500">India — call immediately if in danger</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              If you or someone nearby is experiencing a life-threatening emergency — cardiac arrest, severe trauma, acute breathing difficulty, stroke signs — contact emergency services <strong>immediately</strong>.
            </p>

            <div className="space-y-2">
              <a
                ref={sosModalFirstFocusRef}
                href="tel:112"
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-600/30 transition-colors"
                aria-label="Call National Emergency number 112"
              >
                <PhoneCall className="w-4 h-4" aria-hidden="true" />
                Call 112 — National Emergency
              </a>
              <a
                href="tel:108"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                aria-label="Call National Ambulance service 108"
              >
                <PhoneCall className="w-4 h-4" aria-hidden="true" />
                Call 108 — National Ambulance
              </a>
            </div>

            <button
              onClick={() => { setIsEmergencyCallModalOpen(false); sosTriggerRef.current?.focus(); }}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-center"
            >
              Close and return to MediFlash AI
            </button>
          </div>
        </div>
      )}
    </>
  );
};
