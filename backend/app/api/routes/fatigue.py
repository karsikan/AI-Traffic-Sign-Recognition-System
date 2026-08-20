"""
Driver fatigue and distraction detection.

The frontend grabs a webcam frame every few hundred milliseconds and posts it here. Each
frame is analysed against the rolling state for that session and thrown away.
"""

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, UploadFile

from app.services import fatigue_service
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/fatigue", tags=["Driver Fatigue Detection"])


@router.get("/config")
async def config():
    """Thresholds, method and limitations — the page explains itself from this."""
    return success_response("Fatigue detection configuration", fatigue_service.thresholds())


@router.post("/analyze")
async def analyze(
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    """One webcam frame in, a drowsiness/distraction verdict out."""
    if file.content_type and not file.content_type.startswith("image/"):
        return error_response("Expected an image frame.", "INVALID_FILE_TYPE", 400)

    try:
        content = await file.read()
        frame = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return error_response("Could not decode the frame.", "BAD_FRAME", 400)

        result = fatigue_service.analyse_frame(session_id, frame)
        return success_response("Frame analysed", result)
    except FileNotFoundError:
        return error_response(
            "Face landmark model missing. Expected app/ml/weights/face_landmarker.task.",
            "MODEL_MISSING", 503,
        )
    except Exception as e:
        return error_response(str(e), "FATIGUE_ERROR", 500)


@router.post("/reset")
async def reset(session_id: str = Form(...)):
    """Clear the rolling state — used when the driver restarts monitoring."""
    fatigue_service.reset_session(session_id)
    return success_response("Session reset", {"session_id": session_id})
