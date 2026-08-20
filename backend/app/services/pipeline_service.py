import os
import uuid
import cv2
import numpy as np
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.prediction import Prediction
from app.models.traffic_sign import TrafficSign
from app.ml.pipeline import run_pipeline
from app.services.gemini_service import get_sign_explanation, generate_emergency_guidance, detect_signs_in_image


def _decode_image(image_bytes: bytes) -> np.ndarray | None:
    """
    Decode image bytes to a BGR numpy array, correctly handling:
    - PNG with transparency (RGBA) — alpha channel composited onto white background
    - Standard JPEG/PNG/BMP
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    # Try loading with alpha channel first
    img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if img is None:
        return None
    # If RGBA (4 channels), composite the alpha onto a white background
    if img.ndim == 3 and img.shape[2] == 4:
        alpha = img[:, :, 3:4].astype(np.float32) / 255.0
        rgb = img[:, :, :3].astype(np.float32)
        white = np.ones_like(rgb) * 255.0
        composited = (rgb * alpha + white * (1 - alpha)).astype(np.uint8)
        return composited  # BGR already
    # Grayscale → convert to BGR
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    return img


def _enrich_detection(det: dict, db: Session) -> dict:
    """Enrich a raw detection dict with meaning & category from DB, then Gemini if needed."""
    sign_name = det.get("sign_name", det.get("label", "Unknown Sign"))
    # Gemini Vision may already supply a meaning — use it as the starting fallback
    meaning = det.get("meaning") or ""
    safety_advice = "Proceed with caution."
    category = "general"

    local_sign = db.query(TrafficSign).filter(TrafficSign.name == sign_name).first()
    if local_sign:
        meaning = local_sign.meaning or meaning
        safety_advice = local_sign.safety_instruction or safety_advice
        category = local_sign.category or category

    # Only call Gemini for meaning if we still have nothing (avoids extra API call when
    # Gemini Vision already gave us the meaning during classification)
    if not meaning:
        meaning = get_sign_explanation(sign_name)

    if not meaning:
        meaning = f"Obey rules related to the '{sign_name}' sign."

    confidence = det.get("confidence", 0.0)
    if confidence > 1.0:
        confidence = round(confidence / 100.0, 4)

    return {
        "label": sign_name,
        "sign_name": sign_name,
        "class_id": det.get("class_id", 0),
        "confidence": confidence,
        "meaning": meaning,
        "safety_advice": safety_advice,
        "category": category,
        "bbox": det.get("bbox", []),
        # Both producers stamp this themselves (ml/pipeline.py and gemini_service).
        # Anything that reaches here without it is genuinely unattributed — saying
        # "resnet50" would be claiming a model ran when it may not have.
        "classified_by": det.get("classified_by", "unknown"),
    }


# Above this, a whole-image ResNet50 reading is trustworthy enough to use instead of
# asking Gemini. Measured on this checkpoint: tightly cropped signs score 0.95–1.00,
# while full street scenes — where the classifier is looking at road and sky as much as
# at a sign — score 0.10–0.24. Nothing observed lands between, so the gap is wide.
_FULL_IMAGE_RESNET_MIN_CONFIDENCE = 0.80


def _classify_whole_image(image) -> list:
    """
    Read the entire image as though it were one sign crop.

    Reached when the detector finds no box. An already-cropped sign — a GTSRB test file,
    a screenshot of a single sign — gives YOLO nothing to locate, but it is exactly what
    the classifier was trained on, and the classifier is both local and measured. Trying
    it before the network call keeps those images on the model this project can vouch for.
    Returns [] when the reading is weak, which is what a genuine street scene produces.
    """
    try:
        from PIL import Image as PILImage

        from app.ml.inference import classify_crop

        # `image` is the BGR numpy array _decode_image produces; the classifier wants a
        # PIL image in RGB, so reverse the channel order rather than handing it BGR and
        # quietly classifying colour-swapped signs.
        if isinstance(image, np.ndarray):
            array = image[:, :, ::-1] if image.ndim == 3 else image
            image = PILImage.fromarray(array)

        sign_name, confidence = classify_crop(image)
    except Exception as e:
        logger.warning(f"Whole-image ResNet50 reading failed: {e}")
        return []

    if not sign_name or not confidence or confidence < _FULL_IMAGE_RESNET_MIN_CONFIDENCE:
        return []

    logger.info(f"Whole-image ResNet50 read '{sign_name}' at {confidence:.3f}.")
    return [{
        "sign_name": sign_name,
        "confidence": float(confidence),
        "bbox": [],
        "classified_by": "resnet50",
    }]


class PipelineService:
    @staticmethod
    def run_image_prediction(image_bytes: bytes, file_name: str, db: Session) -> dict:
        os.makedirs("uploads/images", exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}_{file_name}"
        save_path = os.path.join("uploads/images", unique_name)

        with open(save_path, "wb") as f:
            f.write(image_bytes)

        image = _decode_image(image_bytes)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        # Stage 1: YOLO finds bounding boxes, Gemini Vision classifies each crop
        # Stage 2 fallback: if YOLO is missing, Gemini Vision scans the full image
        engine = "yolov8+gemini-vision"
        try:
            raw_detections = run_pipeline(image)
            # Determine actual engine used based on detections
            if raw_detections:
                engines_used = set(d.get("classified_by", "resnet50") for d in raw_detections)
                if engines_used == {"gemini"}:
                    engine = "yolov8+gemini-vision"
                elif engines_used == {"resnet50"}:
                    engine = "yolov8+resnet50"
                else:
                    engine = "yolov8+gemini-vision"
            # If YOLO found nothing at all, read the whole image as one sign before
            # falling through to Gemini — see _classify_whole_image.
            if not raw_detections:
                raw_detections = _classify_whole_image(image)
                engine = "resnet50-full-image"

            if not raw_detections:
                logger.info("YOLO found no boxes — running full-image Gemini Vision scan.")
                raw_detections = detect_signs_in_image(image_bytes)
                engine = "gemini-vision"
        except RuntimeError as e:
            logger.warning(f"YOLO unavailable ({e}), reading whole image instead.")
            raw_detections = _classify_whole_image(image)
            engine = "resnet50-full-image"
            if not raw_detections:
                raw_detections = detect_signs_in_image(image_bytes)
                engine = "gemini-vision"

        if not raw_detections:
            # Return success with empty list — frontend handles the "no sign found" display
            return {
                "demo_mode": False,
                "engine": engine,
                "source": "image",
                "file_name": file_name,
                "prediction_id": None,
                "detections": [],
            }

        enriched = []
        last_prediction_id = None
        for det in raw_detections:
            item = _enrich_detection(det, db)
            enriched.append(item)

            record = Prediction(
                media_path=save_path,
                sign_name=item["sign_name"],
                confidence=item["confidence"],
                source_type="image",
            )
            db.add(record)
            db.flush()
            last_prediction_id = record.id

        db.commit()

        return {
            "demo_mode": False,
            "engine": engine,
            "source": "image",
            "file_name": file_name,
            "prediction_id": last_prediction_id,
            "detections": enriched,
        }

    @staticmethod
    def run_video_prediction(video_bytes: bytes, file_name: str, db: Session) -> dict:
        os.makedirs("uploads/videos", exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}_{file_name}"
        save_path = os.path.join("uploads/videos", unique_name)

        with open(save_path, "wb") as f:
            f.write(video_bytes)

        cap = cv2.VideoCapture(save_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Invalid video file.")

        best_detections: dict[str, dict] = {}
        frame_idx = 0
        sample_rate = 15
        engine = "yolov8+resnet50"

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % sample_rate == 0:
                try:
                    dets = run_pipeline(frame)
                    for det in dets:
                        name = det["sign_name"]
                        conf = det["confidence"]
                        if name not in best_detections or conf > best_detections[name]["confidence"]:
                            best_detections[name] = det
                except RuntimeError:
                    engine = "gemini-vision"
            frame_idx += 1
        cap.release()

        if not best_detections:
            return {
                "demo_mode": False,
                "engine": engine,
                "source": "video",
                "file_name": file_name,
                "prediction_id": None,
                "detections": [],
            }

        enriched = []
        last_prediction_id = None
        for name, det in best_detections.items():
            item = _enrich_detection(det, db)
            enriched.append(item)

            record = Prediction(
                media_path=save_path,
                sign_name=item["sign_name"],
                confidence=item["confidence"],
                source_type="video",
            )
            db.add(record)
            db.flush()
            last_prediction_id = record.id

        db.commit()

        return {
            "demo_mode": False,
            "engine": engine,
            "source": "video",
            "file_name": file_name,
            "prediction_id": last_prediction_id,
            "detections": enriched,
        }

    @staticmethod
    def run_webcam_prediction(image_bytes: bytes, db: Session) -> dict:
        image = _decode_image(image_bytes)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid webcam image frame.")

        engine = "yolov8+gemini-vision"
        try:
            raw_detections = run_pipeline(image)
            # A sign held up close fills the frame and leaves YOLO nothing to locate,
            # yet it is precisely what the classifier reads best — and locally, with no
            # network round trip, which matters most on a live camera.
            if not raw_detections:
                raw_detections = _classify_whole_image(image)
                engine = "resnet50-full-image"
            if not raw_detections:
                raw_detections = detect_signs_in_image(image_bytes)
                engine = "gemini-vision"
        except RuntimeError as e:
            logger.warning(f"Webcam YOLO unavailable ({e}), reading whole frame instead.")
            raw_detections = _classify_whole_image(image)
            engine = "resnet50-full-image"
            if not raw_detections:
                raw_detections = detect_signs_in_image(image_bytes)
                engine = "gemini-vision"

        if not raw_detections:
            return {"demo_mode": False, "engine": engine, "source": "webcam", "prediction_id": None, "detections": []}

        enriched = []
        last_prediction_id = None
        for det in raw_detections:
            item = _enrich_detection(det, db)
            enriched.append(item)

            record = Prediction(
                media_path=None,
                sign_name=item["sign_name"],
                confidence=item["confidence"],
                source_type="webcam",
            )
            db.add(record)
            db.flush()
            last_prediction_id = record.id

        db.commit()

        return {
            "demo_mode": False,
            "engine": engine,
            "source": "webcam",
            "prediction_id": last_prediction_id,
            "detections": enriched,
        }
