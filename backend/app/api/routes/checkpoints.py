"""
Checkpoint and speed-trap reports shared between drivers.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.roadside import CheckpointCreate
from app.services.checkpoint_service import (
    DEFAULT_RADIUS_KM,
    DISCLAIMER,
    GROUPS,
    KINDS,
    CheckpointService,
)
from app.models.user import User
from app.services.deps import get_current_user, get_optional_user
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/checkpoints", tags=["Checkpoint Reports"])


@router.get("/kinds")
async def list_kinds():
    """What can be reported, and how long each kind stays on the map."""
    return success_response("Report kinds", {"kinds": KINDS, "groups": GROUPS, "disclaimer": DISCLAIMER})


@router.get("")
async def list_reports(
    include_expired: bool = Query(False),
    db: Session = Depends(get_db),
):
    try:
        return success_response("Reports listed successfully",
                                CheckpointService.list_all(db, include_expired))
    except Exception as e:
        return error_response(str(e), "CHECKPOINT_LIST_ERROR", 500)


@router.get("/nearby")
async def nearby_reports(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0, le=200),
    kind: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Active reports within the radius, nearest first."""
    try:
        return success_response("Nearby reports fetched",
                                CheckpointService.nearby(db, latitude, longitude, radius_km, kind))
    except Exception as e:
        return error_response(str(e), "CHECKPOINT_NEARBY_ERROR", 500)


@router.post("")
async def report_checkpoint(
    payload: CheckpointCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Mark something you have just passed. A matching report within 250 m is confirmed
    rather than duplicated.
    """
    valid = {k["key"] for k in KINDS}
    if payload.kind not in valid:
        return error_response(
            f"Unknown kind '{payload.kind}'. Use one of: {', '.join(sorted(valid))}.",
            "INVALID_KIND", 400,
        )
    try:
        report = CheckpointService.report(db, payload.model_dump(), reported_by=user.id)
        message = "Existing report confirmed" if report["merged"] else "Report added"
        return success_response(message, report, status_code=201)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "CHECKPOINT_CREATE_ERROR", 500)


@router.post("/{report_id}/confirm")
async def confirm_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """"Still there" — pushes the expiry out and raises the reliability."""
    try:
        report = CheckpointService.confirm(db, report_id)
        if not report:
            return error_response(f"No report with id {report_id}.", "NOT_FOUND", 404)
        return success_response("Report confirmed", report)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "CHECKPOINT_CONFIRM_ERROR", 500)


@router.post("/{report_id}/clear")
async def clear_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """"Gone now" — takes it off the map for everyone."""
    try:
        report = CheckpointService.clear(db, report_id)
        if not report:
            return error_response(f"No report with id {report_id}.", "NOT_FOUND", 404)
        return success_response("Report cleared", report)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "CHECKPOINT_CLEAR_ERROR", 500)


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        if not CheckpointService.delete(db, report_id, user.id):
            return error_response(f"No report with id {report_id}.", "NOT_FOUND", 404)
        return success_response("Report deleted", {"id": report_id})
    except Exception as e:
        db.rollback()
        return error_response(str(e), "CHECKPOINT_DELETE_ERROR", 500)
