from typing import Optional
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    context_type: Optional[str] = None

class ChatData(BaseModel):
    user_message: str
    reply: str
    language: str

class TranslateRequest(BaseModel):
    text: str
    target_language: str

class TranslateData(BaseModel):
    original_text: str
    translated_text: str
    target_language: str
