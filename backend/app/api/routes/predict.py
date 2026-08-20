from fastapi import APIRouter, Depends, File, UploadFile
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.pipeline_service import PipelineService
from app.utils.response import success_response, error_response

router = APIRouter(prefix="/predict", tags=["Prediction Pipeline"])

@router.post("/image")
async def predict_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename:
        return error_response("Uploaded file is empty.", "EMPTY_UPLOAD", 400)
    if file.content_type and not file.content_type.startswith("image/"):
        return error_response("Invalid file type. Please upload an image.", "INVALID_FILE_TYPE", 400)
    try:
        content = await file.read()
        res = PipelineService.run_image_prediction(content, file.filename, db)
        return success_response("Prediction completed successfully", res)
    except Exception as e:
        if hasattr(e, "status_code"):
            status = getattr(e, "status_code")
            detail = getattr(e, "detail", str(e))
            if status == 404:
                return error_response(detail, "NO_SIGN_FOUND", 404)
            return error_response(detail, "PREDICTION_ERROR", status)
        return error_response(str(e), "SERVER_ERROR", 500)

@router.post("/video")
async def predict_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename:
        return error_response("Uploaded video file is empty.", "EMPTY_UPLOAD", 400)
    if file.content_type and not file.content_type.startswith("video/"):
        return error_response("Invalid file type. Please upload a video.", "INVALID_FILE_TYPE", 400)
    try:
        content = await file.read()
        res = PipelineService.run_video_prediction(content, file.filename, db)
        return success_response("Video prediction completed successfully", res)
    except Exception as e:
        if hasattr(e, "status_code"):
            status = getattr(e, "status_code")
            detail = getattr(e, "detail", str(e))
            if status == 404:
                return error_response(detail, "NO_SIGN_FOUND", 404)
            return error_response(detail, "PREDICTION_ERROR", status)
        return error_response(str(e), "SERVER_ERROR", 500)

@router.post("/webcam")
async def predict_webcam(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename:
        return error_response("Uploaded webcam frame is empty.", "EMPTY_UPLOAD", 400)
    try:
        content = await file.read()
        res = PipelineService.run_webcam_prediction(content, db)
        return success_response("Webcam frame processed successfully", res)
    except Exception as e:
        if hasattr(e, "status_code"):
            status = getattr(e, "status_code")
            detail = getattr(e, "detail", str(e))
            if status == 404:
                return error_response(detail, "NO_SIGN_FOUND", 404)
            return error_response(detail, "PREDICTION_ERROR", status)
        return error_response(str(e), "SERVER_ERROR", 500)

@router.post("/batch")
async def predict_batch(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    """Process up to 10 images in one request — returns combined results."""
    if len(files) > 10:
        return error_response("Maximum 10 images per batch.", "BATCH_LIMIT", 400)
    results = []
    for f in files:
        try:
            content = await f.read()
            res = PipelineService.run_image_prediction(content, f.filename or "batch.jpg", db)
            results.append({"filename": f.filename, "success": True, "result": res})
        except Exception as e:
            results.append({"filename": f.filename, "success": False, "error": str(e)})
    return success_response("Batch prediction completed", {"items": results, "total": len(results)})
