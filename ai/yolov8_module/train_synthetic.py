r"""
Fine-tune the shipped detector on the generated scene set, then validate it properly.

Starts from `yolov8_traffic_sign.pt` — the checkpoint already in the repo — so nothing
is downloaded and the model keeps the four sign categories it already knows. The point
of the run is not a better architecture; it is a validation set large enough for the
resulting mAP to mean something. The previous run validated on two images.

    python train_synthetic.py --epochs 10

Trains at 416px on CPU because that is what this machine has: roughly 14 minutes per
epoch over 1,500 scenes. `best.pt` is written every time validation improves, so
stopping the run early still leaves a usable checkpoint.
"""

import argparse
import json
from pathlib import Path

from ultralytics import YOLO

HERE = Path(__file__).resolve().parent
DATA = HERE / "dataset_synthetic" / "data.yaml"
BASE = HERE / "yolov8_traffic_sign.pt"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--imgsz", type=int, default=416)
    ap.add_argument("--batch", type=int, default=8)
    ap.add_argument(
        "--val-only",
        action="store_true",
        help="Skip training and measure the existing best.pt. Use after an interrupted run.",
    )
    args = ap.parse_args()

    if not DATA.exists():
        raise SystemExit(f"{DATA} missing — run build_synthetic_set.py first.")

    if args.val_only:
        print("Validating the existing checkpoint — no training.")
    else:
        _train(args)

    _validate(args)


def _train(args) -> None:
    model = YOLO(str(BASE))
    model.train(
        data=str(DATA),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device="cpu",
        workers=0,          # Windows: dataloader workers deadlock without this
        project=str(HERE / "runs_synthetic"),
        name="detector",
        exist_ok=True,
        patience=20,
        verbose=True,
    )


def _validate(args) -> None:
    """
    Measure the best checkpoint on the held-out scenes and record the numbers, so the
    model page can quote a measurement instead of a memory of one.
    """
    best = HERE / "runs_synthetic" / "detector" / "weights" / "best.pt"
    if not best.exists():
        raise SystemExit(f"{best} missing — train first, or point at another checkpoint.")
    metrics = YOLO(str(best)).val(data=str(DATA), imgsz=args.imgsz, device="cpu", workers=0)

    # Report the epochs that actually ran, not the epochs that were asked for — an
    # interrupted run is a normal outcome on a CPU and the page should say which it was.
    results_csv = HERE / "runs_synthetic" / "detector" / "results.csv"
    epochs_done = args.epochs
    try:
        rows = [r for r in results_csv.read_text(encoding="utf-8").splitlines()[1:] if r.strip()]
        epochs_done = int(rows[-1].split(",")[0])
    except (OSError, ValueError, IndexError):
        pass

    # Count the validation split from disk. `metrics.seen` reports 0 here, and a page
    # that says "measured on 0 images" is worse than no figure at all.
    val_dir = HERE / "dataset_synthetic" / "images" / "val"
    val_images = len(list(val_dir.glob("*.jpg")))
    val_instances = sum(
        len([ln for ln in f.read_text(encoding="utf-8").splitlines() if ln.strip()])
        for f in (HERE / "dataset_synthetic" / "labels" / "val").glob("*.txt")
    )

    box = metrics.box
    names = metrics.names
    payload = {
        "weights_file": "yolov8_traffic.pt",
        "dataset": "Generated road scenes with real GTSRB sign crops",
        "val_images": val_images,
        "val_instances": val_instances,
        "epochs_completed": epochs_done,
        "epochs_requested": args.epochs,
        "imgsz": args.imgsz,
        "mAP50": round(float(box.map50), 4),
        "mAP50_95": round(float(box.map), 4),
        "precision": round(float(box.mp), 4),
        "recall": round(float(box.mr), 4),
        "per_class": [
            {
                "name": names[int(c)],
                "mAP50": round(float(box.ap50[i]), 4),
                "mAP50_95": round(float(box.ap[i]), 4),
            }
            for i, c in enumerate(box.ap_class_index)
        ],
    }

    out = HERE.parent.parent / "backend" / "app" / "ml" / "metrics" / "yolov8_detection.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"\nmAP50 {payload['mAP50']}  mAP50-95 {payload['mAP50_95']}")
    print(f"Written to {out}")
    print(f"Best weights: {best}")


if __name__ == "__main__":
    main()
