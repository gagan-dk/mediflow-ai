import React from 'react';
import { Activity, ShieldCheck, Heart, Sparkles, ExternalLink, Award } from 'lucide-react';
import { COMPREHENSIVE_SAFETY_NOTICE } from '../services/prioritizationEngine';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white shadow-md">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">MediFlow AI</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded">
                SIH Prototype
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
              Smart Hospital Queue & Emergency Routing System. Optimizing emergency department throughput, dynamic resource allocation, and patient survival rates with intelligent facility matching.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
              <Award className="w-4 h-4" />
              <span>Developed for Smart India Hackathon (Healthcare & Emergency Technology)</span>
            </div>
          </div>

          {/* Col 2: Fast Navigation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform Modules</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>
                <button onClick={() => navigate('/assessment')} className="hover:text-brand-300 transition">
                  Emergency Prioritization
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/finder')} className="hover:text-brand-300 transition">
                  Smart Hospital Finder
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/queue')} className="hover:text-brand-300 transition">
                  Live Queue Board
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/journey')} className="hover:text-brand-300 transition">
                  My Emergency Journey
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/command-center')} className="hover:text-brand-300 transition">
                  Hospital Command Center
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Presentation & Simulation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">SIH Presentation</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>
                <button onClick={() => navigate('/insights')} className="hover:text-brand-300 transition flex items-center gap-1">
                  <span>System Insights</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/insights')} className="hover:text-brand-300 transition">
                  100-Case Simulation Engine
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/ambulances')} className="hover:text-brand-300 transition">
                  Ambulance Fleet Dispatch
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/privacy')} className="hover:text-brand-300 transition">
                  Privacy & Safety Governance
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-slate-200">Prototype Disclaimer & Safety Compliance:</strong>
            <p>
              {COMPREHENSIVE_SAFETY_NOTICE}
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} MediFlow AI. Prototype developed for Smart India Hackathon.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              All regional systems operational
            </span>
            <button onClick={() => navigate('/privacy')} className="hover:text-slate-300 transition">
              Synthetic Data Disclosure
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
