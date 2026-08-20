"""
My Fines — the driver's own list of spot-fine charge sheets.

A charge sheet gets here either by hand or straight from the Document Scanner, and from
then on the page shows how long is left to pay, what it costs today, and — where the
licence was kept by the officer — how to get it back.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.spot_fine import SpotFineCreate, SpotFineMarkPaid, SpotFineUpdate
from app.services import document_service
from app.services.spot_fine_service import (
    LICENCE_RETRIEVAL_STEPS,
    SpotFineService,
)
from app.models.user import User
from app.services.deps import get_current_user
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/my-fines", tags=["My Fines Tracker"])


@router.get("")
async def list_fines(
    status: str | None = Query(None, description="pending | paid | court | all"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        fines = SpotFineService.list_fines(db, user.id, status=status)
        return success_response("Fines listed successfully", {
            "fines": fines,
            "summary": SpotFineService.summary(db, user.id),
        })
    except Exception as e:
        return error_response(str(e), "FINES_LIST_ERROR", 500)


@router.get("/summary")
async def fines_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Counts, what is payable today, and the next deadline across every pending fine."""
    try:
        return success_response("Summary fetched", SpotFineService.summary(db, user.id))
    except Exception as e:
        return error_response(str(e), "FINES_SUMMARY_ERROR", 500)


@router.get("/payment-guide")
async def payment_guide():
    """Where and how to pay, and how to get a withheld licence back. No stored data needed."""
    return success_response("Payment and licence retrieval guide", {
        "payment_channels": document_service.FINE_PAYMENT_CHANNELS,
        "payment_note": document_service.FINE_PAYMENT_NOTE,
        "licence_retrieval": LICENCE_RETRIEVAL_STEPS,
        "police_stop_guide": document_service.POLICE_STOP_GUIDE,
    })


@router.get("/preview")
async def preview_late_payment(
    amount_lkr: float = Query(..., ge=0, description="Amount printed on the charge sheet"),
    issued_date: date = Query(..., description="Date the charge sheet was issued"),
    due_date: date | None = Query(None, description="'Pay before' date, if one is printed"),
):
    """
    The double-fine calculator on its own — what a fine costs today, without saving it.
    """
    try:
        return success_response(
            "Late payment preview",
            SpotFineService.preview(amount_lkr, issued_date, due_date),
        )
    except Exception as e:
        return error_response(str(e), "PREVIEW_ERROR", 500)


@router.get("/{fine_id}")
async def get_fine(fine_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    fine = SpotFineService.get_fine(db, fine_id, user.id)
    if not fine:
        return error_response(f"No fine with id {fine_id}.", "NOT_FOUND", 404)
    return success_response("Fine fetched", fine)


@router.post("")
async def create_fine(payload: SpotFineCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Save a charge sheet as a pending fine."""
    try:
        fine = SpotFineService.create_fine(db, user.id, payload.model_dump())
        return success_response("Fine saved successfully", fine, status_code=201)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "FINE_CREATE_ERROR", 500)


@router.patch("/{fine_id}")
async def update_fine(fine_id: int, payload: SpotFineUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return error_response("Nothing to update.", "EMPTY_UPDATE", 400)
    try:
        fine = SpotFineService.update_fine(db, fine_id, user.id, changes)
        if not fine:
            return error_response(f"No fine with id {fine_id}.", "NOT_FOUND", 404)
        return success_response("Fine updated successfully", fine)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "FINE_UPDATE_ERROR", 500)


@router.post("/{fine_id}/pay")
async def mark_paid(fine_id: int, payload: SpotFineMarkPaid, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Record the post office payment and keep the receipt number with the fine."""
    try:
        fine = SpotFineService.mark_paid(db, fine_id, user.id, payload.paid_date, payload.receipt_no)
        if not fine:
            return error_response(f"No fine with id {fine_id}.", "NOT_FOUND", 404)
        return success_response("Fine marked as paid", fine)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "FINE_PAY_ERROR", 500)


@router.post("/{fine_id}/licence-recovered")
async def mark_licence_recovered(fine_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Tick off the last step — the original licence is back from the police station."""
    try:
        fine = SpotFineService.update_fine(db, fine_id, user.id, {"licence_recovered": True})
        if not fine:
            return error_response(f"No fine with id {fine_id}.", "NOT_FOUND", 404)
        return success_response("Licence marked as recovered", fine)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "FINE_UPDATE_ERROR", 500)


@router.delete("/{fine_id}")
async def delete_fine(fine_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        if not SpotFineService.delete_fine(db, fine_id, user.id):
            return error_response(f"No fine with id {fine_id}.", "NOT_FOUND", 404)
        return success_response("Fine deleted successfully", {"id": fine_id})
    except Exception as e:
        db.rollback()
        return error_response(str(e), "FINE_DELETE_ERROR", 500)
