import React from 'react';
import { Info } from 'lucide-react';
import { COMPREHENSIVE_SAFETY_NOTICE } from '../services/prioritizationEngine';

interface DisclaimerBannerProps {
  compact?: boolean;
  className?: string;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false, className = '' }) => {
  if (compact) {
    return (
      <div
        role="note"
        aria-label="Clinical disclaimer"
        className={`flex items-center gap-2.5 px-3.5 py-2.5 bg-[#fff4db] border border-[#fde68a] text-[#5a3b00] rounded-lg text-xs leading-relaxed ${className}`}
      >
        <Info className="w-4 h-4 text-[#5a3b00] shrink-0" aria-hidden="true" />
        <span>
          <strong>General information only. Not a diagnosis.</strong> In a medical emergency, call <strong>112</strong> immediately.
        </span>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label="Safety and regulatory notice"
      className={`p-4 bg-[#fff4db] border border-[#fde68a] rounded-lg text-[#5a3b00] space-y-1.5 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#5a3b00] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a3b00]">
              General Information • Not a Diagnosis
            </span>
            <span className="px-1.5 py-0.2 bg-[#fde68a] text-[#5a3b00] text-[10px] font-semibold rounded">
              Clinical Advisory
            </span>
          </div>
          <p className="text-xs text-[#5a3b00]/90 leading-relaxed">
            {COMPREHENSIVE_SAFETY_NOTICE}
          </p>
        </div>
      </div>
    </div>
  );
};
