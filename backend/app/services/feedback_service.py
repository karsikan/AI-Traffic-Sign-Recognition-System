from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.logging import logger
from app.models.prediction import Prediction
from app.models.feedback import Feedback

class FeedbackService:
    @staticmethod
    def submit_feedback(
        prediction_id: int,
        predicted_label: str | None,
        correct_label: str | None,
        comment: str | None,
        db: Session,
    ) -> dict:
        pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if not pred:
            raise HTTPException(status_code=404, detail=f"Prediction ID {prediction_id} not found.")

        try:
            fb = Feedback(
                prediction_id=prediction_id,
                predicted_label=predicted_label,
                correct_label=correct_label,
                comment=comment or (
                    f"Predicted '{predicted_label}' but correct is '{correct_label}'"
                    if predicted_label and correct_label else None
                ),
            )
            db.add(fb)
            db.commit()
            db.refresh(fb)
            logger.info(f"Feedback logged for prediction {prediction_id}: {predicted_label} → {correct_label}")
        except SQLAlchemyError as sql_err:
            db.rollback()
            logger.error(f"Failed to log feedback: {sql_err}")
            raise HTTPException(status_code=500, detail="Failed to write feedback to database.")

        return {
            "prediction_id": prediction_id,
            "predicted_label": predicted_label,
            "correct_label": correct_label,
            "comment": fb.comment,
        }
