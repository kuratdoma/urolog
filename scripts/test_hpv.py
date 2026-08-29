import asyncio
import sys
from pathlib import Path

# Add /app to sys.path since the package app is at /app
sys.path.append("/app")

from app.db.session import SessionLocal
from app.services.hpv_briefing_service import HPVBriefingService

async def main():
    patient_id = "bef68454-ac80-4c98-bc73-44785859f2b4"
    if len(sys.argv) > 1:
        patient_id = sys.argv[1]
    
    print(f"Testing HPV Briefing generation for patient: {patient_id}")
    service = HPVBriefingService()
    
    async with SessionLocal() as db:
        try:
            briefing = await service.generate_briefing(db, patient_id)
            print("SUCCESS! Generated briefing response:")
            print(briefing.model_dump_json(indent=2))
        except Exception as e:
            print("ERROR occurred during generation:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
