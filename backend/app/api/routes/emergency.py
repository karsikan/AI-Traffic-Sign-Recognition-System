from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.emergency import EmergencyRequest
from app.services.emergency_service import EmergencyService
from app.utils.response import success_response, error_response

router = APIRouter(prefix="/emergency", tags=["Emergency Services"])

@router.post("/help")
async def emergency_help(payload: EmergencyRequest, db: Session = Depends(get_db)):
    try:
        desc = payload.description or ""
        res = EmergencyService.generate_emergency_help(
            emergency_type=payload.emergency_type,
            lat=payload.latitude,
            lon=payload.longitude,
            description=desc,
            db=db
        )
        return success_response("Emergency assistance generated", res)
    except Exception as e:
        if hasattr(e, "status_code"):
            return error_response(getattr(e, "detail", str(e)), "EMERGENCY_ERROR", getattr(e, "status_code"))
        return error_response(str(e), "SERVER_ERROR", 500)
