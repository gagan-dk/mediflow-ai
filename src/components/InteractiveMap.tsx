import React, { useState, useEffect, useMemo } from 'react';
import { Hospital } from '../types/hospital';
import { Ambulance } from '../types/ambulance';
import {
  Hospital as HospitalIcon,
  Truck,
  MapPin,
  Navigation2,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Compass,
  LocateFixed,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { mapService } from '../services/map/mapService';
import { calculateHaversineDistanceKm, decodePolyline } from '../services/realHospitalService';

function parseRouteGeometry(geometry: string | undefined): { lat: number; lng: number }[] | null {
  if (!geometry) return null;
  
  // Try GeoJSON first (Geoapify returns GeoJSON geometry)
  try {
    const geo = JSON.parse(geometry);
    if (geo.type === 'LineString' && Array.isArray(geo.coordinates)) {
      return geo.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    }
    if (geo.type === 'MultiLineString' && Array.isArray(geo.coordinates)) {
      const all = geo.coordinates.flat();
      return all.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    }
  } catch {
    // not JSON, try encoded polyline
  }
  
  // Try encoded polyline (OSRM returns encoded polyline)
  try {
    const decoded = decodePolyline(geometry);
    return decoded.map(([lat, lng]) => ({ lat, lng }));
  } catch {
    return null;
  }
}

interface InteractiveMapProps {
  hospitals: Hospital[];
  selectedHospitalId?: string;
  onSelectHospital?: (hospital: Hospital) => void;
  ambulances?: Ambulance[];
  patientLocation?: { lat: number; lng: number; address: string };
  searchLocation?: { lat: number; lng: number; name: string };
  highlightRoute?: boolean;
  className?: string;
  onSendPreAlert?: (hospital: Hospital) => void;
}

function FixMapCentering({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  ambulances = [],
  patientLocation,
  searchLocation,
  className = '',
  onSendPreAlert,
}) => {
  const { userLiveLocation, detectUserLiveLocation, isLocatingUser } = useApp();

  const activeUserLocation = patientLocation || {
    lat: userLiveLocation.lat,
    lng: userLiveLocation.lng,
    address: userLiveLocation.address || 'Unknown location',
    city: userLiveLocation.city || 'Unknown',
  };

  const hasValidLocation = activeUserLocation.lat !== 0 && activeUserLocation.lng !== 0;

  const [activeHospital, setActiveHospital] = useState<Hospital | null>(
    hospitals.find(h => h.id === selectedHospitalId) || hospitals[0] || null
  );
  const [showTraffic, setShowTraffic] = useState(false);
  const [showAmbulances, setShowAmbulances] = useState(true);
  const [infoWindowOpen, setInfoWindowOpen] = useState(true);
  const [mapStatus, setMapStatus] = useState<string | null>(null);
  const [route, setRoute] = useState<{ lat: number; lng: number }[] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);

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

  useEffect(() => {
    if (!activeHospital || !hasValidLocation) {
      setRoute(null);
      setRouteInfo(null);
      return;
    }
    mapService.getRoute(activeUserLocation.lat, activeUserLocation.lng, activeHospital.coordinates.lat, activeHospital.coordinates.lng)
      .then(r => {
        if (r) {
          setRouteInfo({ distanceKm: r.distanceKm, durationMinutes: r.durationMinutes });
          const parsed = parseRouteGeometry(r.geometry);
          setRoute(parsed);
        } else {
          setRouteInfo(null);
          setRoute(null);
        }
      })
      .catch(() => {
        setRoute(null);
        setRouteInfo(null);
      });
  }, [activeHospital?.id, activeHospital?.coordinates?.lat, activeHospital?.coordinates?.lng, activeUserLocation.lat, activeUserLocation.lng, hasValidLocation]);

  const tileSource = useMemo(() => {
    return mapService.getTileSource('positron');
  }, []);

  const status = mapService.getStatus();
  const unconfigured = mapService.getUnconfiguredMessage();

  const patientIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }), []);

  const hospitalIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }), []);

  const selectedIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }), []);

  const center: [number, number] = useMemo(() => {
    if (activeHospital && activeHospital.coordinates?.lat && activeHospital.coordinates?.lng) {
      return [(activeUserLocation.lat + activeHospital.coordinates.lat) / 2, (activeUserLocation.lng + activeHospital.coordinates.lng) / 2];
    }
    return [activeUserLocation.lat, activeUserLocation.lng];
  }, [activeHospital, activeUserLocation]);

  const zoom = useMemo(() => {
    if (activeHospital && activeHospital.coordinates?.lat) {
      const d = calculateHaversineDistanceKm(activeUserLocation.lat, activeUserLocation.lng, activeHospital.coordinates.lat, activeHospital.coordinates.lng);
      if (d < 3) return 14;
      if (d < 8) return 13;
      return 12;
    }
    return 13;
  }, [activeHospital, activeUserLocation]);

  const googleMapsDirectionsUrl = activeHospital
    ? `https://www.google.com/maps/dir/?api=1&origin=${activeUserLocation.lat},${activeUserLocation.lng}&destination=${activeHospital.coordinates.lat},${activeHospital.coordinates.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/hospitals/@${activeUserLocation.lat},${activeUserLocation.lng},14z`;

  if (unconfigured) {
    return (
      <div className={`relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 flex flex-col ${className}`}>
        <div className="flex-1 flex items-center justify-center p-6 text-center space-y-4">
          <div className="text-slate-300 space-y-2">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <p className="text-sm font-semibold">Map provider not configured.</p>
            <p className="text-xs text-slate-400 max-w-sm">{unconfigured}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 flex flex-col ${className}`}>
      <div className="bg-slate-950/90 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white rounded-lg text-xs font-bold">
            <MapPin className="w-3.5 h-3.5 text-brand-400" />
            <span>Geoapify Live Map</span>
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

          <button
            onClick={() => setShowAmbulances(!showAmbulances)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
              showAmbulances ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle ambulances"
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ambulances</span>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="px-3 py-1 rounded-lg font-semibold text-[11px] bg-brand-600 text-white shadow-xs">Live Map</span>
        </div>
      </div>

      <div className="relative w-full h-[480px] sm:h-[560px] bg-slate-950 overflow-hidden select-none">
        {!hasValidLocation && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="text-center space-y-3 p-6 max-w-sm">
              <MapPin className="w-10 h-10 text-brand-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-200">Location access required</p>
              <p className="text-xs text-slate-400">Enable GPS to center the map on your position and discover nearby hospitals.</p>
              <button
                onClick={detectUserLiveLocation}
                disabled={isLocatingUser}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {isLocatingUser ? 'Acquiring GPS...' : 'Enable My Location'}
              </button>
            </div>
          </div>
        )}

        {tileSource && hasValidLocation && (
          <MapContainer
            center={center}
            zoom={zoom}
            className="w-full h-full"
            zoomControl={true}
            attributionControl={true}
          >
            <TileLayer
              attribution={tileSource.attribution}
              url={tileSource.url}
              maxZoom={tileSource.maxZoom || 19}
            />

            <FixMapCentering center={center} zoom={zoom} />

            {/* Route polyline */}
            {route && route.length > 1 && (
              <Polyline
                positions={route}
                pathOptions={{ color: '#38bdf8', weight: 5, opacity: 0.6 }}
              />
            )}

            {/* Patient marker */}
            <Marker position={[activeUserLocation.lat, activeUserLocation.lng]} icon={patientIcon}>
              <Popup>
                <div className="text-xs font-semibold text-slate-800">
                  Your Location
                  {activeUserLocation.address && <div className="text-[10px] text-slate-500">{activeUserLocation.address}</div>}
                </div>
              </Popup>
            </Marker>

            {/* Search location marker */}
            {searchLocation && (
              <Marker
                position={[searchLocation.lat, searchLocation.lng]}
                icon={new L.Icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41],
                })}
              >
                <Popup>
                  <div className="text-xs font-semibold text-slate-800">
                    Search Location: {searchLocation.name}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Hospital markers */}
            {hospitals.map(hosp => {
              if (!hosp.coordinates?.lat || !hosp.coordinates?.lng) return null;
              const isSelected = activeHospital?.id === hosp.id;
              const isOverloaded = hosp.currentERLoadPercent > 85;

              return (
                <Marker
                  key={hosp.id}
                  position={[hosp.coordinates.lat, hosp.coordinates.lng]}
                  icon={isSelected ? selectedIcon : hospitalIcon}
                  eventHandlers={{
                    click: () => {
                      setActiveHospital(hosp);
                      setInfoWindowOpen(true);
                      if (onSelectHospital) onSelectHospital(hosp);
                    },
                  }}
                >
                  <Popup>
                    <div className="text-xs text-slate-800 space-y-1 min-w-[180px]">
                      <div className="font-bold text-sm">{hosp.name}</div>
                      <div className="text-[10px] text-slate-500">{hosp.address}</div>
                      <div className="font-mono text-[10px]">
                        {hosp.distanceKm} km • {hosp.travelTimeMinutes} min
                      </div>
                      {hosp.operationalDataAvailable ? (
                        <div className="text-[10px]">
                          <span className={hosp.availableICUBeds > 0 ? 'text-purple-600' : 'text-red-600'}>
                            ICU: {hosp.availableICUBeds} open
                          </span>
                          <span className="ml-2 text-amber-600">ER: {hosp.estimatedWaitTimeMinutes}m</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">Operational data not available</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Ambulance markers */}
            {showAmbulances && ambulances.map(amb => {
              const isEnRoute = amb.status === 'En Route' || amb.status === 'Dispatched';
              return (
                <Marker
                  key={amb.id}
                  position={[amb.currentLocation.lat, amb.currentLocation.lng]}
                  icon={new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                  })}
                >
                  <Popup>
                    <div className="text-xs font-semibold text-slate-800">
                      {amb.vehicleNumber} ({amb.status})
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {!tileSource && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            <div className="text-center space-y-3 p-6">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Map tiles unavailable</p>
              <p className="text-xs text-slate-500 max-w-xs">Map provider not configured or tile source is unavailable. Hospital search and list remain functional.</p>
            </div>
          </div>
        )}
      </div>

      {/* Active hospital info card */}
      {activeHospital && infoWindowOpen && (
        <div className="absolute top-4 right-4 z-30 max-w-sm w-full p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 animate-fade-in text-slate-900">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 bg-brand-100 text-brand-800 rounded font-bold text-[10px] uppercase">
                  Real Verified Facility
                </span>
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
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2.5 text-xs text-center border-b border-slate-100">
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <span className="text-[9px] text-slate-400 block font-medium">Distance &amp; ETA</span>
              <span className="font-bold text-emerald-600 font-mono text-[11px]">
                {activeHospital.distanceKm} km
                {routeInfo ? ` • ${routeInfo.durationMinutes}m` : ` • ${activeHospital.travelTimeMinutes}m`}
              </span>
              {routeInfo && (
                <span className="text-[9px] text-slate-400 block">({routeInfo.distanceKm} km via route)</span>
              )}
            </div>
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <span className="text-[9px] text-slate-400 block font-medium">ICU Beds</span>
              <span className={`font-bold font-mono text-[11px] ${activeHospital.availableICUBeds > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {activeHospital.availableICUBeds} Open
              </span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <span className="text-[9px] text-slate-400 block font-medium">ER Wait</span>
              <span className="font-bold text-amber-600 font-mono text-[11px]">{activeHospital.estimatedWaitTimeMinutes} mins</span>
            </div>
          </div>

          <div className="pt-3 space-y-2">
            <div className="flex items-center gap-2">
              {onSelectHospital && (
                <button
                  onClick={() => {
                    if (onSelectHospital) onSelectHospital(activeHospital);
                  }}
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

      <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            Real hospitals from {status.primary} provider ({activeUserLocation.lat.toFixed(4)}°, {activeUserLocation.lng.toFixed(4)}°)
          </span>
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
    </div>
  );
};
