import os
import time
import argparse
import cv2
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Live Traffic Sign Detection via Webcam")
    parser.add_argument("--model_path", type=str, default="models/yolov8_traffic_sign.pt", help="Path to model weights")
    parser.add_argument("--camera_index", type=int, default=0, help="Index of webcam (usually 0)")
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

    # Open Camera
    cap = cv2.VideoCapture(args.camera_index)
    if not cap.isOpened():
        print(f"Error: Could not open webcam at index {args.camera_index}")
        return

    print("Starting webcam detection stream. Press 'q' to quit...")
    
    prev_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Calculate FPS
        current_time = time.time()
        fps = 1.0 / (current_time - prev_time) if (current_time - prev_time) > 0 else 0
        prev_time = current_time

        # Run inference
        results = model(frame)[0]

        # Draw bounding boxes
        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0]) * 100
            cls_id = int(box.cls[0])
            
            label_name = results.names[cls_id].upper()
            
            # Red bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
            # Label & Confidence
            cv2.putText(frame, f"{label_name} {conf:.0f}%", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        # Draw FPS overlay
        cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        # Show frame
        cv2.imshow("Live Traffic Sign Detection", frame)

        # Stop if 'q' is pressed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Stream ended.")

if __name__ == "__main__":
    main()
