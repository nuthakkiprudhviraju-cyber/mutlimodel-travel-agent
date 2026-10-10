import React from 'react';
import { User, Trip, Booking, Notification } from '../../types';
import { 
  User as UserIcon, 
  Shield, 
  Clock, 
  Compass, 
  CheckSquare, 
  Bell, 
  LogOut, 
  Globe, 
  KeyRound, 
  Database 
} from 'lucide-react';

interface ProfileViewProps {
  user: User;
  trips: Trip[];
  bookings: Booking[];
  notifications: Notification[];
  onNavigateTab: (tab: 'planner' | 'results' | 'disruptions' | 'trips' | 'notifications') => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  trips,
  bookings,
  notifications,
  onNavigateTab,
  onLogout,
}) => {
  const displayName = user.full_name || user.email.split('@')[0];
  const pendingBookingsCount = bookings.filter((b) => b.status === 'PENDING_APPROVAL').length;
  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E2E5E4] rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-[#121C1A] text-white flex items-center justify-center text-xl font-bold font-serif tracking-wider">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-serif text-[#121C1A]">{displayName}</h2>
              <span className="px-2 py-0.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-[11px] font-semibold text-[#5C6460]">
                {user.role}
              </span>
            </div>
            <p className="text-sm text-[#5C6460] mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('planner')}
            className="px-4 py-2 bg-[#121C1A] text-white text-xs font-semibold rounded hover:bg-[#2D4645] transition-colors flex items-center space-x-1.5"
          >
            <Compass className="w-4 h-4" />
            <span>Plan New Trip</span>
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-[#E2E5E4] bg-white text-xs font-semibold text-[#5C6460] hover:text-[#121C1A] hover:bg-[#F4F4F4] rounded transition-colors flex items-center space-x-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Grid: Details & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Details */}
        <div className="md:col-span-2 bg-white border border-[#E2E5E4] rounded-lg p-6 space-y-6 shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Account Overview</span>
            <h3 className="text-lg font-serif text-[#121C1A] mt-1">Profile & Credentials</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#F4F4F4] border border-[#E2E5E4] rounded">
              <span className="text-[#5C6460] block text-[11px]">Full Name</span>
              <span className="font-semibold text-[#121C1A] text-sm mt-0.5 block">
                {user.full_name || 'Not provided'}
              </span>
            </div>

            <div className="p-3 bg-[#F4F4F4] border border-[#E2E5E4] rounded">
              <span className="text-[#5C6460] block text-[11px]">Primary Email</span>
              <span className="font-semibold text-[#121C1A] text-sm mt-0.5 block truncate">
                {user.email}
              </span>
            </div>

            <div className="p-3 bg-[#F4F4F4] border border-[#E2E5E4] rounded">
              <span className="text-[#5C6460] block text-[11px]">System Role</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                <span className="font-semibold text-[#121C1A] text-sm">{user.role}</span>
              </div>
            </div>

            <div className="p-3 bg-[#F4F4F4] border border-[#E2E5E4] rounded">
              <span className="text-[#5C6460] block text-[11px]">Preferred Language</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-[#5C6460]" />
                <span className="font-semibold text-[#121C1A] text-sm uppercase">
                  {user.preferred_language || 'en'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#F4F4F4] border border-[#E2E5E4] rounded sm:col-span-2">
              <span className="text-[#5C6460] block text-[11px]">Account ID</span>
              <span className="font-mono text-xs text-[#121C1A] mt-0.5 block">
                {user.id}
              </span>
            </div>
          </div>

          {/* Security & Token Info */}
          <div className="border-t border-[#E2E5E4] pt-5 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Session & Security</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start space-x-2.5 p-3 border border-[#E2E5E4] rounded bg-white">
                <Clock className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-[#121C1A]">30-Minute Session Lifespan</div>
                  <div className="text-[#5C6460] text-[11px] mt-0.5">
                    Session token persists across page refreshes with automatic 30-min expiry.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 p-3 border border-[#E2E5E4] rounded bg-white">
                <Database className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-[#121C1A]">Neon PostgreSQL DB</div>
                  <div className="text-[#5C6460] text-[11px] mt-0.5">
                    Encrypted cloud database with row-level security and pooled connections.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Travel Activity Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E5E4] rounded-lg p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Activity</span>
              <h3 className="text-lg font-serif text-[#121C1A] mt-1">Travel Stats</h3>
            </div>

            <div className="space-y-3">
              <div 
                onClick={() => onNavigateTab('planner')}
                className="p-3 bg-[#F4F4F4] hover:bg-[#EAEAEA] rounded border border-[#E2E5E4] flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Compass className="w-4 h-4 text-[#121C1A]" />
                  <span className="text-xs font-medium text-[#121C1A]">Planned Trips</span>
                </div>
                <span className="font-bold text-sm text-[#121C1A]">{trips.length}</span>
              </div>

              <div 
                onClick={() => onNavigateTab('trips')}
                className="p-3 bg-[#F4F4F4] hover:bg-[#EAEAEA] rounded border border-[#E2E5E4] flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <CheckSquare className="w-4 h-4 text-[#121C1A]" />
                  <div>
                    <span className="text-xs font-medium text-[#121C1A] block">Trip Details & Bookings</span>
                    {pendingBookingsCount > 0 && (
                      <span className="text-[10px] text-amber-700">{pendingBookingsCount} ready to book</span>
                    )}
                  </div>
                </div>
                <span className="font-bold text-sm text-[#121C1A]">{bookings.length}</span>
              </div>

              <div 
                onClick={() => onNavigateTab('notifications')}
                className="p-3 bg-[#F4F4F4] hover:bg-[#EAEAEA] rounded border border-[#E2E5E4] flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Bell className="w-4 h-4 text-[#121C1A]" />
                  <div>
                    <span className="text-xs font-medium text-[#121C1A] block">Activity Log</span>
                    {unreadNotifsCount > 0 && (
                      <span className="text-[10px] text-amber-700">{unreadNotifsCount} unread</span>
                    )}
                  </div>
                </div>
                <span className="font-bold text-sm text-[#121C1A]">{notifications.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Access Card */}
          <div className="bg-[#121C1A] text-white rounded-lg p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-[#A3ACA9]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#A3ACA9]">Agent Engine</span>
            </div>
            <p className="text-xs text-[#A3ACA9] leading-relaxed">
              Powered by Google Gemini AI, OpenStreetMap, OSRM Highway Routing, and Overpass Places.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
