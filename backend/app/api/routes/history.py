from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.core.database import get_db
from app.services.history_service import HistoryService
from app.models.prediction import Prediction as PredictionLog
from app.utils.response import success_response, error_response

router = APIRouter(prefix="/history", tags=["Prediction History"])

@router.get("/predictions")
async def history_predictions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    source_type: str | None = Query(None),
    db: Session = Depends(get_db)
):
    try:
        res = HistoryService.get_prediction_history(page=page, limit=limit, source_type=source_type, db=db)
        return success_response("Prediction history fetched", res)
    except Exception as e:
        return error_response(str(e), "HISTORY_ERROR", 500)


@router.get("/analytics")
async def history_analytics(db: Session = Depends(get_db)):
    """Aggregate detection statistics for the analytics dashboard."""
    try:
        total = db.query(func.count(PredictionLog.id)).scalar() or 0

        # Counts by source type
        by_source = {}
        rows = db.query(PredictionLog.source_type, func.count(PredictionLog.id)).group_by(PredictionLog.source_type).all()
        for source, cnt in rows:
            by_source[source or "unknown"] = cnt

        # Average confidence
        avg_conf = db.query(func.avg(PredictionLog.confidence)).scalar()
        avg_conf = round(float(avg_conf), 4) if avg_conf else 0.0

        # Top 10 most detected signs
        top_signs_rows = (
            db.query(PredictionLog.sign_name, func.count(PredictionLog.id).label("count"))
            .filter(PredictionLog.sign_name.isnot(None))
            .group_by(PredictionLog.sign_name)
            .order_by(text("count DESC"))
            .limit(10)
            .all()
        )
        top_signs = [{"name": r[0], "count": r[1]} for r in top_signs_rows]

        # Detections per day (last 14 days)
        # func.date() is portable across MySQL (DATE()) and SQLite (date()),
        # unlike strftime() which is SQLite-only.
        daily_rows = (
            db.query(
                func.date(PredictionLog.created_at).label("day"),
                func.count(PredictionLog.id).label("count"),
            )
            .group_by(text("day"))
            .order_by(text("day DESC"))
            .limit(14)
            .all()
        )
        daily = [{"date": str(r[0]), "count": r[1]} for r in reversed(daily_rows)]

        # High-confidence detections (>= 80%)
        high_conf = db.query(func.count(PredictionLog.id)).filter(PredictionLog.confidence >= 0.8).scalar() or 0

        return success_response("Analytics fetched", {
            "total_predictions": total,
            "by_source": by_source,
            "average_confidence": avg_conf,
            "high_confidence_count": high_conf,
            "high_confidence_pct": round(high_conf / total * 100, 1) if total else 0,
            "top_signs": top_signs,
            "daily_activity": daily,
        })
    except Exception as e:
        return error_response(str(e), "ANALYTICS_ERROR", 500)
