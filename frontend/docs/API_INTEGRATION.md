# RoamAgent Frontend API Integration Guide (`API_INTEGRATION.md`)

## 1. Architecture Overview

The frontend communicates with the RoamAgent FastAPI backend over REST (`http://127.0.0.1:8000`). All network requests are routed through a centralized API service module (`src/services/api.ts`).

```
┌────────────────────────────────┐
│      Frontend Components       │
│ (ItineraryResults, TripDetails)│
└───────────────┬────────────────┘
                │ Typed function call
                ▼
┌────────────────────────────────┐
│      src/services/api.ts       │
│  - Injects Bearer Auth Token   │
│  - Normalizes JSON responses   │
│  - Fallback to Mock Data       │
└───────────────┬────────────────┘
                │ HTTP Fetch (Bearer Token)
                ▼
┌────────────────────────────────┐
│     FastAPI Backend (8000)     │
└────────────────────────────────┘
```

---

## 2. Authentication & Session Persistence

### 2.1 Storage Key
- Authentication session tokens are persisted in browser `sessionStorage` under the key:
  `roamagent_session_token`

### 2.2 Token Interception Pattern
Every outbound API request automatically includes the `Authorization` header:

```typescript
const token = sessionStorage.getItem('roamagent_session_token');
const headers = {
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
};
```

---

## 3. API Service Mapping

All endpoints consumed by the frontend are mapped directly in `src/services/api.ts`:

### 3.1 Authentication & Session
- **`POST /api/auth/session`**: Initializes a temporary traveler session or logs in an existing corporate user. Returns `{ access_token, user_id, expires_in }`.
- **`GET /api/auth/me`**: Fetches user profile, corporate role, and spend authorization.

### 3.2 Journey Search & Planning
- **`POST /api/journey/parse`**:
  - **Payload**: `{ prompt: string }`
  - **Output**: Extracted parameters `{ origin, destination, departure_date, return_date, budget_limit, travel_class }`.
- **`POST /api/journey/plan`**:
  - Generates multi-modal transportation options (flight, train, bus, cab).

### 3.3 Geospatial & Route Discovery
- **`GET /api/geo/route?origin={lat,lon}&dest={lat,lon}`**: Returns OSRM highway polyline coordinates, distance (km), and travel duration.
- **`GET /api/geo/places?location={dest}&category={attractions|food|hospital}`**:
  - Fetches tourist sights, restaurants, and medical centers via Overpass OSM with instant fallback to curated mock data if external API fails.

### 3.4 Trip Management & Booking Workflow
- **`GET /api/trips`**: Fetches all trips created during current user session.
- **`POST /api/trips`**: Saves confirmed itinerary selections into a trip record (`status: 'draft'`).
- **`PUT /api/trips/{id}`**: Updates selections (only permissible if `status === 'draft'`).
- **`POST /api/trips/{id}/book`**: Commits booking. Transitions status to `'confirmed'`. Backend locks trip from subsequent modifications.
- **`DELETE /api/trips/{id}`**: Deletes unbooked trip records.

### 3.5 Disruption Engine
- **`POST /api/disruptions/simulate`**: Simulates weather delays or transport cancellations.
- **`GET /api/disruptions/status`**: Polls active alerts and alternative re-routing proposals.

---

## 4. Error Handling & Mock Fallbacks

To ensure uninterrupted UX during hackathon presentations or offline demos:
1. If the Overpass API is rate-limited or fails to return hospitals/attractions, the frontend gracefully falls back to structured local mock data.
2. In network outage scenarios, API calls capture errors and display user-friendly error banners without crashing the component tree.
