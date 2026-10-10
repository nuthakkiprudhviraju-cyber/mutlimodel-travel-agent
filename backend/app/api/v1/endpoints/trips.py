from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import User, Trip, Itinerary, ItinerarySegment
from app.schemas.schemas import (
    NaturalLanguageTripRequest,
    TripConstraints,
    TripPlanRequest,
    TripOut,
    ItineraryOut,
    SegmentOut
)
from app.agent.intake_agent import TravelIntakeAgent
from app.services.itinerary_engine import ItineraryPlanningEngine
from app.services.geo_places_service import GeoPlacesService

router = APIRouter()

@router.post("/parse-request", response_model=TripConstraints)
def parse_request(req: NaturalLanguageTripRequest, current_user: User = Depends(get_current_user)):
    """Convert conversational travel prompt into structured constraints using Gemini AI / deterministic fallback."""
    return TravelIntakeAgent.parse_request(req.prompt, req.language or "en")

@router.get("/places-along-corridor")
async def get_places_along_corridor(
    city: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Query Overpass API (OpenStreetMap) to retrieve tourist attractions,
    authentic regional restaurants, and domestic transit hubs for the destination.
    """
    if lat is None or lon is None:
        geo = await GeoPlacesService.geocode(city)
        if geo:
            lat = geo["lat"]
            lon = geo["lon"]
        else:
            lat, lon = (17.7289, 83.3039) if "visakhapatnam" in city.lower() else (17.3786, 78.4816)

    places = await GeoPlacesService.get_places_along_corridor(lat, lon)
    return {"city": city, "center": {"lat": lat, "lon": lon}, "places": places}

@router.get("/osrm-route")
async def get_osrm_route(
    origin: str,
    destination: str,
    mode: str = "driving",
    current_user: User = Depends(get_current_user)
):
    """
    Fetch live road distance, duration, and GeoJSON route coordinates from OSRM.
    """
    orig_geo = await GeoPlacesService.geocode(origin)
    dest_geo = await GeoPlacesService.geocode(destination)

    orig_lat, orig_lon = (orig_geo["lat"], orig_geo["lon"]) if orig_geo else (17.7289, 83.3039)
    dest_lat, dest_lon = (dest_geo["lat"], dest_geo["lon"]) if dest_geo else (17.3786, 78.4816)

    route_info = await GeoPlacesService.get_osrm_route(orig_lat, orig_lon, dest_lat, dest_lon, mode)
    return {
        "origin": origin,
        "destination": destination,
        "mode": mode,
        "route": route_info
    }

@router.post("/plan", response_model=TripOut)
def plan_trip(
    plan_req: TripPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Plan a journey: stores trip constraints and executes deterministic graph engine
    to produce ranked direct and multi-leg itineraries.
    """
    c = plan_req.constraints
    trip_title = plan_req.title or f"{c.origin} to {c.destination} ({c.departure_date})"

    trip = Trip(
        user_id=current_user.id,
        title=trip_title,
        origin=c.origin,
        destination=c.destination,
        departure_date=c.departure_date,
        arrival_deadline=c.arrival_deadline,
        max_budget=c.max_budget,
        passenger_count=c.passenger_count,
        status="PLANNED"
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # Compute itineraries using planning engine
    engine = ItineraryPlanningEngine(db)
    ranked_results = engine.find_itineraries(trip, c)

    for item in ranked_results:
        itinerary = Itinerary(
            trip_id=trip.id,
            rank=item["rank"],
            summary_title=item["summary_title"],
            explanation=item["explanation"],
            total_fare=item["total_fare"],
            total_duration_minutes=item["total_duration_minutes"],
            transfers_count=item["transfers_count"],
            risk_level=item["risk_level"],
            is_deadline_compliant=item["is_deadline_compliant"],
            is_budget_compliant=item["is_budget_compliant"]
        )
        db.add(itinerary)
        db.commit()
        db.refresh(itinerary)

        for seg in item["segments"]:
            segment = ItinerarySegment(
                itinerary_id=itinerary.id,
                sequence_order=seg["sequence_order"],
                transport_mode=seg["transport_mode"],
                service_id=seg.get("service_id"),
                operator=seg["operator"],
                origin_name=seg["origin_name"],
                destination_name=seg["destination_name"],
                origin_lat=seg.get("origin_lat"),
                origin_lng=seg.get("origin_lng"),
                dest_lat=seg.get("dest_lat"),
                dest_lng=seg.get("dest_lng"),
                departure_time=seg["departure_time"],
                arrival_time=seg["arrival_time"],
                duration_minutes=seg["duration_minutes"],
                fare=seg["fare"],
                buffer_minutes=seg["buffer_minutes"]
            )
            db.add(segment)

    db.commit()
    return trip

@router.get("", response_model=List[TripOut])
def list_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all trips owned by the authenticated user."""
    return db.query(Trip).filter(Trip.user_id == current_user.id).order_by(Trip.created_at.desc()).all()

@router.get("/{trip_id}", response_model=TripOut)
def get_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve a single trip by ID with ownership verification."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to access this trip")
    return trip

@router.get("/{trip_id}/itineraries", response_model=List[ItineraryOut])
def get_trip_itineraries(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all ranked itineraries for a trip with verified user ownership."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to access itineraries for this trip")

    itineraries = db.query(Itinerary).filter(Itinerary.trip_id == trip_id).order_by(Itinerary.rank.asc()).all()
    return itineraries
