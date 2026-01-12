"""
Authentication API endpoints for CoSauce Portal.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr

from ..services.auth_service import AuthService
from ..middleware.auth import (
    get_current_user,
    get_client_ip,
    get_user_agent,
    security
)
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["Authentication"])
auth_service = AuthService()


# Request/Response Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: int
    created_at: str
    last_login: str | None


@router.post("/login", response_model=LoginResponse)
async def login(request: Request, credentials: LoginRequest):
    """
    Authenticate user and return access and refresh tokens.
    """
    # Authenticate user
    user = await auth_service.authenticate_user(
        credentials.email,
        credentials.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate tokens
    access_token, access_expires = auth_service.create_access_token(
        user['id'],
        user['email'],
        user['role']
    )
    refresh_token, refresh_expires = auth_service.create_refresh_token(user['id'])

    # Create session for access token
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    await auth_service.create_session(
        user['id'],
        access_token,
        access_expires,
        ip_address,
        user_agent
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Invalidate the current session (logout).
    """
    token = credentials.credentials
    success = await auth_service.invalidate_session(token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session not found or already expired"
        )

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information.
    """
    return current_user


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: Request, refresh_req: RefreshRequest):
    """
    Generate a new access token using a refresh token.
    """
    # Decode refresh token
    payload = auth_service.decode_token(refresh_req.refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token type
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user
    user_id = payload.get("sub")
    user = await auth_service.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate new access token
    access_token, access_expires = auth_service.create_access_token(
        user['id'],
        user['email'],
        user['role']
    )

    # Create session for new access token
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    await auth_service.create_session(
        user['id'],
        access_token,
        access_expires,
        ip_address,
        user_agent
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
