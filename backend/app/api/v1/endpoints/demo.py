from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db, Base, engine
from app.core.deps import require_admin
from app.models.models import User
from app.db.seed import seed_database

router = APIRouter()

@router.get("/scenarios")
def get_demo_scenarios(admin: User = Depends(require_admin)):
    """Return pre-configured scenarios for live hackathon demonstration."""
    return {
        "scenarios": [
            {
                "id": "scenario_a",
                "name": "Intelligent Journey Intake & Planning",
                "prompt": "I want to travel from Visakhapatnam to Hyderabad on the selected date, reach before 9 AM, prefer a sleeper bus and keep my budget below ₹1,500.",
                "features": ["Natural language constraint extraction", "Multi-criteria ranking", "Interactive map route timeline"]
            },
            {
                "id": "scenario_b",
                "name": "Disruption Simulator & Alternative Recovery",
                "description": "Simulate sudden 60-min bus delay or breakdown, calculate deadline impact, search replacement journey without breaking budget.",
                "features": ["Impact recalculation", "Feasible replacement options", "Trade-off analysis"]
            },
            {
                "id": "scenario_c",
                "name": "Human Approval for Consequential Actions",
                "description": "System halts booking before user review, prevents auto-payment or unapproved cancellation.",
                "features": ["Audit trail logging", "State transition enforcement", "Idempotency validation"]
            },
            {
                "id": "scenario_d",
                "name": "Honest Infeasibility Explanation",
                "prompt": "I want to travel from Visakhapatnam to Hyderabad arriving in 2 hours with ₹300 budget.",
                "features": ["Clear explanation why constraints cannot be satisfied", "No hallucinated routes"]
            }
        ]
    }

@router.post("/reset")
def reset_demo_database(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Reset the database to clean seeded demonstration state."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database(db)
    return {"message": "Demo database successfully reset and seeded."}
