from fastapi import APIRouter
from pydantic import BaseModel
from app.schemas.assistant import ChatRequest, TranslateRequest
from app.services.gemini_service import ask_assistant, translate_text, translate_batch
from app.utils.response import success_response, error_response


class BatchTranslateRequest(BaseModel):
    texts: list[str]
    target_language: str

router = APIRouter(prefix="/assistant", tags=["AI Road Assistant"])

@router.post("/chat")
async def assistant_chat(payload: ChatRequest):
    try:
        reply = ask_assistant(payload.message, payload.language, payload.context_type)
        return success_response(
            message="Assistant response generated",
            data={
                "user_message": payload.message,
                "reply": reply,
                "language": payload.language,
                "context_type": payload.context_type
            }
        )
    except Exception as e:
        return error_response(str(e), "ASSISTANT_ERROR", 500)

@router.post("/translate")
async def assistant_translate(payload: TranslateRequest):
    try:
        translated = translate_text(payload.text, payload.target_language)
        return success_response(
            message="Translation completed",
            data={
                "original_text": payload.text,
                "translated_text": translated,
                "target_language": payload.target_language
            }
        )
    except Exception as e:
        return error_response(str(e), "TRANSLATION_ERROR", 500)


@router.post("/translate/batch")
async def assistant_translate_batch(payload: BatchTranslateRequest):
    try:
        results = translate_batch(payload.texts, payload.target_language)
        return success_response(
            message="Batch translation completed",
            data={
                "translations": results,
                "target_language": payload.target_language,
            }
        )
    except Exception as e:
        return error_response(str(e), "TRANSLATION_ERROR", 500)
