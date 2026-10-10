import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_password_hash, verify_password, create_access_token, decode_token

client = TestClient(app)

def test_health_and_readiness():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_ready = client.get("/api/v1/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "ready"

def test_password_hashing():
    pwd = "SecurePassword123!"
    h = get_password_hash(pwd)
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword", h) is False

def test_jwt_generation_and_validation():
    token = create_access_token("test-user-id", role="USER")
    payload = decode_token(token)
    assert payload["sub"] == "test-user-id"
    assert payload["role"] == "USER"
    assert payload["type"] == "access"

def test_login_and_me_endpoint():
    login_data = {
        "email": "traveller@roamagent.com",
        "password": "Travel12345!"
    }
    res = client.post("/api/v1/auth/login", json=login_data)
    assert res.status_code == 200
    token_data = res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Verify protected /me endpoint
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "traveller@roamagent.com"

def test_unauthenticated_request_rejected():
    res = client.get("/api/v1/trips")
    assert res.status_code == 401

def test_conversational_intake_parsing():
    login_data = {"email": "traveller@roamagent.com", "password": "Travel12345!"}
    login_res = client.post("/api/v1/auth/login", json=login_data)
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prompt = "I want to travel from Visakhapatnam to Hyderabad on the selected date, reach before 9 AM, prefer a sleeper bus and keep my budget below ₹1,500."
    res = client.post("/api/v1/trips/parse-request", json={"prompt": prompt}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["origin"] == "Visakhapatnam"
    assert data["destination"] == "Hyderabad"
    assert data["max_budget"] == 1500.0
    assert data["arrival_deadline"] == "09:00"
    assert data["seating_preference"] == "SLEEPER"

def test_trip_planning_and_deterministic_ranking():
    login_data = {"email": "traveller@roamagent.com", "password": "Travel12345!"}
    token = client.post("/api/v1/auth/login", json=login_data).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    plan_payload = {
        "title": "Business Journey to Hyderabad",
        "constraints": {
            "origin": "Visakhapatnam",
            "destination": "Hyderabad",
            "departure_date": "2026-10-15",
            "arrival_deadline": "09:00",
            "max_budget": 1500.0,
            "passenger_count": 1,
            "seating_preference": "SLEEPER"
        }
    }
    trip_res = client.post("/api/v1/trips/plan", json=plan_payload, headers=headers)
    assert trip_res.status_code == 200
    trip_id = trip_res.json()["id"]

    # Check itineraries
    itin_res = client.get(f"/api/v1/trips/{trip_id}/itineraries", headers=headers)
    assert itin_res.status_code == 200
    itins = itin_res.json()
    assert len(itins) > 0
    # Top ranked should be compliant with budget and deadline
    top = itins[0]
    assert top["is_deadline_compliant"] is True
    assert top["is_budget_compliant"] is True

def test_booking_approval_workflow():
    login_data = {"email": "traveller@roamagent.com", "password": "Travel12345!"}
    token = client.post("/api/v1/auth/login", json=login_data).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Plan a trip
    plan_payload = {
        "title": "Test Booking Trip",
        "constraints": {
            "origin": "Visakhapatnam",
            "destination": "Hyderabad",
            "departure_date": "2026-10-20",
            "arrival_deadline": "09:00",
            "max_budget": 1500.0,
            "passenger_count": 1,
            "seating_preference": "SLEEPER"
        }
    }
    trip_id = client.post("/api/v1/trips/plan", json=plan_payload, headers=headers).json()["id"]
    itin_id = client.get(f"/api/v1/trips/{trip_id}/itineraries", headers=headers).json()[0]["id"]

    # 1. Create booking (should be in PENDING_APPROVAL)
    book_res = client.post("/api/v1/bookings", json={"itinerary_id": itin_id, "passenger_name": "Naveen Traveller"}, headers=headers)
    assert book_res.status_code == 200
    booking = book_res.json()
    assert booking["status"] == "PENDING_APPROVAL"
    assert booking["is_simulated"] is True

    # 2. Approve booking explicitly
    approve_res = client.post(f"/api/v1/bookings/{booking['id']}/approve", json={"decision": "APPROVE"}, headers=headers)
    assert approve_res.status_code == 200
    confirmed_book = approve_res.json()
    assert confirmed_book["status"] == "CONFIRMED_SIMULATED"
    assert confirmed_book["confirmation_reference"].startswith("ROAM-SIM-")
