# RoamAgent Frontend Developer Guide (`FRONTEND.md`)

## 1. Overview & Project Setup

The RoamAgent Frontend is built with **React 19**, **TypeScript**, and **Vite**, styled using modern **Tailwind CSS v4**. It implements an autonomous corporate travel planning cockpit with real-time route rendering, multi-modal transport selection, doorstep transit integration (Rapido), and immutable post-booking trip workflows.

### Prerequisites & Tech Stack
- **Node.js**: v18+ or v20+ recommended
- **Build Tool**: Vite 6+
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Lucide React Icons
- **Mapping**: Leaflet 1.9 + React-Leaflet 5
- **Routing & Networking**: Native browser Fetch wrapped in TypeScript services (`src/services/api.ts`)

### Local Development Setup

```bash
# Navigate to the frontend directory
cd "frontend"

# Install dependencies
npm install

# Start development server on http://localhost:5173
npm run dev

# Run TypeScript check and production build
npm run build
```

---

## 2. Directory Structure

```
frontend/
├── docs/                             # Frontend-specific documentation
│   ├── ARCHITECTURE.md               # Architecture, state flow & layout rules
│   ├── FRONTEND.md                   # Developer & component breakdown guide
│   └── API_INTEGRATION.md            # Backend API contract & consumption
├── src/
│   ├── components/                   # UI View & Panel Components
│   │   ├── ItineraryResults.tsx      # 3-Tier Pinned Itinerary planning cockpit
│   │   ├── TripDetails.tsx           # Trips management, edit modal & lock workflow
│   │   ├── DisruptionSimulator.tsx   # Live disruption event testing
│   │   ├── TravelPolicyEditor.tsx    # Corporate travel policy rules
│   │   ├── AdminConsole.tsx          # System metrics and status dashboard
│   │   ├── AnalyticsDashboard.tsx    # Carbon, cost, and route metrics
│   │   ├── ProfileModal.tsx          # User profile view modal
│   │   └── MapView.tsx               # Leaflet route & geocode visualizer
│   ├── services/
│   │   └── api.ts                    # REST API client with Bearer token injector
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript interfaces & models
│   ├── App.tsx                       # Main shell, sidebar navigation & session state
│   ├── main.tsx                      # Vite React root mounting
│   └── index.css                     # Tailwind CSS v4 styling rules
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Core Component Walkthrough

### 3.1 `App.tsx` (Application Shell & Navigation)
- **Edge-to-Edge Responsive Layout**: Left static sidebar (`w-64`) with brand logo, session badge, and navigation tabs:
  - `Journey Search` (`search`): Natural language prompt input and itinerary planner.
  - `Tourist Guide` (`guide`): Regional tourism, POIs, and culinary attractions.
  - `Trips` (`trips`): Active, draft, and booked trips with modification locks.
  - `Disruption Center` (`disruptions`): Real-time delay/cancellation simulation.
  - `Policy Engine` (`policy`): Spend and travel constraints.
  - `Analytics` (`analytics`): Cost, mode breakdown, and carbon emissions.
- **Top Navigation Bar**: Replaced raw sign-out with user identity trigger (`John Doe`) showing user profile modal or secure logout.

### 3.2 `ItineraryResults.tsx` (Pinned 3-Tier Itinerary Cockpit)
Designed to maximize viewport utility (`h-[calc(100vh-6rem)]`) with no wasted whitespace:
1. **Pinned Tier 1 (Header Overview)**:
   - Dynamic route title: `[Source] ([Terminal Mode]) -----> [Destination] ([Terminal Mode])`
   - Travel dates, budget allocation, carbon estimate, and total duration pills.
   - Sub-tab navigator: `Transports`, `Home Pickup & Drop (Rapido)`, `Highway Routes`, `Tourist Attractions`, `Restaurants & Dining`, `Healthcare & Hospitals`.
2. **Scrollable Tier 2 (Middle Content Area)**:
   - Dedicated tab views with independent scrolling.
   - Multi-selection checkboxes for transport tickets, Rapido rides, attractions, and dining options.
   - Interactive Leaflet map displaying OSRM driving routes and Rapido doorstep connection.
3. **Pinned Tier 3 (Footer Action Bar)**:
   - Selection count tracker.
   - Double-check confirmation modal before saving to **Trips**.

### 3.3 `TripDetails.tsx` (Trip Lifecycle & Locking Engine)
- Replaces the legacy Approval Center.
- Displays trips categorized as `Draft (Under Review)` or `Confirmed (Booked)`.
- **Edit Modal**: Allows travelers to re-select transports, Rapido options, and attractions for draft trips.
- **Booking Lock**: Once booked, displays alert *"Once booked, trip details cannot be modified later"*. Edit and delete buttons become disabled to prevent compliance violations.

---

## 4. Leaflet Mapping & Polyline Rendering

- **Tile Provider**: OpenStreetMap standard raster tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
- **Highway Routing**: Coordinates fetched from OSRM (`/api/geo/route`) parsed into Leaflet `Polyline` overlays (`color: #2563eb`, `weight: 4`).
- **Doorstep Transit Pin**: Home pickup coordinates rendered as a green marker with doorstep-to-hub connector polyline (`dashArray: '4, 8'`).

---

## 5. Styling Guidelines (Tailwind CSS v4)

1. **Editorial & Professional Aesthetic**: Clean corporate slate colors (`slate-900`, `slate-700`, `slate-50`, `blue-600`, `emerald-600`).
2. **No Neon / No Glassmorphism**: High contrast, crisp borders (`border-slate-200`), clear typography, and subtle shadows (`shadow-sm`).
3. **Zero Overflow Glitches**: Fixed height containers with nested `overflow-y-auto` ensures all buttons remain visible regardless of screen height.
