from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    preferred_language: str = "en"

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserOut(UserBase):
    id: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut

# --- Trip & Intake Schemas ---
class NaturalLanguageTripRequest(BaseModel):
    prompt: str
    language: Optional[str] = "en"

class TripConstraints(BaseModel):
    origin: str
    destination: str
    departure_date: str
    arrival_deadline: Optional[str] = None
    max_budget: Optional[float] = None
    passenger_count: int = 1
    seating_preference: Optional[str] = "SLEEPER"  # SLEEPER, SEATER, ANY
    preferred_modes: List[str] = ["BUS", "TRAIN", "CAB"]
    selected_places: List[str] = []
    luggage_needed: bool = True
    accessibility_needs: bool = False
    notes: Optional[str] = None

class TripPlanRequest(BaseModel):
    title: Optional[str] = None
    constraints: TripConstraints

class TripOut(BaseModel):
    id: str
    title: str
    origin: str
    destination: str
    departure_date: str
    arrival_deadline: Optional[str]
    max_budget: Optional[float]
    passenger_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Itinerary Schemas ---
class SegmentOut(BaseModel):
    id: str
    sequence_order: int
    transport_mode: str
    operator: str
    origin_name: str
    destination_name: str
    origin_lat: Optional[float]
    origin_lng: Optional[float]
    dest_lat: Optional[float]
    dest_lng: Optional[float]
    departure_time: str
    arrival_time: str
    duration_minutes: int
    fare: float
    buffer_minutes: int

    class Config:
        from_attributes = True

class ItineraryOut(BaseModel):
    id: str
    trip_id: str
    rank: int
    summary_title: str
    explanation: Optional[str]
    total_fare: float
    total_duration_minutes: int
    transfers_count: int
    risk_level: str
    is_deadline_compliant: bool
    is_budget_compliant: bool
    is_selected: bool
    segments: List[SegmentOut] = []

    class Config:
        from_attributes = True

# --- Disruption Schemas ---
class DisruptionSimulateRequest(BaseModel):
    trip_id: str
    disruption_type: str  # DELAY, CANCELLATION, MISSED_CONNECTION
    affected_service_name: Optional[str] = "Primary Service"
    delay_minutes: int = 45
    description: Optional[str] = None

class RecoveryOptionOut(BaseModel):
    id: str
    title: str
    explanation: str
    alternative_itinerary: Optional[ItineraryOut] = None
    additional_cost: float
    time_difference_minutes: int
    feasibility_status: str
    is_chosen: bool

    class Config:
        from_attributes = True

class DisruptionOut(BaseModel):
    id: str
    trip_id: str
    disruption_type: str
    impact_level: str
    affected_service_name: str
    delay_minutes: int
    description: str
    is_simulated: bool
    status: str
    recovery_recommendations: List[RecoveryOptionOut] = []
    created_at: datetime

    class Config:
        from_attributes = True

# --- Booking Schemas ---
class BookingCreateRequest(BaseModel):
    itinerary_id: str
    passenger_name: str
    passenger_count: int = 1
    idempotency_key: Optional[str] = None
    rapido_pickup_requested: bool = False
    rapido_pickup_fare: float = 0.0
    rapido_drop_requested: bool = False
    rapido_drop_fare: float = 0.0

class BookingApprovalAction(BaseModel):
    decision: str  # APPROVE, REJECT
    rejection_reason: Optional[str] = None

class BookingUpdateRequest(BaseModel):
    itinerary_id: Optional[str] = None
    passenger_name: Optional[str] = None
    passenger_count: Optional[int] = None
    rapido_pickup_requested: Optional[bool] = None
    rapido_drop_requested: Optional[bool] = None

class BookingOut(BaseModel):
    id: str
    trip_id: Optional[str] = None
    itinerary_id: str
    status: str
    total_amount: float
    passenger_name: str
    passenger_count: int
    rapido_pickup_requested: Optional[bool] = False
    rapido_pickup_fare: Optional[float] = 0.0
    rapido_drop_requested: Optional[bool] = False
    rapido_drop_fare: Optional[float] = 0.0
    approval_decision: Optional[str] = None
    approval_timestamp: Optional[datetime] = None
    confirmation_reference: Optional[str] = None
    is_simulated: bool
    itinerary: Optional[ItineraryOut] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Notification & Audit Schemas ---
class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    category: str
    level: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
