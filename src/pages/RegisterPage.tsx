import React, { useState } from 'react';
import {
  Plus,
  User,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  Lock,
  Mail,
  Info
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

    const result = await register({ email: trimmedEmail, password, full_name: trimmedName }, 'patient');
    setIsLoading(false);

    if (result.success) {
      onRegisterSuccess(result.role || 'patient');
    } else {
      setError(result.error || 'Registration failed. Please check your details and try again.');
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
            Create your patient account
          </h1>
          <p className="text-xs sm:text-sm text-[#4b5b5a]">
            Access personalized triage, hospital queues, and real-time emergency routing
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl border border-[#dce4e3] shadow-xs p-6 sm:p-8 space-y-5">
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
                placeholder="Dr. Rajesh Kumar or Jane Doe"
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
                placeholder="patient@example.com"
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
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#14201f]">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className={`w-full px-3.5 py-2 bg-white border rounded-lg text-sm text-[#14201f] placeholder:text-[#6b7c7a] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors ${
                  error ? 'border-[#b42318]' : 'border-[#dce4e3]'
                }`}
              />
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0f766e] hover:bg-[#0b5f58] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-3"
            >
              {isLoading ? (
                <span>Creating account…</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
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
      <footer className="text-center text-xs text-[#6b7c7a] py-4">
        MediFlash AI Platform • Production-Grade Healthcare Decision Support
      </footer>
    </div>
  );
};
