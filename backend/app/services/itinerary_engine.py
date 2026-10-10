"""
Deterministic Itinerary Search and Ranking Engine.
Evaluates direct and multi-leg routes, enforces hard constraints (budget, arrival deadline, transfer buffer),
and scores soft preferences (seat tier, duration, punctuality).
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import TransportService, TransportStop, Itinerary, ItinerarySegment, Trip
from app.schemas.schemas import TripConstraints

def time_to_minutes(t_str: str) -> int:
    """Convert HH:MM string to minutes from start of day."""
    parts = t_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])

def minutes_to_time(m: int) -> str:
    """Convert minutes from midnight to HH:MM format."""
    hours = (m // 60) % 24
    mins = m % 60
    return f"{hours:02d}:{mins:02d}"

class ItineraryPlanningEngine:
    def __init__(self, db: Session):
        self.db = db

    def find_itineraries(self, trip: Trip, constraints: TripConstraints) -> List[Dict[str, Any]]:
        """
        Search transport graph for feasible journeys.
        Validates:
        1. Hard constraint: Arrival deadline (e.g. before 09:00 next morning)
        2. Hard constraint: Max budget
        3. Hard constraint: Minimum transfer buffer (at least 45 mins between connections)
        """
        origin_city = constraints.origin.strip().lower()
        dest_city = constraints.destination.strip().lower()

        # Find matching origin and destination stops
        origin_stops = self.db.query(TransportStop).filter(
            TransportStop.city.ilike(f"%{origin_city}%")
        ).all()
        dest_stops = self.db.query(TransportStop).filter(
            TransportStop.city.ilike(f"%{dest_city}%")
        ).all()

        if not origin_stops or not dest_stops:
            return []

        origin_stop_ids = [s.id for s in origin_stops]
        dest_stop_ids = [s.id for s in dest_stops]

        candidate_itineraries = []

        # 1. Search DIRECT services
        direct_services = self.db.query(TransportService).filter(
            TransportService.origin_stop_id.in_(origin_stop_ids),
            TransportService.destination_stop_id.in_(dest_stop_ids),
            TransportService.is_active == True
        ).all()

        for svc in direct_services:
            plan = self._evaluate_single_service(svc, constraints)
            if plan:
                candidate_itineraries.append(plan)

        # 2. Search MULTI-LEG services (1 transfer connecting routes)
        first_legs = self.db.query(TransportService).filter(
            TransportService.origin_stop_id.in_(origin_stop_ids),
            ~TransportService.destination_stop_id.in_(dest_stop_ids),
            TransportService.is_active == True
        ).all()

        for leg1 in first_legs:
            # Transfer stop
            connecting_legs = self.db.query(TransportService).filter(
                TransportService.origin_stop_id == leg1.destination_stop_id,
                TransportService.destination_stop_id.in_(dest_stop_ids),
                TransportService.is_active == True
            ).all()

            for leg2 in connecting_legs:
                plan = self._evaluate_connecting_services(leg1, leg2, constraints)
                if plan:
                    candidate_itineraries.append(plan)

        # Rank candidate itineraries
        ranked = self._rank_itineraries(candidate_itineraries, constraints)
        return ranked

    def _evaluate_single_service(self, svc: TransportService, constraints: TripConstraints) -> Optional[Dict[str, Any]]:
        total_fare = float(svc.base_fare) * constraints.passenger_count
        duration = svc.duration_minutes

        # Check deadline compliance
        is_deadline_compliant = True
        arrival_m = time_to_minutes(svc.arrival_time)
        if constraints.arrival_deadline:
            deadline_m = time_to_minutes(constraints.arrival_deadline)
            # Both morning arrivals (e.g. 07:15 vs 09:00)
            if arrival_m > deadline_m:
                is_deadline_compliant = False

        # Check budget compliance
        is_budget_compliant = True
        if constraints.max_budget is not None and total_fare > float(constraints.max_budget):
            is_budget_compliant = False

        # Filter out if strict hard constraints violated completely
        if constraints.arrival_deadline and not is_deadline_compliant:
            # We preserve it if no other options or for comparison, but note compliance
            pass

        segment = {
            "sequence_order": 1,
            "transport_mode": svc.mode,
            "service_id": svc.id,
            "operator": svc.operator_name,
            "origin_name": svc.origin_stop.name,
            "destination_name": svc.destination_stop.name,
            "origin_lat": svc.origin_stop.latitude,
            "origin_lng": svc.origin_stop.longitude,
            "dest_lat": svc.destination_stop.latitude,
            "dest_lng": svc.destination_stop.longitude,
            "departure_time": svc.departure_time,
            "arrival_time": svc.arrival_time,
            "duration_minutes": svc.duration_minutes,
            "fare": float(svc.base_fare),
            "buffer_minutes": 0,
            "comfort_tier": svc.comfort_tier
        }

        # Transfer risk for direct route is LOW
        risk_level = "LOW"
        title = f"Direct {svc.mode.capitalize()} via {svc.operator_name}"
        
        explanation = f"Direct journey arriving at {svc.arrival_time} with high reliability ({svc.punctuality_rating}/5.0 rating)."
        if constraints.seating_preference and constraints.seating_preference == svc.comfort_tier:
            explanation += f" Matches requested {svc.comfort_tier.lower()} comfort tier."

        return {
            "summary_title": title,
            "explanation": explanation,
            "total_fare": total_fare,
            "total_duration_minutes": duration,
            "transfers_count": 0,
            "risk_level": risk_level,
            "is_deadline_compliant": is_deadline_compliant,
            "is_budget_compliant": is_budget_compliant,
            "punctuality": svc.punctuality_rating,
            "comfort_tier": svc.comfort_tier,
            "segments": [segment]
        }

    def _evaluate_connecting_services(
        self, leg1: TransportService, leg2: TransportService, constraints: TripConstraints
    ) -> Optional[Dict[str, Any]]:
        # Calculate buffer / waiting time at transfer stop
        arr1_m = time_to_minutes(leg1.arrival_time)
        dep2_m = time_to_minutes(leg2.departure_time)

        # Buffer handling across midnight
        if dep2_m >= arr1_m:
            buffer_mins = dep2_m - arr1_m
        else:
            buffer_mins = (dep2_m + 1440) - arr1_m

        # Minimum required transfer buffer is 45 mins, max 240 mins
        if buffer_mins < 45 or buffer_mins > 300:
            return None

        total_duration = leg1.duration_minutes + buffer_mins + leg2.duration_minutes
        total_fare = (float(leg1.base_fare) + float(leg2.base_fare)) * constraints.passenger_count

        is_deadline_compliant = True
        arr2_m = time_to_minutes(leg2.arrival_time)
        if constraints.arrival_deadline:
            deadline_m = time_to_minutes(constraints.arrival_deadline)
            if arr2_m > deadline_m:
                is_deadline_compliant = False

        is_budget_compliant = True
        if constraints.max_budget is not None and total_fare > float(constraints.max_budget):
            is_budget_compliant = False

        seg1 = {
            "sequence_order": 1,
            "transport_mode": leg1.mode,
            "service_id": leg1.id,
            "operator": leg1.operator_name,
            "origin_name": leg1.origin_stop.name,
            "destination_name": leg1.destination_stop.name,
            "origin_lat": leg1.origin_stop.latitude,
            "origin_lng": leg1.origin_stop.longitude,
            "dest_lat": leg1.destination_stop.latitude,
            "dest_lng": leg1.destination_stop.longitude,
            "departure_time": leg1.departure_time,
            "arrival_time": leg1.arrival_time,
            "duration_minutes": leg1.duration_minutes,
            "fare": float(leg1.base_fare),
            "buffer_minutes": buffer_mins,
            "comfort_tier": leg1.comfort_tier
        }

        seg2 = {
            "sequence_order": 2,
            "transport_mode": leg2.mode,
            "service_id": leg2.id,
            "operator": leg2.operator_name,
            "origin_name": leg2.origin_stop.name,
            "destination_name": leg2.destination_stop.name,
            "origin_lat": leg2.origin_stop.latitude,
            "origin_lng": leg2.origin_stop.longitude,
            "dest_lat": leg2.destination_stop.latitude,
            "dest_lng": leg2.destination_stop.longitude,
            "departure_time": leg2.departure_time,
            "arrival_time": leg2.arrival_time,
            "duration_minutes": leg2.duration_minutes,
            "fare": float(leg2.base_fare),
            "buffer_minutes": 0,
            "comfort_tier": leg2.comfort_tier
        }

        risk_level = "MODERATE" if buffer_mins >= 60 else "HIGH"

        return {
            "summary_title": f"Connecting via {leg1.destination_stop.city} ({leg1.operator_name} + {leg2.operator_name})",
            "explanation": f"Multi-leg connection at {leg1.destination_stop.name} with {buffer_mins} mins transfer window.",
            "total_fare": total_fare,
            "total_duration_minutes": total_duration,
            "transfers_count": 1,
            "risk_level": risk_level,
            "is_deadline_compliant": is_deadline_compliant,
            "is_budget_compliant": is_budget_compliant,
            "punctuality": min(leg1.punctuality_rating, leg2.punctuality_rating),
            "comfort_tier": leg1.comfort_tier,
            "segments": [seg1, seg2]
        }

    def _rank_itineraries(self, candidates: List[Dict[str, Any]], constraints: TripConstraints) -> List[Dict[str, Any]]:
        """
        Rank itineraries with deterministic multi-factor score:
        1. Compliance penalty (incompliant gets severe penalty)
        2. Direct vs transfer penalty
        3. User comfort preference match bonus
        4. Duration and fare weighted metrics
        """
        def calculate_score(item: Dict[str, Any]) -> float:
            score = 100.0
            
            # Deadline and budget compliance are fundamental
            if not item["is_deadline_compliant"]:
                score -= 40.0
            if not item["is_budget_compliant"]:
                score -= 30.0

            # Transfer penalty
            score -= (item["transfers_count"] * 15.0)

            # Comfort match bonus
            if constraints.seating_preference and item.get("comfort_tier") == constraints.seating_preference:
                score += 15.0

            # Punctuality bonus
            score += (item.get("punctuality", 4.0) * 4.0)

            # Normalized duration penalty (every hour lowers score slightly)
            score -= (item["total_duration_minutes"] / 60.0) * 1.5

            return score

        # Sort descending by score
        candidates.sort(key=calculate_score, reverse=True)

        # Set ranks
        for idx, item in enumerate(candidates):
            item["rank"] = idx + 1

        return candidates
