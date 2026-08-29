import asyncio
import sys
from sqlalchemy.future import select
from app.db.session import SessionLocal
from app.models.user import User
# Need to import passlib context to hash manually if security module has dependency issues or just import the helper
# security.py seems independent enough
from app.core.security import get_password_hash

async def reset_password(username, new_password):
    async with SessionLocal() as session:
        result = await session.execute(select(User).filter(User.username == username))
        user = result.scalars().first()
        if not user:
            print(f"User {username} not found.")
            return

        print(f"Resetting password for {username}...")
        user.hashed_password = get_password_hash(new_password)
        session.add(user)
        await session.commit()
        print(f"Password for {username} has been reset successfully.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python reset_password.py <username> <new_password>")
        sys.exit(1)
    
    username = sys.argv[1]
    new_password = sys.argv[2]
    asyncio.run(reset_password(username, new_password))
