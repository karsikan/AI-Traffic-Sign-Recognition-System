import os
import argparse
import cv2
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Detect Traffic Signs in Video")
    parser.add_argument("video_path", type=str, help="Path to input video file")
    parser.add_argument("--model_path", type=str, default="models/yolov8_traffic_sign.pt", help="Path to model weights")
    parser.add_argument("--save_path", type=str, default="output_video.mp4", help="Path to save annotated output video")
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

    # Open video
    cap = cv2.VideoCapture(args.video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video file {args.video_path}")
        return

    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Define Video Writer (MP4)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(args.save_path, fourcc, fps, (width, height))

    print(f"Processing video: {width}x{height} | {fps} FPS | Total frames: {total_frames}...")

    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Run inference on single frame
        results = model(frame)[0]

        # Draw bounding boxes
        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0]) * 100
            cls_id = int(box.cls[0])
            
            label_name = results.names[cls_id].upper()
            
            # Red bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
            # Text label
            cv2.putText(frame, f"{label_name} {conf:.0f}%", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        # Write annotated frame
        out.write(frame)
        
        frame_idx += 1
        if frame_idx % 30 == 0:
            print(f"Processed frame [{frame_idx}/{total_frames}]")

    cap.release()
    out.release()
    print(f"Successfully processed video. Output saved to {args.save_path}")

if __name__ == "__main__":
    main()
