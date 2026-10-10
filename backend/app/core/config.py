import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TBS RoamAgent — Multimodal AI Travel Concierge"
    API_V1_STR: str = "/api/v1"
    
    # Security & JWT
    JWT_SECRET_KEY: str = "tbs-roamagent-dev-super-secure-jwt-secret-key-replace-in-prod-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Increased to 30 mins
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Cookie Configuration
    REFRESH_COOKIE_NAME: str = "roamagent_refresh"
    COOKIE_SECURE: bool = False  # Set to True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"
    
    # Database
    DATABASE_URL: str = "sqlite:///./roamagent.db"
    
    # Google Gemini AI
    GEMINI_API_KEY: Optional[str] = None
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Environment
    ENVIRONMENT: str = "development"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
