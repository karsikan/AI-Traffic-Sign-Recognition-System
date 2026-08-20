from typing import List, Optional
from pydantic import BaseModel

class ImageDetectionItem(BaseModel):
    sign_name: str
    class_id: int
    confidence: float
    meaning: str
    safety_advice: str
    bbox: List[int]

class ImageData(BaseModel):
    source: str = "image"
    file_name: str
    detections: List[ImageDetectionItem]

class VideoDetectionItem(BaseModel):
    sign_name: str
    confidence: float
    meaning: str

class VideoData(BaseModel):
    source: str = "video"
    file_name: str
    detections: List[VideoDetectionItem]

class WebcamDetectionItem(BaseModel):
    sign_name: str
    confidence: float
    meaning: str

class WebcamData(BaseModel):
    source: str = "webcam"
    detections: List[WebcamDetectionItem]
