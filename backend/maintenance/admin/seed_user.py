import asyncio
import sys
import os
import getpass
import argparse

# Add parent directory to path to allow importing app
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from sqlalchemy import select

async def create_user(email: str, full_name: str, password: str):
    print("Connecting to database...")
    async with SessionLocal() as db:
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"User {email} already exists. Updating password...")
            existing_user.hashed_password = get_password_hash(password)
            existing_user.is_active = True
            existing_user.is_superuser = True
        else:
            print(f"Creating new user {email}...")
            new_user = User(
                email=email,
                username="admin",
                hashed_password=get_password_hash(password),
                full_name=full_name,
                is_active=True,
                is_superuser=True
            )
            db.add(new_user)

        try:
            await db.commit()
            print("Operation successful!")
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed admin user")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--full-name", required=True, help="Admin full name")
    args = parser.parse_args()

    password = getpass.getpass(f"Password for {args.email}: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match.")
        sys.exit(1)

    asyncio.run(create_user(args.email, args.full_name, password))
