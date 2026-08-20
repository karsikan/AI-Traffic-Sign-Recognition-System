"""
Incident recorder — the driver's own evidence file for an accident or a dispute.
"""

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.roadside import IncidentCreate, IncidentUpdate
from app.services.incident_service import (
    ALLOWED_MEDIA,
    CAPTURE_CHECKLIST,
    INCIDENT_TYPES,
    LEGAL_NOTE,
    MAX_MEDIA_BYTES,
    IncidentService,
    content_type_allowed,
)
from app.models.user import User
from app.services.deps import get_current_user
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/incidents", tags=["Incident Recorder"])


@router.get("")
async def list_incidents(
    incident_type: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return success_response("Incidents listed successfully", {
            "incidents": IncidentService.list_incidents(db, user.id, incident_type),
            "types": INCIDENT_TYPES,
        })
    except Exception as e:
        return error_response(str(e), "INCIDENT_LIST_ERROR", 500)


@router.get("/guide")
async def capture_guide():
    """What to capture and in what order, plus where the law stands on recording."""
    return success_response("Incident capture guide", {
        "checklist": CAPTURE_CHECKLIST,
        "types": INCIDENT_TYPES,
        "legal_note": LEGAL_NOTE,
        "max_media_mb": MAX_MEDIA_BYTES // (1024 * 1024),
    })


@router.post("")
async def create_incident(payload: IncidentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        incident = IncidentService.create_incident(db, user.id, payload.model_dump(exclude_unset=True))
        return success_response("Incident recorded", incident, status_code=201)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "INCIDENT_CREATE_ERROR", 500)


@router.get("/{incident_id}")
async def get_incident(incident_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    incident = IncidentService.get_incident(db, incident_id, user.id)
    if not incident:
        return error_response(f"No incident with id {incident_id}.", "NOT_FOUND", 404)
    return success_response("Incident fetched", incident)


@router.patch("/{incident_id}")
async def update_incident(incident_id: int, payload: IncidentUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return error_response("Nothing to update.", "EMPTY_UPDATE", 400)
    try:
        incident = IncidentService.update_incident(db, incident_id, user.id, changes)
        if not incident:
            return error_response(f"No incident with id {incident_id}.", "NOT_FOUND", 404)
        return success_response("Incident updated", incident)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "INCIDENT_UPDATE_ERROR", 500)


@router.post("/{incident_id}/media")
async def add_media(
    incident_id: int,
    media_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Attach a photo, an audio note or a short video captured at the scene."""
    if media_type not in ALLOWED_MEDIA:
        return error_response(
            f"Unsupported media type '{media_type}'. Use one of: {', '.join(ALLOWED_MEDIA)}.",
            "INVALID_MEDIA_TYPE", 400,
        )

    if not content_type_allowed(media_type, file.content_type):
        return error_response(
            f"File does not look like {media_type} content ({file.content_type}).",
            "INVALID_FILE_TYPE", 400,
        )

    try:
        content = await file.read()
        if len(content) > MAX_MEDIA_BYTES:
            return error_response(
                f"File is larger than the {MAX_MEDIA_BYTES // (1024 * 1024)} MB limit.",
                "FILE_TOO_LARGE", 413,
            )
        incident = IncidentService.add_media(db, incident_id, user.id, media_type, file.filename or "", content)
        if not incident:
            return error_response(f"No incident with id {incident_id}.", "NOT_FOUND", 404)
        return success_response("Media attached", incident, status_code=201)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "MEDIA_UPLOAD_ERROR", 500)


@router.get("/{incident_id}/statement")
async def incident_statement(incident_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """The record written out as a plain statement the driver can print or hand over."""
    statement = IncidentService.build_statement(db, incident_id, user.id)
    if not statement:
        return error_response(f"No incident with id {incident_id}.", "NOT_FOUND", 404)
    return success_response("Statement generated", statement)


@router.delete("/{incident_id}")
async def delete_incident(incident_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        if not IncidentService.delete_incident(db, incident_id, user.id):
            return error_response(f"No incident with id {incident_id}.", "NOT_FOUND", 404)
        return success_response("Incident deleted", {"id": incident_id})
    except Exception as e:
        db.rollback()
        return error_response(str(e), "INCIDENT_DELETE_ERROR", 500)
