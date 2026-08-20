r"""
Measure the shipped ResNet50 weights against the official GTSRB test set.

The model page used to carry hand-written accuracy figures. They came from a
different training run than the weights the backend actually loads, so the page
and the model disagreed. This script replaces guesswork with measurement: it runs
every one of the 12,630 official test images through the same weights and the same
transform that `app/ml/inference.py` applies at prediction time, and writes the
result to `app/ml/metrics/resnet50_gtsrb.json`.

    cd backend
    .venv\Scripts\python.exe -m app.scripts.measure_resnet

Re-run it after any retrain. If the file is missing the model page says the model
has not been measured rather than inventing a number.
"""

import csv
import json
import os
import time
from datetime import datetime, timezone

import torch
from PIL import Image

from app.ml import inference as inf

BATCH = 32
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(HERE, "ml", "metrics", "resnet50_gtsrb.json")


def _archive_root() -> str:
    """archive/ sits beside backend/, but allow an override for other checkouts."""
    env = os.environ.get("GTSRB_ARCHIVE")
    if env:
        return env
    return os.path.abspath(os.path.join(HERE, "..", "..", "archive"))


def main() -> None:
    root = _archive_root()
    csv_path = os.path.join(root, "Test.csv")
    if not os.path.exists(csv_path):
        raise SystemExit(
            f"Test.csv not found at {csv_path}. Point GTSRB_ARCHIVE at the archive/ folder."
        )

    model = inf._load_resnet()
    if model is None:
        raise SystemExit("ResNet weights not found — nothing to measure.")
    transform = inf._resnet_tf
    labels = inf.GTSRB_LABELS

    rows = list(csv.DictReader(open(csv_path)))
    total = len(rows)
    print(f"Measuring {total} test images against {inf.settings.RESNET_WEIGHTS}")

    hits = [0] * len(labels)      # correct predictions per true class
    counts = [0] * len(labels)    # test images per true class
    predicted = [0] * len(labels) # times each class was predicted (for precision)
    correct = 0
    started = time.time()

    for i in range(0, total, BATCH):
        chunk = rows[i:i + BATCH]
        tensors, truths = [], []
        for row in chunk:
            img = Image.open(os.path.join(root, row["Path"])).convert("RGB")
            tensors.append(transform(img))
            truths.append(int(row["ClassId"]))

        with torch.no_grad():
            preds = model(torch.stack(tensors)).argmax(1).tolist()

        for pred, truth in zip(preds, truths):
            counts[truth] += 1
            predicted[pred] += 1
            if pred == truth:
                hits[truth] += 1
                correct += 1

        done = i + len(chunk)
        if done % (BATCH * 20) == 0 or done == total:
            elapsed = time.time() - started
            rate = done / elapsed if elapsed else 0
            print(
                f"  {done}/{total}  acc {100 * correct / done:.2f}%  "
                f"({rate:.1f} img/s, ~{(total - done) / rate / 60:.0f} min left)",
                flush=True,
            )

    # Per-class recall is the accuracy figure the page shows; precision and F1 come
    # from the same counts, so one pass gives every number the page needs.
    per_class = []
    precisions, recalls, f1s = [], [], []
    for idx, name in enumerate(labels):
        support = counts[idx]
        recall = hits[idx] / support if support else 0.0
        precision = hits[idx] / predicted[idx] if predicted[idx] else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)
        per_class.append({
            "id": idx,
            "name": name,
            "accuracy": round(100 * recall, 2),
            "precision": round(100 * precision, 2),
            "f1": round(100 * f1, 2),
            "samples": support,
        })

    def _weighted(values):
        return sum(v * c for v, c in zip(values, counts)) / total

    payload = {
        "measured_at": datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S"),
        "weights_file": os.path.basename(inf.settings.RESNET_WEIGHTS),
        "dataset": "GTSRB official test set",
        "test_images": total,
        "num_classes": len(labels),
        "test_acc": round(100 * correct / total, 2),
        "correct": correct,
        "macro_precision": round(100 * sum(precisions) / len(labels), 2),
        "macro_recall": round(100 * sum(recalls) / len(labels), 2),
        "macro_f1": round(100 * sum(f1s) / len(labels), 2),
        "weighted_precision": round(100 * _weighted(precisions), 2),
        "weighted_recall": round(100 * _weighted(recalls), 2),
        "weighted_f1": round(100 * _weighted(f1s), 2),
        "class_accuracy": per_class,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)

    print(f"\nTest accuracy: {payload['test_acc']}%  ({correct}/{total})")
    print(f"Macro F1: {payload['macro_f1']}%   Weighted F1: {payload['weighted_f1']}%")
    print(f"Written to {OUT_PATH}")


if __name__ == "__main__":
    main()
