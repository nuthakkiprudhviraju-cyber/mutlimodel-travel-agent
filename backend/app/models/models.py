import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="USER", nullable=False)  # USER, ADMIN
    is_active = Column(Boolean, default=True, nullable=False)
    preferred_language = Column(String, default="en", nullable=False)  # en, te
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sessions = relationship("RefreshTokenSession", back_populates="user", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditEvent", back_populates="user", cascade="all, delete-orphan")


class RefreshTokenSession(Base):
    __tablename__ = "refresh_token_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, index=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")


class TransportStop(Base):
    __tablename__ = "transport_stops"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, index=True)
    code = Column(String, nullable=True, index=True)
    city = Column(String, nullable=False, index=True)
    state = Column(String, default="Andhra Pradesh/Telangana")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    stop_type = Column(String, default="BUS_STATION")  # BUS_STATION, RAILWAY_STATION, AIRPORT, METRO


class TransportService(Base):
    __tablename__ = "transport_services"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_number = Column(String, nullable=False, index=True)
    operator_name = Column(String, nullable=False)
    mode = Column(String, nullable=False)  # BUS, TRAIN, FLIGHT, CAB
    comfort_tier = Column(String, default="SEATER")  # SLEEPER, AC_SEATER, NON_AC, LUXURY
    origin_stop_id = Column(String, ForeignKey("transport_stops.id"), nullable=False)
    destination_stop_id = Column(String, ForeignKey("transport_stops.id"), nullable=False)
    departure_time = Column(String, nullable=False)  # e.g., "21:30"
    arrival_time = Column(String, nullable=False)    # e.g., "05:45"
    duration_minutes = Column(Integer, nullable=False)
    base_fare = Column(Numeric(10, 2), nullable=False)
    available_seats = Column(Integer, default=24)
    punctuality_rating = Column(Float, default=4.5)
    is_active = Column(Boolean, default=True)

    origin_stop = relationship("TransportStop", foreign_keys=[origin_stop_id])
    destination_stop = relationship("TransportStop", foreign_keys=[destination_stop_id])


class Trip(Base):
    __tablename__ = "trips"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure_date = Column(String, nullable=False)  # YYYY-MM-DD
    arrival_deadline = Column(String, nullable=True) # HH:MM
    max_budget = Column(Numeric(10, 2), nullable=True)
    passenger_count = Column(Integer, default=1)
    preferences = Column(Text, nullable=True)  # JSON-encoded preferences (sleeper, luggage, etc.)
    status = Column(String, default="PLANNED") # PLANNED, ACTIVE, DISRUPTED, RECOVERED, COMPLETED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="trips")
    itineraries = relationship("Itinerary", back_populates="trip", cascade="all, delete-orphan")
    disruptions = relationship("DisruptionEvent", back_populates="trip", cascade="all, delete-orphan")


class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(String, primary_key=True, default=generate_uuid)
    trip_id = Column(String, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    rank = Column(Integer, default=1)
    summary_title = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    total_fare = Column(Numeric(10, 2), nullable=False)
    total_duration_minutes = Column(Integer, nullable=False)
    transfers_count = Column(Integer, default=0)
    risk_level = Column(String, default="LOW")  # LOW, MODERATE, HIGH
    is_deadline_compliant = Column(Boolean, default=True)
    is_budget_compliant = Column(Boolean, default=True)
    is_selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    trip = relationship("Trip", back_populates="itineraries")
    segments = relationship("ItinerarySegment", back_populates="itinerary", cascade="all, delete-orphan", order_by="ItinerarySegment.sequence_order")
    booking = relationship("Booking", back_populates="itinerary", uselist=False)


class ItinerarySegment(Base):
    __tablename__ = "itinerary_segments"

    id = Column(String, primary_key=True, default=generate_uuid)
    itinerary_id = Column(String, ForeignKey("itineraries.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_order = Column(Integer, nullable=False)
    transport_mode = Column(String, nullable=False)
    service_id = Column(String, ForeignKey("transport_services.id"), nullable=True)
    operator = Column(String, nullable=False)
    origin_name = Column(String, nullable=False)
    destination_name = Column(String, nullable=False)
    origin_lat = Column(Float, nullable=True)
    origin_lng = Column(Float, nullable=True)
    dest_lat = Column(Float, nullable=True)
    dest_lng = Column(Float, nullable=True)
    departure_time = Column(String, nullable=False)
    arrival_time = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    fare = Column(Numeric(10, 2), nullable=False)
    buffer_minutes = Column(Integer, default=0)  # Waiting time before next leg

    itinerary = relationship("Itinerary", back_populates="segments")
    service = relationship("TransportService")


class DisruptionEvent(Base):
    __tablename__ = "disruption_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    trip_id = Column(String, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    disruption_type = Column(String, nullable=False)  # DELAY, CANCELLATION, MISSED_CONNECTION, TRAFFIC
    impact_level = Column(String, default="HIGH")     # LOW, MEDIUM, CRITICAL
    affected_service_name = Column(String, nullable=False)
    delay_minutes = Column(Integer, default=0)
    description = Column(Text, nullable=False)
    is_simulated = Column(Boolean, default=True, nullable=False)
    status = Column(String, default="ACTIVE")  # ACTIVE, RESOLVED, DISMISSED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    trip = relationship("Trip", back_populates="disruptions")
    recovery_recommendations = relationship("RecoveryRecommendation", back_populates="disruption", cascade="all, delete-orphan")


class RecoveryRecommendation(Base):
    __tablename__ = "recovery_recommendations"

    id = Column(String, primary_key=True, default=generate_uuid)
    disruption_id = Column(String, ForeignKey("disruption_events.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    explanation = Column(Text, nullable=False)
    alternative_itinerary_id = Column(String, ForeignKey("itineraries.id"), nullable=True)
    additional_cost = Column(Numeric(10, 2), default=0.0)
    time_difference_minutes = Column(Integer, default=0)
    feasibility_status = Column(String, default="FEASIBLE") # FEASIBLE, INFEASIBLE_DEADLINE, INFEASIBLE_NO_CAPACITY
    is_chosen = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    disruption = relationship("DisruptionEvent", back_populates="recovery_recommendations")
    alternative_itinerary = relationship("Itinerary")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    itinerary_id = Column(String, ForeignKey("itineraries.id"), nullable=False, index=True)
    status = Column(String, default="DRAFT", nullable=False)  # DRAFT, PENDING_APPROVAL, APPROVED, CONFIRMED_SIMULATED, REJECTED, CANCELLED_SIMULATED, FAILED
    total_amount = Column(Numeric(10, 2), nullable=False)
    passenger_name = Column(String, nullable=False)
    passenger_count = Column(Integer, default=1)
    approval_decision = Column(String, nullable=True)  # APPROVED, REJECTED
    approval_timestamp = Column(DateTime, nullable=True)
    rejection_reason = Column(String, nullable=True)
    confirmation_reference = Column(String, nullable=True)  # e.g., TBS-SIM-2026-XYZ
    is_simulated = Column(Boolean, default=True, nullable=False)
    idempotency_key = Column(String, unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="bookings")
    itinerary = relationship("Itinerary", back_populates="booking")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String, default="GENERAL") # TRIP, DISRUPTION, APPROVAL, SYSTEM
    level = Column(String, default="INFO")       # INFO, WARNING, URGENT, SUCCESS
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="notifications")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String, nullable=False, index=True)  # LOGIN, BOOKING_APPROVAL, DISRUPTION_TRIGGERED, etc.
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="audit_logs")
