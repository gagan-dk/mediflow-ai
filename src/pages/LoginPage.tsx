import React, { useState } from 'react';
import {
  Activity,
  User,
  Stethoscope,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sparkles,
  HeartPulse,
  Lock,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/user';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
}

type RoleTab = 'patient' | 'hospital_staff' | 'admin';

interface RoleConfig {
  key: RoleTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  emoji: string;
  description: string;
  email: string;
  password: string;
  gradient: string;
  accentColor: string;
  bgLight: string;
  borderColor: string;
  badgeText: string;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    key: 'patient',
    label: 'Patient / Caregiver',
    icon: User,
    emoji: '👤',
    description: 'Access emergency assessment, track your ambulance, view your queue token, and follow your care journey.',
    email: 'patient@mediflow.ai',
    password: 'patient123',
    gradient: 'from-sky-600 to-blue-700',
    accentColor: 'text-sky-600',
    bgLight: 'bg-sky-50',
    borderColor: 'border-sky-200',
    badgeText: 'Patient Portal',
  },
  {
    key: 'hospital_staff',
    label: 'Hospital Staff',
    icon: Stethoscope,
    emoji: '🩺',
    description: 'Full ER Command Center access — manage pre-alerts, coordinate incoming emergencies, and control bed allocation.',
    email: 'staff@mediflow.ai',
    password: 'staff123',
    gradient: 'from-emerald-600 to-teal-700',
    accentColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeText: 'Clinical Access',
  },
  {
    key: 'admin',
    label: 'Hospital Admin',
    icon: ShieldCheck,
    emoji: '🏢',
    description: 'Administrative oversight — full system analytics, regional load balancing, and hospital network management.',
    email: 'admin@mediflow.ai',
    password: 'admin123',
    gradient: 'from-purple-600 to-indigo-700',
    accentColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeText: 'Admin Access',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useApp();
  const [activeRole, setActiveRole] = useState<RoleTab>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const currentConfig = ROLE_CONFIGS.find(r => r.key === activeRole)!;

  const handleRoleSwitch = (role: RoleTab) => {
    setActiveRole(role);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleQuickFill = () => {
    setEmail(currentConfig.email);
    setPassword(currentConfig.password);
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

    // Simulate async call
    await new Promise(r => setTimeout(r, 700));

    const result = login(email, password);
    setIsLoading(false);

    if (result.success) {
      onLoginSuccess(result.role || 'patient');
    } else {
      setError(result.error || 'Login failed.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-500/8 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-purple-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className={`w-full max-w-lg relative z-10 ${shake ? 'animate-shake' : ''}`}>
        {/* Logo / Brand Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white shadow-2xl shadow-brand-600/40 mb-2">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-3xl font-extrabold text-white tracking-tight">MediFlow</span>
              <span className="px-2 py-0.5 bg-brand-500/30 text-brand-300 text-xs font-extrabold rounded-lg uppercase tracking-wider border border-brand-500/40">AI</span>
            </div>
            <p className="text-sm text-slate-400 font-medium">Smart Hospital Queue &amp; Emergency Routing System</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
            Emergency Network Active · Bangalore Metro Region
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300">
          {/* Role Selector Tabs */}
          <div className="flex border-b border-white/10">
            {ROLE_CONFIGS.map((cfg) => {
              const Icon = cfg.icon;
              const isActive = cfg.key === activeRole;
              return (
                <button
                  key={cfg.key}
                  onClick={() => handleRoleSwitch(cfg.key)}
                  className={`flex-1 py-4 px-2 text-center transition-all duration-200 relative group ${
                    isActive ? `bg-gradient-to-b ${currentConfig.gradient} opacity-15` : ''
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-b opacity-15" />
                  )}
                  <div className="relative flex flex-col items-center gap-1.5">
                    <Icon className={`w-5 h-5 transition-all ${isActive ? currentConfig.accentColor : 'text-slate-400'}`} />
                    <span className="text-[11px] font-semibold leading-tight">{cfg.label.split('/')[0].trim()}</span>
                  </div>
                  {isActive && (
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${currentConfig.gradient}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Form Body */}
          <div className="p-7 space-y-6">
            {/* Role Description Card */}
            <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 ${currentConfig.bgLight} ${currentConfig.borderColor}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{currentConfig.emoji}</span>
                <div>
                  <div className="text-sm font-bold text-white">{currentConfig.label}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-slate-300">
                    {currentConfig.badgeText}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{currentConfig.description}</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder={currentConfig.email}
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-12 bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${currentConfig.gradient} shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign in as {currentConfig.label.split('/')[0].trim()}</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Fill Demo Button */}
            <div className="pt-1">
              <div className="text-center text-[10px] text-slate-500 font-medium mb-2">— Demo / Prototype Credentials —</div>
              <button
                type="button"
                onClick={handleQuickFill}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Auto-fill {currentConfig.label} credentials
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <p className="text-center text-[10px] text-slate-600 mt-2">
                {currentConfig.email} / {currentConfig.password}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <HeartPulse className="w-3.5 h-3.5 text-red-400" />
            <span>MediFlow AI — Smart India Hackathon 2025 Prototype</span>
          </div>
          <p className="text-[10px] text-slate-600">
            This is a demonstration system. No real patient data is processed or stored.
          </p>
        </div>
      </div>
    </div>
  );
};
