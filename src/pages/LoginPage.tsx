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
  HeartPulse,
  Lock,
  Mail,
  Clock,
  UserPlus,
  Phone,
  CheckCircle,
  MapPin,
  Navigation,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/user';
import { Hospital } from '../types/hospital';
import { locationService } from '../services/locationService';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
  sessionExpired?: boolean;
}

type AuthMode = 'login' | 'signup';
type RoleTab = 'patient' | 'hospital_staff' | 'admin';

interface RoleConfig {
  key: RoleTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  emoji: string;
  description: string;
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
    gradient: 'from-purple-600 to-indigo-700',
    accentColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeText: 'Admin Access',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, sessionExpired }) => {
  const { login, register, loginAsDemo, hospitals } = useApp();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [activeRole, setActiveRole] = useState<RoleTab>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([]);
  const [isScanningLocation, setIsScanningLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const currentConfig = ROLE_CONFIGS.find(r => r.key === activeRole)!;

  const scanNearbyHospitals = async () => {
    setIsScanningLocation(true);
    setLocationMessage('Requesting your location...');
    try {
      const coordinates = await locationService.requestLocation();
      const sorted = hospitals
        .map(hospital => {
          const record = hospital as Hospital & { latitude?: number; longitude?: number };
          const latitude = record.coordinates?.lat ?? record.latitude;
          const longitude = record.coordinates?.lng ?? record.longitude;
          if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
          return {
            hospital,
            distanceKm: locationService.calculateDistance(
              coordinates.latitude,
              coordinates.longitude,
              latitude,
              longitude,
            ),
          };
        })
        .filter((item): item is { hospital: Hospital; distanceKm: number } => item !== null)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map(({ hospital, distanceKm }) => ({
          ...hospital,
          distanceKm,
          travelTimeMinutes: locationService.estimateTravelTime(distanceKm, hospital.trafficCondition),
        }));
      setNearbyHospitals(sorted);
      setLocationMessage(sorted.length > 0
        ? `Showing hospitals nearest to your location (${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)}).`
        : 'No hospitals are available yet. Please try again in a moment.');
    } catch {
      setNearbyHospitals(hospitals);
      setLocationMessage('Location access was unavailable. You can still choose from the available hospital list.');
    } finally {
      setIsScanningLocation(false);
    }
  };

  React.useEffect(() => {
    if (authMode === 'signup' && activeRole === 'hospital_staff') {
      setNearbyHospitals(hospitals);
      if (locationService.getCurrentCoordinates()) {
        void scanNearbyHospitals();
      }
    }
  }, [authMode, activeRole, hospitals]);

  const handleAutoFillDemo = () => {
    const demoEmail = currentConfig.key === 'patient' ? 'patient@mediflow.ai' : currentConfig.key === 'hospital_staff' ? 'staff@mediflow.ai' : 'admin@mediflow.ai';
    const demoPass = currentConfig.key === 'patient' ? 'patient123' : currentConfig.key === 'hospital_staff' ? 'staff123' : 'admin123';
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const handleInstantDemoLogin = () => {
    loginAsDemo(activeRole);
    onLoginSuccess(activeRole === 'hospital_staff' ? 'hospital_staff' : activeRole);
  };

  const handleRoleSwitch = (role: RoleTab) => {
    setActiveRole(role);
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
    if (role === 'hospital_staff') {
      setNearbyHospitals(hospitals);
      void scanNearbyHospitals();
    }
  };

  const handleModeSwitch = (mode: AuthMode) => {
    setAuthMode(mode);
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setConfirmPassword('');
    setHospitalId('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (authMode === 'signup') {
      if (activeRole === 'admin') {
        setError('Administrator accounts must be created by an administrator.');
        return;
      }
      if (!fullName || !email || !password || !confirmPassword) {
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
      if (activeRole === 'hospital_staff' && !hospitalId) {
        setError('Please select your hospital.');
        return;
      }

      setIsLoading(true);
      const result = await register(
        email,
        password,
        fullName,
        phone || undefined,
        activeRole === 'hospital_staff' ? 'hospital_staff' : 'patient',
        activeRole === 'hospital_staff' ? hospitalId : undefined,
      );
      setIsLoading(false);

      if (result.success) {
        onLoginSuccess(result.role || (activeRole === 'hospital_staff' ? 'hospital_staff' : 'patient'));
      } else {
        setError(result.error || 'Registration failed. Please try again.');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } else {
      if (!email || !password) {
        setError('Please enter your email and password.');
        return;
      }
      setIsLoading(true);
      const result = await login(email, password);
      setIsLoading(false);

      if (result.success) {
        const role = activeRole === 'hospital_staff' || result.role === 'hospital_staff'
          ? 'hospital_staff'
          : result.role || 'patient';
        onLoginSuccess(role);
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
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
            {/* Session Expired Banner */}
            {sessionExpired && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Your session has expired. Please sign in again.</span>
              </div>
            )}

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

            {/* Login / Sign Up Toggle */}
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                  authMode === 'login'
                    ? `bg-gradient-to-r ${currentConfig.gradient} text-white shadow-lg`
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('signup')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                  authMode === 'signup'
                    ? `bg-gradient-to-r ${currentConfig.gradient} text-white shadow-lg`
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (Sign Up only) */}
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => { setFullName(e.target.value); setError(''); }}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      className="w-full px-4 py-3 bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition"
                    />
                  </div>
                </div>
              )}

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
                    placeholder={`your.email@${currentConfig.key === 'hospital_staff' ? 'hospital.org' : 'example.com'}`}
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition"
                  />
                </div>
              </div>

              {/* Phone (Sign Up only) */}
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone Number <span className="text-slate-500">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setError(''); }}
                      placeholder="+91 98765 43210"
                      autoComplete="tel"
                      className="w-full px-4 py-3 bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition"
                    />
                  </div>
                </div>
              )}

              {authMode === 'signup' && activeRole === 'hospital_staff' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Hospital</label>
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3" />
                      {locationMessage || 'Scan to sort hospitals by your current location.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => void scanNearbyHospitals()}
                      disabled={isScanningLocation}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                      {isScanningLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                      {isScanningLocation ? 'Scanning...' : 'Scan location'}
                    </button>
                  </div>
                  {nearbyHospitals.length > 0 && (
                    <select
                      value={hospitalId}
                      onChange={e => { setHospitalId(e.target.value); setError(''); }}
                      className="w-full px-4 py-3 bg-slate-900 border border-emerald-400/30 text-white rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition"
                    >
                      <option value="">Choose nearest hospital</option>
                      {nearbyHospitals.map(hospital => (
                        <option key={`nearby-${hospital.id}`} value={hospital.hospitalId || hospital.id}>
                          {hospital.name} - {typeof hospital.distanceKm === 'number' ? `${hospital.distanceKm.toFixed(1)} km away` : 'distance unavailable'}
                        </option>
                      ))}
                    </select>
                  )}
                  {hospitals.length === 0 && <p className="text-[11px] text-amber-300">Hospital list is still loading. Please wait a moment and try again.</p>}
                </div>
              )}

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
                    placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
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

              {/* Confirm Password (Sign Up only) */}
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-12 bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition"
                    />
                    {confirmPassword && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {password === confirmPassword ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                  {(error.toLowerCase().includes('backend') || error.toLowerCase().includes('network') || error.toLowerCase().includes('connect') || error.toLowerCase().includes('failed to fetch')) && (
                    <button
                      type="button"
                      onClick={handleInstantDemoLogin}
                      className="w-full mt-2 py-1.5 px-3 bg-red-500/25 hover:bg-red-500/40 text-red-200 border border-red-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <span>⚡ Continue in Demo Mode ({currentConfig.label.split('/')[0].trim()}) &rarr;</span>
                    </button>
                  )}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
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
                    <span>{authMode === 'signup' ? 'Creating Account...' : 'Authenticating...'}</span>
                  </>
                ) : authMode === 'signup' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign in as {currentConfig.label.split('/')[0].trim()}</span>
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials Hint */}
            {authMode === 'login' && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Demo Account — {currentConfig.label.split('/')[0].trim()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAutoFillDemo}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200 rounded transition cursor-pointer"
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      onClick={handleInstantDemoLogin}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded transition cursor-pointer"
                    >
                      Instant Sign-In
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono leading-relaxed bg-black/20 rounded-lg p-2">
                  <div><span className="text-slate-500">Email:</span> {currentConfig.key === 'patient' ? 'patient@mediflow.ai' : currentConfig.key === 'hospital_staff' ? 'staff@mediflow.ai' : 'admin@mediflow.ai'}</div>
                  <div><span className="text-slate-500">Password:</span> {currentConfig.key === 'patient' ? 'patient123' : currentConfig.key === 'hospital_staff' ? 'staff123' : 'admin123'}</div>
                </div>
              </div>
            )}

            {/* Helper Text */}
            <div className="pt-1">
              {authMode === 'login' ? (
                <div className="text-center text-[10px] text-slate-500 font-medium leading-relaxed">
                  <p>Use the credentials provided by your organization administrator.</p>
                  <p className="mt-2">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('signup')}
                      className="text-brand-400 hover:text-brand-300 font-bold underline underline-offset-2 transition"
                    >
                      Create one now
                    </button>
                  </p>
                </div>
              ) : (
                <div className="text-center text-[10px] text-slate-500 font-medium leading-relaxed">
                  <p>Patients and hospital staff can create accounts. Admin accounts require administrator approval.</p>
                  <p className="mt-2">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('login')}
                      className="text-brand-400 hover:text-brand-300 font-bold underline underline-offset-2 transition"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              )}
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
