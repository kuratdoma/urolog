import asyncio
from app.db.session import SessionLocal
from app.models.patient import Hasta
from app.models.appointment import Randevu
from app.api.v1.endpoints.appointments import background_google_sync

async def test():
    try:
        await background_google_sync(1, 1)
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test())
