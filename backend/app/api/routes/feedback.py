from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.feedback import FeedbackRequest
from app.services.feedback_service import FeedbackService
from app.utils.response import success_response, error_response

router = APIRouter(tags=["User Feedback"])

@router.post("/feedback")
async def submit_feedback(payload: FeedbackRequest, db: Session = Depends(get_db)):
    try:
        res = FeedbackService.submit_feedback(
            prediction_id=payload.prediction_id,
            predicted_label=payload.predicted_label,
            correct_label=payload.correct_label,
            comment=payload.comment,
            db=db,
        )
        return success_response("Feedback submitted successfully", res)
    except Exception as e:
        if hasattr(e, "status_code"):
            return error_response(getattr(e, "detail", str(e)), "FEEDBACK_ERROR", getattr(e, "status_code"))
        return error_response(str(e), "SERVER_ERROR", 500)
