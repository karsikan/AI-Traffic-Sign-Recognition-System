r"""
Build a detection dataset by placing real GTSRB sign crops into generated road scenes.

The detector shipped with this project was trained on `dataset_preparation.py`'s mock
set — ten images of plain coloured shapes, two of them held out for validation. Any
mAP measured on two images says nothing, so this script builds something a real number
can come from: many scenes, real sign pixels, and a validation split whose signs the
model never saw during training.

    python build_synthetic_set.py --train 1500 --val 300

Train scenes draw their signs from GTSRB `Train/`, validation scenes from GTSRB `Test/`.
That split matters: a validation sign is a photograph the training run never touched, so
the score reflects recognising signs rather than memorising crops.

What this is not: real street photography. The backgrounds are generated, so the score
belongs to this synthetic distribution, not to German roads. It is an honest measurement
of a modest thing — say so when reporting it.
"""

import argparse
import csv
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
ARCHIVE = HERE.parent.parent / "archive"
OUT = HERE / "dataset_synthetic"

# Same 43 → 4 grouping dataset_preparation.py uses, so the class ids keep their meaning.
GROUP = {}
for c in list(range(0, 11)) + [15, 16, 17]: GROUP[c] = 0   # prohibitory
for c in [33, 34, 35, 36, 37, 38, 39, 40]: GROUP[c] = 1     # mandatory
for c in list(range(18, 32)): GROUP[c] = 2                  # warning
for c in [11, 12, 13, 14, 32, 41, 42]: GROUP[c] = 3         # information

W, H = 640, 480


def _sky_and_ground(rng: random.Random) -> Image.Image:
    """A road scene: graded sky, ground, a road narrowing to a horizon, lane dashes."""
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)

    horizon = rng.randint(int(H * 0.35), int(H * 0.55))
    # Sky: cool blue through to overcast grey, drawn as a vertical gradient.
    top = (rng.randint(90, 150), rng.randint(140, 190), rng.randint(180, 235))
    bottom = (rng.randint(180, 225), rng.randint(200, 235), rng.randint(215, 245))
    for y in range(horizon):
        t = y / max(1, horizon)
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)))

    ground = (rng.randint(70, 130), rng.randint(85, 140), rng.randint(55, 100))
    d.rectangle([0, horizon, W, H], fill=ground)

    road = (rng.randint(60, 95),) * 3
    vanish = rng.randint(int(W * 0.35), int(W * 0.65))
    d.polygon(
        [(vanish - 18, horizon), (vanish + 18, horizon), (W * 0.95, H), (W * 0.05, H)],
        fill=road,
    )

    # Dashed centre line, thinning towards the horizon.
    y = H
    while y > horizon + 8:
        span = (y - horizon) / max(1, H - horizon)
        x = vanish + (W / 2 - vanish) * span
        d.line([(x, y), (x, y - 14 * span)], fill=(225, 220, 190), width=max(1, int(5 * span)))
        y -= int(34 * span) + 6

    # Roadside clutter — buildings, trees, parked shapes. Without these the detector can
    # learn "the only object in the picture is the sign" and score well for the wrong reason.
    for _ in range(rng.randint(3, 7)):
        bw = rng.randint(25, 90)
        bh = rng.randint(30, 130)
        bx = rng.randint(0, W - bw)
        by = horizon - bh + rng.randint(-8, 18)
        shade = (rng.randint(80, 190), rng.randint(80, 190), rng.randint(80, 190))
        if rng.random() < 0.45:
            d.ellipse([bx, by, bx + bw, by + bh], fill=shade)
        else:
            d.rectangle([bx, by, bx + bw, by + bh], fill=shade)

    return img


def _place(scene: Image.Image, crop: Image.Image, rng: random.Random, taken: list) -> tuple | None:
    """Paste one sign, on a pole, without overlapping earlier signs. Returns its box."""
    size = rng.randint(34, 104)
    # GTSRB crops carry roughly a 10% margin of surrounding scene around the sign.
    # Trimming it stops the box from being mostly background, which would teach the
    # detector to look for a pasted rectangle rather than for a sign.
    cw, ch = crop.size
    m = 0.09
    crop = crop.crop((int(cw * m), int(ch * m), int(cw * (1 - m)), int(ch * (1 - m))))
    sign = crop.convert("RGB").resize((size, size), Image.LANCZOS)
    if rng.random() < 0.35:
        sign = sign.rotate(rng.uniform(-7, 7), resample=Image.BICUBIC, expand=False)
    if rng.random() < 0.3:
        sign = sign.filter(ImageFilter.GaussianBlur(rng.uniform(0.3, 0.9)))

    for _ in range(30):
        x = rng.randint(6, W - size - 6)
        y = rng.randint(int(H * 0.12), int(H * 0.62))
        box = (x, y, x + size, y + size)
        if any(not (box[2] < t[0] or box[0] > t[2] or box[3] < t[1] or box[1] > t[3]) for t in taken):
            continue

        pole_h = rng.randint(20, 70)
        d = ImageDraw.Draw(scene)
        d.rectangle(
            [x + size // 2 - 2, y + size, x + size // 2 + 2, min(H, y + size + pole_h)],
            fill=(rng.randint(90, 140),) * 3,
        )
        scene.paste(sign, (x, y))
        taken.append(box)
        return box
    return None


def _sources_from_train(rng: random.Random) -> dict:
    """{class_id: [paths]} from archive/Train/<id>/*.png."""
    out = {}
    for cid in range(43):
        folder = ARCHIVE / "Train" / str(cid)
        if folder.is_dir():
            files = list(folder.glob("*.png"))
            if files:
                out[cid] = rng.sample(files, min(len(files), 400))
    return out


def _sources_from_test() -> dict:
    """{class_id: [paths]} from the official test split, via Test.csv."""
    out = {}
    csv_path = ARCHIVE / "Test.csv"
    if not csv_path.exists():
        return out
    with open(csv_path, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            out.setdefault(int(row["ClassId"]), []).append(ARCHIVE / row["Path"])
    return out


def build(split: str, count: int, sources: dict, rng: random.Random) -> int:
    img_dir = OUT / "images" / split
    lbl_dir = OUT / "labels" / split
    img_dir.mkdir(parents=True, exist_ok=True)
    lbl_dir.mkdir(parents=True, exist_ok=True)

    classes = [c for c in sources if c in GROUP and sources[c]]
    written = 0
    for i in range(count):
        rng_scene = random.Random(rng.random())
        scene = _sky_and_ground(rng_scene)
        taken, lines = [], []

        for _ in range(rng_scene.randint(1, 3)):
            cid = rng_scene.choice(classes)
            try:
                crop = Image.open(rng_scene.choice(sources[cid]))
            except OSError:
                continue
            box = _place(scene, crop, rng_scene, taken)
            if box:
                x1, y1, x2, y2 = box
                lines.append(
                    f"{GROUP[cid]} {(x1 + x2) / 2 / W:.6f} {(y1 + y2) / 2 / H:.6f} "
                    f"{(x2 - x1) / W:.6f} {(y2 - y1) / H:.6f}"
                )

        if not lines:
            continue

        # Whole-scene camera effects, applied after pasting so signs and background share them.
        if rng_scene.random() < 0.3:
            scene = scene.filter(ImageFilter.GaussianBlur(rng_scene.uniform(0.2, 0.7)))

        name = f"{split}_{i:05d}"
        scene.save(img_dir / f"{name}.jpg", quality=rng_scene.randint(72, 95))
        (lbl_dir / f"{name}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        written += 1

        if written % 250 == 0:
            print(f"  {split}: {written}/{count}", flush=True)

    return written


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", type=int, default=1500)
    ap.add_argument("--val", type=int, default=300)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    if not (ARCHIVE / "Train").is_dir():
        raise SystemExit(f"GTSRB crops not found at {ARCHIVE / 'Train'}")

    rng = random.Random(args.seed)
    print("Reading GTSRB crops...")
    train_src = _sources_from_train(rng)
    test_src = _sources_from_test() or train_src
    if test_src is train_src:
        print("  WARNING: Test.csv missing — validation signs come from the training crops.")

    n_train = build("train", args.train, train_src, rng)
    n_val = build("val", args.val, test_src, rng)

    yaml_path = OUT / "data.yaml"
    yaml_path.write_text(
        f"path: {OUT.as_posix()}\n"
        "train: images/train\n"
        "val: images/val\n\n"
        "names:\n"
        "  0: prohibitory\n"
        "  1: mandatory\n"
        "  2: warning\n"
        "  3: information\n",
        encoding="utf-8",
    )

    print(f"\n{n_train} train scenes, {n_val} val scenes")
    print(f"Wrote {yaml_path}")


if __name__ == "__main__":
    main()
