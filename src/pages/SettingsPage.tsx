import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Check,
  KeyRound,
  Bell,
  ShieldCheck,
  Globe,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, currentUser, logout } = useApp();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [notifPrefs, setNotifPrefs] = useState({
    preAlerts: true,
    queueUpdates: true,
    systemAlerts: true,
    promotional: false,
  });

  const handleChangePassword = () => {
    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }
    setPasswordMessage('Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Settings className="w-7 h-7 text-brand-600" />
            Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your preferences, theme, and account security</p>
        </div>
      </div>

      {/* Theme Preference */}
      <div className="bg-white rounded-xl border border-[#dce4e3] shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-[#14201f] flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-5 h-5 text-[#0f766e]" /> : <Sun className="w-5 h-5 text-[#5a3b00]" />}
          Appearance & Theme
        </h3>
        <p className="text-xs text-[#4b5b5a]">Choose how MediFlash looks on your device.</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
              theme === 'light'
                ? 'border-[#0f766e] bg-[#e6f2f1] ring-1 ring-[#0f766e]'
                : 'border-[#dce4e3] hover:border-slate-300 bg-white'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-white border border-[#dce4e3] flex items-center justify-center shrink-0">
              <Sun className="w-4 h-4 text-[#5a3b00]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#14201f]">Light</div>
              <div className="text-[11px] text-[#4b5b5a]">Calm neutral healthcare default</div>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-[#0f766e]" />}
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
              theme === 'dark'
                ? 'border-[#0f766e] bg-[#e6f2f1] ring-1 ring-[#0f766e]'
                : 'border-[#dce4e3] hover:border-slate-300 bg-white'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
              <Moon className="w-4 h-4 text-slate-200" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#14201f]">Dark</div>
              <div className="text-[11px] text-[#4b5b5a]">Sleek dark mode</div>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-[#0f766e]" />}
          </button>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-xl border border-[#dce4e3] shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-[#14201f] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#0f766e]" />
          Account Settings
        </h3>

        {/* Change Password */}
        <div className="border border-[#dce4e3] rounded-lg overflow-hidden">
          <button
            onClick={() => { setPasswordOpen(!passwordOpen); setNotifOpen(false); }}
            className="w-full flex items-center justify-between p-3.5 bg-[#f7f9f9] hover:bg-slate-100 text-sm transition-colors"
          >
            <span className="font-medium text-[#14201f] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#4b5b5a]" /> Change Password
            </span>
            <ChevronRight className={`w-4 h-4 text-[#4b5b5a] transition-transform ${passwordOpen ? 'rotate-90' : ''}`} />
          </button>
          {passwordOpen && (
            <div className="p-4 space-y-3 bg-white">
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-3.5 py-2 bg-white border border-[#dce4e3] rounded-lg text-sm text-[#14201f] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3.5 py-2 bg-white border border-[#dce4e3] rounded-lg text-sm text-[#14201f] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
              />
              {passwordMessage && (
                <p className={`text-xs font-semibold ${passwordMessage.includes('successfully') ? 'text-[#1b6e3c]' : 'text-[#b42318]'}`}>
                  {passwordMessage}
                </p>
              )}
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-[#0f766e] hover:bg-[#0b5f58] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              >
                Update Password
              </button>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        {/* Notification Preferences */}
        <div className="border border-[#dce4e3] rounded-lg overflow-hidden">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setPasswordOpen(false); }}
            className="w-full flex items-center justify-between p-3.5 bg-[#f7f9f9] hover:bg-slate-100 text-sm transition-colors"
          >
            <span className="font-medium text-[#14201f] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#4b5b5a]" /> Notification Preferences
            </span>
            <ChevronRight className={`w-4 h-4 text-[#4b5b5a] transition-transform ${notifOpen ? 'rotate-90' : ''}`} />
          </button>
          {notifOpen && (
            <div className="p-4 space-y-3 bg-white">
              {([
                ['preAlerts', 'Emergency Pre-Alerts'],
                ['queueUpdates', 'Queue Status Updates'],
                ['systemAlerts', 'System Alerts'],
                ['promotional', 'Promotional Updates'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[#14201f]">{label}</span>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${notifPrefs[key] ? 'bg-[#0f766e]' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${notifPrefs[key] ? 'left-5' : 'left-0.5'}`}
                    />
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Privacy */}
        <button className="w-full flex items-center justify-between p-3.5 bg-[#f7f9f9] hover:bg-slate-100 rounded-lg text-sm border border-[#dce4e3] transition-colors">
          <span className="font-medium text-[#14201f] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4b5b5a]" /> Privacy Settings
          </span>
          <ChevronRight className="w-4 h-4 text-[#4b5b5a]" />
        </button>

        {/* Language */}
        <button className="w-full flex items-center justify-between p-3.5 bg-[#f7f9f9] hover:bg-slate-100 rounded-lg text-sm border border-[#dce4e3] transition-colors">
          <span className="font-medium text-[#14201f] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#4b5b5a]" /> Language — English (India)
          </span>
          <ChevronRight className="w-4 h-4 text-[#4b5b5a]" />
        </button>

        {/* Sign out / Role */}
        <div className="border-t border-[#dce4e3] pt-4">
          <div className="text-xs text-[#4b5b5a] mb-2">
            Signed in as <span className="font-bold text-[#14201f]">{currentUser.name}</span> ({currentUser.role.replace('_', ' ')})
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 bg-[#fdecea] hover:bg-red-100 text-[#b42318] rounded-lg text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};
