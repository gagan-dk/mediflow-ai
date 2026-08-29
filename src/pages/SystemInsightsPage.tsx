import React, { useState } from 'react';
import { 
  Sparkles, 
  BarChart3, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Activity, 
  Award, 
  ArrowRight, 
  TrendingUp,
  Cpu,
  Clock,
  BedDouble,
  Truck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { runBatchEmergencySimulation } from '../services/simulationEngine';
import { SimulationResultMetrics, SyntheticScenario } from '../types/simulation';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { soundFX } from '../services/soundEffects';

interface SystemInsightsPageProps {
  navigate: (path: string) => void;
}

export const SystemInsightsPage: React.FC<SystemInsightsPageProps> = ({ navigate }) => {
  const { hospitals } = useApp();
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);
  const [simResults, setSimResults] = useState<{
    metrics: SimulationResultMetrics;
    scenarios: SyntheticScenario[];
  } | null>(() => runBatchEmergencySimulation(hospitals, 100));

  const handleRunSimulation = (count: number = 100) => {
    setIsRunningSimulation(true);
    soundFX.playChime();

    setTimeout(() => {
      const results = runBatchEmergencySimulation(hospitals, count);
      setSimResults(results);
      setIsRunningSimulation(false);
      soundFX.playChime();
    }, 600);
  };

  const metrics = simResults?.metrics;

  const queueDistributionData = metrics ? [
    { name: 'Critical (ESI-1)', count: metrics.queueDistribution.critical, color: '#ef4444' },
    { name: 'High (ESI-2)', count: metrics.queueDistribution.high, color: '#f97316' },
    { name: 'Moderate (ESI-3)', count: metrics.queueDistribution.moderate, color: '#eab308' },
    { name: 'Low (ESI-4/5)', count: metrics.queueDistribution.low, color: '#22c55e' }
  ] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold shadow-xs">
          <Award className="w-3.5 h-3.5 text-amber-600" />
          <span>Smart India Hackathon • Healthcare Innovation Briefing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          System Insights &amp; Algorithmic Architecture
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
          Solving emergency hospital bottlenecks through AI-assisted prioritization, capability-matched routing, and pre-arrival alerts.
        </p>
      </div>

      <DisclaimerBanner />

      {/* Problem vs Existing Approach vs MediFlow AI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Problem */}
        <div className="p-6 bg-red-50/60 rounded-3xl border border-red-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-red-600" /> The Problem
          </div>
          <h3 className="font-bold text-slate-900 text-base">Uncoordinated Emergency Inflow</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Emergency patients and ambulances routinely arrive unannounced at the nearest hospital, only to find the ICU full, oxygen lines saturated, or ER waiting times exceeding 45 minutes.
          </p>
        </div>

        {/* Existing Approach */}
        <div className="p-6 bg-slate-100 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4 text-slate-500" /> Existing Systems
          </div>
          <h3 className="font-bold text-slate-900 text-base">Static Distance &amp; Booking</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Current systems use straight-line GPS distance or general appointment queues without awareness of live ICU bed availability, specialist rosters, or traffic congestion.
          </p>
        </div>

        {/* MediFlow AI Approach */}
        <div className="p-6 bg-emerald-50/80 rounded-3xl border-2 border-emerald-500 shadow-md space-y-3 relative">
          <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
            SIH Innovation
          </div>
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-600" /> MediFlow AI Engine
          </div>
          <h3 className="font-bold text-slate-900 text-base">Intelligent Emergency Coordination</h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            Fuses patient urgency + required facility matching + real-time ICU/ER capacity + traffic ETA to recommend the optimal hospital while transmitting pre-alerts before arrival.
          </p>
        </div>
      </div>

      {/* Architecture Pipeline Visual Flow */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-400" />
            <h3 className="font-bold text-sm text-white">
              MediFlow AI Core Algorithmic Architecture
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">End-to-End Coordination Pipeline</span>
        </div>

        {/* Flow Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center text-xs">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-brand-300">1. Patient Input</div>
            <div className="text-[10px] text-slate-400">Symptoms &amp; Vitals</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-sky-300">2. AI Prioritize</div>
            <div className="text-[10px] text-slate-400">ESI Risk Score</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-purple-300">3. Facility Filter</div>
            <div className="text-[10px] text-slate-400">ICU/Oxygen Check</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-emerald-300">4. MCDA Rank</div>
            <div className="text-[10px] text-slate-400">Travel ETA + Load</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-red-300">5. 🚨 Pre-Alert</div>
            <div className="text-[10px] text-slate-400">Reserve ICU Bed</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-amber-300">6. Ambulance</div>
            <div className="text-[10px] text-slate-400">Capability Match</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-teal-300">7. Command ER</div>
            <div className="text-[10px] text-slate-400">Priority Token</div>
          </div>
        </div>
      </div>

      {/* 100 Emergency Scenarios Simulation Engine */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-lg text-slate-900">
                Monte Carlo Simulation Engine (100 Emergency Cases)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Empirical testing suite that evaluates system behavior across synthetic clinical presentations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunSimulation(50)}
              disabled={isRunningSimulation}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Run 50 Cases
            </button>
            <button
              onClick={() => handleRunSimulation(100)}
              disabled={isRunningSimulation}
              className="flex items-center gap-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition transform active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningSimulation ? 'animate-spin' : ''}`} />
              <span>Run 100 Scenarios</span>
            </button>
          </div>
        </div>

        {/* Prototype Results Banner Note */}
        <div className="px-4 py-2.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 font-medium flex items-center justify-between">
          <span>* Results from simulated test scenarios (Monte Carlo synthetic test run).</span>
          <span className="font-mono text-[11px] text-sky-700">Executed: {metrics?.totalScenariosRun} cases</span>
        </div>

        {/* 5 Computed Simulation Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-600" /> Avg Simulated Wait
              </span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                {metrics.averageSimulatedWaitTimeMinutes} mins
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold font-mono">Optimal load balance</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Critical Cases Routed
              </span>
              <div className="text-2xl font-extrabold text-emerald-700 font-mono">
                {metrics.criticalCasesSuccessfullyRoutedPercent}%
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold font-mono">100% facility match</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Dynamic Reroutes
              </span>
              <div className="text-2xl font-extrabold text-amber-600 font-mono">
                {metrics.reroutesTriggeredCount} Triggered
              </div>
              <span className="text-[10px] text-slate-500">Prevented saturation</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-purple-600" /> Avg Ambulance ETA
              </span>
              <div className="text-2xl font-extrabold text-purple-700 font-mono">
                {metrics.simulatedAmbulanceEtaMinutes} mins
              </div>
              <span className="text-[10px] text-purple-600 font-semibold font-mono">Traffic-calibrated</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-sky-600" /> Network Utilization
              </span>
              <div className="text-2xl font-extrabold text-sky-700 font-mono">
                {metrics.simulatedHospitalUtilizationPercent}%
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">Zero ER collapse</span>
            </div>
          </div>
        )}

        {/* Charts from Simulation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hospital Load Distribution */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Simulated Hospital Patient Load Distribution
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.hospitalLoadDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hospitalName" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.split(' ')[0]} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="patientsRouted" fill="#0284c7" name="Patients Routed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Queue Distribution */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Severity Distribution in Simulation
            </h4>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={queueDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="count"
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {queueDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
