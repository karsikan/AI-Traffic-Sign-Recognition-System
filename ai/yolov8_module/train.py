import os
import argparse
import shutil
from pathlib import Path
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8s on GTSDB Dataset")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--dataset_dir", type=str, default="dataset", help="Dataset root directory")
    parser.add_argument("--save_path", type=str, default="models/yolov8_traffic_sign.pt", help="Path to save model weights")
    args = parser.parse_args()

    dataset_root = os.path.abspath(args.dataset_dir)
    yaml_path = os.path.join(dataset_root, "data.yaml")
    
    # Create models directory if it doesn't exist
    os.makedirs(os.path.dirname(args.save_path), exist_ok=True)

    # Write data.yaml dynamically
    yaml_content = f"""path: {dataset_root}
train: images/train
val: images/val

names:
  0: prohibitory
  1: mandatory
  2: warning
  3: information
"""
    with open(yaml_path, "w") as f:
        f.write(yaml_content)
    print(f"Created YOLO config at {yaml_path}")

    # Load YOLOv8s model
    print("Loading YOLOv8s model...")
    model = YOLO("yolov8s.pt")

    # Train
    print("Starting training...")
    results = model.train(
        data=yaml_path,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch_size,
        project="runs",
        name="gtsdb_train",
        verbose=True
    )

    # Locate best.pt recursively under runs/
    best_weights = None
    for root, dirs, files in os.walk("runs"):
        if "best.pt" in files:
            best_weights = os.path.join(root, "best.pt")
            break

    if best_weights and os.path.exists(best_weights):
        shutil.copy(best_weights, args.save_path)
        print(f"Saved trained weights successfully to {args.save_path} (copied from {best_weights})")
    else:
        print(f"Warning: Could not find trained weights 'best.pt' recursively under runs/")

if __name__ == "__main__":
    main()
