"""
Accident claim hub.
"""

from fastapi import APIRouter

from app.services import insurance_service
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/insurance", tags=["Accident Claim Hub"])


@router.get("/claim-hub")
async def claim_hub():
    """Everything the claim page needs — hotlines, what to do, what to photograph."""
    return success_response("Claim hub", insurance_service.claim_hub())


@router.get("/insurers")
async def insurers():
    """Motor claim hotlines. Numbers only where they could be confirmed."""
    return success_response("Insurers", {
        "insurers": insurance_service.INSURERS,
        "data_note": insurance_service.DATA_NOTE,
    })


@router.get("/photo-checklist")
async def photo_checklist():
    """What to photograph at the scene, in priority order."""
    return success_response("Photo checklist", {
        "checklist": insurance_service.PHOTO_CHECKLIST,
        "immediate_steps": insurance_service.IMMEDIATE_STEPS,
    })


@router.get("/insurers/{key}")
async def insurer(key: str):
    found = insurance_service.find_insurer(key)
    if not found:
        return error_response(f"No insurer with key '{key}'.", "NOT_FOUND", 404)
    return success_response("Insurer found", found)
