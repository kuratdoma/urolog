from fastapi import APIRouter
from . import examinations, operations, media, communications, reports, lipus

router = APIRouter()
public_router = APIRouter()

@public_router.get("/version-check")
async def version_check():
    return {"version": "V2_WITH_PHOTOS", "status": "active"}

router.include_router(examinations.router)
router.include_router(operations.router)
router.include_router(media.router)
public_router.include_router(media.public_router)
router.include_router(communications.router)
router.include_router(reports.router)
router.include_router(lipus.router)
