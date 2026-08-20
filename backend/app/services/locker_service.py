"""
Digital document locker.

Saves the renewal-critical details of a driver's documents and works out, every time
they are read, how close each one is to expiry. The status vocabulary is the same one
the Document Scanner uses — valid / expiring / expired / not_applicable / unknown — so
both pages can be styled from the same map.
"""

from datetime import date

from sqlalchemy.orm import Session

from app.models.user_document import UserDocument
from app.services.document_service import DOC_TYPES

# A CR book has no expiry date, so nothing in the locker should nag about it either.
NON_EXPIRING = {key for key, spec in DOC_TYPES.items() if not spec.get("expiry_field")}


def _owned(db: Session, doc_id: int, user_id: int) -> UserDocument | None:
    """Look a document up by id and owner together — see the note in spot_fine_service."""
    return (
        db.query(UserDocument)
        .filter(UserDocument.id == doc_id, UserDocument.user_id == user_id)
        .first()
    )


def locker_types() -> list[dict]:
    """The document types the locker offers, taken from the scanner's own registry."""
    return [
        {
            "key": key,
            "label": spec["label"],
            "hint": spec["hint"],
            "expires": bool(spec["expiry_field"]),
            "default_remind_days": spec.get("warn_days") or 30,
            "expired_note": spec.get("expired_note"),
        }
        for key, spec in DOC_TYPES.items()
    ]


def build_expiry(doc: UserDocument, today: date | None = None) -> dict:
    """Days remaining, a progress figure, and a traffic-light status for one document."""
    today = today or date.today()
    spec = DOC_TYPES.get(doc.doc_type, {})
    label = spec.get("label", doc.doc_type)

    if doc.doc_type in NON_EXPIRING:
        return {
            "status": "not_applicable",
            "message": f"{label} does not expire.",
            "days_remaining": None, "total_days": None,
            "percent_elapsed": None, "expired": False,
        }

    if not doc.expiry_date:
        return {
            "status": "unknown",
            "message": "No expiry date saved. Add one so this document can be tracked.",
            "days_remaining": None, "total_days": None,
            "percent_elapsed": None, "expired": None,
        }

    days_remaining = (doc.expiry_date - today).days
    total_days = None
    percent = None
    if doc.issued_date and doc.expiry_date > doc.issued_date:
        total_days = (doc.expiry_date - doc.issued_date).days
        elapsed = max(0, min(total_days, (today - doc.issued_date).days))
        percent = round(elapsed / total_days * 100, 1)

    warn = doc.remind_days_before or 30
    if days_remaining < 0:
        status = "expired"
        message = f"EXPIRED {abs(days_remaining)} day(s) ago. {spec.get('expired_note') or ''}".strip()
    elif days_remaining <= warn:
        status = "expiring"
        message = f"Expires in {days_remaining} day(s) — start the renewal now."
    else:
        status = "valid"
        message = f"Valid — {days_remaining} day(s) remaining."

    return {
        "status": status, "message": message,
        "days_remaining": days_remaining, "total_days": total_days,
        "percent_elapsed": percent, "expired": days_remaining < 0,
    }


def serialise(doc: UserDocument, today: date | None = None) -> dict:
    from app.schemas.locker import DocumentOut

    spec = DOC_TYPES.get(doc.doc_type, {})
    data = DocumentOut.model_validate(doc).model_dump(mode="json")
    data["doc_label"] = spec.get("label", doc.doc_type)
    data["expiry"] = build_expiry(doc, today)
    return data


class LockerService:
    @staticmethod
    def list_documents(db: Session, user_id: int, doc_type: str | None = None,
                       today: date | None = None) -> list[dict]:
        query = db.query(UserDocument).filter(UserDocument.user_id == user_id)
        if doc_type and doc_type != "all":
            query = query.filter(UserDocument.doc_type == doc_type)
        rows = query.order_by(UserDocument.expiry_date.is_(None), UserDocument.expiry_date.asc()).all()
        return [serialise(d, today) for d in rows]

    @staticmethod
    def get_document(db: Session, doc_id: int, user_id: int, today: date | None = None) -> dict | None:
        doc = _owned(db, doc_id, user_id)
        return serialise(doc, today) if doc else None

    @staticmethod
    def create_document(db: Session, user_id: int, payload: dict, today: date | None = None) -> dict:
        doc = UserDocument(**payload, user_id=user_id)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return serialise(doc, today)

    @staticmethod
    def update_document(db: Session, doc_id: int, user_id: int, changes: dict,
                        today: date | None = None) -> dict | None:
        doc = _owned(db, doc_id, user_id)
        if not doc:
            return None
        for key, value in changes.items():
            setattr(doc, key, value)
        db.commit()
        db.refresh(doc)
        return serialise(doc, today)

    @staticmethod
    def delete_document(db: Session, doc_id: int, user_id: int) -> bool:
        doc = _owned(db, doc_id, user_id)
        if not doc:
            return False
        db.delete(doc)
        db.commit()
        return True

    @staticmethod
    def alerts(db: Session, user_id: int, today: date | None = None) -> dict:
        """
        Everything that needs attention — expired first, then whatever falls inside its
        own reminder window. This is what a scheduled SMS or email job would read.
        """
        today = today or date.today()
        expired, expiring = [], []

        for doc in db.query(UserDocument).filter(UserDocument.user_id == user_id).all():
            item = serialise(doc, today)
            if item["expiry"]["status"] == "expired":
                expired.append(item)
            elif item["expiry"]["status"] == "expiring":
                expiring.append(item)

        expired.sort(key=lambda d: d["expiry"]["days_remaining"])
        expiring.sort(key=lambda d: d["expiry"]["days_remaining"])

        return {
            "expired": expired,
            "expiring": expiring,
            "count": len(expired) + len(expiring),
            "checked_on": today.isoformat(),
        }

    @staticmethod
    def summary(db: Session, user_id: int, today: date | None = None) -> dict:
        today = today or date.today()
        rows = db.query(UserDocument).filter(UserDocument.user_id == user_id).all()
        counts = {"valid": 0, "expiring": 0, "expired": 0, "not_applicable": 0, "unknown": 0}
        next_expiry: date | None = None
        next_doc_id: int | None = None

        for doc in rows:
            status = build_expiry(doc, today)["status"]
            counts[status] = counts.get(status, 0) + 1
            if doc.expiry_date and doc.expiry_date >= today:
                if next_expiry is None or doc.expiry_date < next_expiry:
                    next_expiry, next_doc_id = doc.expiry_date, doc.id

        return {
            "total": len(rows),
            **counts,
            "needs_attention": counts["expired"] + counts["expiring"],
            "next_expiry": next_expiry.isoformat() if next_expiry else None,
            "next_expiry_document_id": next_doc_id,
        }
