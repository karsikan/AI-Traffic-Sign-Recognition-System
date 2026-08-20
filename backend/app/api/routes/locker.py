"""
Digital Locker and Demerit Points Tracker.

Both live behind ``/locker`` — the documents the driver is keeping an eye on, and the
points record that decides whether the licence is at risk.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.locker import DemeritCreate, DocumentCreate, DocumentUpdate
from app.services.demerit_service import DemeritService
from app.services.locker_service import LockerService, locker_types
from app.models.user import User
from app.services.deps import get_current_user
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/locker", tags=["Digital Locker"])


# ── Documents ───────────────────────────────────────────────────────────────────

@router.get("/documents")
async def list_documents(
    doc_type: str | None = Query(None, description="Filter to one document type"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return success_response("Documents listed successfully", {
            "documents": LockerService.list_documents(db, user.id, doc_type=doc_type),
            "summary": LockerService.summary(db, user.id),
        })
    except Exception as e:
        return error_response(str(e), "LOCKER_LIST_ERROR", 500)


@router.get("/types")
async def list_types():
    """The document types the locker tracks, shared with the Document Scanner."""
    return success_response("Locker document types", locker_types())


@router.get("/summary")
async def locker_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return success_response("Locker summary", LockerService.summary(db, user.id))
    except Exception as e:
        return error_response(str(e), "LOCKER_SUMMARY_ERROR", 500)


@router.get("/alerts")
async def locker_alerts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Documents that are expired or inside their reminder window. A scheduled SMS or
    email job would read exactly this.
    """
    try:
        return success_response("Expiry alerts", LockerService.alerts(db, user.id))
    except Exception as e:
        return error_response(str(e), "LOCKER_ALERTS_ERROR", 500)


@router.post("/documents")
async def create_document(payload: DocumentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        doc = LockerService.create_document(db, user.id, payload.model_dump())
        return success_response("Document saved successfully", doc, status_code=201)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "LOCKER_CREATE_ERROR", 500)


@router.get("/documents/{doc_id}")
async def get_document(doc_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = LockerService.get_document(db, doc_id, user.id)
    if not doc:
        return error_response(f"No document with id {doc_id}.", "NOT_FOUND", 404)
    return success_response("Document fetched", doc)


@router.patch("/documents/{doc_id}")
async def update_document(doc_id: int, payload: DocumentUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return error_response("Nothing to update.", "EMPTY_UPDATE", 400)
    try:
        doc = LockerService.update_document(db, doc_id, user.id, changes)
        if not doc:
            return error_response(f"No document with id {doc_id}.", "NOT_FOUND", 404)
        return success_response("Document updated successfully", doc)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "LOCKER_UPDATE_ERROR", 500)


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        if not LockerService.delete_document(db, doc_id, user.id):
            return error_response(f"No document with id {doc_id}.", "NOT_FOUND", 404)
        return success_response("Document deleted successfully", {"id": doc_id})
    except Exception as e:
        db.rollback()
        return error_response(str(e), "LOCKER_DELETE_ERROR", 500)


# ── Demerit points ──────────────────────────────────────────────────────────────

@router.get("/demerit")
async def demerit_overview(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Balance, tier, and every recorded offence."""
    try:
        return success_response("Demerit record", {
            "balance": DemeritService.balance(db, user.id),
            "records": DemeritService.list_records(db, user.id),
        })
    except Exception as e:
        return error_response(str(e), "DEMERIT_ERROR", 500)


@router.get("/demerit/catalogue")
async def demerit_catalogue():
    """Point-carrying offences, so a record can be added in one tap."""
    return success_response("Offences carrying demerit points", DemeritService.catalogue())


@router.post("/demerit")
async def add_demerit(payload: DemeritCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        record = DemeritService.add_record(db, user.id, payload.model_dump())
        return success_response("Demerit record added", record, status_code=201)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "DEMERIT_CREATE_ERROR", 500)


@router.delete("/demerit/{record_id}")
async def delete_demerit(record_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        if not DemeritService.delete_record(db, record_id, user.id):
            return error_response(f"No demerit record with id {record_id}.", "NOT_FOUND", 404)
        return success_response("Demerit record deleted", {"id": record_id})
    except Exception as e:
        db.rollback()
        return error_response(str(e), "DEMERIT_DELETE_ERROR", 500)
