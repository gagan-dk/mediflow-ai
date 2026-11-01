import React, { useState } from 'react';
import {
  Plus,
  User,
  Stethoscope,
  Building2,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/user';

interface RegisterPageProps {
  onRegisterSuccess: (role: UserRole) => void;
  onSwitchToLogin: () => void;
}

type RoleTab = 'patient' | 'hospital_staff' | 'admin';

interface RoleConfig {
  key: RoleTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  badgeText: string;
  emailPlaceholder: string;
  namePlaceholder: string;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    key: 'patient',
    label: 'Patient / Caregiver',
    icon: User,
    description: 'Track your emergency queue, receive triage guidance, and manage ambulance routing.',
    badgeText: 'Patient',
    emailPlaceholder: 'patient@example.com',
    namePlaceholder: 'Jane Doe',
  },
  {
    key: 'hospital_staff',
    label: 'Hospital Staff',
    icon: Stethoscope,
    description: 'Access the Command Center, manage beds, incoming pre-alerts, and ICU capacity.',
    badgeText: 'Clinical Staff',
    emailPlaceholder: 'staff@yourhospital.org',
    namePlaceholder: 'Dr. Rajesh Kumar',
  },
  {
    key: 'admin',
    label: 'Administrator',
    icon: Building2,
    description: 'System-wide analytics, hospital network configuration, and algorithmic simulations.',
    badgeText: 'Admin',
    emailPlaceholder: 'admin@mediflow.ai',
    namePlaceholder: 'System Administrator',
  },
];

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const { register } = useApp();

  const [activeRole, setActiveRole] = useState<RoleTab>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentConfig = ROLE_CONFIGS.find(r => r.key === activeRole)!;

  const handleRoleSwitch = (role: RoleTab) => {
    setActiveRole(role);
    setError('');
  };

  // Password strength checker
  const getPasswordStrength = (pwd: string): { label: string; color: string; fraction: string } => {
    if (!pwd) return { label: '', color: 'bg-slate-200', fraction: 'w-0' };
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-red-400', fraction: 'w-1/4' };
    if (pwd.length < 8) return { label: 'Fair', color: 'bg-amber-400', fraction: 'w-2/4' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: 'Strong', color: 'bg-[#0f766e]', fraction: 'w-full' };
    return { label: 'Good', color: 'bg-teal-400', fraction: 'w-3/4' };
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await register(
      { email: trimmedEmail, password, full_name: trimmedName },
      activeRole
    );
    setIsLoading(false);

    if (result.success) {
      onRegisterSuccess(result.role || activeRole);
    } else {
      setError(result.error || 'Registration failed. Please check your details and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9f9] text-[#14201f] flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0f766e] text-white shadow-sm">
              <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
            </div>
            <span className="font-bold text-2xl text-[#14201f] tracking-tight">MediFlash</span>
            <span className="px-2 py-0.5 bg-[#e6f2f1] text-[#0b5f58] text-xs font-semibold rounded-md">
              Beta
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#14201f] tracking-tight pt-2">
            Create your account
          </h1>
          <p className="text-xs sm:text-sm text-[#4b5b5a]">
            Choose your role and sign up to get started
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl border border-[#dce4e3] shadow-sm p-6 sm:p-8 space-y-5">

          {/* Role Selection Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#4b5b5a]">
              I am signing up as
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
                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#e6f2f1] border-[#0f766e] text-[#0b5f58] font-semibold ring-1 ring-[#0f766e]/30'
                        : 'bg-white border-[#dce4e3] text-[#4b5b5a] hover:bg-slate-50 hover:text-[#14201f]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0b5f58]' : 'text-[#6b7c7a]'}`} />
                    <span className="truncate text-center leading-tight">
                      {cfg.label.split('/')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Info Callout */}
          <div className="p-3 bg-[#f7f9f9] border border-[#dce4e3] rounded-lg flex items-start gap-2.5 text-xs">
            <Info className="w-4 h-4 text-[#0b5f58] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#14201f]">{currentConfig.label}: </span>
              <span className="text-[#4b5b5a]">{currentConfig.description}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="fullName" className="block text-xs font-semibold text-[#14201f]">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={currentConfig.namePlaceholder}
                autoComplete="name"
                className={`w-full px-3.5 py-2 bg-white border rounded-lg text-sm text-[#14201f] placeholder:text-[#6b7c7a] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors ${
                  error ? 'border-[#b42318]' : 'border-[#dce4e3]'
                }`}
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label htmlFor="regEmail" className="block text-xs font-semibold text-[#14201f]">
                Email address
              </label>
              <input
                id="regEmail"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={currentConfig.emailPlaceholder}
                autoComplete="email"
                className={`w-full px-3.5 py-2 bg-white border rounded-lg text-sm text-[#14201f] placeholder:text-[#6b7c7a] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors ${
                  error ? 'border-[#b42318]' : 'border-[#dce4e3]'
                }`}
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="regPassword" className="block text-xs font-semibold text-[#14201f]">
                Password
              </label>
              <div className="relative">
                <input
                  id="regPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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
              {/* Password strength bar */}
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.fraction}`} />
                  </div>
                  <p className="text-[11px] text-[#4b5b5a]">
                    Strength: <span className="font-semibold">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#14201f]">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className={`w-full px-3.5 py-2 pr-10 bg-white border rounded-lg text-sm text-[#14201f] placeholder:text-[#6b7c7a] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors ${
                    error ? 'border-[#b42318]' : 'border-[#dce4e3]'
                  }`}
                />
                {passwordsMatch && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0f766e]" />
                )}
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0f766e] hover:bg-[#0b5f58] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-3"
            >
              {isLoading ? (
                <span>Creating account…</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create {currentConfig.badgeText} Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 bg-[#fff4db] border border-[#fde68a] rounded-lg flex items-start gap-2.5 text-xs text-[#5a3b00] leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#5a3b00]" />
          <span>
            MediFlash gives general health information and does not replace a doctor. In an emergency, call <strong>112</strong> or <strong>108</strong> immediately.
          </span>
        </div>

        {/* Footer switch to Login */}
        <div className="text-center text-xs text-[#4b5b5a]">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-[#0b5f58] font-semibold hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="text-center text-xs text-[#6b7c7a] py-4 mt-4">
        MediFlash AI Platform • Production-Grade Healthcare Decision Support
      </footer>
    </div>
  );
};
