# TBS RoamAgent — Multimodal AI Travel Concierge
> **SAMARTHA Hackathon 2026: Agentic AI in Travel Technology**

TBS RoamAgent is an autonomous corporate and intercity travel platform integrating Gemini 2.5 Flash agents, Open Source Routing Machine (OSRM), OpenStreetMap Overpass discovery, and doorstep last-mile transit (Rapido) into a unified, policy-compliant travel cockpit.

---

## 🚀 Key Highlights & Capabilities

- 🤖 **Gemini 2.5 Flash Intake Agent**: Extracts departure/arrival cities, departure dates, arrival deadlines, budgets, and comfort seating tiers from natural-language travel prompts.
- 🗺️ **Real-Time OSRM & Overpass Engine**: Computes high-density highway driving polylines, transit durations, and dynamic point-of-interest discovery (tourist attractions, verified restaurants, and medical emergency hubs).
- 🛵 **First/Last-Mile Doorstep Transit (Rapido)**: Seamlessly integrates home pickup and terminal drop-off (Bike, Auto, Cab) directly alongside intercity train, bus, and flight options.
- 🔒 **Immutable Trip State & Booking Lock**: Multi-select double-check confirmation workflow. Once booked, trip records are locked against modifications to guarantee corporate itinerary compliance.
- ⚡ **Zero-Overflow Pinned 3-Tier Cockpit**: Pinned overview header, independently scrollable itinerary selectors, and pinned action footer.

---

## 🛠️ Full Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Leaflet 1.9, React-Leaflet, Lucide Icons |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy 2.0 ORM, Neon PostgreSQL / SQLite, Pydantic v2 |
| **AI & Geolocation** | Google Gemini 2.5 Flash, OSRM Highway Engine, OpenStreetMap Overpass API, Offline Mock Fallback Engine |
| **Security & Auth** | Bearer JWT Session Tokens, Argon2id hashing, Granular Role-Based Access Control |

---

## 📁 Repository Structure

```
.
├── backend/                  # FastAPI REST Backend
│   ├── app/                  # Application core, routers, database models, agent logic
│   ├── docs/                 # Backend-specific architecture, APIs & developer guides
│   │   ├── ARCHITECTURE.md   # Backend architecture & sequence flows
│   │   ├── API_REFERENCE.md  # Complete REST API specifications
│   │   └── BACKEND.md        # Backend setup & testing instructions
│   ├── tests/                # Automated Pytest suite
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React 19 + TypeScript + Vite Cockpit
│   ├── docs/                 # Frontend-specific architecture, layout & API guides
│   │   ├── ARCHITECTURE.md   # Frontend architecture & 3-Tier layout specs
│   │   ├── FRONTEND.md       # Frontend developer & component guide
│   │   └── API_INTEGRATION.md# Frontend API consumption & session persistence
│   ├── src/                  # Components, services, Leaflet maps & state
│   ├── package.json
│   └── vite.config.ts
│
├── RoamAgent_Final_Presentation.pptx # Widescreen 16:9 7-Slide PowerPoint Deck
├── .env.example              # Environment variables template (No secrets committed)
├── .gitignore                # Production ignore rules (.env, node_modules, pycache, etc.)
└── README.md
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- **Python**: 3.11+ (Python 3.13 supported)
- **Node.js**: 18+ or 20+
- **Google Gemini API Key** (optional, mock fallback engine provided)

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env and supply your GEMINI_API_KEY and DATABASE_URL if using PostgreSQL

# Run automated tests
python -m pytest

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- Interactive API Docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
- Cockpit UI: `http://localhost:5173`

---

## 📊 Presentation Slide Deck

A 7-slide widescreen presentation deck is available in the root repository:
- 📁 **[`RoamAgent_Final_Presentation.pptx`](./RoamAgent_Final_Presentation.pptx)**
- 📖 **Slide Topics**:
  1. Team Introduction & Problem Statement
  2. Aim & Strategic Objectives
  3. Preview of Website (Stage 01 Journey Planner Interface)
  4. End-to-End User & System Workflow
  5. Full-Stack Technology Architecture
  6. Advantages & Disadvantages Evaluation
  7. Conclusion & Future Roadmap

---

## 🔒 Security & Environment Variables Notice
All sensitive database credentials, API tokens, and local cache files are strictly excluded from version control via `.gitignore`. Refer to [`.env.example`](./.env.example) to set up local environment variables safely.
