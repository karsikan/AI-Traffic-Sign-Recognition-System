from sqlalchemy import Column, Integer, String, Text
from app.core.database import Base

class TrafficSign(Base):
    __tablename__ = "traffic_signs"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, index=True)              # GTSRB / model class id
    name = Column(String(150), nullable=False)
    category = Column(String(80))                        # warning | prohibitory | mandatory | info
    meaning = Column(Text)
    safety_instruction = Column(Text)
    traffic_rule = Column(Text)
    image_path = Column(String(255))
