import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Radio,
  Loader2,
  X,
  Building2,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Hospital } from '../types/hospital';
import { InteractiveMap } from '../components/InteractiveMap';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { LocationPermissionModal } from '../components/LocationPermissionModal';
import { locationService } from '../services/locationService';
import { hospitalDiscoveryService } from '../services/hospitalDiscoveryService';

interface HospitalFinderPageProps {
  navigate: (path: string) => void;
}

export const HospitalFinderPage: React.FC<HospitalFinderPageProps> = ({ navigate }) => {
  const { 
    hospitals, 
    addDiscoveredHospitals,
    rankedHospitals, 
    selectedHospital, 
    setSelectedHospital, 
    sendHospitalPreAlert, 
    ambulances,
    userLiveLocation,
    detectUserLiveLocation,
    isLocatingUser,
    addNotification
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'top_6' | 'icu' | 'lowest_wait' | 'nearest' | 'trauma' | 'distance_10' | 'distance_20'>('nearest');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearchingHospitals, setIsSearchingHospitals] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!locationService.isPermissionAcknowledged() && !isLocatingUser) {
      const timer = setTimeout(() => {
        setShowLocationModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLocatingUser]);

  // Automatically attempt location on mount if permission acknowledged or already granted
  useEffect(() => {
    if (isLocatingUser) return;
    const permState = locationService.getState().permissionState;
    if (permState === 'GRANTED' || locationService.isPermissionAcknowledged()) {
      detectUserLiveLocation();
    }
  }, []);

  const handleAllowLocation = async () => {
    setShowLocationModal(false);
    try {
      const coords = await locationService.requestLocation();
      await detectUserLiveLocation();
      locationService.acknowledgePermission(true);
    } catch (error: any) {
      console.error('Location error:', error);
      locationService.acknowledgePermission(false);
      setLocationError('Unable to access your device location. Please enable location access and try again.');
    }
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    locationService.acknowledgePermission(false);
    setLocationError('Location access denied. Hospital distances may be less accurate.');
  };

  // Perform live real-time OpenStreetMap / Nominatim search for the exact hospital typed
  const handleSearchRealHospitals = useCallback(async (explicitQuery?: string) => {
    const queryToSearch = (explicitQuery !== undefined ? explicitQuery : searchQuery).trim();
    if (!queryToSearch || isSearchingHospitals) return;

    setIsSearchingHospitals(true);
    setSearchStatus(`Searching OpenStreetMap for "${queryToSearch}"...`);
    try {
      let userLat = userLiveLocation.lat;
      let userLng = userLiveLocation.lng;
      if (!userLat || !userLng) {
        await detectUserLiveLocation();
        userLat = userLiveLocation.lat || 12.9716;
        userLng = userLiveLocation.lng || 77.5946;
      }

      // Query OpenStreetMap Nominatim + Overpass specifically for the typed hospital name
      const discovered = await hospitalDiscoveryService.searchHospitalsByQuery(queryToSearch, userLat, userLng);

      if (discovered && discovered.length > 0) {
        // Merge into centralized app state so maps, ranking, and routing immediately have access
        addDiscoveredHospitals(discovered);
        
        // Select the top searched result immediately so map centers on it
        setSelectedHospital(discovered[0]);
        
        setSearchStatus(`Found ${discovered.length} matching healthcare facility for "${queryToSearch}".`);
        addNotification({
          title: '🏥 Real Hospital Found',
          message: `Located "${discovered[0].name}" (${discovered[0].distanceKm} km away). Marked on live map.`,
          type: 'system'
        });
      } else {
        // Check if any hospital in current list matches
        const localMatches = rankedHospitals.filter(r => 
          r.hospital.name.toLowerCase().includes(queryToSearch.toLowerCase()) ||
          r.hospital.address.toLowerCase().includes(queryToSearch.toLowerCase())
        );
        if (localMatches.length > 0) {
          setSearchStatus(`Found ${localMatches.length} matching facility in local database.`);
          setSelectedHospital(localMatches[0].hospital);
        } else {
          setSearchStatus(`No exact facility found for "${queryToSearch}". Try searching by full hospital name or city.`);
        }
      }
    } catch (e) {
      console.error('Search hospitals error:', e);
      setSearchStatus('Could not complete search. Please try again.');
    } finally {
      setIsSearchingHospitals(false);
    }
  }, [searchQuery, isSearchingHospitals, userLiveLocation, detectUserLiveLocation, addDiscoveredHospitals, setSelectedHospital, addNotification, rankedHospitals]);

  // Debounced auto-search when user types 3 or more characters
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) {
      setSearchStatus(null);
      return;
    }

    const timer = setTimeout(() => {
      handleSearchRealHospitals(trimmed);
    }, 550);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredHospitals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rankedHospitals.filter((item, idx) => {
      const h = item.hospital;

      if (query) {
        const matchesSearch = 
          h.name.toLowerCase().includes(query) ||
          h.address.toLowerCase().includes(query) ||
          h.specialties.some((s: string) => s.toLowerCase().includes(query)) ||
          Boolean(h.isDirectSearchMatch);

        if (!matchesSearch) return false;

        if (filterType === 'icu') return h.availableICUBeds > 0;
        if (filterType === 'lowest_wait') return h.estimatedWaitTimeMinutes <= 15;
        if (filterType === 'distance_10') return h.distanceKm <= 10.0;
        if (filterType === 'distance_20') return h.distanceKm <= 20.0;
        if (filterType === 'trauma') return h.traumaLevel === 1;

        return true;
      }

      if (filterType === 'top_6') return idx < 6;
      if (filterType === 'icu') return h.availableICUBeds > 0;
      if (filterType === 'lowest_wait') return h.estimatedWaitTimeMinutes <= 15;
      if (filterType === 'nearest') return true; // all hospitals, sorted by distance below
      if (filterType === 'distance_10') return h.distanceKm <= 10.0;
      if (filterType === 'distance_20') return h.distanceKm <= 20.0;
      if (filterType === 'trauma') return h.traumaLevel === 1;

      return true;
    });
  }, [rankedHospitals, searchQuery, filterType]);

  // When searching, sort direct/exact name matches to the absolute top, followed by distance
  const displayedHospitals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return [...filteredHospitals].sort((a, b) => {
        const aName = a.hospital.name.toLowerCase();
        const bName = b.hospital.name.toLowerCase();
        
        const aDirect = a.hospital.isDirectSearchMatch || aName.includes(query) ? 0 : 1;
        const bDirect = b.hospital.isDirectSearchMatch || bName.includes(query) ? 0 : 1;
        
        if (aDirect !== bDirect) return aDirect - bDirect;
        return a.hospital.distanceKm - b.hospital.distanceKm;
      });
    }

    if (filterType === 'nearest') {
      return [...filteredHospitals].sort((a, b) => a.hospital.distanceKm - b.hospital.distanceKm);
    }
    return filteredHospitals;
  }, [filteredHospitals, searchQuery, filterType]);

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
    <>
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
      />
      
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
      <div className="space-y-2">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          {/* Search Bar with live search and clear button */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className={`w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 ${isSearchingHospitals ? 'animate-pulse text-brand-500' : ''}`} />
            <input
              type="text"
              placeholder="Type any hospital name (e.g., Apollo, AIIMS, Fortis, City Hospital)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchQuery.trim() && handleSearchRealHospitals()}
              className="w-full pl-9 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchStatus(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => handleSearchRealHospitals()}
                disabled={isSearchingHospitals || !searchQuery.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition disabled:opacity-50"
              >
                {isSearchingHospitals ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <span>Search</span>
                )}
              </button>
            </div>
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
              Nearest
            </button>
            <button
              onClick={() => setFilterType('distance_10')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filterType === 'distance_10' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              &lt; 10 km
            </button>
            <button
              onClick={() => setFilterType('distance_20')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filterType === 'distance_20' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              &lt; 20 km
            </button>
          </div>
        </div>

        {/* Live Search Status Banner */}
        {searchStatus && (
          <div className="px-4 py-2 bg-brand-50 border border-brand-200 text-brand-900 rounded-xl text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              {isSearchingHospitals ? (
                <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-brand-600" />
              )}
              <span>{searchStatus}</span>
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchStatus(null);
                }}
                className="text-xs font-bold text-brand-700 hover:text-brand-900 underline"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dual Pane Layout: Hospital Cards on Left + Google Maps on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hospital Cards List */}
        <div className="lg:col-span-5 space-y-4 max-h-[820px] overflow-y-auto pr-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>{displayedHospitals.length} Real Healthcare Facilities Found</span>
            <span className="text-emerald-600 font-semibold">Live GPS Calibrated</span>
          </div>

          {displayedHospitals.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                <HospitalIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">No Matching Facility Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  We couldn't locate any hospital matching <strong>"{searchQuery}"</strong> in the map database. Try searching for another hospital name or clear the search.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchStatus(null);
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Clear Search Filter
                </button>
                <button
                  onClick={detectUserLiveLocation}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Re-Scan Nearby Hospitals
                </button>
              </div>
            </div>
          ) : (
            displayedHospitals.map(rankedItem => {
              const hosp = rankedItem.hospital;
              const isSelected = selectedHospital?.id === hosp.id;
              const isEligible = rankedItem.isEligible;
              const rankBadge = getRankBadge(rankedItem.rank);
              const isDirectMatch = Boolean(
                hosp.isDirectSearchMatch ||
                (searchQuery.trim() && hosp.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
              );

              return (
                <div
                  key={hosp.id}
                  onClick={() => handleSelectHospital(hosp)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer relative space-y-3.5 ${
                    isSelected
                      ? 'bg-white border-2 border-brand-500 shadow-xl shadow-brand-500/15 ring-2 ring-brand-500/20'
                      : isDirectMatch
                      ? 'bg-gradient-to-br from-emerald-50/40 via-white to-white border-emerald-300 shadow-md hover:border-emerald-400'
                      : !isEligible
                      ? 'bg-slate-50/70 border-slate-200 opacity-80'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* AI Rank Badge / Direct Search Match Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isDirectMatch && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-200" />
                          <span>🎯 Direct Search Match</span>
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] border shadow-2xs ${rankBadge.style}`}>
                        {rankBadge.label}
                      </span>
                    </div>

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
                        <HospitalIcon className={`w-4 h-4 ${isSelected ? 'text-brand-600' : isDirectMatch ? 'text-emerald-600' : 'text-slate-500'}`} />
                        {hosp.name}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500">{hosp.address}</p>
                  </div>

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 border-y border-slate-100 bg-slate-50/50 p-2.5 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Distance from You</span>
                      <span className="font-bold font-mono text-slate-800">{hosp.distanceKm} km</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block font-mono">({hosp.travelTimeMinutes}m ETA)</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">ICU Beds</span>
                      {hosp.operationalDataAvailable ? (
                        <>
                          <span className={`font-bold font-mono ${hosp.availableICUBeds > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                            {hosp.availableICUBeds} / {hosp.totalICUBeds} Open
                          </span>
                          <span className="text-[10px] text-slate-500 block">{hosp.availableEmergencyBeds} ER Beds</span>
                        </>
                      ) : (
                        <span className="font-bold font-mono text-slate-400">Operational data not available</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Doctors & ER</span>
                      {hosp.operationalDataAvailable ? (
                        <>
                          <span className="font-bold font-mono text-emerald-600">
                            {hosp.doctors?.available ?? 0} Drs Available
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {hosp.emergencyRooms?.available ?? 0} ER Rooms Open
                          </span>
                        </>
                      ) : (
                        <span className="font-bold font-mono text-slate-400">Operational data not available</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">ER Wait Time</span>
                      {hosp.operationalDataAvailable ? (
                        <>
                          <span className="font-bold font-mono text-amber-600">{hosp.estimatedWaitTimeMinutes} mins</span>
                          <span className="text-[10px] text-slate-500 block font-mono">Load: {hosp.currentERLoadPercent}%</span>
                        </>
                      ) : (
                        <span className="font-bold font-mono text-slate-400">Operational data not available</span>
                      )}
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
            })
          )}
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

      {locationError && (
        <div className="fixed bottom-4 right-4 max-w-sm p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-lg animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Location Access Limited</p>
              <p className="text-xs text-amber-700 mt-1">{locationError}</p>
              <button
                onClick={() => setLocationError(null)}
                className="text-xs text-amber-600 hover:text-amber-800 font-semibold mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
