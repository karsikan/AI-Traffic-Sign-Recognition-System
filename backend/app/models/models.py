from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    preferred_language = Column(String(10), default="en")  # en | ta | si
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    predictions = relationship("Prediction", back_populates="user")
    feedback = relationship("Feedback", back_populates="user")
    emergencies = relationship("EmergencyLog", back_populates="user")
    fines = relationship("FineCalculation", back_populates="user")
    chats = relationship("ChatHistory", back_populates="user")


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


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    sign_id = Column(Integer, ForeignKey("traffic_signs.id"), nullable=True)
    source_type = Column(String(20))                     # image | video | webcam
    media_path = Column(String(255))
    detected_name = Column(String(150))
    confidence = Column(Float)
    detection_model = Column(String(40), default="yolov8")
    classification_model = Column(String(40), default="resnet50")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="predictions")
    sign = relationship("TrafficSign")
    feedback = relationship("Feedback", back_populates="prediction")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    prediction_id = Column(Integer, ForeignKey("predictions.id"))
    predicted_label = Column(String(150))
    correct_label = Column(String(150))
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="feedback")
    prediction = relationship("Prediction", back_populates="feedback")


class EmergencyLog(Base):
    __tablename__ = "emergency_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    emergency_type = Column(String(40))                  # accident | medical | breakdown
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    nearest_hospital = Column(String(255))
    nearest_police = Column(String(255))
    guidance = Column(Text, nullable=True)
    status = Column(String(20), default="reported")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="emergencies")


class NearbyService(Base):
    __tablename__ = "nearby_services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200))
    service_type = Column(String(40))   # petrol|hospital|police|garage|restaurant|pharmacy
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String(255))
    phone = Column(String(40))


class FineCalculation(Base):
    __tablename__ = "fine_calculations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    offence = Column(String(150))
    amount_lkr = Column(Float)
    target_currency = Column(String(10))
    converted_amount = Column(Float)
    exchange_rate = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="fines")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    language = Column(String(10), default="en")
    question = Column(Text)
    answer = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chats")
