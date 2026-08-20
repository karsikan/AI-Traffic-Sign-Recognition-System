"""
Model benchmark.

The accuracy figures in ``model.py`` come from training runs. Latency cannot be quoted
that way — it depends entirely on the machine the demo runs on, so this measures it here
and now by actually pushing images through both models.

That distinction is worth being explicit about in an evaluation: accuracy is a property
of the trained weights, latency is a property of this laptop.
"""

import glob
import os
import statistics
import time

import numpy as np
from PIL import Image

from app.core.logging import logger

# Where to look for real sample images, in preference order
SAMPLE_SOURCES = [
    "../archive/Test/*.png",
    "../archive/Test/*.ppm",
    "uploads/images/*.jpg",
    "uploads/images/*.png",
]

DEFAULT_RUNS = 8
WARMUP_RUNS = 2


def _sample_images(limit: int) -> tuple[list[Image.Image], str]:
    """Real GTSRB test images if they are on disk, otherwise synthetic noise."""
    for pattern in SAMPLE_SOURCES:
        paths = sorted(glob.glob(pattern))[:limit]
        if len(paths) >= 1:
            images = []
            for p in paths:
                try:
                    images.append(Image.open(p).convert("RGB"))
                except Exception:
                    continue
            if images:
                return images, f"{len(images)} real images from {os.path.dirname(pattern)}"

    rng = np.random.default_rng(42)
    images = [
        Image.fromarray(rng.integers(0, 255, (64, 64, 3), dtype=np.uint8))
        for _ in range(limit)
    ]
    return images, f"{limit} synthetic images (no test set found on disk)"


def _timed(fn, runs: int) -> dict | None:
    """Run, discarding warm-up passes, and report the spread rather than one number."""
    try:
        for _ in range(WARMUP_RUNS):
            fn()
    except Exception as e:
        logger.warning(f"Benchmark warm-up failed: {e}")
        return {"error": str(e)}

    timings = []
    for _ in range(runs):
        start = time.perf_counter()
        try:
            fn()
        except Exception as e:
            return {"error": str(e)}
        timings.append((time.perf_counter() - start) * 1000.0)

    timings.sort()
    return {
        "runs": len(timings),
        "mean_ms": round(statistics.fmean(timings), 2),
        "median_ms": round(statistics.median(timings), 2),
        "min_ms": round(timings[0], 2),
        "max_ms": round(timings[-1], 2),
        "stdev_ms": round(statistics.stdev(timings), 2) if len(timings) > 1 else 0.0,
        "fps": round(1000.0 / statistics.fmean(timings), 1) if statistics.fmean(timings) else None,
    }


def run_benchmark(runs: int = DEFAULT_RUNS) -> dict:
    """Measure YOLOv8 detection and ResNet50 classification latency on this machine."""
    import torch

    from app.ml import inference

    images, source_note = _sample_images(max(runs, 4))
    primary = images[0]

    results: dict = {}

    # ── YOLOv8 detection ────────────────────────────────────────────────────────
    try:
        yolo = inference._load_yolo()
        if yolo is None:
            results["yolov8"] = {"error": "YOLOv8 weights not loaded."}
        else:
            arr = np.array(primary)
            results["yolov8"] = {
                "task": "Detection — where the signs are",
                "input_size": "640×640 (letterbox)",
                **(_timed(lambda: yolo.predict(arr, verbose=False), runs) or {}),
            }
    except Exception as e:
        results["yolov8"] = {"error": str(e)}

    # ── ResNet50 classification ─────────────────────────────────────────────────
    try:
        resnet = inference._load_resnet()
        if resnet is None:
            results["resnet50"] = {"error": "ResNet50 weights not loaded."}
        else:
            # 224×224 is what the transform in inference.py actually applies at
            # prediction time, whatever the training preprocessing notes say.
            results["resnet50"] = {
                "task": "Classification — which sign it is",
                "input_size": "224×224",
                **(_timed(lambda: inference.classify_crop(primary), runs) or {}),
            }
    except Exception as e:
        results["resnet50"] = {"error": str(e)}

    # ── Combined pipeline, for the honest end-to-end figure ─────────────────────
    both = [r for r in (results.get("yolov8"), results.get("resnet50")) if r and "mean_ms" in r]
    combined = round(sum(r["mean_ms"] for r in both), 2) if len(both) == 2 else None

    threads = None
    try:
        threads = torch.get_num_threads()
    except Exception:
        pass

    return {
        "models": results,
        "combined_mean_ms": combined,
        "combined_note": (
            "Detection followed by classification, as the pipeline actually runs. The "
            "Gemini Vision stage is excluded — it is a network call, not local compute."
        ),
        "environment": {
            "device": "cpu",
            "torch_threads": threads,
            "sample_source": source_note,
            "warmup_runs": WARMUP_RUNS,
        },
        "measured_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "note": (
            "Latency measured on this machine just now — it will differ on other hardware. "
            "Accuracy figures elsewhere on this page come from the training runs and do not "
            "change between machines."
        ),
    }


def comparison_table(
    resnet_test_acc: float | None = None,
    yolo_map50: float | None = None,
    yolo_val_images: int | None = None,
) -> list[dict]:
    """
    The side-by-side an examiner actually wants: what each model is for, and why the
    project uses both rather than one.

    Both headline metrics carry the size of the set they were measured on, because a
    detection mAP from a handful of images and one from hundreds are not the same claim.
    Pass None for a metric that has not been measured and the row says so.
    """
    resnet_headline = (
        f"Test accuracy {resnet_test_acc}% (12,630 images)"
        if resnet_test_acc is not None
        else "Not measured yet — run measure_resnet"
    )
    if yolo_map50 is None:
        yolo_headline = "Not measured yet"
    elif (yolo_val_images or 0) < 50:
        yolo_headline = f"mAP@50 {yolo_map50} — but on {yolo_val_images} validation images, so not meaningful"
    else:
        yolo_headline = f"mAP@50 {yolo_map50} ({yolo_val_images} held-out scenes, generated backgrounds)"
    return [
        {
            "aspect": "Question it answers",
            "yolov8": "Where in the image is a sign?",
            "resnet50": "Which of the 43 classes is this crop?",
        },
        {
            "aspect": "Architecture",
            "yolov8": "Single-stage detector, CSPDarknet backbone",
            "resnet50": "50-layer CNN with residual connections",
        },
        {
            "aspect": "Output",
            "yolov8": "Bounding boxes with objectness and class scores",
            "resnet50": "A 43-way softmax over one image",
        },
        {
            "aspect": "Training data",
            "yolov8": "Generated road scenes carrying real sign crops, 4 categories",
            "resnet50": "GTSRB — 51,839 cropped signs, 43 classes",
        },
        {
            "aspect": "Headline metric",
            "yolov8": yolo_headline,
            "resnet50": resnet_headline,
        },
        {
            "aspect": "Inference input size",
            "yolov8": "640×640",
            "resnet50": "224×224",
        },
        {
            "aspect": "Why both",
            "yolov8": "A classifier alone cannot find a sign in a street photo",
            "resnet50": "The detector only knows 4 broad categories — the sign's name comes from here",
        },
    ]
