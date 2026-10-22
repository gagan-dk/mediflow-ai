import React, { useState } from 'react';
import { 
  ArrowRight, 
  Info, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Pill, 
  Plus, 
  ShieldAlert, 
  Hospital, 
  Clock, 
  Activity,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const { hospitals, queuePatients } = useApp();
  const [questionText, setQuestionText] = useState('');

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim()) {
      navigate('/ask?q=' + encodeURIComponent(questionText));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === 'Describe symptoms') {
      navigate('/assessment');
    } else if (suggestion === 'Understand a lab report') {
      navigate('/ask?topic=blood-test');
    } else if (suggestion === 'Prepare for a doctor visit') {
      navigate('/ask?topic=follow-up');
    } else {
      setQuestionText(suggestion);
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans max-w-5xl mx-auto">
      {/* Page Title & Intro matching Screenshot 3 */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-[#14201f] tracking-tight leading-snug">
          How can I help with your health today?
        </h1>
        <p className="text-sm sm:text-base text-[#4b5b5a] leading-relaxed max-w-3xl">
          Ask a question in your own words. MediFlash explains health information in plain language and helps you prepare for conversations with your doctor.
        </p>
      </div>

      {/* Main Interactive Prompt Card matching Screenshot 3 */}
      <div className="bg-white rounded-xl border border-[#dce4e3] shadow-xs p-5 sm:p-6 space-y-4">
        <form onSubmit={handleAskSubmit} className="space-y-3">
          <label htmlFor="promptInput" className="block text-sm font-semibold text-[#14201f]">
            What would you like to understand?
          </label>
          <div className="relative">
            <textarea
              id="promptInput"
              rows={3}
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="For example: What does my blood test result mean?"
              className="w-full p-3.5 bg-white border border-[#dce4e3] rounded-lg text-sm text-[#14201f] placeholder:text-[#6b7c7a] focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-xs text-[#6b7c7a]">
              Share only what is needed. Avoid names and ID numbers.
            </span>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0f766e] hover:bg-[#0b5f58] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors self-end sm:self-auto"
            >
              <span>Ask MediFlash</span>
            </button>
          </div>
        </form>

        {/* Suggestion Quick Pills matching Screenshot 3 */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#dce4e3]">
          {[
            'Understand a lab report',
            'Check a medication',
            'Prepare for a doctor visit',
            'Describe symptoms',
          ].map(item => (
            <button
              key={item}
              type="button"
              onClick={() => handleSuggestionClick(item)}
              className="px-3 py-1.5 bg-white border border-[#dce4e3] hover:border-[#0f766e] hover:text-[#0b5f58] text-[#14201f] text-xs font-medium rounded-lg transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Warning Callout matching Screenshot 3 */}
      <div className="p-3.5 bg-[#fff4db] border border-[#fde68a] rounded-lg flex items-start gap-2.5 text-xs text-[#5a3b00] leading-relaxed">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#5a3b00]" />
        <div>
          <span>
            MediFlash gives general health information. It does not diagnose conditions or replace a doctor.{' '}
            <strong>In an emergency, call 112.</strong>{' '}
          </span>
          <button
            onClick={() => navigate('/privacy')}
            className="font-semibold underline hover:text-black ml-1"
          >
            How MediFlash works
          </button>
        </div>
      </div>

      {/* 2-Column Section matching Screenshot 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Recent Conversations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#dce4e3] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#dce4e3] pb-3">
            <h2 className="text-sm font-bold text-[#14201f]">Recent conversations</h2>
            <button
              onClick={() => navigate('/ask')}
              className="text-xs font-semibold text-[#0b5f58] hover:underline"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-[#dce4e3]">
            <button
              onClick={() => navigate('/ask')}
              className="w-full py-3 flex items-start justify-between text-left hover:bg-slate-50 px-2 rounded-lg transition-colors group"
            >
              <div>
                <div className="text-sm font-semibold text-[#14201f] group-hover:text-[#0b5f58] transition-colors">
                  Questions about a new prescription
                </div>
                <div className="text-xs text-[#6b7c7a] mt-0.5">Yesterday</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#6b7c7a] group-hover:text-[#0b5f58] shrink-0 mt-1" />
            </button>

            <button
              onClick={() => navigate('/ask?topic=blood-test')}
              className="w-full py-3 flex items-start justify-between text-left hover:bg-slate-50 px-2 rounded-lg transition-colors group"
            >
              <div>
                <div className="text-sm font-semibold text-[#14201f] group-hover:text-[#0b5f58] transition-colors">
                  Understanding a blood test report
                </div>
                <div className="text-xs text-[#6b7c7a] mt-0.5">Monday</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#6b7c7a] group-hover:text-[#0b5f58] shrink-0 mt-1" />
            </button>

            <button
              onClick={() => navigate('/ask?topic=follow-up')}
              className="w-full py-3 flex items-start justify-between text-left hover:bg-slate-50 px-2 rounded-lg transition-colors group"
            >
              <div>
                <div className="text-sm font-semibold text-[#14201f] group-hover:text-[#0b5f58] transition-colors">
                  Preparing for a follow-up visit
                </div>
                <div className="text-xs text-[#6b7c7a] mt-0.5">Last week</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#6b7c7a] group-hover:text-[#0b5f58] shrink-0 mt-1" />
            </button>
          </div>
        </div>

        {/* Right Column (1/3 width): Health Info & Appointments */}
        <div className="space-y-4">
          {/* Card: Your health information */}
          <div className="bg-white rounded-xl border border-[#dce4e3] shadow-xs p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#14201f]">Your health information</h2>
            
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#14201f]">Medications</div>
              <p className="text-xs text-[#4b5b5a] leading-relaxed">
                None added yet. Add them to get safer, more relevant answers.
              </p>
            </div>

            <button
              onClick={() => navigate('/ambulances')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b5f58] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add a medication</span>
            </button>
          </div>

          {/* Card: Upcoming appointments */}
          <div className="bg-white rounded-xl border border-[#dce4e3] shadow-xs p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#14201f]">Upcoming appointments</h2>
            <p className="text-xs text-[#4b5b5a]">
              Nothing scheduled.
            </p>
            <button
              onClick={() => navigate('/queue')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b5f58] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add an appointment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Platform Navigation Shortcuts */}
      <div className="pt-4 border-t border-[#dce4e3] space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#4b5b5a]">
          Emergency Network Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/assessment')}
            className="p-4 bg-white hover:bg-slate-50 border border-[#dce4e3] rounded-xl text-left transition-colors space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#e6f2f1] text-[#0b5f58] flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#6b7c7a] group-hover:text-[#0b5f58] transition-colors" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#14201f]">Emergency Prioritization</div>
              <p className="text-xs text-[#4b5b5a] mt-0.5">Clinical symptom triage &amp; ESI Level deduction</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/finder')}
            className="p-4 bg-white hover:bg-slate-50 border border-[#dce4e3] rounded-xl text-left transition-colors space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#e6f2f1] text-[#0b5f58] flex items-center justify-center">
                <Hospital className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#6b7c7a] group-hover:text-[#0b5f58] transition-colors" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#14201f]">Hospital &amp; ICU Finder</div>
              <p className="text-xs text-[#4b5b5a] mt-0.5">{hospitals.length} verified hospitals in regional radius</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/queue')}
            className="p-4 bg-white hover:bg-slate-50 border border-[#dce4e3] rounded-xl text-left transition-colors space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#e6f2f1] text-[#0b5f58] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#6b7c7a] group-hover:text-[#0b5f58] transition-colors" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#14201f]">Live ER Queue Board</div>
              <p className="text-xs text-[#4b5b5a] mt-0.5">Real-time priority token &amp; wait time engine</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
