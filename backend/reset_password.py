"""
Reset password for a CoSauce Portal user.
"""

import asyncio
import aiosqlite
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.services.auth_service import AuthService
from app.config import DATA_DIR

DB_PATH = DATA_DIR / "portal.db"
auth_service = AuthService()


async def reset_password(email: str, new_password: str):
    """Reset a user's password."""

    async with aiosqlite.connect(DB_PATH) as db:
        # Check if user exists
        cursor = await db.execute(
            "SELECT id, name FROM users WHERE email = ?",
            (email,)
        )
        user = await cursor.fetchone()

        if not user:
            print(f"❌ User with email {email} not found")
            return False

        user_id, name = user

        # Hash new password
        password_hash = auth_service.hash_password(new_password)

        # Update password
        await db.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (password_hash, user_id)
        )
        await db.commit()

        print(f"✅ Password reset successfully!")
        print(f"   User: {name}")
        print(f"   Email: {email}")
        print(f"   New password: {new_password}")

        return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Reset user password")
    parser.add_argument("email", help="User email address")
    parser.add_argument("password", help="New password")

    args = parser.parse_args()

    asyncio.run(reset_password(args.email, args.password))
