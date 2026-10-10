import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Trip, Itinerary, Booking, Notification } from './types';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { TripPlanner } from './components/trip-planner/TripPlanner';
import { ItineraryResults, TripConfirmationData } from './components/itineraries/ItineraryResults';
import { DisruptionSimulator } from './components/disruptions/DisruptionSimulator';
import { TripDetailsView } from './components/trips/TripDetailsView';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { RouteMapModal } from './components/map/RouteMapModal';
import { ProfileView } from './components/profile/ProfileView';
import { 
  Compass, 
  Bell, 
  LogOut, 
  Layers, 
  AlertTriangle, 
  RotateCcw,
  Menu,
  ChevronLeft,
  User as UserIcon,
  ChevronDown,
  MapPin
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'planner' | 'results' | 'disruptions' | 'trips' | 'notifications' | 'profile' | 'demo'>('planner');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);

  // Application Data States
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedItineraryForMap, setSelectedItineraryForMap] = useState<Itinerary | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load user data upon authentication
  const reloadData = async () => {
    if (!user) return;
    try {
      const [tripsData, bookingsData, notifData] = await Promise.all([
        api.getTrips(),
        api.getBookings(),
        api.getNotifications()
      ]);
      setTrips(tripsData);
      setBookings(bookingsData);
      setNotifications(notifData);

      if (tripsData.length > 0 && !currentTripId) {
        setCurrentTripId(tripsData[0].id);
        const itinData = await api.getTripItineraries(tripsData[0].id);
        setItineraries(itinData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    reloadData();
  }, [user]);

  const handleTripCreated = async (tripId: string) => {
    setCurrentTripId(tripId);
    const itinData = await api.getTripItineraries(tripId);
    setItineraries(itinData);
    setActiveTab('results');
    reloadData();
  };

  const handleConfirmTrip = async (data: TripConfirmationData) => {
    try {
      await api.createBooking({
        itinerary_id: data.itinerary.id,
        passenger_name: data.passengerName || user?.full_name || 'Traveller',
        passenger_count: data.passengerCount || 1,
        idempotency_key: `trip-${data.itinerary.id}-${Date.now()}`,
        rapido_pickup_requested: data.rapidoPickup,
        rapido_pickup_fare: data.rapidoPickup ? 75.0 : 0.0,
        rapido_drop_requested: data.rapidoDrop,
        rapido_drop_fare: data.rapidoDrop ? 95.0 : 0.0,
      });

      setSelectedItineraryForMap(null);
      setActiveTab('trips');
      reloadData();
      setActionNotice(
        `Trip details saved to Trip Details! You can review, book (simulated), edit details, or remove it.`
      );
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to save trip');
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset database to clean seed state?')) {
      try {
        await api.resetDemo();
        alert('Database reset successful.');
        reloadData();
      } catch (err: any) {
        alert(err.message || 'Reset failed (Requires ADMIN role).');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center text-sm font-semibold text-[#121C1A]">
        Loading RoamAgent Environment...
      </div>
    );
  }

  // Show public landing page if not signed in
  if (!user) {
    return (
      <>
        <LandingPage
          onGetStarted={() => setAuthModalOpen(true)}
          onSignIn={() => setAuthModalOpen(true)}
        />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  // Authenticated Application Shell
  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#121C1A] flex flex-col">
      {/* Top Bar */}
      <header className="h-16 border-b border-[#E2E5E4] bg-white flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 text-[#5C6460] hover:text-[#121C1A] rounded hover:bg-[#F4F4F4] transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 bg-[#121C1A] text-white flex items-center justify-center rounded">
            <Compass className="w-5 h-5 text-[#A3ACA9]" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-base text-[#121C1A]">TBS RoamAgent</span>
            <span className="text-[10px] uppercase tracking-wider text-[#5C6460] block -mt-1">Multimodal AI Concierge</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => { setSelectedItineraryForMap(null); setActiveTab('notifications'); }}
            className="relative p-2 text-[#5C6460] hover:text-[#121C1A] rounded hover:bg-[#F4F4F4] transition-colors"
            title="Activity Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.filter((n) => !n.is_read).length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-600 rounded-full"></span>
            )}
          </button>

          {/* Profile Trigger Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-2.5 p-1.5 pr-2.5 rounded-lg border border-[#E2E5E4] hover:border-[#121C1A] hover:bg-[#F4F4F4] transition-all text-xs font-medium text-[#121C1A]"
            >
              <div className="w-7 h-7 rounded-full bg-[#121C1A] text-white flex items-center justify-center font-serif font-bold text-xs">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-xs text-[#121C1A]">
                {user.full_name || user.email.split('@')[0]}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#5C6460] transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfileDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E2E5E4] rounded-lg shadow-lg z-50 py-1.5 text-xs">
                  <div className="px-4 py-2.5 border-b border-[#E2E5E4] bg-[#F4F4F4]/50">
                    <p className="font-semibold text-[#121C1A] truncate">{user.full_name || user.email.split('@')[0]}</p>
                    <p className="text-[11px] text-[#5C6460] truncate mt-0.5">{user.email}</p>
                    <span className="inline-block mt-1.5 px-1.5 py-0.2 bg-white border border-[#E2E5E4] rounded text-[10px] font-semibold text-[#5C6460]">
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedItineraryForMap(null);
                      setActiveTab('profile');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F4F4] text-[#121C1A] flex items-center space-x-2 font-medium"
                  >
                    <UserIcon className="w-4 h-4 text-[#5C6460]" />
                    <span>Profile</span>
                  </button>

                  <div className="border-t border-[#E2E5E4] my-1" />

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F4F4] text-red-700 flex items-center space-x-2 font-medium"
                  >
                    <LogOut className="w-4 h-4 text-red-700" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 flex w-full">
        {/* Fixed Static Left Navigation Sidebar */}
        <aside
          className={`h-[calc(100vh-4rem)] sticky top-16 border-r border-[#E2E5E4] bg-white transition-all duration-200 z-30 flex flex-col justify-between p-4 flex-shrink-0 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className="space-y-2">
            {[
              { id: 'planner', label: 'AI Trip Planner', icon: Compass },
              { id: 'results', label: `Itineraries (${itineraries.length})`, icon: Layers },
              { id: 'disruptions', label: 'Disruption Simulator', icon: AlertTriangle },
              { id: 'trips', label: `Trip Details (${bookings.length})`, icon: MapPin },
              { id: 'notifications', label: `Activity Log (${notifications.length})`, icon: Bell },
              { id: 'profile', label: 'My Profile', icon: UserIcon },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = (activeTab === item.id) && !selectedItineraryForMap;
              return (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItineraryForMap(null); setActiveTab(item.id as any); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#121C1A] text-white'
                      : 'text-[#5C6460] hover:bg-[#F4F4F4] hover:text-[#121C1A]'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Quick Demo Controls */}
          {!sidebarCollapsed && (
            <div className="bg-[#F4F4F4] border border-[#E2E5E4] rounded p-3 space-y-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#5C6460] block text-[10px]">
                Demo Environment
              </span>
              <p className="text-[#5C6460] text-[11px]">Simulated live corridor timetable.</p>
              {user.role === 'ADMIN' && (
                <button
                  onClick={handleResetDemo}
                  className="w-full py-1.5 bg-white border border-[#E2E5E4] rounded text-[11px] font-semibold text-[#121C1A] hover:bg-[#E2E5E4] flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Demo Database</span>
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Content Area - Edge to edge fit without awkward gutters */}
        <main className="flex-1 p-4 md:p-6 w-full space-y-6 overflow-y-auto">
          {actionNotice && (
            <div className="p-4 bg-white border border-[#121C1A] rounded-lg text-xs font-semibold text-[#121C1A] shadow-sm">
              {actionNotice}
            </div>
          )}

          {selectedItineraryForMap ? (
            <RouteMapModal
              itinerary={selectedItineraryForMap}
              onBack={() => setSelectedItineraryForMap(null)}
              onRequestBooking={(itin) => handleConfirmTrip({
                itinerary: itin,
                rapidoPickup: true,
                rapidoDrop: true,
                selectedAttractions: [],
                selectedRestaurants: [],
                passengerName: user?.full_name || 'Traveller',
                passengerCount: 1,
                totalAmount: itin.total_fare + 170.0
              })}
            />
          ) : (
            <>
              {activeTab === 'planner' && <TripPlanner onTripCreated={handleTripCreated} />}

              {activeTab === 'results' && (
                <ItineraryResults
                  trip={trips.find(t => t.id === currentTripId)}
                  itineraries={itineraries}
                  userName={user?.full_name || user?.email?.split('@')[0] || 'Traveller'}
                  onConfirmTrip={handleConfirmTrip}
                  onViewTimeline={(itin: Itinerary) => setSelectedItineraryForMap(itin)}
                />
              )}

              {activeTab === 'disruptions' && (
                <DisruptionSimulator trips={trips} onDisruptionHandled={reloadData} />
              )}

              {activeTab === 'trips' && (
                <TripDetailsView
                  bookings={bookings}
                  trips={trips}
                  itineraries={itineraries}
                  onRefresh={reloadData}
                  onNavigatePlanner={() => { setSelectedItineraryForMap(null); setActiveTab('planner'); }}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationCenter notifications={notifications} onRefresh={reloadData} />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  user={user}
                  trips={trips}
                  bookings={bookings}
                  notifications={notifications}
                  onNavigateTab={(t) => { setSelectedItineraryForMap(null); setActiveTab(t); }}
                  onLogout={logout}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
