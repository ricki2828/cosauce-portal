"""
Authentication Service for CoSauce Portal.
Handles password hashing, JWT generation/validation, and session management.
"""

from datetime import datetime, timedelta
from typing import Optional
import uuid
import hashlib
import bcrypt
from jose import JWTError, jwt
import aiosqlite
from pathlib import Path

from ..config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    DATA_DIR
)

DB_PATH = DATA_DIR / "portal.db"


class AuthService:
    """Service for authentication and authorization."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )

    @staticmethod
    def create_access_token(user_id: str, email: str, role: str) -> tuple[str, datetime]:
        """Create a JWT access token."""
        expires_at = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "sub": user_id,
            "email": email,
            "role": role,
            "exp": expires_at,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return token, expires_at

    @staticmethod
    def create_refresh_token(user_id: str) -> tuple[str, datetime]:
        """Create a JWT refresh token."""
        expires_at = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode = {
            "sub": user_id,
            "exp": expires_at,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return token, expires_at

    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except JWTError:
            return None

    @staticmethod
    def hash_token(token: str) -> str:
        """Create SHA256 hash of token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    async def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """Authenticate a user by email and password."""
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT id, email, name, password_hash, role, is_active
                FROM users
                WHERE email = ? AND is_active = 1
                """,
                (email,)
            )
            row = await cursor.fetchone()

            if not row:
                return None

            user = dict(row)

            # Verify password
            if not self.verify_password(password, user['password_hash']):
                return None

            # Update last login
            await db.execute(
                "UPDATE users SET last_login = datetime('now') WHERE id = ?",
                (user['id'],)
            )
            await db.commit()

            # Remove password hash from response
            del user['password_hash']
            return user

    async def create_session(
        self,
        user_id: str,
        token: str,
        expires_at: datetime,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Create a session record for a token."""
        session_id = str(uuid.uuid4())
        token_hash = self.hash_token(token)

        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """
                INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    user_id,
                    token_hash,
                    expires_at.isoformat(),
                    ip_address,
                    user_agent
                )
            )
            await db.commit()

        return session_id

    async def invalidate_session(self, token: str) -> bool:
        """Invalidate a session (logout)."""
        token_hash = self.hash_token(token)

        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                (token_hash,)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def validate_session(self, token: str) -> bool:
        """Check if a session is still valid."""
        token_hash = self.hash_token(token)

        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute(
                """
                SELECT id FROM sessions
                WHERE token_hash = ? AND datetime(expires_at) > datetime('now')
                """,
                (token_hash,)
            )
            row = await cursor.fetchone()
            return row is not None

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID."""
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT id, email, name, role, is_active, created_at, last_login
                FROM users
                WHERE id = ? AND is_active = 1
                """,
                (user_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def cleanup_expired_sessions(self):
        """Remove expired sessions from database."""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')"
            )
            await db.commit()
