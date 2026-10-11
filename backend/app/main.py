import os
import sys

# Ensure 'backend/' root directory is in sys.path for Vercel serverless Python runtime
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.db.seed import seed_database
from app.api.v1.endpoints import auth, trips, disruptions, bookings, notifications, demo

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json"
)

# CORS Middleware with strict origin settings + Vercel domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS + [
        "https://mutlimodel-travel-agent.vercel.app",
        "https://traveltech-plum.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_db_initialized = False

@app.middleware("http")
async def ensure_db_seeded(request, call_next):
    global _db_initialized
    if not _db_initialized and request.method != "OPTIONS" and not request.url.path.endswith("/health"):
        try:
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                seed_database(db)
            finally:
                db.close()
            _db_initialized = True
        except Exception as e:
            print(f"Database init warning: {e}")
    return await call_next(request)

# Health endpoints
@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "TBS RoamAgent",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

@app.get("/api/v1/ready", tags=["Health"])
def readiness_check():
    return {"status": "ready", "database": "connected"}

# Include API v1 Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(trips.router, prefix="/api/v1/trips", tags=["Trips"])
app.include_router(disruptions.router, prefix="/api/v1/disruptions", tags=["Disruptions"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["Bookings"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(demo.router, prefix="/api/v1/demo", tags=["Demo Management"])
