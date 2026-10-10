# TBS RoamAgent — Backend Architecture & Technical Design

> **Scope:** Backend Architecture, Data Modeling, Service Flow & Technology Stack  
> **Directory:** `c:\samartha hac\backend\docs\ARCHITECTURE.md`  
> **Framework:** FastAPI (Python 3.13) + Neon Cloud PostgreSQL  

---

## 1. Backend Philosophy & Architectural Principles

The RoamAgent backend is constructed around four operational tenets:
1. **Separation of LLM & Timetable Truth:** Google Gemini AI is utilized strictly as a natural language semantic parser. It is **never** permitted to hallucinate transit schedules, seat availability, or fares. Timetable data is strictly resolved deterministically via the database.
2. **Deterministic Route Graph Engine:** Direct and multi-leg transfers are calculated using graph search algorithms with hard mathematical validation on transfer buffers ($\ge 30\text{ mins}$) and arrival deadlines.
3. **External Spatial & Geocoding Decoupling:** Road corridors and regional amenities are fetched through asynchronous HTTP clients directly from OSRM (`router.project-osrm.org`) and Overpass OpenStreetMap API, with verified fallback caches for network resiliency.
4. **Human-in-the-Loop Governance:** Financial and booking actions default to `PENDING_APPROVAL`. No automated action confirms a booking without explicit traveler consent, and confirmed bookings are permanently locked from modifications.

---

## 2. Backend Technology Stack & Frameworks

| Component | Technology | Version | Role & Architecture Responsibility |
| :--- | :--- | :--- | :--- |
| **Language Runtime** | Python | `3.13.9` | Asynchronous modern Python execution |
| **Web Framework** | FastAPI | `0.115+` | High-throughput asynchronous REST API framework with Pydantic V2 validation |
| **ASGI Web Server** | Uvicorn | `0.34+` | Production ASGI web server running on `127.0.0.1:8000` |
| **Database & Pooling** | Neon PostgreSQL | Cloud `v16+` | Serverless cloud PostgreSQL over SSL (`ep-polished-term-b4fvyodq`) |
| **ORM & Data Layer** | SQLAlchemy | `2.0+` | Declarative relational object mapping with pre-ping connection recovery |
| **AI LLM Engine** | Google Gemini | `gemini-3.8-flash` | Prompt parameter extraction via the official `google-genai` SDK |
| **Security & Auth** | PyJWT & Passlib | `2.10+` | Bearer token authentication, bcrypt password hashing, 30-min token expiration |
| **HTTP Client** | HTTPX | `0.28+` | Non-blocking asynchronous network calls for OSRM, Overpass, and Nominatim |
| **Test Suite** | Pytest | `8.4+` | Automated testing framework with `pytest-asyncio` |

---

## 3. Directory & Module Structure

```
backend/
├── app/
│   ├── main.py                     # App factory, CORS, exception handlers, DB auto-seed
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings, JWT secret, 30-minute expiration
│   │   ├── security.py             # bcrypt hashing, JWT token creation and decoding
│   │   └── deps.py                 # Dependency injectors (get_db, get_current_user)
│   ├── agent/
│   │   └── intake_agent.py         # Google Gemini AI agent (gemini-3.8-flash) & regex fallback
│   ├── db/
│   │   ├── session.py              # SQLAlchemy engine & session maker with SSL
│   │   └── seed.py                 # Timetable seeding for South Indian transit corridors
│   ├── models/
│   │   └── models.py               # Declarative ORM models (User, Trip, Booking, etc.)
│   ├── schemas/
│   │   └── schemas.py              # Pydantic validation models
│   ├── services/
│   │   ├── itinerary_engine.py     # Deterministic graph route planning engine
│   │   ├── disruption_engine.py    # Autonomous delay evaluation & recovery generator
│   │   └── geo_places_service.py   # OSRM router & Overpass API places client
│   └── api/
│       └── v1/
│           ├── router.py           # Unified v1 router
│           └── endpoints/
│               ├── auth.py         # Registration, login, profile
│               ├── trips.py        # Planning, itineraries, OSRM routes, places
│               ├── bookings.py     # Booking creation, updates, approval lock, deletion
│               ├── disruptions.py  # Disruption simulation & recovery
│               ├── notifications.py# Activity notifications
│               └── demo.py         # Reset database to seed state
├── docs/                           # Backend Documentation
│   ├── ARCHITECTURE.md             # This document
│   ├── API_REFERENCE.md            # Complete REST API reference
│   └── BACKEND.md                  # Developer & setup guide
└── tests/
    └── test_backend.py             # 8 integration test cases
```

---

## 4. Backend Service Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant Auth as Auth & Security (deps.py)
    participant API as FastAPI Router (v1)
    participant Gemini as Gemini AI Agent (intake_agent.py)
    participant Engine as Planning Engine (itinerary_engine.py)
    participant Geo as GeoPlacesService (geo_places_service.py)
    participant DB as Neon PostgreSQL (SQLAlchemy)

    Note over Client,API: 1. Authentication & Token Verification
    Client->>API: HTTP Request + Bearer JWT
    API->>Auth: Validate Token Signature & Expiry (30 mins)
    Auth->>DB: Fetch active User record
    Auth-->>API: Injects Current User

    Note over Client,Gemini: 2. AI Prompt Parameter Parsing
    Client->>API: POST /trips/parse-request {"prompt": "..."}
    API->>Gemini: Parse via gemini-3.8-flash
    alt Gemini Success
        Gemini-->>API: Structured constraints JSON
    else Gemini Quota / Network Error
        Gemini->>Gemini: Deterministic Regex Fallback Anchor
        Gemini-->>API: Extracted constraints JSON
    end
    API-->>Client: Returns TripConstraints

    Note over Client,Engine: 3. Timetable Graph Route Search
    Client->>API: POST /trips/plan
    API->>Engine: Execute find_itineraries(trip, constraints)
    Engine->>DB: Query departures on corridor
    Engine->>Engine: Validate transfer buffer & deadlines
    Engine->>DB: Persist ranked Itineraries & Segments
    API-->>Client: Returns ranked Itineraries

    Note over Client,Geo: 4. Geospatial Corridor Intelligence
    Client->>API: GET /trips/osrm-route
    API->>Geo: Query OSRM Highway API
    Geo-->>API: Distance (km) + Polyline coordinates

    Client->>API: GET /trips/places-along-corridor
    API->>Geo: Query Overpass OpenStreetMap
    Geo-->>API: Attractions, Dining, Verified Emergency Hospitals
    API-->>Client: Returns corridor places

    Note over Client,DB: 5. Booking Creation, Edit & Approval Lock
    Client->>API: POST /bookings (Creates PENDING_APPROVAL booking)
    API->>DB: Persist Booking record

    opt If unconfirmed
        Client->>API: PATCH /bookings/:id (Update carrier, passengers, Rapido)
        API->>DB: Updates record & recalculates fare
    end

    Client->>API: POST /bookings/:id/approve (Confirms booking)
    API->>DB: Updates status to CONFIRMED_SIMULATED & issues ref ROAM-SIM-XXXX
    Note over API,DB: Locks record against any future PATCH requests (HTTP 400)
    API-->>Client: Confirmed Booking with lock
```

---

## 5. Entity-Relationship Data Model

```mermaid
erDiagram
    USERS ||--o{ TRIPS : owns
    USERS ||--o{ BOOKINGS : creates
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_EVENTS : triggers

    TRIPS ||--o{ ITINERARIES : contains
    TRIPS ||--o{ DISRUPTION_EVENTS : suffers
    
    ITINERARIES ||--o{ ITINERARY_SEGMENTS : composed_of
    ITINERARIES ||--o| BOOKINGS : booked_as

    DISRUPTION_EVENTS ||--o{ RECOVERY_RECOMMENDATIONS : generates
    RECOVERY_RECOMMENDATIONS ||--o| ITINERARIES : recommends

    USERS {
        string id PK
        string email UK
        string hashed_password
        string full_name
        string role "USER or ADMIN"
        boolean is_active
        string preferred_language
        datetime created_at
    }

    TRIPS {
        string id PK
        string user_id FK
        string title
        string origin
        string destination
        string departure_date
        string arrival_deadline
        float max_budget
        int passenger_count
        string status "PLANNED, ACTIVE, COMPLETED"
        datetime created_at
    }

    ITINERARIES {
        string id PK
        string trip_id FK
        int rank
        string summary_title
        text explanation
        numeric total_fare
        int total_duration_minutes
        int transfers_count
        string risk_level "LOW, MODERATE, HIGH"
        boolean is_deadline_compliant
        boolean is_budget_compliant
        boolean is_selected
        datetime created_at
    }

    ITINERARY_SEGMENTS {
        string id PK
        string itinerary_id FK
        int sequence_order
        string transport_mode "BUS, TRAIN, CAB, FLIGHT"
        string operator
        string origin_name
        string destination_name
        float origin_lat
        float origin_lng
        float dest_lat
        float dest_lng
        string departure_time
        string arrival_time
        int duration_minutes
        numeric fare
        int buffer_minutes
    }

    BOOKINGS {
        string id PK
        string user_id FK
        string itinerary_id FK
        string status "PENDING_APPROVAL, CONFIRMED_SIMULATED, REJECTED, CANCELLED_SIMULATED"
        numeric total_amount
        string passenger_name
        int passenger_count
        string approval_decision
        datetime approval_timestamp
        string confirmation_reference
        boolean is_simulated
        string idempotency_key UK
        datetime created_at
        datetime updated_at
    }
```

---

## 6. Security & Session Integrity

1. **Session Expiry:** Access tokens have an expiration window of **30 minutes** (`ACCESS_TOKEN_EXPIRE_MINUTES = 30`).
2. **Database SSL:** Neon PostgreSQL connection enforces SSL mode (`sslmode=require`).
3. **Idempotency Protection:** Booking requests require unique `idempotency_key` strings to protect against duplicate submissions.
4. **Post-Booking Lock:** Bookings with status `CONFIRMED_SIMULATED` are permanently locked; `PATCH /api/v1/bookings/:id` returns `HTTP 400 Bad Request`.
