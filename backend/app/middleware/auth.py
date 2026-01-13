"""
Authentication Middleware for CoSauce Portal.
Provides FastAPI dependencies for JWT validation and role-based access control.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..services.auth_service import AuthService

# Security scheme for JWT bearer tokens
security = HTTPBearer()

# Initialize auth service
auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency to get the current authenticated user from JWT token.
    Raises HTTPException if token is invalid or expired.
    """
    token = credentials.credentials

    # Decode and validate token
    payload = auth_service.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate session still exists
    if not await auth_service.validate_session(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    user_id = payload.get("sub")
    user = await auth_service.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Dependency to require admin role.
    Raises HTTPException if user is not an admin.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def get_current_director(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Dependency to require director or admin role.
    Raises HTTPException if user is not a director or admin.
    """
    if current_user.get("role") not in ["director", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Director or admin access required"
        )
    return current_user


async def get_current_team_leader(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Dependency to require team_leader role (or higher).
    Raises HTTPException if user is not a team leader, director, or admin.
    """
    if current_user.get("role") not in ["team_leader", "director", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team leader access required"
        )
    return current_user


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP address from request."""
    # Check X-Forwarded-For header (set by proxies)
    if forwarded := request.headers.get("X-Forwarded-For"):
        return forwarded.split(",")[0].strip()
    # Check X-Real-IP header
    if real_ip := request.headers.get("X-Real-IP"):
        return real_ip
    # Fall back to direct client
    return request.client.host if request.client else None


def get_user_agent(request: Request) -> Optional[str]:
    """Extract user agent from request."""
    return request.headers.get("User-Agent")
