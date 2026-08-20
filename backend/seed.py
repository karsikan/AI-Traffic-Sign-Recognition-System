"""Seed the traffic_signs, predictions, and feedback tables in SQLite/MySQL.
Run:  python seed.py
"""
import random
from datetime import datetime, timedelta
from app.core.database import Base, SessionLocal, engine
from app.models.traffic_sign import TrafficSign
from app.models.prediction import Prediction
from app.models.feedback import Feedback
from app.ml.pipeline import GTSRB_LABELS

CATEGORY_BY_KEYWORD = [
    ("Speed limit", "prohibitory"),
    ("No ", "prohibitory"),
    ("Yield", "mandatory"),
    ("Stop", "mandatory"),
    ("Turn", "mandatory"),
    ("Keep", "mandatory"),
    ("Roundabout", "mandatory"),
    ("Ahead", "mandatory"),
    ("Priority", "info"),
    ("End", "info"),
]


def categorise(name: str) -> str:
    for kw, cat in CATEGORY_BY_KEYWORD:
        if name.startswith(kw):
            return cat
    return "warning"


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed Traffic Signs
    if db.query(TrafficSign).count() == 0:
        for idx, name in enumerate(GTSRB_LABELS):
            cat = categorise(name)
            db.add(TrafficSign(
                class_id=idx,
                name=name,
                category=cat,
                meaning=f"{name}: drivers must observe this {cat} sign.",
                safety_instruction=f"Reduce speed if needed and respond to '{name}'.",
                traffic_rule=f"Under Sri Lankan road rules, obey the '{name}' sign.",
            ))
        db.commit()
        print(f"Seeded {len(GTSRB_LABELS)} traffic signs.")
    else:
        print("traffic_signs already seeded.")

    # Seed mock predictions & feedback if not present
    if db.query(Prediction).count() == 0:
        predictions = []
        now = datetime.utcnow()
        for i in range(50):
            sign_name = random.choice(GTSRB_LABELS)
            days_ago = random.randint(0, 9)
            created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            pred = Prediction(
                source_type=random.choice(["image", "webcam"]),
                media_path=f"uploads/images/seed_{i}.jpg",
                sign_name=sign_name,
                confidence=round(random.uniform(0.82, 0.99), 4),
                created_at=created_at,
            )
            db.add(pred)
            db.flush()
            predictions.append(pred)
        db.commit()

        # Seed a few feedback entries (wrong predictions reported by user)
        for idx, p in enumerate(predictions[:3]):
            correct_sign_name = random.choice([s for s in GTSRB_LABELS if s != p.sign_name])
            fb = Feedback(
                prediction_id=p.id,
                predicted_label=p.sign_name,
                correct_label=correct_sign_name,
                comment=f"System predicted '{p.sign_name}' but it is actually '{correct_sign_name}'",
                created_at=p.created_at + timedelta(minutes=5),
            )
            db.add(fb)
        db.commit()
        print("Seeded 50 mock predictions and 3 wrong prediction feedback entries.")
    else:
        print("predictions already seeded.")

    db.close()


if __name__ == "__main__":
    main()
