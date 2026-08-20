import os
import argparse
import random
import shutil
from pathlib import Path
import cv2
import numpy as np

# GTSDB 43 classes mapped to 4 YOLO groups:
# 0: prohibitory, 1: mandatory, 2: warning, 3: information/other
GROUP = {}
for c in list(range(0, 11)) + [15, 16, 17]: GROUP[c] = 0   # Prohibitory
for c in [33, 34, 35, 36, 37, 38, 39, 40]: GROUP[c] = 1     # Mandatory
for c in list(range(18, 32)): GROUP[c] = 2                  # Warning
for c in [11, 12, 13, 14, 32, 41, 42]: GROUP[c] = 3         # Information

def create_synthetic_gtsdb(output_dir):
    """
    Creates a tiny synthetic GTSDB dataset so training and conversions are immediately testable.
    """
    print("GTSDB folders not found. Generating a mock dataset for immediate testing...")
    
    img_dir = os.path.join(output_dir, "FullIJCNN2013")
    os.makedirs(img_dir, exist_ok=True)
    
    gt_path = os.path.join(output_dir, "gt.txt")
    
    # Generate 10 synthetic traffic sign images and bounding box annotations
    annotations = []
    for i in range(10):
        fname = f"{i:05d}.ppm"
        img_path = os.path.join(img_dir, fname)
        
        # Create a basic image: grey road background (800x600)
        img = np.ones((600, 800, 3), dtype=np.uint8) * 128
        
        # Draw a synthetic sign:
        # e.g., class 14 (Stop - index 3 group) as red octagon, class 1 (30 speed limit - index 0 group) as red circle
        class_id = random.choice([1, 14, 25, 38])
        x1, y1 = random.randint(100, 200), random.randint(100, 200)
        x2, y2 = x1 + 80, y1 + 80
        
        if class_id == 14:  # Stop sign (Red box)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), -1)
        elif class_id == 1:  # Speed limit circle
            cv2.circle(img, ((x1+x2)//2, (y1+y2)//2), 40, (0, 0, 255), -1)
            cv2.circle(img, ((x1+x2)//2, (y1+y2)//2), 30, (255, 255, 255), -1)
        else:  # Warning triangle
            pts = np.array([[(x1+x2)//2, y1], [x1, y2], [x2, y2]], np.int32)
            cv2.drawContours(img, [pts], 0, (0, 0, 255), -1)
            
        cv2.imwrite(img_path, img)
        annotations.append(f"{fname};{x1};{y1};{x2};{y2};{class_id}")
        
    with open(gt_path, "w") as f:
        f.write("\n".join(annotations) + "\n")
        
    print(f"Generated mock GTSDB dataset at {output_dir}")
    return gt_path, img_dir

def main():
    parser = argparse.ArgumentParser(description="Convert GTSDB to YOLO format")
    parser.add_argument("--gt", type=str, default="gt.txt", help="Path to gt.txt")
    parser.add_argument("--img_dir", type=str, default="FullIJCNN2013", help="Path to GTSDB images directory")
    parser.add_argument("--out", type=str, default="dataset", help="Output directory for YOLO dataset")
    args = parser.parse_args()

    # If annotations or images are missing, create a mock dataset to run tests out-of-the-box
    if not os.path.exists(args.gt) or not os.path.exists(args.img_dir):
        # Check if they are in the parent directory
        parent_gt = r"C:\Users\jdino\Downloads\final project (1)\final project\gt.txt"
        parent_img = r"C:\Users\jdino\Downloads\final project (1)\final project\FullIJCNN2013"
        if os.path.exists(parent_gt) and os.path.exists(parent_img):
            args.gt = parent_gt
            args.img_dir = parent_img
        else:
            # Fallback to generating mock data in the current module folder
            mock_gt, mock_img = create_synthetic_gtsdb("gtsdb_mock")
            args.gt = mock_gt
            args.img_dir = mock_img

    out_path = Path(args.out)
    
    # Create target YOLO folders
    for split in ["train", "val"]:
        (out_path / f"images/{split}").mkdir(parents=True, exist_ok=True)
        (out_path / f"labels/{split}").mkdir(parents=True, exist_ok=True)

    print(f"Reading annotations from {args.gt}...")
    boxes = {}
    with open(args.gt, "r") as f:
        for line in f:
            if not line.strip():
                continue
            parts = line.strip().split(";")
            if len(parts) < 6:
                continue
            fname, x1, y1, x2, y2, cid = parts[:6]
            boxes.setdefault(fname, []).append(
                (int(x1), int(y1), int(x2), int(y2), int(cid))
            )

    all_images = list(boxes.keys())
    random.seed(42)
    random.shuffle(all_images)
    
    # Split: 85% train, 15% validation
    split_idx = int(len(all_images) * 0.85)
    train_images = all_images[:split_idx]
    val_images = all_images[split_idx:]

    def process_split(image_list, split_name):
        count = 0
        for fname in image_list:
            src = Path(args.img_dir) / fname
            if not src.exists():
                continue
                
            # YOLO labels need normalized coordinates
            image = cv2.imread(str(src))
            if image is None:
                continue
            H, W, _ = image.shape
            
            # Save image as PNG
            png_name = fname.replace(".ppm", ".png").replace(".jpg", ".png")
            dest_img_path = out_path / f"images/{split_name}" / png_name
            cv2.imwrite(str(dest_img_path), image)
            
            # Write normalized coordinates to label text file
            txt_name = png_name.replace(".png", ".txt")
            dest_lbl_path = out_path / f"labels/{split_name}" / txt_name
            
            with open(dest_lbl_path, "w") as lf:
                for x1, y1, x2, y2, cid in boxes[fname]:
                    g = GROUP.get(cid, 2)  # default to warning if class not found
                    cx = (x1 + x2) / 2.0 / W
                    cy = (y1 + y2) / 2.0 / H
                    w = (x2 - x1) / float(W)
                    h = (y2 - y1) / float(H)
                    lf.write(f"{g} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")
            count += 1
        print(f"Saved {count} images in {split_name} split.")

    print("Processing train split...")
    process_split(train_images, "train")
    print("Processing validation split...")
    process_split(val_images, "val")
    
    print(f"YOLO Dataset Preparation Complete! Dataset stored in: {out_path.resolve()}")

if __name__ == "__main__":
    main()
