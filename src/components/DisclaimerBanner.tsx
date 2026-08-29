import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { COMPREHENSIVE_SAFETY_NOTICE } from '../services/prioritizationEngine';

interface DisclaimerBannerProps {
  compact?: boolean;
  className?: string;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false, className = '' }) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-lg text-xs font-medium ${className}`}>
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Prototype Disclaimer:</strong> AI-assisted prioritization — not a medical diagnosis. In a real emergency, call 112/911 immediately.
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gradient-to-r from-amber-50 via-sky-50 to-amber-50 border border-amber-200/80 rounded-xl text-slate-800 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Safety & Regulatory Notice
            </h4>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-200/60 text-amber-900 rounded-full">
              SIH Healthcare Prototype
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {COMPREHENSIVE_SAFETY_NOTICE}
          </p>
        </div>
      </div>
    </div>
  );
};
