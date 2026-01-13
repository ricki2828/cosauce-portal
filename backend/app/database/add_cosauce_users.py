"""
Add CoSauce directors to the portal.
Creates user accounts for CoSauce directors with standard password.
"""

import asyncio
import aiosqlite
import uuid
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.services.auth_service import AuthService
from app.config import DATA_DIR

DB_PATH = DATA_DIR / "portal.db"
auth_service = AuthService()

# User data
USERS = [
    {"email": "chaz@cosauce.co", "name": "Chaz", "role": "director"},
    {"email": "serkan@cosauce.co", "name": "Serkan", "role": "director"},
    {"email": "laura@cosauce.co", "name": "Laura", "role": "director"},
    {"email": "trev@cosauce.co", "name": "Trev", "role": "director"},
    {"email": "yise@cosauce.co", "name": "Yise", "role": "director"},
    {"email": "koli@cosauce.co", "name": "Koli", "role": "director"},
]

SHARED_PASSWORD = "C05@uc3"


async def add_user(email: str, name: str, password: str, role: str):
    """Add a single user to the database."""

    async with aiosqlite.connect(DB_PATH) as db:
        # Check if user already exists
        cursor = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        )
        existing = await cursor.fetchone()

        if existing:
            print(f"⚠️  {email} - Already exists, skipping")
            return False

        # Hash password
        password_hash = auth_service.hash_password(password)

        # Create user
        user_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO users (id, email, name, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, email, name, password_hash, role)
        )
        await db.commit()

        print(f"✅ {email} - Created successfully (role: {role})")
        return True


async def add_all_users():
    """Add all CoSauce users."""
    print("=" * 60)
    print("Adding CoSauce Portal Users")
    print("=" * 60)
    print(f"Shared password: {SHARED_PASSWORD}")
    print()

    created_count = 0
    skipped_count = 0

    for user_data in USERS:
        success = await add_user(
            email=user_data["email"],
            name=user_data["name"],
            password=SHARED_PASSWORD,
            role=user_data["role"]
        )
        if success:
            created_count += 1
        else:
            skipped_count += 1

    print()
    print("=" * 60)
    print(f"Summary: {created_count} created, {skipped_count} skipped")
    print("=" * 60)

    if created_count > 0:
        print()
        print("⚠️  IMPORTANT: Users should change their password after first login!")


if __name__ == "__main__":
    asyncio.run(add_all_users())
