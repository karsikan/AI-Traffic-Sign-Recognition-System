from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth / User ----------
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    preferred_language: str = "en"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    preferred_language: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    preferred_language: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Traffic signs ----------
class TrafficSignOut(BaseModel):
    id: int
    class_id: int
    name: str
    category: Optional[str]
    meaning: Optional[str]
    safety_instruction: Optional[str]
    traffic_rule: Optional[str]
    image_path: Optional[str]

    class Config:
        from_attributes = True


# ---------- Predictions ----------
class DetectionBox(BaseModel):
    label: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    category: Optional[str] = None
    meaning: Optional[str] = None


class PredictionResult(BaseModel):
    source_type: str
    detections: List[DetectionBox]
    annotated_image: Optional[str] = None  # base64 or url


class PredictionOut(BaseModel):
    id: int
    source_type: str
    media_path: Optional[str]
    detected_name: Optional[str]
    confidence: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Feedback ----------
class FeedbackCreate(BaseModel):
    prediction_id: int
    predicted_label: str
    correct_label: str
    comment: Optional[str] = None


class FeedbackOut(FeedbackCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Emergency ----------
class EmergencyCreate(BaseModel):
    emergency_type: str
    latitude: float
    longitude: float
    description: Optional[str] = None


class EmergencyOut(BaseModel):
    id: int
    emergency_type: str
    latitude: float
    longitude: float
    nearest_hospital: Optional[str]
    nearest_police: Optional[str]
    guidance: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Nearby services ----------
class NearbyQuery(BaseModel):
    latitude: float
    longitude: float
    service_type: str
    radius: int = 5000


# ---------- Fine calculator ----------
class FineRequest(BaseModel):
    offence: str
    amount_lkr: float
    target_currency: str = "USD"


class FineResponse(BaseModel):
    offence: str
    amount_lkr: float
    target_currency: str
    converted_amount: float
    exchange_rate: float


# ---------- Chat ----------
class ChatRequest(BaseModel):
    question: str
    language: str = "en"


class ChatResponse(BaseModel):
    answer: str
    language: str


class TranslateRequest(BaseModel):
    text: str
    target_language: str  # en | ta | si


# ---------- Analytics ----------
class AnalyticsOut(BaseModel):
    total_detections: int
    total_users: int
    most_detected: List[dict]
    detections_by_day: List[dict]
    average_confidence: float
    accuracy_rate: float
    wrong_predictions_count: int
