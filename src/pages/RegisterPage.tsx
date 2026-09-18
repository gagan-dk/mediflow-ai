import React, { useState } from 'react';
import {
  Activity,
  User,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  HeartPulse,
  Lock,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/user';

interface RegisterPageProps {
  onRegisterSuccess: (role: UserRole) => void;
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const { register } = useApp();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    
    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    const result = await register({ email: trimmedEmail, password, full_name: trimmedName });
    setIsLoading(false);

    if (result.success) {
      onRegisterSuccess(result.role || 'patient');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4 relative bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 overflow-x-hidden">
      {/* Animated background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-sky-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className={`w-full max-w-lg relative z-10 flex flex-col flex-1 justify-center ${shake ? 'animate-shake' : ''}`}>
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
            <p className="text-sm text-slate-400 font-medium">Create your patient account</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300">
          
          <div className="bg-gradient-to-r from-sky-600/20 to-blue-700/20 p-4 border-b border-sky-500/30 flex items-center justify-center gap-3">
             <User className="text-sky-400 w-5 h-5" />
             <span className="text-sky-100 font-semibold text-sm">Patient / Caregiver Registration</span>
          </div>

          {/* Form Body */}
          <div className="p-7 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => { setFullName(e.target.value); setError(''); }}
                    placeholder="John Doe"
                    autoComplete="name"
                    className="w-full px-4 py-3 bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition"
                  />
                </div>
              </div>

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
                    placeholder="your.email@example.com"
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
                    placeholder="Create a strong password"
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition"
                  />
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
                className="w-full mt-2 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-600 to-sky-500 shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <span className="text-xs text-slate-400">Already have an account? </span>
              <button 
                onClick={onSwitchToLogin}
                className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
              >
                Sign in instead
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <HeartPulse className="w-3.5 h-3.5 text-red-400" />
            <span>MediFlow AI — Smart India Hackathon 2025 Prototype</span>
          </div>
        </div>
      </div>
    </div>
  );
};
