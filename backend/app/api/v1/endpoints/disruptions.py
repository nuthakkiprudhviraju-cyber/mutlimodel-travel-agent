from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import User, Trip, DisruptionEvent
from app.schemas.schemas import DisruptionSimulateRequest, DisruptionOut
from app.agent.recovery_agent import DisruptionRecoveryAgent

router = APIRouter()

@router.post("/simulate", response_model=DisruptionOut)
def simulate_disruption(
    req: DisruptionSimulateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Simulate a travel disruption (service delay, cancellation, traffic blockage).
    Runs automated recovery analysis, ranks replacement itineraries,
    and surfaces options awaiting user approval.
    """
    trip = db.query(Trip).filter(Trip.id == req.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to simulate disruptions on this trip")

    agent = DisruptionRecoveryAgent(db)
    event = agent.trigger_disruption(
        trip_id=trip.id,
        disruption_type=req.disruption_type,
        delay_minutes=req.delay_minutes,
        affected_service_name=req.affected_service_name or "Scheduled Service",
        description=req.description
    )
    return event

@router.get("", response_model=List[DisruptionOut])
def list_disruptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List disruptions affecting current user's trips."""
    user_trips = db.query(Trip.id).filter(Trip.user_id == current_user.id).all()
    trip_ids = [t[0] for t in user_trips]
    return db.query(DisruptionEvent).filter(DisruptionEvent.trip_id.in_(trip_ids)).order_by(DisruptionEvent.created_at.desc()).all()
