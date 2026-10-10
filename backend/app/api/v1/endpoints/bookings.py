import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import User, Itinerary, Booking, AuditEvent, Notification
from app.schemas.schemas import BookingCreateRequest, BookingApprovalAction, BookingOut, BookingUpdateRequest

router = APIRouter()

@router.post("", response_model=BookingOut)
def create_booking_request(
    req: BookingCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initialize a booking request in PENDING_APPROVAL state.
    Requires explicit human approval before any simulated confirmation occurs.
    Enforces idempotency and ownership.
    """
    # Check idempotency
    if req.idempotency_key:
        existing_booking = db.query(Booking).filter(
            Booking.idempotency_key == req.idempotency_key,
            Booking.user_id == current_user.id
        ).first()
        if existing_booking:
            return existing_booking

    itinerary = db.query(Itinerary).filter(Itinerary.id == req.itinerary_id).first()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    # Verify trip ownership
    if itinerary.trip.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to book this itinerary")

    total_fare = float(itinerary.total_fare)
    if req.rapido_pickup_requested:
        total_fare += float(req.rapido_pickup_fare or 75.0)
    if req.rapido_drop_requested:
        total_fare += float(req.rapido_drop_fare or 95.0)

    booking = Booking(
        user_id=current_user.id,
        itinerary_id=itinerary.id,
        status="PENDING_APPROVAL",
        total_amount=total_fare,
        passenger_name=req.passenger_name,
        passenger_count=req.passenger_count,
        is_simulated=True,
        idempotency_key=req.idempotency_key
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Persist audit record
    audit = AuditEvent(
        user_id=current_user.id,
        event_type="BOOKING_PENDING_APPROVAL",
        details=f"Booking {booking.id} created for Itinerary {itinerary.id}. Total: ₹{booking.total_amount}. Pending user approval."
    )
    db.add(audit)

    # Persist notification
    notification = Notification(
        user_id=current_user.id,
        title="Approval Required: Booking Confirmation",
        message=f"Please review and approve your booking for ₹{booking.total_amount} ({itinerary.summary_title}).",
        category="APPROVAL",
        level="WARNING"
    )
    db.add(notification)
    db.commit()

    return booking

@router.get("", response_model=List[BookingOut])
def list_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List bookings belonging to current user."""
    return db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve booking by ID with ownership verification."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    return booking

@router.post("/{booking_id}/approve", response_model=BookingOut)
def approve_booking(
    booking_id: str,
    action: BookingApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enforce backend user approval before simulated confirmation.
    Transitions: PENDING_APPROVAL -> CONFIRMED_SIMULATED (if approved) or REJECTED.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to approve this booking")

    if booking.status not in ["PENDING_APPROVAL", "DRAFT"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change approval on booking with status '{booking.status}'"
        )

    now = datetime.now(timezone.utc)
    if action.decision == "APPROVE":
        booking.status = "CONFIRMED_SIMULATED"
        booking.approval_decision = "APPROVED"
        booking.approval_timestamp = now
        ref_id = f"ROAM-SIM-{uuid.uuid4().hex[:8].upper()}"
        booking.confirmation_reference = ref_id

        audit = AuditEvent(
            user_id=current_user.id,
            event_type="BOOKING_APPROVED_CONFIRMED",
            details=f"User approved booking {booking.id}. Simulated confirmation reference {ref_id} issued."
        )
        notif = Notification(
            user_id=current_user.id,
            title="Booking Confirmed (Simulated)",
            message=f"Your trip booking is confirmed with ref {ref_id}. No real money was charged.",
            category="APPROVAL",
            level="SUCCESS"
        )
    else:
        booking.status = "REJECTED"
        booking.approval_decision = "REJECTED"
        booking.rejection_reason = action.rejection_reason or "Declined by traveller."
        booking.approval_timestamp = now

        audit = AuditEvent(
            user_id=current_user.id,
            event_type="BOOKING_REJECTED",
            details=f"User rejected booking {booking.id}. Reason: {booking.rejection_reason}"
        )
        notif = Notification(
            user_id=current_user.id,
            title="Booking Request Declined",
            message=f"Booking for itinerary was declined. No reservation was placed.",
            category="APPROVAL",
            level="INFO"
        )

    db.add(audit)
    db.add(notif)
    db.commit()
    db.refresh(booking)

    return booking

@router.patch("/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: str,
    req: BookingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update passenger details or configuration on a saved trip/booking."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")

    if booking.status == "CONFIRMED_SIMULATED":
        raise HTTPException(
            status_code=400,
            detail="Cannot edit a confirmed booking. Once booked, details cannot be changed."
        )

    if req.itinerary_id:
        new_itin = db.query(Itinerary).filter(Itinerary.id == req.itinerary_id).first()
        if new_itin:
            booking.itinerary_id = new_itin.id

    if req.passenger_name is not None and req.passenger_name.strip():
        booking.passenger_name = req.passenger_name.strip()
    if req.passenger_count is not None and req.passenger_count > 0:
        booking.passenger_count = req.passenger_count

    target_itin = db.query(Itinerary).filter(Itinerary.id == booking.itinerary_id).first()
    if target_itin:
        total = float(target_itin.total_fare) * (booking.passenger_count or 1)
        if req.rapido_pickup_requested:
            total += 75.0
        if req.rapido_drop_requested:
            total += 95.0
        booking.total_amount = total

    db.commit()
    db.refresh(booking)
    return booking

@router.delete("/{booking_id}")
def delete_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently delete a saved trip/booking."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to delete this booking")

    db.delete(booking)
    db.commit()
    return {"message": "Booking deleted successfully", "id": booking_id}
