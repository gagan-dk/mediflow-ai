import React from 'react';
import { 
  ShieldAlert, 
  Hospital, 
  Clock, 
  MapPin, 
  Activity, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  BedDouble, 
  Truck, 
  HeartPulse, 
  Layers, 
  BarChart3, 
  ShieldCheck,
  AlertTriangle,
  Play,
  Navigation
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const { hospitals } = useApp();

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-14 overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-brand-50/70 via-sky-50/40 to-transparent pointer-events-none -z-10" />
        <div className="absolute -top-20 right-10 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-40 left-10 w-80 h-80 bg-sky-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Top Pill */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              <span>Smart Hospital Queue & Emergency Routing System</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700 font-bold">Smart India Hackathon</span>
            </div>
          </div>

          {/* Hero Headline & Subtitle */}
          <div className="text-center space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Get the Right Care. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-brand-600 via-sky-600 to-teal-600 bg-clip-text text-transparent">
                At the Right Hospital.
              </span>{' '}
              At the Right Time.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              AI-assisted emergency prioritization and dynamic hospital coordination that routes patients to facilities with verified ICU, emergency bed capacity, and shortest travel ETA.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <button
                onClick={() => navigate('/assessment')}
                className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-500/25 transition transform active:scale-95"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Start Emergency Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/finder')}
                className="flex items-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm shadow-xs transition"
              >
                <Hospital className="w-4 h-4 text-brand-600" />
                <span>Find Nearby Hospitals</span>
              </button>


            </div>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="max-w-3xl mx-auto">
            <DisclaimerBanner />
          </div>

          {/* Visual Live Healthcare Dashboard Flow Preview Card */}
          <div className="pt-4 max-w-5xl mx-auto">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-2xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    Live Regional Emergency Coordination Matrix (Bangalore Central)
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">Telemetry: Live Simulated</span>
                  <button
                    onClick={() => navigate('/command-center')}
                    className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
                  >
                    <span>Command Center</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 4 Key Real-time Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Monitored Hospitals</span>
                    <Hospital className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">6 Centers</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">100% Online & Synced</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Available ICU Beds</span>
                    <BedDouble className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-purple-700 font-mono">18 / 110</div>
                  <div className="text-[11px] text-slate-500 font-medium">Real-time telemetry</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Average ER Wait</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-amber-600 font-mono">14.2 min</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">42% below regional avg</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Active Ambulances</span>
                    <Truck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 font-mono">5 Units</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">ALS & Oxygen Ready</div>
                </div>
              </div>

              {/* Sample Live Hospital Capacity Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                      <th className="pb-2">Hospital Facility</th>
                      <th className="pb-2">Distance & ETA</th>
                      <th className="pb-2">ICU Capacity</th>
                      <th className="pb-2">Emergency Wait</th>
                      <th className="pb-2">Current ER Load</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hospitals.slice(0, 3).map((hosp) => (
                      <tr key={hosp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{hosp.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">{hosp.type}</span>
                        </td>
                        <td className="py-3 font-mono">
                          <span className="font-bold text-slate-700">{hosp.distanceKm} km</span>
                          <span className="text-slate-400 ml-1">({hosp.travelTimeMinutes}m ETA)</span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                            hosp.availableICUBeds > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {hosp.availableICUBeds} Available
                          </span>
                        </td>
                        <td className="py-3 font-mono text-slate-700">
                          {hosp.estimatedWaitTimeMinutes} mins
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  hosp.currentERLoadPercent > 85 ? 'bg-red-500' : hosp.currentERLoadPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${hosp.currentERLoadPercent}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-semibold">{hosp.currentERLoadPercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => navigate('/finder')}
                            className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg transition"
                          >
                            Route
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Interactive Workflow Stepper */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600">
            How MediFlow AI Works
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Seamless 4-Stage Emergency Coordination
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Eliminating emergency bottlenecking and delays through predictive triage and capacity reservation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center font-extrabold text-sm">
              01
            </div>
            <h4 className="font-bold text-slate-900 text-base">Enter Emergency Symptoms</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Patient or paramedic enters symptoms, pain scale, and vitals. Instant preset triggers available for cardiac and trauma cases.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-extrabold text-sm">
              02
            </div>
            <h4 className="font-bold text-slate-900 text-base">AI Prioritization & Facility Match</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Calculates Emergency Severity Index (ESI 1-5) and strictly filters hospitals that possess required ICU, oxygen, or trauma capabilities.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-extrabold text-sm">
              03
            </div>
            <h4 className="font-bold text-slate-900 text-base">Hospital Pre-Alert Transmission</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Transmits real-time 🚨 Pre-Alert to the destination ER with patient telemetry, reserving resuscitation bays and ICU beds before arrival.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-extrabold text-sm">
              04
            </div>
            <h4 className="font-bold text-slate-900 text-base">Priority Queue & Arrival</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Patient receives priority digital token (e.g. #A104). Staff are ready at the ambulance bay for immediate life-saving handover.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600">
            Platform Capabilities
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Modern Healthcare Networks
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl w-fit">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">AI-Assisted Emergency Prioritization</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Estimates clinical urgency risk (0-100) and maps essential physiological needs without claiming unauthorized medical diagnosis.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-3 bg-brand-50 text-brand-600 rounded-xl w-fit">
              <Hospital className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Required Facility Matching Engine</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Eliminates hospitals with saturated ICUs, unavailable oxygen infrastructure, or lacking trauma surgery teams from critical routing.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Dynamic Hospital Re-Routing</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Monitors hospital capacity in real time and automatically re-routes ambulances if an emergency room hits 95% saturation.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Real-Time Queue Token Tracker</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Provides patients and families with live queue position updates, countdown wait times, and priority escalation.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit">
              <BedDouble className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Interactive Bed & ICU Manager</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Visual bed matrix across Emergency, ICU, Trauma, and General wards with 1-click status toggling and pre-alert reservation locks.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit">
              <Truck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Ambulance Capability Dispatch</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Matches ambulances based on onboard equipment (ALS, Ventilator, Oxygen support) and shortest ETA via live GIS grid.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
