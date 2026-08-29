import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  FileText, 
  Server, 
  CheckCircle2, 
  AlertTriangle,
  Award
} from 'lucide-react';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

export const PrivacySecurityPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-xs font-bold shadow-xs">
          <Lock className="w-3.5 h-3.5" />
          <span>Healthcare Governance &amp; Compliance Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Privacy, Security &amp; Safety Guidelines
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Transparent disclosure of prototype data boundaries and the future production security roadmap.
        </p>
      </div>

      <DisclaimerBanner />

      {/* Prototype Boundaries & Synthetic Data Disclosure */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>1. Current Prototype Data Boundaries</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Synthetic Patient Data
            </h4>
            <p className="text-slate-600 leading-relaxed">
              All patient names, vitals, pre-alerts, and medical histories used throughout this demonstration are synthetically generated for testing purposes. No real Protected Health Information (PHI) is stored or processed.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> AI-Assisted Prioritization Scope
            </h4>
            <p className="text-slate-600 leading-relaxed">
              MediFlow AI acts exclusively as an urgency estimation and capacity routing decision-support tool. It does not provide medical diagnoses or replace clinical judgement.
            </p>
          </div>
        </div>
      </div>

      {/* Future Production Requirements Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
          <Server className="w-5 h-5 text-brand-600" />
          <span>2. Future Production Security &amp; Compliance Roadmap</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <Key className="w-5 h-5 text-brand-600" />
            <h4 className="font-bold text-slate-800">End-to-End Encryption</h4>
            <p className="text-slate-600 leading-relaxed">
              AES-256 encryption at rest for patient triage profiles and TLS 1.3 encryption for all pre-alert and telemetry API transmissions.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <Lock className="w-5 h-5 text-purple-600" />
            <h4 className="font-bold text-slate-800">Role-Based Access (RBAC)</h4>
            <p className="text-slate-600 leading-relaxed">
              Granular access separation between Patients, Paramedics, ER Physicians, and Health Board Administrators with multi-factor authentication (MFA).
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-slate-800">FHIR &amp; ABDM / DISHA</h4>
            <p className="text-slate-600 leading-relaxed">
              Compliance with HL7 FHIR standard payloads, India's Ayushman Bharat Digital Mission (ABDM), and DISHA data protection standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
