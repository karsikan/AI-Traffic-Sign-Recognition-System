"""
Incident recorder.

Whatever a driver writes down at the roadside is worth more than what they remember a
week later. This keeps the note, the officer's number, the position and any photos or
audio together with the time they were captured, and can hand the whole thing back as a
single statement the driver can print or take to a lawyer.

Media is written under ``uploads/incidents/<incident_id>/`` and served by the static
mount already configured in ``main.py``.
"""

import os
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.incident import Incident, IncidentMedia

UPLOAD_ROOT = os.path.join("uploads", "incidents")

INCIDENT_TYPES = [
    {"key": "police_dispute", "label": "Dispute with an officer",
     "hint": "A stop or charge you disagree with, or a demand for money"},
    {"key": "accident", "label": "Accident",
     "hint": "A collision, however minor — record it before the vehicles move"},
    {"key": "breakdown", "label": "Breakdown",
     "hint": "A vehicle failure, for an insurance or workshop claim"},
    {"key": "other", "label": "Something else",
     "hint": "Anything worth a timestamped note"},
]

ALLOWED_MEDIA = {
    "photo": {"image/"},
    "audio": {"audio/"},
    "video": {"video/"},
}

# A browser recording a voice note may label the blob audio/webm, video/webm or nothing
# at all depending on the platform, and a file picker often sends octet-stream. Treat an
# unknown type as acceptable — the media_type parameter is already checked against the
# allow-list above, and the size cap does the rest. Only a confident mismatch is refused.
UNKNOWN_CONTENT_TYPES = {"application/octet-stream", "binary/octet-stream", ""}

# webm and mp4 containers legitimately carry audio-only streams
CONTAINER_ALIASES = {
    "audio": {"video/webm", "video/mp4", "video/ogg"},
    "video": {"audio/webm", "audio/mp4"},
    "photo": set(),
}


def content_type_allowed(media_type: str, content_type: str | None) -> bool:
    """Whether an upload's declared type is compatible with the media slot it claims."""
    declared = (content_type or "").split(";")[0].strip().lower()
    if declared in UNKNOWN_CONTENT_TYPES:
        return True
    if any(declared.startswith(prefix) for prefix in ALLOWED_MEDIA[media_type]):
        return True
    return declared in CONTAINER_ALIASES[media_type]


MAX_MEDIA_BYTES = 25 * 1024 * 1024   # 25 MB per file

# What to capture, in the order that matters if the stop ends early
CAPTURE_CHECKLIST = [
    {"step": 1, "title": "The officer's number",
     "detail": "Every officer has an official number. Ask for it and write it down first — without it a complaint goes nowhere."},
    {"step": 2, "title": "A photo of the papers",
     "detail": "Photograph the charge sheet or the yellow permit, both sides, before you leave. Check the offence, section, amount and dates are filled in."},
    {"step": 3, "title": "The scene",
     "detail": "Wide shot showing where you are, then the vehicles, then any damage or road markings. Include a road name or landmark in one frame."},
    {"step": 4, "title": "A voice note while it is fresh",
     "detail": "Say the date, time, place, what happened and what was said. Thirty seconds now beats an hour of recollection later."},
    {"step": 5, "title": "Witnesses",
     "detail": "A name and phone number from anyone who saw it. Most cases turn on whether there was an independent witness."},
    {"step": 6, "title": "Tell someone where you are",
     "detail": "Send your location to a family member. Use the SOS button if you feel unsafe."},
]

LEGAL_NOTE = (
    "You may record in a public place, including a roadside stop, provided you do not "
    "obstruct the officer or interfere with their duty. Do not conceal that you are "
    "recording if you are asked directly, and never record inside a police station without "
    "permission. These files are stored on this machine only — nothing is uploaded anywhere."
)


def _owned(db: Session, incident_id: int, user_id: int) -> Incident | None:
    """Look an incident up by id and owner together — see the note in spot_fine_service."""
    return (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.user_id == user_id)
        .first()
    )


def _media_dir(incident_id: int) -> str:
    path = os.path.join(UPLOAD_ROOT, str(incident_id))
    os.makedirs(path, exist_ok=True)
    return path


def serialise(incident: Incident, media: list[IncidentMedia]) -> dict:
    maps_url = None
    if incident.latitude is not None and incident.longitude is not None:
        maps_url = (
            f"https://www.google.com/maps/search/?api=1"
            f"&query={incident.latitude},{incident.longitude}"
        )

    return {
        "id": incident.id,
        "incident_type": incident.incident_type,
        "title": incident.title,
        "description": incident.description,
        "officer_no": incident.officer_no,
        "officer_name": incident.officer_name,
        "police_station": incident.police_station,
        "vehicle_no": incident.vehicle_no,
        "other_party": incident.other_party,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "location_note": incident.location_note,
        "maps_url": maps_url,
        "occurred_at": incident.occurred_at.isoformat() if incident.occurred_at else None,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "media": [
            {
                "id": m.id,
                "media_type": m.media_type,
                "url": "/" + m.file_path.replace("\\", "/"),
                "original_name": m.original_name,
                "size_bytes": m.size_bytes,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in media
        ],
        "media_count": len(media),
    }


class IncidentService:
    @staticmethod
    def _media_for(db: Session, incident_id: int) -> list[IncidentMedia]:
        return (
            db.query(IncidentMedia)
            .filter(IncidentMedia.incident_id == incident_id)
            .order_by(IncidentMedia.id.asc())
            .all()
        )

    @staticmethod
    def list_incidents(db: Session, user_id: int, incident_type: str | None = None) -> list[dict]:
        query = db.query(Incident).filter(Incident.user_id == user_id)
        if incident_type and incident_type != "all":
            query = query.filter(Incident.incident_type == incident_type)
        rows = query.order_by(Incident.occurred_at.desc(), Incident.id.desc()).all()
        return [serialise(i, IncidentService._media_for(db, i.id)) for i in rows]

    @staticmethod
    def get_incident(db: Session, incident_id: int, user_id: int) -> dict | None:
        incident = _owned(db, incident_id, user_id)
        if not incident:
            return None
        return serialise(incident, IncidentService._media_for(db, incident_id))

    @staticmethod
    def create_incident(db: Session, user_id: int, payload: dict) -> dict:
        if not payload.get("occurred_at"):
            payload["occurred_at"] = datetime.utcnow()
        incident = Incident(**payload, user_id=user_id)
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return serialise(incident, [])

    @staticmethod
    def update_incident(db: Session, incident_id: int, user_id: int, changes: dict) -> dict | None:
        incident = _owned(db, incident_id, user_id)
        if not incident:
            return None
        for key, value in changes.items():
            setattr(incident, key, value)
        db.commit()
        db.refresh(incident)
        return serialise(incident, IncidentService._media_for(db, incident_id))

    @staticmethod
    def add_media(db: Session, incident_id: int, user_id: int, media_type: str,
                  filename: str, content: bytes) -> dict | None:
        incident = _owned(db, incident_id, user_id)
        if not incident:
            return None

        extension = os.path.splitext(filename or "")[1][:10] or {
            "photo": ".jpg", "audio": ".webm", "video": ".webm",
        }.get(media_type, "")
        stored_name = f"{media_type}_{uuid.uuid4().hex[:12]}{extension}"
        path = os.path.join(_media_dir(incident_id), stored_name)

        with open(path, "wb") as handle:
            handle.write(content)

        record = IncidentMedia(
            incident_id=incident_id,
            media_type=media_type,
            file_path=path,
            original_name=filename,
            size_bytes=len(content),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return serialise(incident, IncidentService._media_for(db, incident_id))

    @staticmethod
    def delete_incident(db: Session, incident_id: int, user_id: int) -> bool:
        incident = _owned(db, incident_id, user_id)
        if not incident:
            return False

        for media in IncidentService._media_for(db, incident_id):
            try:
                os.remove(media.file_path)
            except OSError:
                pass          # the row goes either way — a missing file is not an error
            db.delete(media)

        db.delete(incident)
        db.commit()

        try:
            os.rmdir(os.path.join(UPLOAD_ROOT, str(incident_id)))
        except OSError:
            pass
        return True

    @staticmethod
    def build_statement(db: Session, incident_id: int, user_id: int) -> dict | None:
        """
        The incident written out as a plain statement — the shape a driver would hand to
        an insurer, an OIC or a lawyer.
        """
        incident = _owned(db, incident_id, user_id)
        if not incident:
            return None
        media = IncidentService._media_for(db, incident_id)

        lines = []
        when = incident.occurred_at.strftime("%d %B %Y at %H:%M") if incident.occurred_at else "an unrecorded time"
        lines.append(f"On {when} the following was recorded.")

        if incident.location_note:
            lines.append(f"Location: {incident.location_note}.")
        if incident.latitude is not None and incident.longitude is not None:
            lines.append(f"GPS position: {incident.latitude:.6f}, {incident.longitude:.6f}.")
        if incident.vehicle_no:
            lines.append(f"Vehicle driven: {incident.vehicle_no}.")
        if incident.officer_no or incident.officer_name or incident.police_station:
            who = ", ".join(x for x in [
                f"officer number {incident.officer_no}" if incident.officer_no else None,
                f"name given as {incident.officer_name}" if incident.officer_name else None,
                f"station {incident.police_station}" if incident.police_station else None,
            ] if x)
            lines.append(f"Officer involved: {who}.")
        if incident.other_party:
            lines.append(f"Other party: {incident.other_party}")
        if incident.description:
            lines.append("")
            lines.append("Account:")
            lines.append(incident.description)
        if media:
            lines.append("")
            counts: dict[str, int] = {}
            for m in media:
                counts[m.media_type] = counts.get(m.media_type, 0) + 1
            summary = ", ".join(f"{n} {kind}{'s' if n > 1 else ''}" for kind, n in counts.items())
            lines.append(f"Attached evidence: {summary}, captured at the time.")

        return {
            "incident_id": incident_id,
            "title": incident.title or "Incident record",
            "statement": "\n".join(lines),
            "media_count": len(media),
            "note": (
                "Generated from what you entered. Read it through and correct anything "
                "before relying on it — it is your statement, not a legal document."
            ),
        }
