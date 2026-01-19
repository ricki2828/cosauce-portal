#!/usr/bin/env python3
"""
Admin Account Management Script
List admin users and reset passwords
"""
import asyncio
import aiosqlite
import bcrypt
from pathlib import Path
import getpass

DB_PATH = Path(__file__).parent.parent / "data" / "portal.db"


async def list_all_users():
    """List all users in the database"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT id, email, name, role, is_active, created_at, last_login
            FROM users
            ORDER BY role, email
        """)
        users = await cursor.fetchall()

        if not users:
            print("❌ No users found in the database!")
            return []

        print("\n" + "=" * 80)
        print("ALL USERS IN DATABASE")
        print("=" * 80)

        for i, user in enumerate(users, 1):
            print(f"\n{i}. {user['name']}")
            print(f"   Email: {user['email']}")
            print(f"   Role: {user['role']}")
            print(f"   Active: {'Yes' if user['is_active'] else 'No'}")
            print(f"   ID: {user['id']}")
            print(f"   Created: {user['created_at']}")
            print(f"   Last Login: {user['last_login'] or 'Never'}")

        print("\n" + "=" * 80)
        return users


async def reset_password(email: str, new_password: str):
    """Reset a user's password"""
    # Hash the password
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    async with aiosqlite.connect(DB_PATH) as db:
        # Check if user exists
        cursor = await db.execute(
            "SELECT id, name, email, role FROM users WHERE email = ?",
            (email,)
        )
        user = await cursor.fetchone()

        if not user:
            print(f"\n❌ User with email '{email}' not found!")
            return False

        # Update password
        await db.execute(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = ?",
            (password_hash, email)
        )
        await db.commit()

        # Delete all sessions for this user (force re-login)
        await db.execute(
            "DELETE FROM sessions WHERE user_id = ?",
            (user[0],)
        )
        await db.commit()

        print(f"\n✅ Password reset successfully for {user[1]} ({email})")
        print(f"   Role: {user[3]}")
        print(f"   All existing sessions have been invalidated.")
        return True


async def create_admin_user(email: str, name: str, password: str):
    """Create a new admin user"""
    # Hash the password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    async with aiosqlite.connect(DB_PATH) as db:
        # Check if user already exists
        cursor = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        )
        existing = await cursor.fetchone()

        if existing:
            print(f"\n❌ User with email '{email}' already exists!")
            return False

        # Create user
        import uuid
        user_id = str(uuid.uuid4())

        await db.execute(
            """
            INSERT INTO users (id, email, name, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, 'admin', 1)
            """,
            (user_id, email, name, password_hash)
        )
        await db.commit()

        print(f"\n✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Name: {name}")
        print(f"   Role: admin")
        print(f"   ID: {user_id}")
        return True


async def main():
    print("=" * 80)
    print("CoSauce Portal - Admin Account Management")
    print("=" * 80)
    print()

    # List all users first
    users = await list_all_users()

    if not users:
        print("\nNo users exist. Let's create an admin user.")
        create_new = True
    else:
        print("\nWhat would you like to do?")
        print("  1. Reset password for existing user")
        print("  2. Create new admin user")
        print("  3. Exit")
        print()

        choice = input("Enter choice (1-3): ").strip()

        if choice == "3":
            print("Exiting...")
            return

        create_new = (choice == "2")

    if create_new:
        print("\n" + "=" * 80)
        print("CREATE NEW ADMIN USER")
        print("=" * 80)

        email = input("Email address: ").strip()
        name = input("Full name: ").strip()
        password = getpass.getpass("Password: ")
        password_confirm = getpass.getpass("Confirm password: ")

        if password != password_confirm:
            print("\n❌ Passwords do not match!")
            return

        if len(password) < 6:
            print("\n❌ Password must be at least 6 characters!")
            return

        await create_admin_user(email, name, password)

    else:
        print("\n" + "=" * 80)
        print("RESET PASSWORD")
        print("=" * 80)

        email = input("\nEmail address of user: ").strip()
        password = getpass.getpass("New password: ")
        password_confirm = getpass.getpass("Confirm new password: ")

        if password != password_confirm:
            print("\n❌ Passwords do not match!")
            return

        if len(password) < 6:
            print("\n❌ Password must be at least 6 characters!")
            return

        await reset_password(email, password)

    print()


if __name__ == "__main__":
    asyncio.run(main())
