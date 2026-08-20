from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

class SuccessResponse(BaseModel):
    success: bool = Field(default=True)
    message: str
    data: Any = Field(default=None)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ErrorResponse(BaseModel):
    success: bool = Field(default=False)
    message: str
    error_code: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
