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
    parser.add_argument("--dataset_yaml", type=str, default=r"C:\Users\jdino\Downloads\final project (1)\final project\ai\yolov8_module\dataset.yaml", help="Path to dataset.yaml")
    parser.add_argument("--save_path", type=str, default=r"C:\Users\jdino\Downloads\final project (1)\final project\models\yolov8_traffic_sign.pt", help="Path to save model weights")
    args = parser.parse_args()

    # Create models directory if it doesn't exist
    os.makedirs(os.path.dirname(args.save_path), exist_ok=True)

    if not os.path.exists(args.dataset_yaml):
        raise FileNotFoundError(f"dataset.yaml not found at {args.dataset_yaml}")

    # Load YOLOv8s model
    print("Loading YOLOv8s model...")
    # Attempt to load a local model if exists, otherwise download
    model = YOLO("yolov8s.pt")

    # Train
    print("Starting training...")
    results = model.train(
        data=args.dataset_yaml,
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
