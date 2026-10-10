# TBS RoamAgent — Backend Developer & Services Guide

> **Directory:** `c:\samartha hac\backend\docs\BACKEND.md`  
> **Environment:** Python 3.13.9, FastAPI, Neon Cloud PostgreSQL  

---

## 1. Quickstart & Local Setup

### 1.1 Prerequisites
- Python 3.13.x
- Active Neon PostgreSQL database (`neondb`) with SSL enabled
- Valid Google Gemini API Key (`GEMINI_API_KEY`)

### 1.2 Environment Configuration (`.env`)
Create or edit `backend/.env`:
```env
PROJECT_NAME="TBS RoamAgent Backend"
ENVIRONMENT="development"
SECRET_KEY="roamagent-super-secret-key-change-in-production-2026"
ACCESS_TOKEN_EXPIRE_MINUTES=30

DATABASE_URL="postgresql://neondb_owner:npg_ciW2fgetRL1J@ep-polished-term-b4fvyodq-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
GEMINI_API_KEY="your-google-gemini-api-key"
```

### 1.3 Running the Backend Server
Start the Uvicorn ASGI server from `c:\samartha hac\backend`:
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base URL: `http://127.0.0.1:8000/api/v1`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

---

## 2. Core Backend Services & Modules

### 2.1 Gemini Intake Agent (`app/agent/intake_agent.py`)
- **SDK:** Official `google-genai` SDK.
- **Model:** `gemini-3.8-flash`.
- **Method:** `TravelIntakeAgent.parse_request(prompt: str, language: str)`.
- **System Prompt:** Mandates JSON extraction of origin, destination, departure date, arrival deadline, budget, passenger count, seating comfort, and preferred modes.
- **Regex Fallback:** In the event of network rate limits or timeouts, automatically uses regex anchoring (`\bfrom\s+(...)\s+to\s+(...)`) to extract parameters deterministically.

### 2.2 Itinerary Planning Engine (`app/services/itinerary_engine.py`)
- **Method:** `ItineraryPlanningEngine(db).find_itineraries(trip, constraints)`.
- **Logic:**
  1. Direct search: queries all transport services connecting origin hub to destination hub.
  2. Multi-leg search: identifies feasible intermediate hubs (e.g., Vijayawada for Chennai $\leftrightarrow$ Visakhapatnam), ensuring transfer buffer $\ge 30\text{ mins}$.
  3. Ranking: scores journeys based on arrival deadline compliance, budget compliance, and transfer reliability risk.

### 2.3 Geo & Corridor Places Service (`app/services/geo_places_service.py`)
- **OSRM Integration:** `get_osrm_route(origin_lat, origin_lon, dest_lat, dest_lon, mode)`. Queries `router.project-osrm.org` to return true road driving distance and GeoJSON polyline geometry.
- **Overpass Integration:** `get_places_along_corridor(lat, lon)`. Queries OpenStreetMap Overpass API for tourist monuments and regional restaurants.
- **Hospital Isolation:** Strictly filters out `bus_station` and `station` from medical amenities. Augments real 24/7 multi-specialty hospitals (Apollo, Yashoda, CARE, Fortis) so travellers always see verified medical casualty facilities.

### 2.4 Disruption Recovery Engine (`app/services/disruption_engine.py`)
- **Method:** `DisruptionEngine.handle_disruption(trip, disruption)`.
- **Simulation:** Injects delay minutes into an active leg.
- **Impact Assessment:** Checks whether the delay exhausts connection buffers or causes missed arrivals.
- **Recovery Options:** Generates alternative transport solutions (e.g., bypass trains or next-hour buses) with time and cost tradeoffs.

---

## 3. Database Seeding & Demo Reset (`app/db/seed.py`)

When the backend starts up, `seed_database(db)` initializes:
- **Default Users:**
  - `traveller@roamagent.com` / `Travel12345!` (Role: `USER`)
  - `admin@roamagent.com` / `Admin12345!` (Role: `ADMIN`)
  - `testuser@roamagent.com` / `TestPass123!` (Role: `USER`)
- **Corridor Timetables:** Over 20 realistic intercity departures covering buses (TSRTC, APSRTC, KPN Travels, Morning Star) and trains (Godavari SF, Vande Bharat, Coromandel, Ratnachal).
- **Admin Reset:** `POST /api/v1/demo/reset` allows administrators to restore the database to this baseline seed state at any time.

---

## 4. Automated Testing Suite

All integration tests are located in `backend/tests/test_backend.py`.

### 4.1 Running Tests
```powershell
python -m pytest
```

### 4.2 Test Coverage
The suite executes 8 tests verifying:
1. `test_health_and_ready`: System health endpoints.
2. `test_auth_registration_and_login`: JWT token generation, role verification, and profile retrieval.
3. `test_token_expiry_configuration`: Confirms the 30-minute session lifetime.
4. `test_ai_intake_agent`: Natural language prompt parsing with Gemini AI and regex fallback.
5. `test_trip_planning_engine`: End-to-end multi-modal itinerary ranking and transfer buffer validation.
6. `test_osrm_and_geo_service`: Highway routing and corridor places retrieval.
7. `test_disruption_handling`: Delay simulation and recovery recommendation generation.
8. `test_booking_approval_workflow`: Trip creation, simulated approval confirmation (`ROAM-SIM-XXXX`), and locking against post-booking mutations.
