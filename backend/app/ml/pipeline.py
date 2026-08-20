import os
import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from ultralytics import YOLO
from app.core.config import settings

# Labels
GTSRB_LABELS = [
    "Speed limit 20", "Speed limit 30", "Speed limit 50", "Speed limit 60",
    "Speed limit 70", "Speed limit 80", "End speed limit 80", "Speed limit 100",
    "Speed limit 120", "No overtaking", "No overtaking (trucks)",
    "Right of way at intersection", "Priority road", "Yield", "Stop",
    "No vehicles", "No trucks", "No entry", "General caution",
    "Dangerous curve left", "Dangerous curve right", "Double curve",
    "Bumpy road", "Slippery road", "Road narrows right", "Road work",
    "Traffic signals", "Pedestrians", "Children crossing", "Bicycles crossing",
    "Beware ice/snow", "Wild animals crossing", "End all limits",
    "Turn right ahead", "Turn left ahead", "Ahead only", "Go straight or right",
    "Go straight or left", "Keep right", "Keep left", "Roundabout mandatory",
    "End no overtaking", "End no overtaking (trucks)",
]

_yolo = None
_resnet = None
_resnet_tf = None
_device = None

def get_device():
    global _device
    if _device is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return _device

def load_yolo():
    global _yolo
    if _yolo is not None:
        return _yolo
    if not os.path.exists(settings.YOLO_WEIGHTS):
        return None
    _yolo = YOLO(settings.YOLO_WEIGHTS)
    return _yolo

def load_resnet():
    global _resnet, _resnet_tf
    if _resnet is not None:
        return _resnet
    if not os.path.exists(settings.RESNET_WEIGHTS):
        return None
        
    device = get_device()
    model = models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(GTSRB_LABELS))
    model.load_state_dict(torch.load(settings.RESNET_WEIGHTS, map_location=device))
    model = model.to(device)
    model.eval()
    
    _resnet = model
    _resnet_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return _resnet

def classify_crop(crop_img: np.ndarray):
    model = load_resnet()
    if model is None:
        raise RuntimeError("ResNet weights missing.")
        
    device = get_device()
    crop_rgb = cv2.cvtColor(crop_img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(crop_rgb)
    x = _resnet_tf(pil_img).unsqueeze(0).to(device)
    
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0]
        idx = int(probs.argmax())
        
    return idx, GTSRB_LABELS[idx], round(float(probs[idx]), 4)

def _crop_to_jpeg_bytes(crop: np.ndarray) -> bytes:
    """Encode a numpy BGR crop as JPEG bytes for Gemini Vision."""
    ok, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return bytes(buf) if ok else b""


def _iou(a: list, b: list) -> float:
    """Intersection-over-Union of two [x1, y1, x2, y2] boxes."""
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if inter == 0:
        return 0.0
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union


def run_pipeline(image: np.ndarray, use_gemini_classify: bool = False) -> list:
    """
    Stage 1 — YOLO: detect bounding boxes of traffic signs in the image,
    then Non-Maximum Suppression to drop duplicate overlapping boxes.
    Stage 2 — ResNet50: classify each cropped box to get the exact sign name.
    Stage 2 alternative — Gemini Vision (use_gemini_classify=True): used when
    the ResNet model is unavailable or cloud classification is preferred.

    Returns list of dicts: {"sign_name", "class_id", "confidence", "bbox", "meaning"}
    """
    from app.services.gemini_service import classify_sign_crop  # avoid circular at module load

    yolo = load_yolo()
    if yolo is None:
        raise RuntimeError("YOLO weights missing.")

    results = yolo(image, conf=0.15, verbose=False)[0]

    # Collect candidate boxes, dropping ones too small to contain a readable
    # sign — YOLO noise on close-up images makes classifiers hallucinate.
    candidates = []
    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        if (x2 - x1) < 20 or (y2 - y1) < 20:
            continue
        candidates.append((float(box.conf[0]), [x1, y1, x2, y2]))

    # Non-Maximum Suppression: keep the highest-confidence box, drop any
    # remaining box that overlaps a kept one — one sign, one detection.
    candidates.sort(key=lambda c: c[0], reverse=True)
    kept_boxes = []
    for conf, bbox in candidates:
        if all(_iou(bbox, kb) < 0.45 for kb in kept_boxes):
            kept_boxes.append(bbox)

    detections = []
    for bbox in kept_boxes:
        x1, y1, x2, y2 = bbox
        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            continue

        gemini_result = None
        if use_gemini_classify:
            crop_bytes = _crop_to_jpeg_bytes(crop)
            if crop_bytes:
                gemini_result = classify_sign_crop(crop_bytes)

        if gemini_result:
            # Gemini Vision successfully identified the sign
            detections.append({
                "sign_name": gemini_result["sign_name"],
                "class_id": -1,
                "confidence": gemini_result["confidence"],
                "meaning": gemini_result.get("meaning", ""),
                "bbox": [x1, y1, x2, y2],
                "classified_by": "gemini",
            })
        else:
            # Gemini unavailable (rate-limited / offline) — use ResNet50
            resnet = load_resnet()
            if resnet is None:
                continue
            class_id, label, cls_conf = classify_crop(crop)
            # Accept any ResNet detection — even low-confidence ones are better than nothing
            # The frontend shows the confidence bar so users can judge reliability
            detections.append({
                "sign_name": label,
                "class_id": class_id,
                "confidence": cls_conf,
                "meaning": "",
                "bbox": [x1, y1, x2, y2],
                "classified_by": "resnet50",
            })

    # Final dedupe: if two detections carry the same sign name and their boxes
    # still overlap, they are the same physical sign — keep the most confident.
    detections.sort(key=lambda d: d["confidence"], reverse=True)
    unique = []
    for det in detections:
        duplicate = any(
            det["sign_name"] == u["sign_name"] and _iou(det["bbox"], u["bbox"]) > 0.2
            for u in unique
        )
        if not duplicate:
            unique.append(det)

    return unique
