"""
User Management API endpoints for CoSauce Portal.
Admin-only endpoints for managing users.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import uuid
import aiosqlite
from typing import Optional

from ..services.auth_service import AuthService
from ..middleware.auth import get_current_admin
from ..config import DATA_DIR

router = APIRouter(prefix="/users", tags=["User Management"])
auth_service = AuthService()
DB_PATH = DATA_DIR / "portal.db"
VALID_ROLES = ["admin", "director", "viewer", "team_leader"]


# Request/Response Models
class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "viewer"  # admin, director, viewer, team_leader


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[int] = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: int
    created_at: str
    last_login: str | None


@router.get("", response_model=list[UserResponse])
async def list_users(current_user: dict = Depends(get_current_admin)):
    """
    List all users (admin only).
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, email, name, role, is_active, created_at, last_login
            FROM users
            ORDER BY created_at DESC
            """
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: CreateUserRequest,
    current_user: dict = Depends(get_current_admin)
):
    """
    Create a new user (admin only).
    """
    # Validate role
    if user_data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"
        )

    # Check if email already exists
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            (user_data.email,)
        )
        if await cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # Hash password
        password_hash = auth_service.hash_password(user_data.password)

        # Create user
        user_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO users (id, email, name, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, user_data.email, user_data.name, password_hash, user_data.role)
        )
        await db.commit()

        # Fetch created user
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, email, name, role, is_active, created_at, last_login
            FROM users
            WHERE id = ?
            """,
            (user_id,)
        )
        row = await cursor.fetchone()
        return dict(row)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """
    Get user details by ID (admin only).
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, email, name, role, is_active, created_at, last_login
            FROM users
            WHERE id = ?
            """,
            (user_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return dict(row)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    updates: UpdateUserRequest,
    current_user: dict = Depends(get_current_admin)
):
    """
    Update user details (admin only).
    """
    # Build update query
    update_fields = []
    params = []

    if updates.name is not None:
        update_fields.append("name = ?")
        params.append(updates.name)

    if updates.role is not None:
        if updates.role not in ["admin", "director", "viewer"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Must be one of: admin, director, viewer"
            )
        update_fields.append("role = ?")
        params.append(updates.role)

    if updates.is_active is not None:
        update_fields.append("is_active = ?")
        params.append(updates.is_active)

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    # Add updated_at
    update_fields.append("updated_at = datetime('now')")
    params.append(user_id)

    async with aiosqlite.connect(DB_PATH) as db:
        # Update user
        await db.execute(
            f"""
            UPDATE users
            SET {', '.join(update_fields)}
            WHERE id = ?
            """,
            params
        )
        await db.commit()

        # Fetch updated user
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, email, name, role, is_active, created_at, last_login
            FROM users
            WHERE id = ?
            """,
            (user_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return dict(row)


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """
    Deactivate a user (admin only).
    Does not delete, just sets is_active = 0.
    """
    # Prevent self-deactivation
    if user_id == current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )

    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?",
            (user_id,)
        )
        await db.commit()

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

    return {"message": "User deactivated successfully"}


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    reset_data: ResetPasswordRequest,
    current_user: dict = Depends(get_current_admin)
):
    """
    Reset a user's password (admin only).
    """
    # Hash new password
    password_hash = auth_service.hash_password(reset_data.new_password)

    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            UPDATE users
            SET password_hash = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (password_hash, user_id)
        )
        await db.commit()

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Invalidate all sessions for this user
        await db.execute(
            "DELETE FROM sessions WHERE user_id = ?",
            (user_id,)
        )
        await db.commit()

    return {"message": "Password reset successfully. User must login again."}
