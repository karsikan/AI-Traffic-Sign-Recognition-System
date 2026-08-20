from sqlalchemy.orm import Session
from app.models.prediction import Prediction

class HistoryService:
    @staticmethod
    def get_prediction_history(page: int, limit: int, source_type: str | None, db: Session) -> dict:
        q = db.query(Prediction)
        if source_type:
            q = q.filter(Prediction.source_type == source_type)
            
        total = q.count()
        
        # Paginate
        offset = (page - 1) * limit
        items = q.order_by(Prediction.created_at.desc()).offset(offset).limit(limit).all()
        
        results = []
        for it in items:
            created_at_str = ""
            if it.created_at:
                if hasattr(it.created_at, "isoformat"):
                    created_at_str = it.created_at.isoformat()
                else:
                    created_at_str = str(it.created_at)
            
            results.append({
                "id": it.id,
                "sign_name": it.sign_name,
                "confidence": it.confidence,
                "source_type": it.source_type,
                "created_at": created_at_str
            })
            
        return {
            "items": results,
            "total": total
        }
