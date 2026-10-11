/**
 * API client with dual-tier session management:
 * 1. Primary short-lived in-memory access token.
 * 2. Automatic refresh token cookie rotation and restore on page reload.
 * 3. Client session storage fallback to prevent logout when reloading.
 */

let inMemoryAccessToken: string | null = null;

// Recover active token on reload
try {
  inMemoryAccessToken = sessionStorage.getItem('roamagent_session_token');
} catch {}

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem('roamagent_session_token', token);
    } else {
      sessionStorage.removeItem('roamagent_session_token');
    }
  } catch {}
};

export const getAccessToken = () => inMemoryAccessToken;

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // sends and receives HttpOnly refresh cookie
  };

  let response = await fetch(`${BASE_URL}${endpoint}`, config);

  // If unauthorized, attempt silent refresh using the HttpOnly cookie
  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAccessToken(refreshData.access_token);
        headers.set('Authorization', `Bearer ${refreshData.access_token}`);
        // Retry original request with refreshed token
        response = await fetch(`${BASE_URL}${endpoint}`, { ...config, headers });
      } else {
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errorData.detail || `Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  refresh: () => request<any>('/auth/refresh', { method: 'POST' }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  getMe: () => request<any>('/auth/me'),

  // Trips & Intake
  parseRequest: (prompt: string, language = 'en') => 
    request<any>('/trips/parse-request', { method: 'POST', body: JSON.stringify({ prompt, language }) }),
  planTrip: (data: any) => 
    request<any>('/trips/plan', { method: 'POST', body: JSON.stringify(data) }),
  getTrips: () => request<any[]>('/trips'),
  getTripItineraries: (tripId: string) => request<any[]>(`/trips/${tripId}/itineraries`),

  // Live Geo, OSRM & Places
  getOsrmRoute: (origin: string, destination: string, mode: string = 'driving') =>
    request<any>(`/trips/osrm-route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${encodeURIComponent(mode)}`),
  getPlacesAlongCorridor: (city: string, lat?: number, lon?: number) => {
    let url = `/trips/places-along-corridor?city=${encodeURIComponent(city)}`;
    if (lat !== undefined && lon !== undefined) url += `&lat=${lat}&lon=${lon}`;
    return request<any>(url);
  },

  // Disruptions
  simulateDisruption: (data: any) => 
    request<any>('/disruptions/simulate', { method: 'POST', body: JSON.stringify(data) }),
  getDisruptions: () => request<any[]>('/disruptions'),

  // Bookings & Trips
  createBooking: (data: any) => 
    request<any>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getBookings: () => request<any[]>('/bookings'),
  updateBooking: (bookingId: string, data: any) =>
    request<any>(`/bookings/${bookingId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBooking: (bookingId: string) =>
    request<any>(`/bookings/${bookingId}`, { method: 'DELETE' }),
  approveBooking: (bookingId: string, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) =>
    request<any>(`/bookings/${bookingId}/approve`, { 
      method: 'POST', 
      body: JSON.stringify({ decision, rejection_reason: rejectionReason }) 
    }),
  cancelBooking: (bookingId: string) => 
    request<any>(`/bookings/${bookingId}/cancel`, { method: 'POST' }),

  // Notifications
  getNotifications: () => request<any[]>('/notifications'),
  markNotificationRead: (id: string) => 
    request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Demo
  getDemoScenarios: () => request<any>('/demo/scenarios'),
  resetDemo: () => request<any>('/demo/reset', { method: 'POST' }),
};
