import os
import cv2
import json
import argparse
import numpy as np
import torch
import torch.nn as nn
from torchvision import models

def load_classes(classes_path):
    with open(classes_path, 'r') as f:
        return json.load(f)

# Global variables for lazy loading
_model = None
_classes = None
_device = None

def init_model(model_path="model/resnet50_traffic_sign.pth", classes_path="traffic_sign_classes.json"):
    global _model, _classes, _device
    if _model is not None:
        return
        
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load class mapping
    if not os.path.exists(classes_path):
        # Fallback relative to script location
        classes_path = os.path.join(os.path.dirname(__file__), "traffic_sign_classes.json")
    _classes = load_classes(classes_path)
    
    # Build model architecture
    try:
        _model = models.resnet50(weights=None)
    except TypeError:
        _model = models.resnet50()
        
    num_ftrs = _model.fc.in_features
    _model.fc = nn.Linear(num_ftrs, 43)
    
    # Load weights
    if os.path.exists(model_path):
        _model.load_state_dict(torch.load(model_path, map_location=_device))
    else:
        # If trained model doesn't exist, load pre-trained ImageNet model with random fc layers for demo
        try:
            _model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        except AttributeError:
            _model = models.resnet50(pretrained=True)
        num_ftrs = _model.fc.in_features
        _model.fc = nn.Linear(num_ftrs, 43)
        
    _model = _model.to(_device)
    _model.eval()

def predict_image(image_path, model_path="model/resnet50_traffic_sign.pth", classes_path="traffic_sign_classes.json"):
    """
    Predicts the traffic sign class, class ID, and confidence score for a given image.
    
    Returns:
        dict: containing "sign_name", "class_id", and "confidence"
    """
    init_model(model_path, classes_path)
    
    # Load and preprocess image via OpenCV
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Could not load image at path: {image_path}")
        
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = cv2.resize(image, (224, 224))
    
    # Normalize
    image = image.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    image = (image - mean) / std
    
    # HWC to CHW and expand dim to (1, C, H, W)
    image = image.transpose(2, 0, 1)
    image_tensor = torch.tensor(image, dtype=torch.float32).unsqueeze(0).to(_device)
    
    # Run inference
    with torch.no_grad():
        outputs = _model(image_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]
        confidence, predicted_idx = torch.max(probabilities, 0)
        
    class_id = int(predicted_idx.item())
    sign_name = _classes.get(str(class_id), "Unknown")
    confidence_score = float(confidence.item()) * 100
    
    return {
        "sign_name": sign_name,
        "class_id": class_id,
        "confidence": round(confidence_score, 1)
    }

def main():
    parser = argparse.ArgumentParser(description="Predict Traffic Sign from Image")
    parser.add_argument("image_path", type=str, help="Path to input image file")
    parser.add_argument("--model_path", type=str, default="model/resnet50_traffic_sign.pth", help="Path to model weights file")
    parser.add_argument("--classes_path", type=str, default="traffic_sign_classes.json", help="Path to traffic_sign_classes.json")
    args = parser.parse_args()

    try:
        result = predict_image(args.image_path, args.model_path, args.classes_path)
        # Output result as formatted JSON as requested
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}, indent=2))

if __name__ == "__main__":
    main()
