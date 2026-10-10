"""
Disruption Recovery Agent.
Analyzes broken journeys caused by cancellations, delays or traffic,
determines root-cause failure, searches feasible alternative itineraries,
and calculates cost/time trade-offs requiring explicit human approval.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import Trip, Itinerary, DisruptionEvent, RecoveryRecommendation, Notification
from app.services.itinerary_engine import ItineraryPlanningEngine
from app.schemas.schemas import TripConstraints

class DisruptionRecoveryAgent:
    def __init__(self, db: Session):
        self.db = db
        self.engine = ItineraryPlanningEngine(db)

    def trigger_disruption(
        self,
        trip_id: str,
        disruption_type: str,
        delay_minutes: int = 45,
        affected_service_name: str = "Primary Service",
        description: str = None
    ) -> DisruptionEvent:
        """
        Record a simulated disruption event and execute recovery analysis.
        """
        trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            raise ValueError("Trip not found")

        trip.status = "DISRUPTED"

        event_desc = description or f"Simulated {disruption_type.lower()} of {delay_minutes} minutes affecting {affected_service_name}."

        disruption = DisruptionEvent(
            trip_id=trip_id,
            disruption_type=disruption_type,
            impact_level="CRITICAL" if disruption_type == "CANCELLATION" else "HIGH",
            affected_service_name=affected_service_name,
            delay_minutes=delay_minutes,
            description=event_desc,
            is_simulated=True,
            status="ACTIVE"
        )
        self.db.add(disruption)
        self.db.commit()
        self.db.refresh(disruption)

        # Generate recovery recommendations
        self._generate_recovery_options(trip, disruption)

        # Notify user
        notification = Notification(
            user_id=trip.user_id,
            title=f"Disruption Alert: {trip.title}",
            message=f"{event_desc} RoamAgent has prepared replacement options awaiting your review and approval.",
            category="DISRUPTION",
            level="URGENT"
        )
        self.db.add(notification)
        self.db.commit()

        return disruption

    def _generate_recovery_options(self, trip: Trip, disruption: DisruptionEvent):
        """
        Evaluate alternatives. Generates feasible options and highlights trade-offs.
        """
        constraints = TripConstraints(
            origin=trip.origin,
            destination=trip.destination,
            departure_date=trip.departure_date,
            arrival_deadline=trip.arrival_deadline,
            max_budget=float(trip.max_budget) if trip.max_budget else 2500.0,
            passenger_count=trip.passenger_count,
            seating_preference="ANY"
        )

        ranked_alternatives = self.engine.find_itineraries(trip, constraints)

        if not ranked_alternatives:
            # Honest scenario where no viable route exists
            rec = RecoveryRecommendation(
                disruption_id=disruption.id,
                title="No Feasible Alternative Under Existing Constraints",
                explanation="All available services exceed the arrival deadline or remaining seats are sold out. Recommend rescheduling journey date.",
                additional_cost=0.0,
                time_difference_minutes=0,
                feasibility_status="INFEASIBLE_NO_CAPACITY"
            )
            self.db.add(rec)
            self.db.commit()
            return

        # Top 2 alternatives saved to DB for user approval
        for idx, alt in enumerate(ranked_alternatives[:2]):
            alt_itinerary = Itinerary(
                trip_id=trip.id,
                rank=alt["rank"],
                summary_title=f"[Replacement] {alt['summary_title']}",
                explanation=alt["explanation"],
                total_fare=alt["total_fare"],
                total_duration_minutes=alt["total_duration_minutes"],
                transfers_count=alt["transfers_count"],
                risk_level=alt["risk_level"],
                is_deadline_compliant=alt["is_deadline_compliant"],
                is_budget_compliant=alt["is_budget_compliant"]
            )
            self.db.add(alt_itinerary)
            self.db.commit()
            self.db.refresh(alt_itinerary)

            rec = RecoveryRecommendation(
                disruption_id=disruption.id,
                title=f"Option {idx+1}: {alt['summary_title']}",
                explanation=f"Re-routes via {alt['summary_title']}. Re-calculated arrival time remains {'compliant' if alt['is_deadline_compliant'] else 'tight'} with arrival target.",
                alternative_itinerary_id=alt_itinerary.id,
                additional_cost=max(0.0, float(alt["total_fare"]) - 1000.0),
                time_difference_minutes=alt["total_duration_minutes"] - 630,
                feasibility_status="FEASIBLE" if alt["is_deadline_compliant"] else "INFEASIBLE_DEADLINE"
            )
            self.db.add(rec)

        self.db.commit()
