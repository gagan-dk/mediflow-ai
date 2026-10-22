import React, { useState } from 'react';
import {
  Plus,
  User,
  Stethoscope,
  Building2,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Lock,
  Mail,
  Clock,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/user';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
  sessionExpired?: boolean;
  onSwitchToRegister?: () => void;
}

type RoleTab = 'patient' | 'hospital_staff' | 'admin';

interface RoleConfig {
  key: RoleTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  badgeText: string;
  demoEmail: string;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    key: 'patient',
    label: 'Patient / Caregiver',
    icon: User,
    description: 'Access emergency triage assessment, hospital queue tracking, and ambulance navigation.',
    badgeText: 'Patient Portal',
    demoEmail: 'patient@example.com',
  },
  {
    key: 'hospital_staff',
    label: 'Hospital Staff',
    icon: Stethoscope,
    description: 'Emergency Operations Command Center, incoming pre-alerts, and ICU bed management.',
    badgeText: 'Clinical Staff',
    demoEmail: 'staff@example.com',
  },
  {
    key: 'admin',
    label: 'Administrator',
    icon: Building2,
    description: 'System-wide analytics, algorithmic simulations, and regional hospital network configuration.',
    badgeText: 'System Admin',
    demoEmail: 'admin@example.com',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, sessionExpired, onSwitchToRegister }) => {
  const { login } = useApp();
  const [activeRole, setActiveRole] = useState<RoleTab>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentConfig = ROLE_CONFIGS.find(r => r.key === activeRole)!;

  const handleRoleSwitch = (role: RoleTab) => {
    setActiveRole(role);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    setError('');

    const result = await login(email, password, activeRole);
    setIsLoading(false);

    if (result.success) {
      onLoginSuccess(result.role || 'patient');
    } else {
      setError(result.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9f9] text-[#14201f] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0f766e] text-white shadow-xs">
              <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
            </div>
            <span className="font-bold text-2xl text-[#14201f] tracking-tight">MediFlash</span>
            <span className="px-2 py-0.5 bg-[#e6f2f1] text-[#0b5f58] text-xs font-semibold rounded-md">
              Beta
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#14201f] tracking-tight pt-2">
            Sign in to your account
          </h1>
          <p className="text-xs sm:text-sm text-[#4b5b5a]">
            Clinical decision support &amp; emergency care coordination
          </p>
        </div>

        {/* Session Expired Notice */}
        {sessionExpired && (
          <div className="flex items-center gap-2.5 p-3.5 bg-[#fff4db] border border-[#fde68a] rounded-lg text-xs text-[#5a3b00]">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Your session has expired. Please sign in again.</span>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-xl border border-[#dce4e3] shadow-xs p-6 sm:p-8 space-y-6">
          {/* Role Selection Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#4b5b5a]">
              Select Persona
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_CONFIGS.map((cfg) => {
                const Icon = cfg.icon;
                const isActive = cfg.key === activeRole;
                return (
                  <button
                    key={cfg.key}
                    type="button"
                    onClick={() => handleRoleSwitch(cfg.key)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#e6f2f1] border-[#0f766e] text-[#0b5f58] font-semibold'
                        : 'bg-white border-[#dce4e3] text-[#4b5b5a] hover:bg-slate-50 hover:text-[#14201f]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0b5f58]' : 'text-[#6b7c7a]'}`} />
                    <span className="truncate">{cfg.label.split('/')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Persona Info Callout */}
          <div className="p-3 bg-[#f7f9f9] border border-[#dce4e3] rounded-lg flex items-start gap-2.5 text-xs">
            <Info className="w-4 h-4 text-[#0b5f58] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-[#14201f]">{currentConfig.label}: </span>
              <span className="text-[#4b5b5a]">{currentConfig.description}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-xs font-semibold text-[#14201f]">
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={`w-full px-3.5 py-2 bg-white border rounded-lg text-sm text-[#14201f] placeholder:text-[#6b7c7a] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors ${
                    error ? 'border-[#b42318]' : 'border-[#dce4e3]'
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-[#14201f]">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full px-3.5 py-2 pr-10 bg-white border rounded-lg text-sm text-[#14201f] placeholder:text-[#6b7c7a] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors ${
                    error ? 'border-[#b42318]' : 'border-[#dce4e3]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7c7a] hover:text-[#14201f]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-[#b42318] pt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0f766e] hover:bg-[#0b5f58] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span>Signing in…</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign in as {currentConfig.label.split('/')[0].trim()}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Autofill */}
          <div className="pt-2 border-t border-[#dce4e3] space-y-2">
            <span className="block text-[11px] font-semibold text-[#4b5b5a] text-center">
              Quick demo credentials:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo(currentConfig.demoEmail)}
                className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-[#dce4e3] rounded-lg text-xs font-medium text-[#14201f] transition-colors"
              >
                Autofill {currentConfig.badgeText}
              </button>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 bg-[#fff4db] border border-[#fde68a] rounded-lg flex items-start gap-2.5 text-xs text-[#5a3b00] leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#5a3b00]" />
          <span>
            MediFlash gives general health information and does not replace a doctor. In an emergency, call <strong>112</strong> or <strong>108</strong> immediately.
          </span>
        </div>

        {/* Footer switch to Register */}
        <div className="text-center text-xs text-[#4b5b5a]">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-[#0b5f58] font-semibold hover:underline"
          >
            Create an account
          </button>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="text-center text-xs text-[#6b7c7a] py-4">
        MediFlash AI Platform • Production-Grade Healthcare Decision Support
      </footer>
    </div>
  );
};
