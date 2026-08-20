from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import TrafficSign
from app.schemas.schemas import TrafficSignOut

router = APIRouter(prefix="/api/signs", tags=["Traffic Sign Information"])


@router.get("", response_model=list[TrafficSignOut])
def list_signs(category: str | None = None, db: Session = Depends(get_db)):
    q = db.query(TrafficSign)
    if category:
        q = q.filter(TrafficSign.category == category)
    return q.order_by(TrafficSign.class_id).all()


@router.get("/{sign_id}", response_model=TrafficSignOut)
def get_sign(sign_id: int, db: Session = Depends(get_db)):
    sign = db.query(TrafficSign).filter(TrafficSign.id == sign_id).first()
    if not sign:
        raise HTTPException(status_code=404, detail="Sign not found")
    return sign
