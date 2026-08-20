from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.core.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    media_path = Column(String(255), nullable=True)
    sign_name = Column(String(150), nullable=False)
    confidence = Column(Float, nullable=False)
    source_type = Column(String(20), nullable=False) # image | video | webcam
    created_at = Column(DateTime, default=datetime.utcnow)
