import os
import argparse
import cv2
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Detect Traffic Signs in Image")
    parser.add_argument("image_path", type=str, help="Path to input image")
    parser.add_argument("--model_path", type=str, default="models/yolov8_traffic_sign.pt", help="Path to model weights")
    parser.add_argument("--save_path", type=str, default="output_image.png", help="Path to save annotated output image")
    args = parser.parse_args()

    # Load model
    model_path = args.model_path
    if not os.path.exists(model_path):
        global_path = r"C:\Users\jdino\Downloads\final project (1)\final project\models\yolov8_traffic_sign.pt"
        if os.path.exists(global_path):
            model_path = global_path
            
    if os.path.exists(model_path):
        print(f"Loading trained model from {model_path}...")
        model = YOLO(model_path)
    else:
        print(f"Warning: Trained weights not found. Loading default yolov8s.pt...")
        model = YOLO("yolov8s.pt")

    # Load image
    image = cv2.imread(args.image_path)
    if image is None:
        print(f"Error: Could not read image from {args.image_path}")
        return

    # Run inference
    results = model(image)[0]

    # Draw boxes
    for box in results.boxes:
        # Get coordinates
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        conf = float(box.conf[0]) * 100
        cls_id = int(box.cls[0])
        
        # Get class name
        label_name = results.names[cls_id].upper()
        
        # Draw bounding box (red rectangle)
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 3)
        
        # Put text label
        label_text = f"{label_name} {conf:.0f}%"
        cv2.putText(image, label_text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        
        print(f"Detected: {label_name} | Confidence: {conf:.1f}% | Box: [{x1}, {y1}, {x2}, {y2}]")

    # Save output image
    cv2.imwrite(args.save_path, image)
    print(f"Saved annotated image to {args.save_path}")

    # Try displaying the image (closes on key press)
    try:
        cv2.imshow("Traffic Sign Detection", image)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    except Exception:
        # Silent pass on headless environments
        pass

if __name__ == "__main__":
    main()
