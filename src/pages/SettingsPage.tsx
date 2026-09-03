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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-5 h-5 text-brand-600" /> : <Sun className="w-5 h-5 text-amber-500" />}
          Appearance & Theme
        </h3>
        <p className="text-xs text-slate-500">Choose how MediFlow AI looks on your device.</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
              theme === 'light'
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">Light</div>
              <div className="text-[11px] text-slate-500">Bright & clean default</div>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-brand-600" />}
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
              theme === 'dark'
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 text-slate-200" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">Dark</div>
              <div className="text-[11px] text-slate-500">Easier on the eyes at night</div>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-brand-600" />}
          </button>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-brand-600" />
          Account Settings
        </h3>

        {/* Change Password */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => { setPasswordOpen(!passwordOpen); setNotifOpen(false); }}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition"
          >
            <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-500" /> Change Password
            </span>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${passwordOpen ? 'rotate-90' : ''}`} />
          </button>
          {passwordOpen && (
            <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {passwordMessage && (
                <p className={`text-xs font-semibold ${passwordMessage.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {passwordMessage}
                </p>
              )}
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition"
              >
                Update Password
              </button>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setPasswordOpen(false); }}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition"
          >
            <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-500" /> Notification Preferences
            </span>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${notifOpen ? 'rotate-90' : ''}`} />
          </button>
          {notifOpen && (
            <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
              {([
                ['preAlerts', 'Emergency Pre-Alerts'],
                ['queueUpdates', 'Queue Status Updates'],
                ['systemAlerts', 'System Alerts'],
                ['promotional', 'Promotional Updates'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`relative w-10 h-5 rounded-full transition ${notifPrefs[key] ? 'bg-brand-600' : 'bg-slate-300'}`}
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
        <button className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm transition">
          <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500" /> Privacy Settings
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Language */}
        <button className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm transition">
          <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" /> Language — English (India)
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Sign out / Role */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="text-xs text-slate-500 mb-2">
            Signed in as <span className="font-bold text-slate-700 dark:text-slate-200">{currentUser.name}</span> ({currentUser.role.replace('_', ' ')})
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};
