from typing import Optional
from pydantic import BaseModel

class FeedbackRequest(BaseModel):
    prediction_id: int
    predicted_label: Optional[str] = None
    correct_label: Optional[str] = None
    comment: Optional[str] = None

class FeedbackData(BaseModel):
    prediction_id: int
    predicted_label: Optional[str] = None
    correct_label: Optional[str] = None
    comment: Optional[str] = None
