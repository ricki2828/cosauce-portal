"""
Seed initial admin user for CoSauce Portal.
Creates a default admin account for first-time setup.
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


async def seed_admin_user(
    email: str = "admin@cosauce.co",
    password: str = "ChangeMe123!",
    name: str = "Admin User"
):
    """Create an initial admin user."""

    async with aiosqlite.connect(DB_PATH) as db:
        # Check if user already exists
        cursor = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        )
        existing = await cursor.fetchone()

        if existing:
            print(f"❌ User with email {email} already exists")
            return False

        # Hash password
        password_hash = auth_service.hash_password(password)

        # Create admin user
        user_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO users (id, email, name, password_hash, role)
            VALUES (?, ?, ?, ?, 'admin')
            """,
            (user_id, email, name, password_hash)
        )
        await db.commit()

        print(f"✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   ⚠️  IMPORTANT: Change the password immediately after first login!")

        return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed initial admin user")
    parser.add_argument("--email", default="admin@cosauce.co", help="Admin email")
    parser.add_argument("--password", default="ChangeMe123!", help="Admin password")
    parser.add_argument("--name", default="Admin User", help="Admin name")

    args = parser.parse_args()

    asyncio.run(seed_admin_user(args.email, args.password, args.name))
