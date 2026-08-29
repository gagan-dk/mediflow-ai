import React, { useState } from 'react';
import { 
  Hospital as HospitalIcon, 
  MapPin, 
  Clock, 
  BedDouble, 
  Truck, 
  Sparkles, 
  Filter, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Compass,
  Award,
  Globe,
  LocateFixed,
  Radio
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Hospital } from '../types/hospital';
import { InteractiveMap } from '../components/InteractiveMap';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface HospitalFinderPageProps {
  navigate: (path: string) => void;
}

export const HospitalFinderPage: React.FC<HospitalFinderPageProps> = ({ navigate }) => {
  const { 
    hospitals, 
    rankedHospitals, 
    selectedHospital, 
    setSelectedHospital, 
    sendHospitalPreAlert, 
    ambulances,
    userLiveLocation,
    detectUserLiveLocation,
    isLocatingUser
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'top_6' | 'icu' | 'lowest_wait' | 'nearest' | 'trauma'>('top_6');

  const filteredHospitals = rankedHospitals.filter((item, idx) => {
    const h = item.hospital;
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.specialties.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'top_6') return idx < 6;
    if (filterType === 'icu') return h.availableICUBeds > 0;
    if (filterType === 'lowest_wait') return h.estimatedWaitTimeMinutes <= 15;
    if (filterType === 'nearest') return h.distanceKm <= 5.0;
    if (filterType === 'trauma') return h.traumaLevel === 1;

    return true;
  });

  const handleSelectHospital = (hosp: Hospital) => {
    setSelectedHospital(hosp);
  };

  const handlePreAlertAndRoute = (hosp: Hospital) => {
    setSelectedHospital(hosp);
    sendHospitalPreAlert(hosp);
    navigate('/journey');
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          label: '🏆 AI Best-Case Scenario Pick',
          style: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold'
        };
      case 2:
        return {
          label: '🥈 Optimal Specialist Center',
          style: 'bg-sky-100 text-sky-900 border-sky-300 font-bold'
        };
      case 3:
        return {
          label: '🥉 High Capacity Alternative',
          style: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
        };
      case 4:
        return {
          label: '4️⃣ Secondary Emergency Center',
          style: 'bg-purple-100 text-purple-900 border-purple-300 font-medium'
        };
      case 5:
        return {
          label: '5️⃣ Community Support Center',
          style: 'bg-slate-100 text-slate-800 border-slate-300 font-medium'
        };
      case 6:
      default:
        return {
          label: '6️⃣ Regional Backup Facility',
          style: 'bg-slate-100 text-slate-700 border-slate-300 font-medium'
        };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-bold">
            <Globe className="w-3.5 h-3.5" />
            <span>Live GPS Real-Time Hospital Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find Nearby Real Hospitals
          </h1>
          <p className="text-xs text-slate-500">
            Analyzing your live GPS position to discover real, verified nearby healthcare facilities. The AI suggests the <strong>Top 5 to 6 Best Hospitals</strong> based on live capacity and traffic ETA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={detectUserLiveLocation}
            disabled={isLocatingUser}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition transform active:scale-95"
          >
            <LocateFixed className={`w-4 h-4 ${isLocatingUser ? 'animate-spin' : ''}`} />
            <span>{isLocatingUser ? 'Acquiring GPS...' : '📍 Re-Scan My Live Location'}</span>
          </button>
        </div>
      </div>

      <DisclaimerBanner compact />

      {/* Live GPS Telemetry Status Bar */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 via-sky-50 to-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 text-white shadow-xs">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span>Current GPS Location:</span>
              <span className="font-mono text-emerald-700 font-extrabold">
                {userLiveLocation.address}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Coordinates: ({userLiveLocation.lat.toFixed(4)}°, {userLiveLocation.lng.toFixed(4)}°) • Accuracy: ±{userLiveLocation.accuracyMeters || 15}m • {hospitals.length} Real Hospitals Synced
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('top_6')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'top_6'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            ⭐ Top 6 AI Best-Case Picks
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search real hospital by name or specialty..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterType('top_6')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterType === 'top_6' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⭐ Top 6 AI Picks
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterType === 'all' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Real Hospitals ({rankedHospitals.length})
          </button>
          <button
            onClick={() => setFilterType('icu')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterType === 'icu' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ICU Beds Open
          </button>
          <button
            onClick={() => setFilterType('lowest_wait')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterType === 'lowest_wait' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Lowest Wait Time
          </button>
          <button
            onClick={() => setFilterType('nearest')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterType === 'nearest' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Nearest (&lt; 5 km)
          </button>
        </div>
      </div>

      {/* Dual Pane Layout: Hospital Cards on Left + Google Maps on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hospital Cards List */}
        <div className="lg:col-span-5 space-y-4 max-h-[820px] overflow-y-auto pr-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>{filteredHospitals.length} Real Nearby Hospitals Found</span>
            <span className="text-emerald-600 font-semibold">Live GPS Calibrated</span>
          </div>

          {filteredHospitals.map(rankedItem => {
            const hosp = rankedItem.hospital;
            const isSelected = selectedHospital?.id === hosp.id;
            const isEligible = rankedItem.isEligible;
            const rankBadge = getRankBadge(rankedItem.rank);

            return (
              <div
                key={hosp.id}
                onClick={() => handleSelectHospital(hosp)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer relative space-y-3.5 ${
                  isSelected
                    ? 'bg-white border-2 border-brand-500 shadow-xl shadow-brand-500/15 ring-2 ring-brand-500/20'
                    : !isEligible
                    ? 'bg-slate-50/70 border-slate-200 opacity-80'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* AI Rank Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] border shadow-2xs ${rankBadge.style}`}>
                    {rankBadge.label}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold">Suitability:</span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-extrabold shadow-xs ${
                      isEligible
                        ? 'bg-brand-50 border border-brand-200 text-brand-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {rankedItem.suitabilityScore}/100
                    </span>
                  </div>
                </div>

                {/* Header info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                      <HospitalIcon className={`w-4 h-4 ${isSelected ? 'text-brand-600' : 'text-slate-500'}`} />
                      {hosp.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500">{hosp.address}</p>
                </div>

                {/* Core Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs py-2 border-y border-slate-100 bg-slate-50/50 p-2.5 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Distance from You</span>
                    <span className="font-bold font-mono text-slate-800">{hosp.distanceKm} km</span>
                    <span className="text-[10px] text-emerald-600 font-semibold block font-mono">({hosp.travelTimeMinutes}m ETA)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">ICU Beds</span>
                    <span className={`font-bold font-mono ${hosp.availableICUBeds > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      {hosp.availableICUBeds} / {hosp.totalICUBeds} Open
                    </span>
                    <span className="text-[10px] text-slate-500 block">{hosp.availableEmergencyBeds} ER Beds</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">ER Wait Time</span>
                    <span className="font-bold font-mono text-amber-600">{hosp.estimatedWaitTimeMinutes} mins</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Load: {hosp.currentERLoadPercent}%</span>
                  </div>
                </div>

                {/* Explainable AI snippet */}
                <p className="text-[11px] text-slate-600 italic line-clamp-2">
                  "{rankedItem.whyThisHospitalExplanation}"
                </p>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {hosp.ambulanceAvailableCount} Ambulances Ready
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectHospital(hosp);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isSelected
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isSelected ? 'Selected ✓' : 'Select'}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreAlertAndRoute(hosp);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <span>Route &amp; Alert</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Google Maps Interactive Component */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveMap
            hospitals={hospitals}
            selectedHospitalId={selectedHospital?.id}
            onSelectHospital={handleSelectHospital}
            onSendPreAlert={handlePreAlertAndRoute}
            ambulances={ambulances}
            className="h-full min-h-[560px]"
          />
        </div>
      </div>
    </div>
  );
};
