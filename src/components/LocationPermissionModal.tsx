import React from 'react';
import { MapPin, X, CheckCircle2 } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onAllow,
  onDeny,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-sky-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Enable Location Access</h3>
              <p className="text-xs text-brand-100 mt-0.5">Help us find nearby hospitals</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            MediFlow AI uses your device location to:
          </p>

          <div className="space-y-3">
            {[
              'Find nearby hospitals in real-time',
              'Calculate accurate travel distance',
              'Display hospitals on the map',
              'Improve hospital recommendations',
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Privacy Note:</strong> Your location is only used for hospital discovery and routing. 
              We do not store or share your location data with third parties.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onAllow}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-600/20 transition transform active:scale-95"
            >
              Allow Location
            </button>
            <button
              onClick={onDeny}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
