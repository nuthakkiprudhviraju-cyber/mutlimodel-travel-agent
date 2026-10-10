import React, { useState } from 'react';
import { Booking, Itinerary, Trip } from '../../types';
import { api } from '../../services/api';
import { 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Clock, 
  Bike, 
  Landmark, 
  Utensils, 
  Bus, 
  AlertCircle, 
  CreditCard,
  Compass,
  X,
  Lock,
  AlertTriangle
} from 'lucide-react';

interface TripDetailsProps {
  bookings: Booking[];
  trips?: Trip[];
  itineraries?: Itinerary[];
  onRefresh: () => void;
  onNavigatePlanner: () => void;
}

export const TripDetailsView: React.FC<TripDetailsProps> = ({
  bookings,
  trips = [],
  itineraries = [],
  onRefresh,
  onNavigatePlanner,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Booking confirmation modal state (warns user that once booked, cannot edit)
  const [bookingToConfirm, setBookingToConfirm] = useState<Booking | null>(null);

  // Full Edit Modal State
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editPassengerName, setEditPassengerName] = useState('');
  const [editPassengerCount, setEditPassengerCount] = useState(1);
  const [editItinId, setEditItinId] = useState('');
  const [editRapidoPickup, setEditRapidoPickup] = useState(false);
  const [editRapidoDrop, setEditRapidoDrop] = useState(false);
  const [editSelectedPlaces, setEditSelectedPlaces] = useState<string[]>([]);
  const [editSelectedRestaurants, setEditSelectedRestaurants] = useState<string[]>([]);

  // Helper to resolve itinerary for a booking
  const getBookingItinerary = (booking: Booking): Itinerary | undefined => {
    if (booking.itinerary) return booking.itinerary;
    return itineraries.find((it) => it.id === booking.itinerary_id);
  };

  // Helper to resolve city
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

  // Action: Confirm & Book (Once booked, cannot edit)
  const handleProceedBookTrip = async () => {
    if (!bookingToConfirm) return;
    setLoadingId(bookingToConfirm.id);
    setError(null);
    try {
      const res = await api.approveBooking(bookingToConfirm.id, 'APPROVE');
      setSuccessMessage(`Trip booked and locked! Confirmation Ref: ${res.confirmation_reference || 'ROAM-SIM-CONFIRMED'}`);
      setBookingToConfirm(null);
      setTimeout(() => setSuccessMessage(null), 5000);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Booking failed');
    } finally {
      setLoadingId(null);
    }
  };

  // Action: Delete Trip
  const handleDeleteTrip = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return;
    }
    setLoadingId(bookingId);
    setError(null);
    try {
      await api.deleteBooking(bookingId);
      setSuccessMessage('Trip deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete trip');
    } finally {
      setLoadingId(null);
    }
  };

  // Action: Open Comprehensive Edit Modal (only for unconfirmed trips)
  const handleOpenEdit = (booking: Booking) => {
    if (booking.status === 'CONFIRMED_SIMULATED') {
      alert("This trip is already confirmed and locked. It cannot be edited.");
      return;
    }
    setEditingBooking(booking);
    setEditPassengerName(booking.passenger_name);
    setEditPassengerCount(booking.passenger_count || 1);
    setEditItinId(booking.itinerary_id);
    setEditRapidoPickup(booking.rapido_pickup_requested || false);
    setEditRapidoDrop(booking.rapido_drop_requested || false);
    setEditSelectedPlaces(booking.selected_places || []);
    setEditSelectedRestaurants(booking.selected_restaurants || []);
  };

  // Action: Save Edited Details
  const handleSaveEdit = async () => {
    if (!editingBooking) return;
    setLoadingId(editingBooking.id);
    setError(null);
    try {
      await api.updateBooking(editingBooking.id, {
        itinerary_id: editItinId,
        passenger_name: editPassengerName,
        passenger_count: editPassengerCount,
        rapido_pickup_requested: editRapidoPickup,
        rapido_drop_requested: editRapidoDrop,
      });
      setEditingBooking(null);
      setSuccessMessage('Trip details updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update trip details');
    } finally {
      setLoadingId(null);
    }
  };

  // Sample tourist options for edit modal
  const commonAttractions = [
    'Charminar & Laad Bazaar',
    'Golconda Fort Complex',
    'Hussain Sagar & Buddha Promenade',
    'Salar Jung Museum',
    'Ramoji Film City Studio',
    'Marina Beach & Lighthouse',
    'Kapaleeshwarar Mylapore Temple',
    'RK Beach & Submarine Museum',
    'Kailasagiri Hilltop Park'
  ];

  const commonRestaurants = [
    'Paradise Biryani Secunderabad',
    'Bawarchi RTC X Roads',
    'Chutneys Nagarjuna Circle',
    'Nimrah Cafe & Bakery',
    'Murugan Idli Shop',
    'Saravana Bhavan',
    'Daspalla Executive Court',
    'Sea Inn Coastal Seafood'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Stage 03 • Managed Journeys</span>
          <h2 className="text-2xl font-serif text-[#121C1A] mt-1">Trip Details & Bookings</h2>
          <p className="text-xs text-[#5C6460] mt-0.5">
            Review customized itineraries, complete bookings, edit unconfirmed travel preferences, or remove trips.
          </p>
        </div>
        <button
          onClick={onNavigatePlanner}
          className="px-4 py-2 bg-[#121C1A] text-white text-xs font-semibold rounded hover:bg-[#2D4645] transition-colors flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Compass className="w-4 h-4" />
          <span>Plan Another Trip</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-medium text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-xs font-medium text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Trip List */}
      {bookings.length === 0 ? (
        <div className="bg-white border border-[#E2E5E4] rounded-lg p-12 text-center space-y-4">
          <Compass className="w-10 h-10 text-[#A3ACA9] mx-auto" />
          <h3 className="text-lg font-serif text-[#121C1A]">No Trips Saved Yet</h3>
          <p className="text-xs text-[#5C6460] max-w-md mx-auto">
            You haven't confirmed any trip details yet. Go to the AI Trip Planner, customize your transport, Rapido connectors, tourist attractions, and restaurants, then click "Confirm Details" to save your trip here.
          </p>
          <button
            onClick={onNavigatePlanner}
            className="px-5 py-2 bg-[#121C1A] text-white text-xs font-semibold rounded hover:bg-[#2D4645] transition-colors"
          >
            Start Planning a Trip
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const itin = getBookingItinerary(booking);
            const parentTrip = trips.find(t => t.id === itin?.trip_id);
            const firstSeg = itin?.segments[0];
            const lastSeg = itin?.segments[itin?.segments.length - 1];

            const originStation = firstSeg?.origin_name || 'Origin Station';
            const destStation = lastSeg?.destination_name || 'Destination Station';
            const originCity = resolveCity(originStation, parentTrip?.origin);
            const destCity = resolveCity(destStation, parentTrip?.destination);
            const operator = firstSeg?.operator || itin?.summary_title || 'Intercity Carrier';
            const mode = firstSeg?.transport_mode || 'BUS';

            const isConfirmed = booking.status === 'CONFIRMED_SIMULATED';

            return (
              <div
                key={booking.id}
                className="bg-white border border-[#E2E5E4] rounded-lg p-6 shadow-sm hover:border-[#121C1A] transition-all space-y-5"
              >
                {/* Trip Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E2E5E4] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6460]">Trip Route</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                          isConfirmed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isConfirmed ? 'Confirmed & Booked (Locked)' : 'Saved • Ready to Book'}
                      </span>
                      {booking.confirmation_reference && (
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {booking.confirmation_reference}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-serif text-[#121C1A] flex flex-wrap items-center gap-2">
                      <span>{originCity} <span className="text-xs font-sans text-[#5C6460]">({originStation})</span></span>
                      <span className="text-[#A3ACA9] font-sans font-light tracking-wider">———&gt;</span>
                      <span>{destCity} <span className="text-xs font-sans text-[#5C6460]">({destStation})</span></span>
                    </h3>
                  </div>

                  <div className="text-left md:text-right">
                    <div className="text-2xl font-bold text-[#121C1A]">₹{booking.total_amount.toFixed(2)}</div>
                    <div className="text-[11px] text-[#5C6460] flex items-center md:justify-end space-x-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{booking.passenger_count || 1} Passenger • {new Date(booking.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Customized Items Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Transport Leg */}
                  <div className="p-3 bg-[#F4F4F4] rounded border border-[#E2E5E4] space-y-1.5">
                    <div className="flex items-center justify-between text-[#5C6460] font-semibold text-[11px]">
                      <span className="flex items-center space-x-1">
                        <Bus className="w-3.5 h-3.5" />
                        <span>Selected Transport</span>
                      </span>
                      <span className="px-1.5 py-0.2 bg-white rounded border border-[#E2E5E4] uppercase font-bold text-[9px] text-[#121C1A]">
                        {mode}
                      </span>
                    </div>
                    <div className="font-semibold text-[#121C1A] text-xs">{operator}</div>
                    {firstSeg && (
                      <div className="text-[#5C6460] text-[11px]">
                        Departure: {firstSeg.departure_time} • Arrival: {lastSeg?.arrival_time || 'Next Day'}
                      </div>
                    )}
                  </div>

                  {/* Rapido Home Pickup & Drop */}
                  <div className="p-3 bg-[#F4F4F4] rounded border border-[#E2E5E4] space-y-1.5">
                    <div className="flex items-center justify-between text-[#5C6460] font-semibold text-[11px]">
                      <span className="flex items-center space-x-1">
                        <Bike className="w-3.5 h-3.5" />
                        <span>Home Pickup & Drop</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-700">Rapido</span>
                    </div>
                    <div className="text-[#121C1A] space-y-0.5">
                      <div>Pickup: <strong className="text-[#121C1A]">{booking.rapido_pickup_requested ? 'Included (+₹75)' : 'Not selected'}</strong></div>
                      <div>Drop: <strong className="text-[#121C1A]">{booking.rapido_drop_requested ? 'Included (+₹95)' : 'Not selected'}</strong></div>
                    </div>
                  </div>

                  {/* Passenger Information */}
                  <div className="p-3 bg-[#F4F4F4] rounded border border-[#E2E5E4] space-y-1.5">
                    <div className="text-[#5C6460] font-semibold text-[11px]">Passenger & Booking Info</div>
                    <div className="font-semibold text-[#121C1A] text-xs">{booking.passenger_name}</div>
                    <div className="text-[#5C6460] text-[11px]">
                      Passenger Count: {booking.passenger_count || 1} • Status: {booking.status}
                    </div>
                  </div>
                </div>

                {/* Additional Selected Places (Tourists & Restaurants) */}
                {((booking.selected_places && booking.selected_places.length > 0) || 
                  (booking.selected_restaurants && booking.selected_restaurants.length > 0)) && (
                  <div className="p-3 bg-white border border-[#E2E5E4] rounded space-y-2 text-xs">
                    {booking.selected_places && booking.selected_places.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-semibold text-[#5C6460] flex items-center space-x-1 mr-1 text-[11px]">
                          <Landmark className="w-3 h-3 text-[#121C1A]" />
                          <span>Planned Attractions:</span>
                        </span>
                        {booking.selected_places.map((place, pidx) => (
                          <span key={pidx} className="px-2 py-0.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-[11px] text-[#121C1A]">
                            {place}
                          </span>
                        ))}
                      </div>
                    )}

                    {booking.selected_restaurants && booking.selected_restaurants.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-semibold text-[#5C6460] flex items-center space-x-1 mr-1 text-[11px]">
                          <Utensils className="w-3 h-3 text-[#121C1A]" />
                          <span>Planned Dining:</span>
                        </span>
                        {booking.selected_restaurants.map((rest, ridx) => (
                          <span key={ridx} className="px-2 py-0.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-[11px] text-[#121C1A]">
                            {rest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions: Book / Edit / Delete */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E5E4]">
                  <div className="text-xs text-[#5C6460]">
                    Booking ID: <span className="font-mono">{booking.id.slice(0, 12)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Delete Button */}
                    <button
                      type="button"
                      disabled={loadingId === booking.id}
                      onClick={() => handleDeleteTrip(booking.id)}
                      className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded transition-colors flex items-center space-x-1 disabled:opacity-50"
                      title="Delete Trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>

                    {/* Edit Details Button: ENABLED ONLY IF NOT CONFIRMED */}
                    {!isConfirmed ? (
                      <button
                        type="button"
                        disabled={loadingId === booking.id}
                        onClick={() => handleOpenEdit(booking)}
                        className="px-3 py-1.5 border border-[#121C1A] text-[#121C1A] hover:bg-[#F4F4F4] text-xs font-semibold rounded transition-colors flex items-center space-x-1 disabled:opacity-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>
                    ) : (
                      <div 
                        className="px-3 py-1.5 border border-[#E2E5E4] text-[#A3ACA9] bg-[#F4F4F4] text-xs font-semibold rounded flex items-center space-x-1 cursor-not-allowed"
                        title="Once booked, details cannot be edited later."
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked (Booked)</span>
                      </div>
                    )}

                    {/* Book Button: triggers confirmation prompt warning */}
                    {!isConfirmed ? (
                      <button
                        type="button"
                        disabled={loadingId === booking.id}
                        onClick={() => setBookingToConfirm(booking)}
                        className="px-4 py-1.5 bg-[#121C1A] text-white hover:bg-[#2D4645] text-xs font-semibold rounded transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Book Trip (Simulated)</span>
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Booked & Ready</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOOKING CONFIRMATION MODAL WITH WARNING (ONCE BOOKED, CANNOT EDIT LATER) */}
      {bookingToConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#E2E5E4] rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-700">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-serif text-[#121C1A]">Confirm & Book Trip</h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
              <strong>⚠️ Important Notice:</strong>
              <p>Once this trip is booked and confirmed, it is locked. You <strong>cannot edit</strong> passenger details, transport options, or add-ons later.</p>
            </div>

            <div className="p-3 bg-[#F4F4F4] rounded border border-[#E2E5E4] text-xs space-y-1.5">
              <div className="font-semibold text-[#121C1A]">
                Passenger: {bookingToConfirm.passenger_name} ({bookingToConfirm.passenger_count || 1} passenger)
              </div>
              <div className="text-[#5C6460]">
                Rapido Pickup: {bookingToConfirm.rapido_pickup_requested ? 'Yes (+₹75)' : 'No'} • Drop: {bookingToConfirm.rapido_drop_requested ? 'Yes (+₹95)' : 'No'}
              </div>
              <div className="font-bold text-sm text-[#121C1A] pt-1 border-t border-[#E2E5E4]">
                Total To Pay: ₹{bookingToConfirm.total_amount.toFixed(2)}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBookingToConfirm(null)}
                className="px-4 py-2 border border-[#E2E5E4] rounded text-xs font-semibold text-[#5C6460] hover:text-[#121C1A]"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={loadingId === bookingToConfirm.id}
                onClick={handleProceedBookTrip}
                className="px-5 py-2 bg-[#121C1A] text-white rounded text-xs font-semibold hover:bg-[#2D4645] flex items-center space-x-1.5"
              >
                <span>Yes, Confirm & Book Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE EDIT MODAL (ALLOWS SELECTING ALL THINGS WHEN UNCONFIRMED) */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-[#E2E5E4] rounded-lg max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#E2E5E4] pb-3">
              <div>
                <h3 className="text-lg font-serif text-[#121C1A]">Edit All Trip Details</h3>
                <p className="text-xs text-[#5C6460]">Customize your carrier, passenger info, Rapido rides, and tourist spots.</p>
              </div>
              <button
                onClick={() => setEditingBooking(null)}
                className="p-1 text-[#5C6460] hover:text-[#121C1A] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Passenger Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5C6460] font-semibold mb-1">Passenger Full Name</label>
                  <input
                    type="text"
                    value={editPassengerName}
                    onChange={(e) => setEditPassengerName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E5E4] rounded text-xs text-[#121C1A] focus:outline-none focus:border-[#121C1A]"
                  />
                </div>

                <div>
                  <label className="block text-[#5C6460] font-semibold mb-1">Passenger Count</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editPassengerCount}
                    onChange={(e) => setEditPassengerCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-[#E2E5E4] rounded text-xs text-[#121C1A] focus:outline-none focus:border-[#121C1A]"
                  />
                </div>
              </div>

              {/* 2. Choose Transport Carrier */}
              {itineraries.length > 0 && (
                <div>
                  <label className="block text-[#5C6460] font-semibold mb-1.5">Change Selected Transport</label>
                  <div className="space-y-2 max-h-36 overflow-y-auto border border-[#E2E5E4] rounded p-2">
                    {itineraries.map((it) => (
                      <label 
                        key={it.id} 
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          editItinId === it.id ? 'bg-[#121C1A] text-white' : 'hover:bg-[#F4F4F4] text-[#121C1A]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="edit-itin"
                            checked={editItinId === it.id}
                            onChange={() => setEditItinId(it.id)}
                            className="text-[#121C1A]"
                          />
                          <span className="font-medium text-xs truncate max-w-xs">{it.summary_title}</span>
                        </div>
                        <span className="font-bold text-xs">₹{it.total_fare.toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Rapido Home Connections */}
              <div className="p-3 bg-[#F4F4F4] rounded border border-[#E2E5E4] space-y-2">
                <span className="font-semibold text-[#121C1A] block">Rapido Home Connections</span>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRapidoPickup}
                    onChange={(e) => setEditRapidoPickup(e.target.checked)}
                    className="rounded text-[#121C1A] focus:ring-[#121C1A]"
                  />
                  <span>Doorstep to Station Pickup (+₹75.00)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRapidoDrop}
                    onChange={(e) => setEditRapidoDrop(e.target.checked)}
                    className="rounded text-[#121C1A] focus:ring-[#121C1A]"
                  />
                  <span>Arrival Station to Final Destination Drop (+₹95.00)</span>
                </label>
              </div>

              {/* 4. Select / Deselect Tourist Attractions */}
              <div>
                <label className="block text-[#5C6460] font-semibold mb-1.5">Planned Tourist Spots</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border border-[#E2E5E4] rounded p-2">
                  {commonAttractions.map((att, i) => {
                    const isSelected = editSelectedPlaces.includes(att);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setEditSelectedPlaces(prev => 
                            prev.includes(att) ? prev.filter(p => p !== att) : [...prev, att]
                          );
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? 'bg-[#121C1A] text-white border-[#121C1A]'
                            : 'bg-white text-[#5C6460] border-[#E2E5E4] hover:border-[#121C1A]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{att}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Select / Deselect Restaurants */}
              <div>
                <label className="block text-[#5C6460] font-semibold mb-1.5">Planned Dining Spots</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border border-[#E2E5E4] rounded p-2">
                  {commonRestaurants.map((rest, i) => {
                    const isSelected = editSelectedRestaurants.includes(rest);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setEditSelectedRestaurants(prev => 
                            prev.includes(rest) ? prev.filter(r => r !== rest) : [...prev, rest]
                          );
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? 'bg-[#121C1A] text-white border-[#121C1A]'
                            : 'bg-white text-[#5C6460] border-[#E2E5E4] hover:border-[#121C1A]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{rest}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E2E5E4]">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="px-4 py-2 border border-[#E2E5E4] rounded text-xs font-semibold text-[#5C6460] hover:text-[#121C1A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-[#121C1A] text-white rounded text-xs font-semibold hover:bg-[#2D4645]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
