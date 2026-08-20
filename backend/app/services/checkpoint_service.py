"""
Checkpoint and speed-trap reports.

Drivers mark what they pass; other drivers nearby see it while it is still likely to be
there. Each kind has its own lifetime — a fixed speed camera is worth knowing about for a
long time, a mobile speed gun for barely an hour — and a report simply stops being
returned once it goes stale rather than being deleted on a timer.

Distance uses the same haversine helper the Nearby page already relies on.
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.checkpoint import CheckpointReport
from app.services.emergency_service import haversine_distance

# How long a report stays useful, in minutes. A flood outlasts a speed gun by a day.
KINDS = [
    # Police activity
    {"key": "police_checkpoint", "label": "Police checkpoint", "lifetime_minutes": 180,
     "group": "police", "hint": "Officers stopping vehicles and checking documents"},
    {"key": "speed_gun", "label": "Speed gun", "lifetime_minutes": 90,
     "group": "police", "hint": "A handheld radar or laser being used at the roadside"},
    {"key": "speed_camera", "label": "Fixed speed camera", "lifetime_minutes": 43200,
     "group": "police", "hint": "A permanent camera — worth knowing about for a month"},
    {"key": "breathalyser", "label": "Breath testing", "lifetime_minutes": 180,
     "group": "police", "hint": "An alcohol testing operation"},

    # Road hazards
    {"key": "accident", "label": "Accident", "lifetime_minutes": 120,
     "group": "hazard", "hint": "A collision blocking or slowing the road"},
    {"key": "road_block", "label": "Road block / diversion", "lifetime_minutes": 240,
     "group": "hazard", "hint": "A closure, diversion or heavy congestion"},
    {"key": "roadwork", "label": "Roadworks", "lifetime_minutes": 10080,
     "group": "hazard", "hint": "Construction or resurfacing — usually there for days"},
    {"key": "flood", "label": "Flooding", "lifetime_minutes": 720,
     "group": "hazard", "hint": "Standing water making the road impassable or dangerous"},
    {"key": "landslide", "label": "Landslide / rockfall", "lifetime_minutes": 4320,
     "group": "hazard", "hint": "Earth or rock on the carriageway — common on hill roads"},
    {"key": "fallen_tree", "label": "Fallen tree / debris", "lifetime_minutes": 480,
     "group": "hazard", "hint": "An obstruction after wind or rain"},
    {"key": "animal", "label": "Animals on the road", "lifetime_minutes": 120,
     "group": "hazard", "hint": "Elephants, cattle or strays — a real hazard on rural routes"},
    {"key": "broken_road", "label": "Pothole / broken surface", "lifetime_minutes": 20160,
     "group": "hazard", "hint": "Damaged surface worth slowing for"},
]

GROUPS = [
    {"key": "police", "label": "Police activity"},
    {"key": "hazard", "label": "Road hazards"},
]

_LIFETIME = {k["key"]: k["lifetime_minutes"] for k in KINDS}
_LABEL = {k["key"]: k["label"] for k in KINDS}
_GROUP = {k["key"]: k["group"] for k in KINDS}

DEFAULT_RADIUS_KM = 15.0

DISCLAIMER = (
    "Reports come from other drivers, not from the police, and may be wrong or out of date. "
    "Nothing here is a reason to speed up, slow down suddenly, or change route unsafely — "
    "drive to the road and the law, not to the map."
)


def _expires_at(report: CheckpointReport) -> datetime:
    """A confirmation restarts the clock, so a busy checkpoint stays on the map."""
    minutes = _LIFETIME.get(report.kind, 180)
    return (report.last_confirmed_at or report.reported_at) + timedelta(minutes=minutes)


def is_active(report: CheckpointReport, now: datetime | None = None) -> bool:
    now = now or datetime.utcnow()
    return report.cleared_at is None and _expires_at(report) > now


def serialise(report: CheckpointReport, now: datetime | None = None,
              lat: float | None = None, lon: float | None = None) -> dict:
    now = now or datetime.utcnow()
    expires = _expires_at(report)
    minutes_left = max(0, int((expires - now).total_seconds() // 60))
    age_minutes = int((now - report.reported_at).total_seconds() // 60)

    data = {
        "id": report.id,
        "kind": report.kind,
        "kind_label": _LABEL.get(report.kind, report.kind),
        "group": _GROUP.get(report.kind, "hazard"),
        "latitude": report.latitude,
        "longitude": report.longitude,
        "road_name": report.road_name,
        "note": report.note,
        "confirmations": report.confirmations,
        "reported_at": report.reported_at.isoformat(),
        "last_confirmed_at": report.last_confirmed_at.isoformat() if report.last_confirmed_at else None,
        "age_minutes": age_minutes,
        "minutes_left": minutes_left,
        "expires_at": expires.isoformat(),
        "active": is_active(report, now),
        "cleared": report.cleared_at is not None,
        "maps_url": f"https://www.google.com/maps/search/?api=1&query={report.latitude},{report.longitude}",
        # reported_by is deliberately not exposed — who reported a checkpoint is nobody
        # else's business, and publishing it would put that driver at risk.
    }

    if lat is not None and lon is not None:
        data["distance_km"] = haversine_distance(lat, lon, report.latitude, report.longitude)

    # A single unconfirmed report an hour old deserves less trust than five fresh ones
    if report.confirmations >= 3:
        data["reliability"] = "confirmed"
    elif report.confirmations >= 1:
        data["reliability"] = "corroborated"
    elif age_minutes <= 30:
        data["reliability"] = "fresh"
    else:
        data["reliability"] = "unconfirmed"

    return data


class CheckpointService:
    @staticmethod
    def nearby(db: Session, lat: float, lon: float, radius_km: float = DEFAULT_RADIUS_KM,
               kind: str | None = None, now: datetime | None = None) -> dict:
        now = now or datetime.utcnow()
        query = db.query(CheckpointReport).filter(CheckpointReport.cleared_at.is_(None))
        if kind and kind != "all":
            query = query.filter(CheckpointReport.kind == kind)

        items = []
        for report in query.all():
            if not is_active(report, now):
                continue
            data = serialise(report, now, lat, lon)
            if data["distance_km"] <= radius_km:
                items.append(data)

        items.sort(key=lambda r: r["distance_km"])
        return {
            "reports": items,
            "count": len(items),
            "radius_km": radius_km,
            "centre": {"latitude": lat, "longitude": lon},
            "kinds": KINDS,
            "groups": GROUPS,
            "disclaimer": DISCLAIMER,
        }

    @staticmethod
    def list_all(db: Session, include_expired: bool = False, now: datetime | None = None) -> dict:
        now = now or datetime.utcnow()
        rows = db.query(CheckpointReport).order_by(CheckpointReport.reported_at.desc()).all()
        items = [serialise(r, now) for r in rows]
        if not include_expired:
            items = [r for r in items if r["active"]]
        return {
            "reports": items,
            "count": len(items),
            "kinds": KINDS,
            "groups": GROUPS,
            "disclaimer": DISCLAIMER,
        }

    @staticmethod
    def report(db: Session, payload: dict, reported_by: int | None = None,
               now: datetime | None = None) -> dict:
        """
        Add a report — unless there is already an active one of the same kind within
        250 m, in which case this counts as confirming that one instead of duplicating it.
        """
        now = now or datetime.utcnow()
        lat, lon, kind = payload["latitude"], payload["longitude"], payload["kind"]

        for existing in db.query(CheckpointReport).filter(
            CheckpointReport.kind == kind, CheckpointReport.cleared_at.is_(None)
        ).all():
            if not is_active(existing, now):
                continue
            if haversine_distance(lat, lon, existing.latitude, existing.longitude) <= 0.25:
                existing.confirmations += 1
                existing.last_confirmed_at = now
                db.commit()
                db.refresh(existing)
                return {**serialise(existing, now, lat, lon), "merged": True}

        report = CheckpointReport(
            kind=kind,
            latitude=lat,
            longitude=lon,
            road_name=payload.get("road_name"),
            note=payload.get("note"),
            confirmations=0,
            last_confirmed_at=now,
            reported_at=now,
            reported_by=reported_by,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return {**serialise(report, now, lat, lon), "merged": False}

    @staticmethod
    def confirm(db: Session, report_id: int, now: datetime | None = None) -> dict | None:
        now = now or datetime.utcnow()
        report = db.query(CheckpointReport).filter(CheckpointReport.id == report_id).first()
        if not report:
            return None
        report.confirmations += 1
        report.last_confirmed_at = now
        db.commit()
        db.refresh(report)
        return serialise(report, now)

    @staticmethod
    def clear(db: Session, report_id: int, now: datetime | None = None) -> dict | None:
        """Mark a report as gone — the checkpoint has packed up."""
        now = now or datetime.utcnow()
        report = db.query(CheckpointReport).filter(CheckpointReport.id == report_id).first()
        if not report:
            return None
        report.cleared_at = now
        db.commit()
        db.refresh(report)
        return serialise(report, now)

    @staticmethod
    def delete(db: Session, report_id: int, user_id: int | None = None) -> bool:
        """
        Remove a report. A driver may withdraw only their own — anyone can mark a report
        'gone now', which is the right tool for a checkpoint that has simply moved on.
        """
        query = db.query(CheckpointReport).filter(CheckpointReport.id == report_id)
        if user_id is not None:
            query = query.filter(CheckpointReport.reported_by == user_id)
        report = query.first()
        if not report:
            return False
        db.delete(report)
        db.commit()
        return True
