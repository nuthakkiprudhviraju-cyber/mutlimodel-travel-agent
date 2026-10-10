import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Itinerary } from '../../types';
import { api } from '../../services/api';
import { 
  Clock, 
  MapPin, 
  ArrowLeft, 
  Utensils, 
  Landmark, 
  Bus, 
  Compass, 
  Navigation, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import L from 'leaflet';

// Leaflet standard marker icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  itinerary: Itinerary;
  onBack: () => void;
  onRequestBooking: (itinerary: Itinerary) => void;
}

export const RouteMapModal: React.FC<MapProps> = ({ itinerary, onBack, onRequestBooking }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'attractions' | 'restaurants' | 'domestic'>('timeline');
  const [osrmRoute, setOsrmRoute] = useState<any>(null);
  const [placesData, setPlacesData] = useState<any>({ attractions: [], restaurants: [], domestic_places: [] });
  const [loadingGeo, setLoadingGeo] = useState<boolean>(true);

  // Extract origin and destination
  const firstSeg = itinerary.segments[0];
  const lastSeg = itinerary.segments[itinerary.segments.length - 1];
  const originName = firstSeg?.origin_name || 'Visakhapatnam';
  const destName = lastSeg?.destination_name || 'Hyderabad';

  useEffect(() => {
    let isMounted = true;
    setLoadingGeo(true);

    const fetchGeoData = async () => {
      try {
        // 1. Fetch live OSRM highway coordinates and travel time
        const routeRes = await api.getOsrmRoute(originName, destName, 'driving');
        if (isMounted && routeRes?.route) {
          setOsrmRoute(routeRes.route);
        }

        // 2. Fetch destination attractions, regional restaurants, and domestic places via Overpass
        const placesRes = await api.getPlacesAlongCorridor(destName);
        if (isMounted && placesRes?.places) {
          setPlacesData(placesRes.places);
        }
      } catch (e) {
        console.error('Geo & Overpass load error:', e);
      } finally {
        if (isMounted) setLoadingGeo(false);
      }
    };

    fetchGeoData();
    return () => { isMounted = false; };
  }, [originName, destName]);

  // Coordinates for the polyline
  const fallbackPositions: [number, number][] = itinerary.segments.map((seg) => [
    seg.origin_lat || 17.7289,
    seg.origin_lng || 83.3039,
  ]);
  if (lastSeg?.dest_lat && lastSeg?.dest_lng) {
    fallbackPositions.push([lastSeg.dest_lat, lastSeg.dest_lng]);
  }

  const polylineCoords: [number, number][] = osrmRoute?.coordinates && osrmRoute.coordinates.length > 0
    ? osrmRoute.coordinates
    : fallbackPositions;

  const center: [number, number] = polylineCoords.length > 0 ? polylineCoords[0] : [17.5, 80.5];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-[#121C1A] hover:text-[#2D4645]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Itineraries</span>
        </button>

        <button
          onClick={() => onRequestBooking(itinerary)}
          className="px-4 py-2 bg-[#121C1A] text-white text-xs font-semibold rounded hover:bg-[#2D4645] transition-colors"
        >
          Request Booking for This Route
        </button>
      </div>

      <div className="bg-white border border-[#E2E5E4] rounded-lg p-6 shadow-sm space-y-6">
        {/* Header & OSRM Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E5E4] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C6460]">
                Live Multimodal Corridor Inspection
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-[#F4F4F4] text-[#2D4645] rounded font-medium border border-[#E2E5E4]">
                OSRM Routing + Overpass OpenStreetMap
              </span>
            </div>
            <h3 className="text-2xl font-serif text-[#121C1A] mt-1">{itinerary.summary_title}</h3>
            <p className="text-xs text-[#5C6460] mt-1">{itinerary.explanation}</p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-[#121C1A]">₹{itinerary.total_fare.toFixed(2)}</div>
            <div className="text-xs text-[#5C6460] flex items-center justify-end space-x-2 mt-0.5">
              <span>{Math.floor(itinerary.total_duration_minutes / 60)}h {itinerary.total_duration_minutes % 60}m total</span>
              {osrmRoute?.distance_km > 0 && (
                <span className="font-semibold text-[#121C1A]">({osrmRoute.distance_km} km highway)</span>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Leaflet Map */}
        <div className="h-[380px] w-full rounded-lg overflow-hidden border border-[#E2E5E4] relative">
          <MapContainer center={center} zoom={7} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Stops Markers */}
            {itinerary.segments.map((seg, idx) => (
              <React.Fragment key={seg.id || idx}>
                {seg.origin_lat && seg.origin_lng && (
                  <Marker position={[seg.origin_lat, seg.origin_lng]}>
                    <Popup>
                      <strong>{seg.origin_name}</strong><br />
                      Departure: {seg.departure_time} ({seg.operator})
                    </Popup>
                  </Marker>
                )}
                {seg.dest_lat && seg.dest_lng && (
                  <Marker position={[seg.dest_lat, seg.dest_lng]}>
                    <Popup>
                      <strong>{seg.destination_name}</strong><br />
                      Arrival: {seg.arrival_time}
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            ))}

            {/* Tourist Attractions Markers */}
            {placesData.attractions.map((att: any, idx: number) => (
              att.lat && att.lon && (
                <Marker key={`att-${idx}`} position={[att.lat, att.lon]}>
                  <Popup>
                    <strong>🏛️ {att.name}</strong><br />
                    {att.description || 'Attraction / Heritage Spot'}
                  </Popup>
                </Marker>
              )
            ))}

            {/* Live OSRM Route Polyline */}
            {polylineCoords.length >= 2 && (
              <Polyline positions={polylineCoords} color="#121C1A" weight={4} opacity={0.85} />
            )}
          </MapContainer>
        </div>

        {/* Tab Selection for Timeline vs Places */}
        <div className="border-b border-[#E2E5E4] flex space-x-6">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'timeline' ? 'border-[#121C1A] text-[#121C1A]' : 'border-transparent text-[#5C6460] hover:text-[#121C1A]'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>Corridor Timeline ({itinerary.segments.length} Legs)</span>
          </button>

          <button
            onClick={() => setActiveTab('attractions')}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'attractions' ? 'border-[#121C1A] text-[#121C1A]' : 'border-transparent text-[#5C6460] hover:text-[#121C1A]'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Tourist Attractions ({placesData.attractions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'restaurants' ? 'border-[#121C1A] text-[#121C1A]' : 'border-transparent text-[#5C6460] hover:text-[#121C1A]'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Nearby Restaurants & Cafes ({placesData.restaurants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('domestic')}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'domestic' ? 'border-[#121C1A] text-[#121C1A]' : 'border-transparent text-[#5C6460] hover:text-[#121C1A]'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Domestic Transit & Hospitals ({placesData.domestic_places.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {itinerary.segments.map((seg, idx) => (
              <div key={seg.id} className="p-4 bg-[#F4F4F4] rounded border border-[#E2E5E4] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-[#121C1A] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <strong className="text-sm text-[#121C1A]">{seg.operator} ({seg.transport_mode})</strong>
                  </div>
                  <div className="text-xs text-[#5C6460]">
                    From: <span className="font-medium text-[#121C1A]">{seg.origin_name}</span> at {seg.departure_time}
                  </div>
                  <div className="text-xs text-[#5C6460]">
                    To: <span className="font-medium text-[#121C1A]">{seg.destination_name}</span> at {seg.arrival_time}
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="font-semibold text-[#121C1A]">Fare: ₹{seg.fare.toFixed(2)}</div>
                  <div className="text-[#5C6460]">Duration: {seg.duration_minutes} mins</div>
                  {seg.buffer_minutes > 0 && (
                    <div className="text-amber-800 font-medium mt-1">
                      Connection Layover Buffer: {seg.buffer_minutes} mins
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'attractions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {placesData.attractions.length === 0 && (
              <div className="col-span-3 text-xs text-[#5C6460] p-4 text-center">Loading attractions...</div>
            )}
            {placesData.attractions.map((att: any, idx: number) => (
              <div key={idx} className="p-4 bg-[#F4F4F4] border border-[#E2E5E4] rounded space-y-1">
                <div className="flex items-center space-x-2 text-sm font-semibold text-[#121C1A]">
                  <Landmark className="w-4 h-4 text-[#2D4645]" />
                  <span>{att.name}</span>
                </div>
                <div className="text-xs text-[#5C6460]">{att.description || `Category: ${att.category}`}</div>
                {att.lat && att.lon && (
                  <div className="text-[10px] text-[#A3ACA9] font-mono">
                    GPS: {att.lat.toFixed(4)}, {att.lon.toFixed(4)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {placesData.restaurants.length === 0 && (
              <div className="col-span-3 text-xs text-[#5C6460] p-4 text-center">Loading restaurants...</div>
            )}
            {placesData.restaurants.map((rest: any, idx: number) => (
              <div key={idx} className="p-4 bg-[#F4F4F4] border border-[#E2E5E4] rounded space-y-1">
                <div className="flex items-center space-x-2 text-sm font-semibold text-[#121C1A]">
                  <Utensils className="w-4 h-4 text-[#2D4645]" />
                  <span>{rest.name}</span>
                </div>
                <div className="text-xs text-[#5C6460]">{rest.cuisine || rest.category}</div>
                {rest.lat && rest.lon && (
                  <div className="text-[10px] text-[#A3ACA9] font-mono">
                    GPS: {rest.lat.toFixed(4)}, {rest.lon.toFixed(4)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'domestic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {placesData.domestic_places.length === 0 && (
              <div className="col-span-3 text-xs text-[#5C6460] p-4 text-center">Loading domestic amenities...</div>
            )}
            {placesData.domestic_places.map((place: any, idx: number) => (
              <div key={idx} className="p-4 bg-[#F4F4F4] border border-[#E2E5E4] rounded space-y-1">
                <div className="flex items-center space-x-2 text-sm font-semibold text-[#121C1A]">
                  <Bus className="w-4 h-4 text-[#2D4645]" />
                  <span>{place.name}</span>
                </div>
                <div className="text-xs text-[#5C6460]">Amenity: {place.category}</div>
                {place.lat && place.lon && (
                  <div className="text-[10px] text-[#A3ACA9] font-mono">
                    GPS: {place.lat.toFixed(4)}, {place.lon.toFixed(4)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
