"""Traffic-sign detection (YOLOv8) + classification (ResNet50).

The module loads models lazily. If weights are missing it runs in a clearly
labelled DEMO mode so the rest of the application remains testable.
"""
import base64
import os
from io import BytesIO
from typing import List

import numpy as np
from PIL import Image

from app.core.config import settings

# GTSRB 43-class label map (abbreviated names)
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


def _load_yolo():
    global _yolo
    if _yolo is not None:
        return _yolo
    if not os.path.exists(settings.YOLO_WEIGHTS):
        return None
    from ultralytics import YOLO
    _yolo = YOLO(settings.YOLO_WEIGHTS)
    return _yolo


def _load_resnet():
    global _resnet, _resnet_tf
    if _resnet is not None:
        return _resnet
    if not os.path.exists(settings.RESNET_WEIGHTS):
        return None
    import torch
    from torchvision import models, transforms
    model = models.resnet50(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, len(GTSRB_LABELS))
    state = torch.load(settings.RESNET_WEIGHTS, map_location="cpu")
    model.load_state_dict(state)
    model.eval()
    _resnet = model
    _resnet_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return _resnet


def classify_crop(crop: Image.Image):
    model = _load_resnet()
    if model is None:
        return None, None
    import torch
    x = _resnet_tf(crop.convert("RGB")).unsqueeze(0)
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0]
        idx = int(probs.argmax())
    return GTSRB_LABELS[idx], float(probs[idx])


def detect_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    yolo = _load_yolo()
    detections = []

    if yolo is None:
        # No local weights: try Gemini Vision for REAL recognition (free tier).
        from app.services.gemini_service import vision_detect, _configured

        vision = vision_detect(image_bytes, mime_type)
        if vision:
            for v in vision:
                bbox = [0, 0, img.width, img.height]
                bf = v.get("bbox_frac")
                if isinstance(bf, list) and len(bf) == 4:
                    try:
                        x, y, w, h = (float(n) for n in bf)
                        bbox = [
                            round(x * img.width), round(y * img.height),
                            round((x + w) * img.width), round((y + h) * img.height),
                        ]
                    except (TypeError, ValueError):
                        pass
                detections.append({
                    "label": v["name"],
                    "confidence": round(v["confidence"], 4),
                    "bbox": bbox,
                    "category": v.get("category", "other"),
                    "meaning": v.get("meaning", ""),
                })
            return {"engine": "gemini-vision", "demo_mode": False, "detections": detections}

        # Nothing available at all -> labelled demo placeholder.
        hint = (
            "Add GEMINI_API_KEY to backend/.env for instant AI recognition, "
            "or train YOLOv8/ResNet50 and drop the weights in app/ml/weights/."
            if not _configured() else
            "No sign detected (or the AI vision call was unavailable). Try a clearer image."
        )
        return {
            "engine": "demo",
            "demo_mode": True,
            "detections": [{
                "label": hint,
                "confidence": 0.0,
                "bbox": [0, 0, img.width, img.height],
                "category": "info",
            }],
        }

    results = yolo(np.array(img), verbose=False)[0]
    for box in results.boxes:
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
        conf = float(box.conf[0])
        crop = img.crop((x1, y1, x2, y2))
        label, cls_conf = classify_crop(crop)
        if label is None:  # fall back to YOLO class name
            label = results.names[int(box.cls[0])]
            cls_conf = conf
        detections.append({
            "label": label,
            "confidence": round(cls_conf, 4),
            "bbox": [x1, y1, x2, y2],
        })
    return {"engine": "yolov8+resnet50", "demo_mode": False, "detections": detections}
