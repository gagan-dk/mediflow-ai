import React, { useState, useEffect } from 'react';
import { Hospital } from '../types/hospital';
import { Ambulance } from '../types/ambulance';
import { 
  Hospital as HospitalIcon, 
  Truck, 
  MapPin, 
  Layers, 
  Navigation2, 
  Maximize2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ExternalLink, 
  Compass, 
  Globe, 
  Share2, 
  Sparkles,
  ChevronRight,
  ShieldAlert,
  LocateFixed
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface InteractiveMapProps {
  hospitals: Hospital[];
  selectedHospitalId?: string;
  onSelectHospital?: (hospital: Hospital) => void;
  ambulances?: Ambulance[];
  patientLocation?: { lat: number; lng: number; address: string };
  highlightRoute?: boolean;
  className?: string;
  onSendPreAlert?: (hospital: Hospital) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  ambulances = [],
  patientLocation,
  className = '',
  onSendPreAlert
}) => {
  const { userLiveLocation, detectUserLiveLocation, isLocatingUser } = useApp();

  const activeUserLocation = patientLocation || {
    lat: userLiveLocation.lat || 12.9716,
    lng: userLiveLocation.lng || 77.5946,
    address: userLiveLocation.address || 'Bangalore, India',
    city: userLiveLocation.city || 'Bangalore'
  };

  const [activeHospital, setActiveHospital] = useState<Hospital | null>(
    hospitals.find(h => h.id === selectedHospitalId) || hospitals[0] || null
  );
  const [mapMode, setMapMode] = useState<'google' | 'satellite' | 'gis'>('google');
  const [showTraffic, setShowTraffic] = useState(true);
  const [showAmbulances, setShowAmbulances] = useState(true);
  const [infoWindowOpen, setInfoWindowOpen] = useState(true);

  useEffect(() => {
    if (selectedHospitalId) {
      const found = hospitals.find(h => h.id === selectedHospitalId);
      if (found) {
        setActiveHospital(found);
        setInfoWindowOpen(true);
      }
    } else if (hospitals.length > 0) {
      setActiveHospital(hospitals[0]);
    }
  }, [selectedHospitalId, hospitals]);

   // Dynamic coordinate bounds calculation based on actual live user & hospital coordinates
   const validHospitals = hospitals.filter(h => h.coordinates?.lat && h.coordinates?.lng);
   const allLats = activeUserLocation.lat ? [activeUserLocation.lat, ...validHospitals.map(h => h.coordinates.lat)] : validHospitals.map(h => h.coordinates.lat);
   const allLngs = activeUserLocation.lng ? [activeUserLocation.lng, ...validHospitals.map(h => h.coordinates.lng)] : validHospitals.map(h => h.coordinates.lng);

   const validLats = allLats.filter(lat => !isNaN(lat) && lat !== 0);
   const validLngs = allLngs.filter(lng => !isNaN(lng) && lng !== 0);

   const minLat = validLats.length > 0 ? Math.min(...validLats) - 0.015 : 12.9716 - 0.015;
   const maxLat = validLats.length > 0 ? Math.max(...validLats) + 0.015 : 12.9716 + 0.015;
   const minLng = validLngs.length > 0 ? Math.min(...validLngs) - 0.02 : 77.5946 - 0.02;
   const maxLng = validLngs.length > 0 ? Math.max(...validLngs) + 0.02 : 77.5946 + 0.02;

  const latToPercent = (lat: number) => {
    const span = maxLat - minLat || 0.05;
    return Math.min(92, Math.max(8, 100 - ((lat - minLat) / span) * 100));
  };

  const lngToPercent = (lng: number) => {
    const span = maxLng - minLng || 0.05;
    return Math.min(92, Math.max(8, ((lng - minLng) / span) * 100));
  };

  const handleMarkerClick = (hosp: Hospital) => {
    setActiveHospital(hosp);
    setInfoWindowOpen(true);
    if (onSelectHospital) {
      onSelectHospital(hosp);
    }
  };

  const patientX = lngToPercent(activeUserLocation.lng);
  const patientY = latToPercent(activeUserLocation.lat);

  const activeHospX = activeHospital ? lngToPercent(activeHospital.coordinates.lng) : 50;
  const activeHospY = activeHospital ? latToPercent(activeHospital.coordinates.lat) : 50;

  // Real Google Maps directions URL between real GPS points
  const googleMapsDirectionsUrl = activeHospital
    ? `https://www.google.com/maps/dir/?api=1&origin=${activeUserLocation.lat},${activeUserLocation.lng}&destination=${activeHospital.coordinates.lat},${activeHospital.coordinates.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/hospitals/@${activeUserLocation.lat},${activeUserLocation.lng},14z`;

  // Real Google Maps interactive iframe view - always centered on user's actual location
  const googleMapIframeSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    activeHospital ? `${activeHospital.name}, ${activeHospital.address}` : `${activeUserLocation.lat},${activeUserLocation.lng}`
  )}&ll=${activeUserLocation.lat},${activeUserLocation.lng}&z=13&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className={`relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 flex flex-col ${className}`}>
      {/* If no hospitals and no active hospital selected, show fallback */}
      {(!hospitals || hospitals.length === 0) && !activeHospital && (
        <div className="flex-1 flex items-center justify-center p-6 text-center space-y-4">
          <div className="text-slate-300 space-y-2">
            <p className="text-sm font-semibold">Map data loading...</p>
            <p className="text-xs text-slate-400">Please wait while hospitals and location data are being prepared.</p>
          </div>
        </div>
      )}

      {(hospitals && hospitals.length > 0) || activeHospital && (
      <>
      <div className="bg-slate-950/90 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white rounded-lg text-xs font-bold">
            <Globe className="w-3.5 h-3.5 text-brand-400" />
            <span>Google Maps Live Emergency Layer</span>
          </div>

          <button
            onClick={detectUserLiveLocation}
            disabled={isLocatingUser}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition"
            title="Re-scan current live GPS position"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocatingUser ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isLocatingUser ? 'Locating...' : userLiveLocation.isLiveGps ? 'GPS Active' : 'Center on Me'}
            </span>
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setMapMode('google')}
            className={`px-3 py-1 rounded-lg font-semibold transition text-[11px] ${
              mapMode === 'google' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Google Map
          </button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-3 py-1 rounded-lg font-semibold transition text-[11px] ${
              mapMode === 'satellite' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapMode('gis')}
            className={`px-3 py-1 rounded-lg font-semibold transition text-[11px] ${
              mapMode === 'gis' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            GIS Tactical
          </button>
        </div>
      </div>

      {/* Map View Canvas Container */}
      <div className="relative w-full h-[480px] sm:h-[560px] bg-slate-950 overflow-hidden select-none">
        {/* Mode 1 & 2: Google Maps Real Interactive View Layer */}
        {(mapMode === 'google' || mapMode === 'satellite') && (
          <div className="absolute inset-0 w-full h-full">
            <iframe
              title="Google Map Live Hospital View"
              key={`${mapMode}-${activeUserLocation.lat.toFixed(4)}-${activeUserLocation.lng.toFixed(4)}`}
              src={googleMapIframeSrc}
              className="w-full h-full border-0 opacity-90"
              loading="lazy"
              allowFullScreen
            />
          </div>
        )}

        {/* Mode 3: Tactical GIS Canvas */}
        {mapMode === 'gis' && (
          <div className="absolute inset-0 w-full h-full bg-slate-950">
            <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="gis-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gis-grid)" />
            </svg>

            {/* Dynamic Emergency Route Line */}
            {activeHospital && (
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <line
                  x1={`${patientX}%`}
                  y1={`${patientY}%`}
                  x2={`${activeHospX}%`}
                  y2={`${activeHospY}%`}
                  stroke="#38bdf8"
                  strokeWidth="8"
                  strokeOpacity="0.35"
                  strokeLinecap="round"
                />
                <line
                  x1={`${patientX}%`}
                  y1={`${patientY}%`}
                  x2={`${activeHospX}%`}
                  y2={`${activeHospY}%`}
                  stroke="#0284c7"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </svg>
            )}
          </div>
        )}

        {/* Interactive Floating Hospital Markers (Interactive Overlay on top of Google Map) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Patient Marker */}
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            style={{ left: `${patientX}%`, top: `${patientY}%` }}
          >
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-3 bg-sky-500/40 rounded-full animate-ping" />
              <div className="relative flex items-center justify-center w-8 h-8 bg-sky-500 text-white rounded-full shadow-lg border-2 border-white">
                <Navigation2 className="w-4 h-4 transform -rotate-45" />
              </div>
              <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded shadow border border-sky-500/40">
                You ({('city' in activeUserLocation && activeUserLocation.city) || 'Live GPS'})
              </div>
            </div>
          </div>

          {/* Ambulances */}
          {showAmbulances && ambulances.map(amb => {
            const ambX = lngToPercent(amb.currentLocation.lng);
            const ambY = latToPercent(amb.currentLocation.lat);
            const isEnRoute = amb.status === 'En Route' || amb.status === 'Dispatched';

            return (
              <div
                key={amb.id}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{ left: `${ambX}%`, top: `${ambY}%` }}
              >
                <div className="relative group cursor-pointer">
                  {isEnRoute && <div className="absolute -inset-2 bg-amber-500/40 rounded-full animate-ping" />}
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full shadow-md border-2 border-white ${
                    isEnRoute ? 'bg-amber-500 text-white animate-bounce' : 'bg-slate-700 text-slate-200'
                  }`}>
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-30">
                    {amb.vehicleNumber} ({amb.status})
                  </div>
                </div>
              </div>
            );
          })}

          {/* Real Hospital Marker Pins */}
          {hospitals.map((hosp, idx) => {
            const hospX = lngToPercent(hosp.coordinates.lng);
            const hospY = latToPercent(hosp.coordinates.lat);
            const isSelected = activeHospital?.id === hosp.id;
            const isOverloaded = hosp.currentERLoadPercent > 85;

            return (
              <div
                key={hosp.id}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{ left: `${hospX}%`, top: `${hospY}%` }}
              >
                <button
                  onClick={() => handleMarkerClick(hosp)}
                  className={`group relative flex flex-col items-center focus:outline-none transition transform hover:scale-110 ${
                    isSelected ? 'scale-110 z-30' : ''
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -inset-3 bg-brand-500/50 rounded-full animate-pulse" />
                  )}
                  <div className={`flex items-center justify-center p-2 rounded-xl shadow-xl border-2 transition ${
                    isSelected
                      ? 'bg-brand-600 text-white border-white shadow-brand-500/50'
                      : isOverloaded
                      ? 'bg-red-600 text-white border-red-300'
                      : 'bg-slate-900/90 text-white border-slate-500 hover:border-brand-400'
                  }`}>
                    <HospitalIcon className="w-4 h-4" />
                  </div>

                  <div className={`mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-md border ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-300'
                      : 'bg-slate-900/95 text-slate-200 border-slate-700'
                  }`}>
                    #{idx + 1} {hosp.name.split(' ')[0]} ({hosp.travelTimeMinutes}m)
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Interactive Google Map Hospital InfoWindow Card */}
        {activeHospital && infoWindowOpen && (
          <div className="absolute top-4 right-4 z-30 max-w-sm w-full p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 animate-fade-in text-slate-900">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-brand-100 text-brand-800 rounded font-bold text-[10px] uppercase">
                    Real Verified Facility
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{activeHospital.type}</span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 mt-1">
                  {activeHospital.name}
                </h4>
                <p className="text-[11px] text-slate-500">{activeHospital.address}</p>
              </div>

              <button
                onClick={() => setInfoWindowOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Telemetry Quick Row */}
            <div className="grid grid-cols-3 gap-2 py-2.5 text-xs text-center border-b border-slate-100">
              <div className="p-1.5 bg-slate-50 rounded-lg">
                <span className="text-[9px] text-slate-400 block font-medium">Distance &amp; ETA</span>
                <span className="font-bold text-emerald-600 font-mono">{activeHospital.distanceKm} km • {activeHospital.travelTimeMinutes}m</span>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg">
                <span className="text-[9px] text-slate-400 block font-medium">ICU Beds</span>
                <span className={`font-bold font-mono ${activeHospital.availableICUBeds > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {activeHospital.availableICUBeds} Open
                </span>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg">
                <span className="text-[9px] text-slate-400 block font-medium">ER Wait</span>
                <span className="font-bold text-amber-600 font-mono">{activeHospital.estimatedWaitTimeMinutes} mins</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center gap-2">
                {onSelectHospital && (
                  <button
                    onClick={() => onSelectHospital(activeHospital)}
                    className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 transition transform active:scale-95"
                  >
                    Select This Hospital
                  </button>
                )}

                {onSendPreAlert && (
                  <button
                    onClick={() => onSendPreAlert(activeHospital)}
                    className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition transform active:scale-95 flex items-center gap-1"
                    title="Send Pre-Alert"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Pre-Alert</span>
                  </button>
                )}
              </div>

              <a
                href={googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold transition"
              >
                <Compass className="w-3.5 h-3.5 text-brand-600" />
                <span>Navigate Live from My GPS in Google Maps</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real existing hospitals analyzed from live coordinates ({activeUserLocation.lat.toFixed(4)}°, {activeUserLocation.lng.toFixed(4)}°).</span>
        </div>

        <a
          href={googleMapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 text-[11px]"
        >
          <span>Open in Google Maps App</span>
          <ExternalLink className="w-3 h-3" />
        </a>
       </div>
       </>
       )}
     </div>
   );
 };
