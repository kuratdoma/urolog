import asyncio
import sys
from sqlalchemy.future import select
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def create_user(username, password):
    async with SessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(User).filter(User.username == username))
        existing_user = result.scalars().first()
        
        if existing_user:
            print(f"User '{username}' already exists. Updating password...")
            existing_user.hashed_password = get_password_hash(password)
            existing_user.is_active = True
            session.add(existing_user)
        else:
            print(f"Creating new user '{username}'...")
            new_user = User(
                username=username,
                hashed_password=get_password_hash(password),
                full_name="Alp",
                role="DOCTOR",
                is_active=True,
                is_superuser=True
            )
            session.add(new_user)
        
        await session.commit()
        print(f"User '{username}' processed successfully.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_user.py <username> <password>")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    asyncio.run(create_user(username, password))
