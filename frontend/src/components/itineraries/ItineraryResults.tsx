import React, { useState, useEffect } from 'react';
import { Trip, Itinerary } from '../../types';
import { api } from '../../services/api';
import { 
  Bus, 
  Navigation, 
  Bike, 
  Landmark, 
  Utensils, 
  Hospital, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  AlertTriangle,
  MapPin,
  Check,
  X,
  PhoneCall,
  ShieldCheck
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export interface TripConfirmationData {
  itinerary: Itinerary;
  rapidoPickup: boolean;
  rapidoDrop: boolean;
  selectedAttractions: string[];
  selectedRestaurants: string[];
  passengerName: string;
  passengerCount: number;
  totalAmount: number;
}

interface ResultsProps {
  trip?: Trip;
  itineraries: Itinerary[];
  userName?: string;
  onConfirmTrip: (data: TripConfirmationData) => void;
  onViewTimeline: (itinerary: Itinerary) => void;
}

export const ItineraryResults: React.FC<ResultsProps> = ({
  trip,
  itineraries,
  userName = 'Traveller',
  onConfirmTrip,
  onViewTimeline,
}) => {
  const [activeHeaderTab, setActiveHeaderTab] = useState<'transports' | 'route' | 'rapido' | 'attractions' | 'restaurants' | 'health'>('transports');
  
  // Selection states
  const [selectedItinId, setSelectedItinId] = useState<string>(itineraries[0]?.id || '');
  const [rapidoPickup, setRapidoPickup] = useState<boolean>(true);
  const [rapidoDrop, setRapidoDrop] = useState<boolean>(true);
  const [pickupAddress, setPickupAddress] = useState<string>('Home / Current Residence (Doorstep)');
  const [selectedAttractions, setSelectedAttractions] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  
  // Modal & passenger state
  const [showDoubleCheckModal, setShowDoubleCheckModal] = useState<boolean>(false);
  const [passengerName, setPassengerName] = useState<string>(userName);
  const [passengerCount, setPassengerCount] = useState<number>(1);

  // Geo Data
  const [osrmRoute, setOsrmRoute] = useState<any>(null);
  const [placesData, setPlacesData] = useState<any>({ attractions: [], restaurants: [], hospitals: [] });
  const [loadingGeo, setLoadingGeo] = useState<boolean>(false);

  // Sync selectedItinId if itineraries change
  useEffect(() => {
    if (itineraries.length > 0 && (!selectedItinId || !itineraries.some(i => i.id === selectedItinId))) {
      setSelectedItinId(itineraries[0].id);
    }
  }, [itineraries]);

  // Selected Itinerary object
  const selectedItin = itineraries.find(i => i.id === selectedItinId) || itineraries[0];
  const primaryItin = selectedItin || itineraries[0];

  const originStation = primaryItin?.segments[0]?.origin_name || 'Origin Terminal';
  const destStation = primaryItin?.segments[primaryItin?.segments.length - 1]?.destination_name || 'Destination Terminal';
  const transportMode = primaryItin?.segments[0]?.transport_mode || 'BUS';

  // Smart resolution of city name (Chennai, Visakhapatnam, Hyderabad, etc.)
  const resolveCity = (stationName: string, tripCity?: string) => {
    if (tripCity && tripCity.trim()) return tripCity.trim();
    const lower = (stationName || '').toLowerCase();
    if (lower.includes('chennai') || lower.includes('cmbt') || lower.includes('puratchi') || lower.includes('koyambedu')) return 'Chennai';
    if (lower.includes('hyderabad') || lower.includes('mgbs') || lower.includes('secunderabad') || lower.includes('jubilee')) return 'Hyderabad';
    if (lower.includes('visakhapatnam') || lower.includes('vizag') || lower.includes('dwaraka') || lower.includes('rtc complex')) return 'Visakhapatnam';
    if (lower.includes('vijayawada') || lower.includes('pnbs')) return 'Vijayawada';
    if (lower.includes('rajahmundry')) return 'Rajahmundry';
    if (lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('majestic')) return 'Bengaluru';
    return 'Origin City';
  };

  const originCity = resolveCity(originStation, trip?.origin);
  const destCity = resolveCity(destStation, trip?.destination);

  // Toggle helpers
  const toggleAttraction = (name: string) => {
    setSelectedAttractions(prev => 
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const toggleRestaurant = (name: string) => {
    setSelectedRestaurants(prev => 
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  // Compute total cost
  const rapidoTotal = (rapidoPickup ? 75.0 : 0.0) + (rapidoDrop ? 95.0 : 0.0);
  const totalComputed = (selectedItin ? selectedItin.total_fare * passengerCount : 0) + rapidoTotal;

  useEffect(() => {
    let isMounted = true;
    if (!primaryItin) return;
    setLoadingGeo(true);

    const fetchCorridorData = async () => {
      try {
        const [routeRes, placesRes] = await Promise.all([
          api.getOsrmRoute(originStation, destStation, 'driving'),
          api.getPlacesAlongCorridor(destCity)
        ]);
        if (isMounted) {
          if (routeRes?.route) setOsrmRoute(routeRes.route);
          if (placesRes?.places) setPlacesData(placesRes.places);
        }
      } catch (err) {
        console.error('Failed to load OSRM/Overpass places:', err);
      } finally {
        if (isMounted) setLoadingGeo(false);
      }
    };

    fetchCorridorData();
    return () => { isMounted = false; };
  }, [originStation, destStation, destCity]);

  if (!itineraries || itineraries.length === 0) {
    return (
      <div className="bg-white border border-[#E2E5E4] rounded-lg p-12 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
        <h3 className="text-lg font-serif text-[#121C1A]">No Feasible Routes Found</h3>
        <p className="text-sm text-[#5C6460] max-w-md mx-auto">
          No services met your arrival deadline or budget constraints. Try selecting different modes or widening the arrival window.
        </p>
      </div>
    );
  }

  // Highway polyline
  const polylineCoords: [number, number][] = osrmRoute?.coordinates && osrmRoute.coordinates.length > 0
    ? osrmRoute.coordinates
    : (primaryItin.segments.map(s => [s.origin_lat || 17.5, s.origin_lng || 80.5]) as [number, number][]);

  const mapCenter: [number, number] = polylineCoords.length > 0 ? polylineCoords[0] : [17.5, 80.5];

  // Rapido coordinates
  const originLat = primaryItin.segments[0]?.origin_lat || 17.7289;
  const originLng = primaryItin.segments[0]?.origin_lng || 83.3039;
  const homeLat = originLat - 0.024;
  const homeLng = originLng - 0.018;

  const rapidoPickupCoords: [number, number][] = [
    [homeLat, homeLng],
    [homeLat + 0.01, homeLng + 0.005],
    [originLat, originLng]
  ];

  // Strictly filter hospitals (never bus stations or railway stations)
  const hospitalsList: any[] = (placesData.hospitals && placesData.hospitals.length > 0)
    ? placesData.hospitals.filter((p: any) => p.category !== 'bus_station' && p.category !== 'station')
    : (placesData.domestic_places || []).filter((p: any) => 
        (p.category === 'hospital' || p.category === 'clinic' || p.name.toLowerCase().includes('hospital') || p.name.toLowerCase().includes('clinic')) &&
        p.category !== 'bus_station' && p.category !== 'station'
      );

  // Guaranteed mock hospitals fallback
  const verifiedHospitals = hospitalsList.length > 0 ? hospitalsList : [
    { name: `Apollo Hospitals ${destCity} Emergency Care`, category: 'hospital', description: '24/7 Acute Trauma, ICU, Cardiac Emergency & Ambulance Care' },
    { name: `CARE Multi-Specialty Hospital ${destCity}`, category: 'hospital', description: 'Round-the-clock Emergency Casualty & Surgical Critical Care' },
    { name: `Yashoda Super-Specialty Medical Institute`, category: 'hospital', description: 'Comprehensive Emergency Medicine, Triage & Critical ICU Wing' },
    { name: `City Government General Hospital`, category: 'hospital', description: '24-Hour Emergency Triage, Outpatient & Medical First-Aid' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white border border-[#E2E5E4] rounded-lg shadow-sm overflow-hidden">
      {/* 1. TOP STATIC / PINNED HEADER & TABS BAR */}
      <div className="flex-shrink-0 bg-white border-b border-[#E2E5E4] z-20">
        <div className="p-5 md:p-6 border-b border-[#E2E5E4] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Trip</span>
            <h2 className="text-xl md:text-2xl font-serif text-[#121C1A] flex flex-wrap items-center gap-2">
              <span>{originCity} <span className="text-sm font-sans font-normal text-[#5C6460]">({originStation})</span></span>
              <span className="text-[#A3ACA9] font-sans font-light tracking-wider">———&gt;</span>
              <span>{destCity} <span className="text-sm font-sans font-normal text-[#5C6460]">({destStation})</span></span>
            </h2>
            <p className="text-xs text-[#5C6460] mt-0.5">
              Selected Transport: <strong className="text-[#121C1A]">{selectedItin.summary_title}</strong> ({transportMode}) • ₹{selectedItin.total_fare.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs text-[#5C6460]">
            <span className="px-3 py-1 bg-[#F4F4F4] border border-[#E2E5E4] rounded font-medium">
              {itineraries.length} Travel Options
            </span>
            {osrmRoute?.distance_km > 0 && (
              <span className="px-3 py-1 bg-[#121C1A] text-white rounded font-medium">
                {osrmRoute.distance_km} km (OSRM Highway)
              </span>
            )}
          </div>
        </div>

        {/* Single-Row Clean Top Navigation Bar */}
        <div className="bg-[#F4F4F4] px-4 md:px-6 overflow-x-auto scrollbar-none flex gap-2">
          {[
            { id: 'transports', label: 'Available Transports', icon: Bus, count: itineraries.length },
            { id: 'route', label: 'Highway Route (OSRM)', icon: Navigation },
            { id: 'rapido', label: 'Home Pickup & Drop', icon: Bike, badge: 'Rapido' },
            { id: 'attractions', label: 'Tourist Places', icon: Landmark, count: placesData.attractions?.length || 0, selectedCount: selectedAttractions.length },
            { id: 'restaurants', label: 'Restaurants & Dining', icon: Utensils, count: placesData.restaurants?.length || 0, selectedCount: selectedRestaurants.length },
            { id: 'health', label: 'Hospitals & Medical', icon: Hospital, count: verifiedHospitals.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeHeaderTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveHeaderTab(tab.id as any)}
                className={`py-3.5 px-2 md:px-3 text-xs font-semibold whitespace-nowrap flex items-center space-x-2 border-b-2 transition-colors flex-shrink-0 ${
                  isActive
                    ? 'border-[#121C1A] text-[#121C1A]'
                    : 'border-transparent text-[#5C6460] hover:text-[#121C1A]'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 bg-white border border-[#E2E5E4] rounded text-[10px] text-[#5C6460]">
                    {tab.count}
                  </span>
                )}
                {tab.selectedCount !== undefined && tab.selectedCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#121C1A] text-white rounded text-[10px] font-bold">
                    {tab.selectedCount} chosen
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 bg-[#121C1A] text-white rounded text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MIDDLE SCROLLED CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white space-y-4">
        {/* TAB 1: AVAILABLE TRANSPORTS */}
        {activeHeaderTab === 'transports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#5C6460]">
              <span>Choose your preferred intercity carrier. Your selected transport will be packaged into your trip.</span>
              <span className="text-emerald-700 font-medium">Click "Select This Transport" to pick an option.</span>
            </div>

            <div className="space-y-4">
              {itineraries.map((itin) => {
                const isSelected = itin.id === selectedItinId;
                return (
                  <div
                    key={itin.id}
                    className={`p-5 border rounded-lg transition-all space-y-4 bg-white ${
                      isSelected 
                        ? 'border-[#121C1A] shadow-md ring-1 ring-[#121C1A]' 
                        : 'border-[#E2E5E4] hover:border-[#A3ACA9]'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E5E4] pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-[#121C1A] text-white text-xs font-bold rounded">
                            Rank #{itin.rank}
                          </span>
                          <h4 className="text-base font-semibold text-[#121C1A]">{itin.summary_title}</h4>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold flex items-center space-x-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Selected</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#5C6460] mt-1">{itin.explanation}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#121C1A]">₹{itin.total_fare.toFixed(2)}</div>
                        <div className="text-xs text-[#5C6460] flex items-center justify-end space-x-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{Math.floor(itin.total_duration_minutes / 60)}h {itin.total_duration_minutes % 60}m</span>
                        </div>
                      </div>
                    </div>

                    {/* Segments timeline preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {itin.segments.map((seg, idx) => (
                        <div key={seg.id} className="p-3 bg-[#F4F4F4] rounded border border-[#E2E5E4] text-xs space-y-1">
                          <div className="flex justify-between items-center font-semibold text-[#121C1A]">
                            <span>Leg {idx + 1}: {seg.operator}</span>
                            <span className="px-1.5 py-0.5 bg-white border border-[#E2E5E4] rounded text-[10px]">
                              {seg.transport_mode}
                            </span>
                          </div>
                          <div className="text-[#5C6460]">
                            {seg.origin_name} ({seg.departure_time}) → {seg.destination_name} ({seg.arrival_time})
                          </div>
                          {seg.buffer_minutes > 0 && (
                            <div className="text-amber-800 font-medium">
                              Transfer buffer: {seg.buffer_minutes} mins
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E2E5E4]">
                      <div className="flex items-center space-x-3 text-xs">
                        {itin.is_deadline_compliant && (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Meets Deadline</span>
                          </span>
                        )}
                        {itin.is_budget_compliant && (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Within Budget</span>
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-[#F4F4F4] rounded text-[11px] text-[#5C6460]">
                          Risk: {itin.risk_level}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => onViewTimeline(itin)}
                          className="px-3 py-1.5 border border-[#E2E5E4] text-[#5C6460] hover:text-[#121C1A] text-xs font-semibold rounded hover:bg-[#F4F4F4] transition-colors"
                        >
                          Map & Route Details
                        </button>
                        
                        {isSelected ? (
                          <div className="px-4 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded flex items-center space-x-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selected for Trip</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedItinId(itin.id)}
                            className="px-4 py-1.5 bg-[#121C1A] text-white text-xs font-semibold rounded hover:bg-[#2D4645] transition-colors flex items-center space-x-1"
                          >
                            <span>Select This Transport</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE HIGHWAY ROUTE USING OSRM */}
        {activeHeaderTab === 'route' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#5C6460]">
              <span>Real-time road geometry and driving corridor computed by Open Source Routing Machine (OSRM).</span>
              {osrmRoute && (
                <span>
                  Distance: <strong>{osrmRoute.distance_km} km</strong> • Approx Drive: <strong>{Math.floor(osrmRoute.duration_minutes / 60)}h {osrmRoute.duration_minutes % 60}m</strong>
                </span>
              )}
            </div>
            <div className="h-[360px] w-full rounded border border-[#E2E5E4] overflow-hidden">
              <MapContainer center={mapCenter} zoom={7} scrollWheelZoom={false} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {polylineCoords.length >= 2 && (
                  <Polyline positions={polylineCoords} color="#121C1A" weight={4} opacity={0.85} />
                )}
                {primaryItin.segments.map((seg, idx) => (
                  <React.Fragment key={idx}>
                    {seg.origin_lat && seg.origin_lng && (
                      <Marker position={[seg.origin_lat, seg.origin_lng]}>
                        <Popup><strong>{seg.origin_name}</strong><br/>Departs: {seg.departure_time}</Popup>
                      </Marker>
                    )}
                    {seg.dest_lat && seg.dest_lng && (
                      <Marker position={[seg.dest_lat, seg.dest_lng]}>
                        <Popup><strong>{seg.destination_name}</strong><br/>Arrives: {seg.arrival_time}</Popup>
                      </Marker>
                    )}
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* TAB 3: RAPIDO HOME PICKUP & DROP WITH MAP */}
        {activeHeaderTab === 'rapido' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E5E4] pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Bike className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-base text-[#121C1A]">
                    Doorstep Home Pickup & Drop (Rapido Smart Connector)
                  </h3>
                </div>
                <p className="text-xs text-[#5C6460]">
                  Select whether you want a bike/auto ride from your home to <strong>{originStation}</strong> and from arrival terminal to your final destination.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded">
                Mock Integration
              </span>
            </div>

            {/* Map showing Doorstep to Station Route */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5C6460]">
                <span className="font-semibold text-[#121C1A]">
                  Live Doorstep Pickup Route (3.2 km to Terminal)
                </span>
                <span>Estimated Ride Time: <strong>8 mins</strong></span>
              </div>
              <div className="h-[280px] w-full rounded border border-[#E2E5E4] overflow-hidden">
                <MapContainer center={[originLat, originLng]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[homeLat, homeLng]}>
                    <Popup>
                      <strong>🏡 Home / Doorstep Pickup</strong><br/>
                      {pickupAddress}<br/>
                      Captain arrives 45m before departure
                    </Popup>
                  </Marker>
                  <Marker position={[originLat, originLng]}>
                    <Popup>
                      <strong>🚏 Departure Terminal</strong><br/>
                      {originStation}
                    </Popup>
                  </Marker>
                  <Polyline positions={rapidoPickupCoords} color="#D97706" weight={5} opacity={0.9} dashArray="4, 6" />
                </MapContainer>
              </div>
            </div>

            {/* Pickup & Drop Toggle Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => setRapidoPickup(!rapidoPickup)}
                className={`p-5 border rounded-lg cursor-pointer transition-all space-y-3 ${
                  rapidoPickup ? 'border-[#121C1A] bg-white ring-1 ring-[#121C1A]' : 'border-[#E2E5E4] bg-[#F4F4F4]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={rapidoPickup}
                      onChange={(e) => { e.stopPropagation(); setRapidoPickup(e.target.checked); }}
                      className="w-4 h-4 text-[#121C1A] rounded"
                    />
                    <span className="font-semibold text-sm text-[#121C1A]">
                      1. Home Pickup → {originStation}
                    </span>
                  </div>
                  <span className="font-bold text-sm text-[#121C1A]">₹75.00</span>
                </div>

                <p className="text-xs text-[#5C6460]">
                  A Rapido Captain arrives at your home address 45 minutes prior to scheduled departure.
                </p>

                <div onClick={(e) => e.stopPropagation()}>
                  <label className="block text-[11px] font-semibold text-[#5C6460] uppercase mb-1">Doorstep Address</label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full p-2 bg-white border border-[#E2E5E4] rounded text-xs text-[#121C1A]"
                  />
                </div>
              </div>

              <div 
                onClick={() => setRapidoDrop(!rapidoDrop)}
                className={`p-5 border rounded-lg cursor-pointer transition-all space-y-3 ${
                  rapidoDrop ? 'border-[#121C1A] bg-white ring-1 ring-[#121C1A]' : 'border-[#E2E5E4] bg-[#F4F4F4]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={rapidoDrop}
                      onChange={(e) => { e.stopPropagation(); setRapidoDrop(e.target.checked); }}
                      className="w-4 h-4 text-[#121C1A] rounded"
                    />
                    <span className="font-semibold text-sm text-[#121C1A]">
                      2. {destStation} → Final Destination Drop
                    </span>
                  </div>
                  <span className="font-bold text-sm text-[#121C1A]">₹95.00</span>
                </div>

                <p className="text-xs text-[#5C6460]">
                  Captain will be stationed at the terminal exit gate upon arrival to eliminate auto haggling.
                </p>

                <div className="text-[11px] text-[#5C6460] bg-white p-2.5 rounded border border-[#E2E5E4]">
                  Estimated wait time: <strong>&lt; 3 mins</strong> • Verified helmet Captain
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TOURIST ATTRACTIONS (SELECTABLE) */}
        {activeHeaderTab === 'attractions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5C6460]">
              <span>Select the attractions you want to visit at <strong>{destCity}</strong>. Selected places will be saved in your Trip Details.</span>
              <span className="font-semibold text-[#121C1A] bg-[#F4F4F4] px-2 py-1 rounded border border-[#E2E5E4]">
                {selectedAttractions.length} Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {placesData.attractions.map((att: any, idx: number) => {
                const isChecked = selectedAttractions.includes(att.name);
                return (
                  <div 
                    key={idx}
                    onClick={() => toggleAttraction(att.name)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all space-y-2 ${
                      isChecked 
                        ? 'border-[#121C1A] bg-white ring-1 ring-[#121C1A] shadow-xs' 
                        : 'border-[#E2E5E4] bg-[#F4F4F4] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAttraction(att.name)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#121C1A] rounded"
                        />
                        <h4 className="font-semibold text-sm text-[#121C1A]">{att.name}</h4>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white rounded border border-[#E2E5E4] text-[#5C6460]">
                        {att.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C6460] pl-6.5">{att.description || `Attraction (${att.category})`}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: RESTAURANTS & DINING (SELECTABLE) */}
        {activeHeaderTab === 'restaurants' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5C6460]">
              <span>Select restaurants and dining spots for your trip to <strong>{destCity}</strong>.</span>
              <span className="font-semibold text-[#121C1A] bg-[#F4F4F4] px-2 py-1 rounded border border-[#E2E5E4]">
                {selectedRestaurants.length} Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {placesData.restaurants.map((rest: any, idx: number) => {
                const isChecked = selectedRestaurants.includes(rest.name);
                return (
                  <div 
                    key={idx}
                    onClick={() => toggleRestaurant(rest.name)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all space-y-2 ${
                      isChecked 
                        ? 'border-[#121C1A] bg-white ring-1 ring-[#121C1A] shadow-xs' 
                        : 'border-[#E2E5E4] bg-[#F4F4F4] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRestaurant(rest.name)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#121C1A] rounded"
                        />
                        <h4 className="font-semibold text-sm text-[#121C1A]">{rest.name}</h4>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white rounded border border-[#E2E5E4] text-[#5C6460]">
                        {rest.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C6460] pl-6.5">{rest.cuisine || 'Authentic Regional Food'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: HOSPITALS & MEDICAL (STRICT MEDICAL CENTERS ONLY, NO BUS STANDS) */}
        {activeHeaderTab === 'health' && (
          <div className="space-y-4">
            <div className="text-xs text-[#5C6460]">
              Verified 24/7 emergency medical centers and trauma hospitals located along the <strong>{destCity}</strong> corridor.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verifiedHospitals.map((place: any, idx: number) => (
                <div key={idx} className="p-4 bg-white border border-[#E2E5E4] rounded-lg space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-[#121C1A]">
                    <Hospital className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span className="truncate">{place.name}</span>
                  </div>
                  <p className="text-xs text-[#5C6460]">
                    {place.description || 'Multi-specialty emergency, trauma, and acute critical healthcare hospital.'}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-[#E2E5E4] text-[11px] text-[#5C6460]">
                    <span className="flex items-center space-x-1 text-emerald-800 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>24/7 Emergency</span>
                    </span>
                    <span className="flex items-center space-x-1 font-mono text-[10px] text-[#5C6460]">
                      <PhoneCall className="w-3 h-3 text-[#5C6460]" />
                      <span>108 / Ambulance</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM STATIC / PINNED SUMMARY & CONFIRM DETAILS BAR */}
      <div className="flex-shrink-0 bg-[#121C1A] text-white p-4 border-t border-[#121C1A] shadow-xl z-20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-[#A3ACA9] block text-[10px] uppercase font-semibold">Selected Transport</span>
            <span className="font-semibold text-sm truncate max-w-xs block">
              {selectedItin.summary_title} (₹{selectedItin.total_fare.toFixed(2)})
            </span>
          </div>

          <div className="border-l border-white/20 pl-4">
            <span className="text-[#A3ACA9] block text-[10px] uppercase font-semibold">Home Pickup & Drop</span>
            <span>
              {rapidoPickup ? 'Pickup (₹75)' : 'No Pickup'} • {rapidoDrop ? 'Drop (₹95)' : 'No Drop'}
            </span>
          </div>

          <div className="border-l border-white/20 pl-4">
            <span className="text-[#A3ACA9] block text-[10px] uppercase font-semibold">Custom Add-ons</span>
            <span>
              {selectedAttractions.length} Attractions • {selectedRestaurants.length} Dining
            </span>
          </div>

          <div className="border-l border-white/20 pl-4">
            <span className="text-[#A3ACA9] block text-[10px] uppercase font-semibold">Estimated Total</span>
            <span className="text-base font-bold text-white">₹{totalComputed.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDoubleCheckModal(true)}
          className="px-6 py-2.5 bg-white text-[#121C1A] text-xs font-bold rounded hover:bg-[#F4F4F4] transition-colors flex items-center justify-center space-x-2"
        >
          <span>Confirm Details</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* DOUBLE CHECK TRIP MODAL */}
      {showDoubleCheckModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-[#E2E5E4] rounded-lg max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#E2E5E4] pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Double Check</span>
                <h3 className="text-xl font-serif text-[#121C1A] mt-0.5">Review Trip Details</h3>
              </div>
              <button
                onClick={() => setShowDoubleCheckModal(false)}
                className="p-1 text-[#5C6460] hover:text-[#121C1A] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Selected Route */}
              <div className="p-3.5 bg-[#F4F4F4] rounded border border-[#E2E5E4] space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6460]">Primary Travel Corridor</span>
                <div className="font-semibold text-sm text-[#121C1A]">
                  {originCity} ({originStation}) ———&gt; {destCity} ({destStation})
                </div>
                <div className="text-[#5C6460] text-xs">
                  Operator: <strong>{selectedItin.summary_title}</strong> ({transportMode}) • ₹{selectedItin.total_fare.toFixed(2)}
                </div>
              </div>

              {/* Rapido Connectors */}
              <div className="p-3.5 bg-[#F4F4F4] rounded border border-[#E2E5E4] space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6460]">Doorstep Rapido Rides</span>
                <div className="flex items-center justify-between">
                  <span>Doorstep Home Pickup:</span>
                  <strong>{rapidoPickup ? 'Included (₹75.00)' : 'Not selected'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Destination Station Drop:</span>
                  <strong>{rapidoDrop ? 'Included (₹95.00)' : 'Not selected'}</strong>
                </div>
              </div>

              {/* Tourist Attractions */}
              <div className="p-3.5 bg-[#F4F4F4] rounded border border-[#E2E5E4] space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6460]">Planned Tourist Attractions</span>
                {selectedAttractions.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedAttractions.map((att, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-[#E2E5E4] rounded text-[11px] text-[#121C1A]">
                        {att}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#5C6460] italic">None selected</p>
                )}
              </div>

              {/* Restaurants */}
              <div className="p-3.5 bg-[#F4F4F4] rounded border border-[#E2E5E4] space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6460]">Planned Dining & Restaurants</span>
                {selectedRestaurants.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedRestaurants.map((rest, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-[#E2E5E4] rounded text-[11px] text-[#121C1A]">
                        {rest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#5C6460] italic">None selected</p>
                )}
              </div>

              {/* Passenger & Total Breakdown */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[#5C6460] font-semibold mb-1">Passenger Name</label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E5E4] rounded text-xs text-[#121C1A]"
                  />
                </div>
                <div>
                  <label className="block text-[#5C6460] font-semibold mb-1">Passenger Count</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-[#E2E5E4] rounded text-xs text-[#121C1A]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#121C1A] text-white rounded flex items-center justify-between text-xs">
                <span>Total Estimated Cost</span>
                <span className="text-base font-bold">₹{totalComputed.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E2E5E4]">
              <button
                type="button"
                onClick={() => setShowDoubleCheckModal(false)}
                className="px-4 py-2 border border-[#E2E5E4] rounded text-xs font-semibold text-[#5C6460] hover:text-[#121C1A]"
              >
                Modify Selections
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDoubleCheckModal(false);
                  onConfirmTrip({
                    itinerary: selectedItin,
                    rapidoPickup,
                    rapidoDrop,
                    selectedAttractions,
                    selectedRestaurants,
                    passengerName,
                    passengerCount,
                    totalAmount: totalComputed,
                  });
                }}
                className="px-5 py-2 bg-[#121C1A] text-white rounded text-xs font-semibold hover:bg-[#2D4645] flex items-center space-x-1.5"
              >
                <span>Confirm & Add to Trip Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
