export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'USER' | 'ADMIN';
  is_active: boolean;
  preferred_language: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TripConstraints {
  origin: string;
  destination: string;
  departure_date: string;
  arrival_deadline?: string;
  max_budget?: number;
  passenger_count: number;
  seating_preference?: string;
  preferred_modes: string[];
  selected_places?: string[];
  luggage_needed: boolean;
  accessibility_needs: boolean;
  notes?: string;
}

export interface Segment {
  id: string;
  sequence_order: number;
  transport_mode: string;
  operator: string;
  origin_name: string;
  destination_name: string;
  origin_lat?: number;
  origin_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  fare: number;
  buffer_minutes: number;
}

export interface Itinerary {
  id: string;
  trip_id: string;
  rank: number;
  summary_title: string;
  explanation?: string;
  total_fare: number;
  total_duration_minutes: number;
  transfers_count: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  is_deadline_compliant: boolean;
  is_budget_compliant: boolean;
  is_selected: boolean;
  segments: Segment[];
}

export interface Trip {
  id: string;
  title: string;
  origin: string;
  destination: string;
  departure_date: string;
  arrival_deadline?: string;
  max_budget?: number;
  passenger_count: number;
  status: string;
  created_at: string;
}

export interface RecoveryOption {
  id: string;
  title: string;
  explanation: string;
  alternative_itinerary?: Itinerary;
  additional_cost: number;
  time_difference_minutes: number;
  feasibility_status: string;
  is_chosen: boolean;
}

export interface Disruption {
  id: string;
  trip_id: string;
  disruption_type: string;
  impact_level: string;
  affected_service_name: string;
  delay_minutes: number;
  description: string;
  is_simulated: boolean;
  status: string;
  recovery_recommendations: RecoveryOption[];
  created_at: string;
}

export interface Booking {
  id: string;
  trip_id?: string;
  itinerary_id: string;
  itinerary?: Itinerary;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'CONFIRMED_SIMULATED' | 'REJECTED' | 'CANCELLED_SIMULATED';
  total_amount: number;
  passenger_name: string;
  passenger_count: number;
  rapido_pickup_requested?: boolean;
  rapido_pickup_fare?: number;
  rapido_drop_requested?: boolean;
  rapido_drop_fare?: number;
  selected_places?: string[];
  selected_restaurants?: string[];
  approval_decision?: string;
  confirmation_reference?: string;
  is_simulated: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  level: 'INFO' | 'WARNING' | 'URGENT' | 'SUCCESS';
  is_read: boolean;
  created_at: string;
}
