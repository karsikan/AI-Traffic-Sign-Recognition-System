from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.core.database import Base

class EmergencyLog(Base):
    __tablename__ = "emergency_logs"

    id = Column(Integer, primary_key=True, index=True)
    emergency_type = Column(String(40), nullable=False) # accident | medical | breakdown
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    nearest_hospital = Column(String(255), nullable=True)
    nearest_police = Column(String(255), nullable=True)
    nearest_petrol = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
