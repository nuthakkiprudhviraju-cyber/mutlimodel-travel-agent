from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    hash_token,
    decode_token
)
from app.core.deps import get_current_user
from app.models.models import User, RefreshTokenSession, AuditEvent
from app.schemas.schemas import (
    UserCreate,
    UserLogin,
    UserOut,
    TokenResponse,
    UserPasswordChange
)

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate, response: Response, request: Request, db: Session = Depends(get_db)):
    """Register a new user account with secure password hashing."""
    normalized_email = user_in.email.strip().lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    user = User(
        email=normalized_email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role="USER",
        preferred_language=user_in.preferred_language
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create session & tokens
    session = RefreshTokenSession(
        user_id=user.id,
        token_hash="",
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    refresh_token = create_refresh_token(subject=user.id, session_id=session.id)
    session.token_hash = hash_token(refresh_token)
    
    # Audit log
    audit = AuditEvent(user_id=user.id, event_type="REGISTER", details="User registered successfully")
    db.add(audit)
    db.commit()

    access_token = create_access_token(subject=user.id, role=user.role)

    # Set secure HttpOnly cookie for refresh token
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, response: Response, request: Request, db: Session = Depends(get_db)):
    """Authenticate user with generic error response against user enumeration."""
    normalized_email = login_in.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Generic error message to prevent account enumeration
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    session = RefreshTokenSession(
        user_id=user.id,
        token_hash="",
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    refresh_token = create_refresh_token(subject=user.id, session_id=session.id)
    session.token_hash = hash_token(refresh_token)

    audit = AuditEvent(user_id=user.id, event_type="LOGIN", details="Successful login")
    db.add(audit)
    db.commit()

    access_token = create_access_token(subject=user.id, role=user.role)

    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user)
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Rotate refresh token and issue new access token. Revokes session family if token reuse is detected."""
    refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not refresh_token:
        # Check authorization header fallback for clients unable to use cookies in development
        auth_header = request.headers.get("x-refresh-token")
        if auth_header:
            refresh_token = auth_header
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not found"
            )

    try:
        payload = decode_token(refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    session_id = payload.get("sid")
    user_id = payload.get("sub")

    session = db.query(RefreshTokenSession).filter(RefreshTokenSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or not found")

    # Reuse detection
    if session.is_revoked:
        # Revoke all sessions for this user due to detected reuse!
        db.query(RefreshTokenSession).filter(RefreshTokenSession.user_id == user_id).update({"is_revoked": True})
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token reuse detected. All active sessions have been revoked."
        )

    # Verify token hash
    if session.token_hash != hash_token(refresh_token):
        session.is_revoked = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token mismatch. Session revoked.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account unavailable")

    # Revoke old session and issue new session (Token Rotation)
    session.is_revoked = True
    session.revoked_at = datetime.now(timezone.utc)

    new_session = RefreshTokenSession(
        user_id=user.id,
        token_hash="",
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    new_refresh_token = create_refresh_token(subject=user.id, session_id=new_session.id)
    new_session.token_hash = hash_token(new_refresh_token)
    db.commit()

    access_token = create_access_token(subject=user.id, role=user.role)

    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=new_refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user)
    )

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Revoke session and clear refresh cookie."""
    refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME) or request.headers.get("x-refresh-token")
    if refresh_token:
        try:
            payload = decode_token(refresh_token)
            session_id = payload.get("sid")
            session = db.query(RefreshTokenSession).filter(RefreshTokenSession.id == session_id).first()
            if session:
                session.is_revoked = True
                session.revoked_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass

    response.delete_cookie(key=settings.REFRESH_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return profile of current authenticated user."""
    return current_user

@router.post("/change-password")
def change_password(
    data: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user's password."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    
    current_user.hashed_password = get_password_hash(data.new_password)
    # Revoke other sessions on password change
    db.query(RefreshTokenSession).filter(RefreshTokenSession.user_id == current_user.id).update({"is_revoked": True})
    
    audit = AuditEvent(user_id=current_user.id, event_type="PASSWORD_CHANGE", details="Password changed successfully")
    db.add(audit)
    db.commit()

    return {"message": "Password changed successfully. All other sessions have been logged out."}
