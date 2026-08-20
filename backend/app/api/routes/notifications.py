"""
Reminder notifications — what is due, and (where a gateway exists) sending it.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.notification_service import (
    NotificationService,
    provider_status,
)
from app.models.user import User
from app.services.deps import get_current_user
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/notifications", tags=["Reminders"])


@router.get("/due")
async def due_reminders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Every reminder that warrants the driver's attention today — fines running out of
    days, court dates approaching, documents expired or expiring.
    """
    try:
        return success_response("Due reminders fetched", NotificationService.due(db, user.id))
    except Exception as e:
        return error_response(str(e), "REMINDERS_ERROR", 500)


@router.get("/providers")
async def list_providers():
    """Which delivery channels exist and which are actually configured."""
    return success_response("Notification providers", {
        "providers": provider_status(),
        "note": (
            "Only the log provider is active. SMS, WhatsApp and email are stubbed behind "
            "the same interface — supply gateway credentials and implement send() to "
            "enable them without touching anything else."
        ),
    })


@router.get("/schedule")
async def schedule_hint():
    """How to run the dispatch unattended once a gateway is configured."""
    return success_response("Scheduling guidance", NotificationService.schedule_hint())


@router.post("/dispatch")
async def dispatch(
    to: str = Query(..., description="Phone number or email the reminders would go to"),
    provider: str = Query("log", description="log | sms | whatsapp | email"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Push today's reminders through a provider. With no gateway configured this writes to
    the server log and reports ``delivered: false`` — it never claims a send it did not make.
    """
    try:
        return success_response("Dispatch complete", NotificationService.dispatch(db, user.id, to, provider))
    except ValueError as e:
        return error_response(str(e), "UNKNOWN_PROVIDER", 400)
    except Exception as e:
        return error_response(str(e), "DISPATCH_ERROR", 500)
