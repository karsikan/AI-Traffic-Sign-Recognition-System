"""
Reminder notifications.

Two halves, kept apart on purpose:

  * *deciding what needs saying* — expiring documents, fines running out of days, court
    dates coming up. This half is real and works today.
  * *delivering it* — SMS, WhatsApp, email. This half needs a paid gateway account, so
    the only provider that ships is ``LogProvider``, which writes the message to the
    server log and reports it as not delivered.

The split means adding a real gateway later is one class and one config value, with no
change to anything that builds the messages. ``dispatch`` never pretends: every result
carries ``delivered`` and the provider that handled it.
"""

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.spot_fine import SpotFine
from app.services.locker_service import LockerService
from app.services.spot_fine_service import build_countdown

# ── Providers ───────────────────────────────────────────────────────────────────


class NotificationProvider:
    """A delivery channel. Subclass, implement ``send``, register in ``PROVIDERS``."""

    name = "base"
    configured = False

    def send(self, to: str, message: str, subject: str | None = None) -> dict:
        raise NotImplementedError


class LogProvider(NotificationProvider):
    """
    The default. Writes what would have been sent to the server log so the whole pipeline
    can be exercised and demonstrated without a gateway account.
    """

    name = "log"
    configured = True

    def send(self, to: str, message: str, subject: str | None = None) -> dict:
        logger.info(f"[notification:log] to={to} subject={subject or '-'} :: {message}")
        return {
            "provider": self.name,
            "to": to,
            "delivered": False,
            "detail": "Written to the server log. No gateway is configured, so nothing was sent.",
        }


class SmsProvider(NotificationProvider):
    """
    Placeholder for an SMS gateway (Dialog, Mobitel, Twilio…).

    To make this real: put the credentials in ``.env``, set ``configured = True``, and
    post to the gateway inside ``send``. Nothing else in the codebase has to change.
    """

    name = "sms"
    configured = False

    def send(self, to: str, message: str, subject: str | None = None) -> dict:
        return {
            "provider": self.name,
            "to": to,
            "delivered": False,
            "detail": "No SMS gateway configured. Add credentials to .env and implement SmsProvider.send().",
        }


class WhatsAppProvider(NotificationProvider):
    """
    Placeholder for the WhatsApp Business API.

    A free alternative that needs no gateway is already in the app: ``build_alert_links``
    in ``emergency_service`` makes a ``wa.me`` link the driver taps themselves.
    """

    name = "whatsapp"
    configured = False

    def send(self, to: str, message: str, subject: str | None = None) -> dict:
        return {
            "provider": self.name,
            "to": to,
            "delivered": False,
            "detail": "No WhatsApp Business account configured. A tap-to-send wa.me link works without one.",
        }


class EmailProvider(NotificationProvider):
    """Placeholder for SMTP or a transactional email service."""

    name = "email"
    configured = False

    def send(self, to: str, message: str, subject: str | None = None) -> dict:
        return {
            "provider": self.name,
            "to": to,
            "delivered": False,
            "detail": "No SMTP settings configured. Add them to .env and implement EmailProvider.send().",
        }


PROVIDERS: dict[str, NotificationProvider] = {
    p.name: p for p in [LogProvider(), SmsProvider(), WhatsAppProvider(), EmailProvider()]
}


def provider_status() -> list[dict]:
    return [
        {"name": p.name, "configured": p.configured,
         "detail": p.send("—", "—")["detail"] if not p.configured else "Active."}
        for p in PROVIDERS.values()
    ]


# ── Deciding what needs saying ──────────────────────────────────────────────────

# urgency → how loudly the frontend should render it
URGENCY_ORDER = {"overdue": 0, "critical": 1, "warning": 2, "info": 3}


def _fine_reminders(db: Session, user_id: int, today: date) -> list[dict]:
    reminders = []
    for fine in db.query(SpotFine).filter(
            SpotFine.user_id == user_id, SpotFine.status != "paid").all():
        countdown = build_countdown(fine, today)
        stage, days_left = countdown["stage"], countdown["days_left"]

        if stage == "court":
            urgency, title = "overdue", "Payment period has ended"
        elif stage == "double":
            urgency, title = "critical", "Double fine now payable"
        elif days_left is not None and days_left <= 3:
            urgency, title = "warning", "Fine due in a few days"
        else:
            continue        # nothing worth interrupting anyone for yet

        amount = countdown["payable_now_lkr"]
        reminders.append({
            "kind": "fine",
            "ref_id": fine.id,
            "urgency": urgency,
            "title": title,
            "message": (
                f"{fine.offence} — "
                + (f"LKR {amount:,.0f} payable now. " if amount else "")
                + countdown["message"]
                + " Pay at govpay.lk or a post office."
            ),
            "due_date": countdown["normal_end"],
            "action_url": "/my-fines",
        })

    for fine in db.query(SpotFine).filter(
        SpotFine.user_id == user_id, SpotFine.status != "paid",
        SpotFine.court_date.isnot(None)
    ).all():
        days = (fine.court_date - today).days
        if 0 <= days <= 14:
            reminders.append({
                "kind": "court",
                "ref_id": fine.id,
                "urgency": "critical" if days <= 3 else "warning",
                "title": "Court date approaching",
                "message": (
                    f"{fine.court or 'Court'} on {fine.court_date.isoformat()} "
                    f"— in {days} day(s). Attend, or a warrant may be issued."
                ),
                "due_date": fine.court_date.isoformat(),
                "action_url": "/my-fines",
            })

    return reminders


def _document_reminders(db: Session, user_id: int, today: date) -> list[dict]:
    alerts = LockerService.alerts(db, user_id, today)
    reminders = []

    for doc in alerts["expired"]:
        reminders.append({
            "kind": "document",
            "ref_id": doc["id"],
            "urgency": "overdue",
            "title": f"{doc['doc_label']} has expired",
            "message": doc["expiry"]["message"],
            "due_date": doc["expiry_date"],
            "action_url": "/locker",
        })

    for doc in alerts["expiring"]:
        days = doc["expiry"]["days_remaining"]
        reminders.append({
            "kind": "document",
            "ref_id": doc["id"],
            "urgency": "critical" if days <= 7 else "warning",
            "title": f"{doc['doc_label']} expires soon",
            "message": doc["expiry"]["message"],
            "due_date": doc["expiry_date"],
            "action_url": "/locker",
        })

    return reminders


class NotificationService:
    @staticmethod
    def due(db: Session, user_id: int, today: date | None = None) -> dict:
        """Everything that warrants a reminder right now, most urgent first."""
        today = today or date.today()
        reminders = _fine_reminders(db, user_id, today) + _document_reminders(db, user_id, today)
        reminders.sort(key=lambda r: (URGENCY_ORDER.get(r["urgency"], 9), r.get("due_date") or ""))

        by_urgency: dict[str, int] = {}
        for r in reminders:
            by_urgency[r["urgency"]] = by_urgency.get(r["urgency"], 0) + 1

        return {
            "reminders": reminders,
            "count": len(reminders),
            "by_urgency": by_urgency,
            "checked_on": today.isoformat(),
            "generated_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def dispatch(db: Session, user_id: int, to: str, provider: str = "log",
                 today: date | None = None) -> dict:
        """
        Push the due reminders through a provider. With no gateway configured this only
        writes to the log — the response says so rather than claiming success.
        """
        handler = PROVIDERS.get(provider)
        if handler is None:
            raise ValueError(
                f"Unknown provider '{provider}'. Available: {', '.join(PROVIDERS)}."
            )

        due = NotificationService.due(db, user_id, today)
        results = []
        for reminder in due["reminders"]:
            results.append({
                "reminder": reminder["title"],
                **handler.send(to, reminder["message"], subject=reminder["title"]),
            })

        delivered = sum(1 for r in results if r["delivered"])
        return {
            "attempted": len(results),
            "delivered": delivered,
            "provider": provider,
            "provider_configured": handler.configured,
            "results": results,
            "note": (
                "Reminders are shown in the app whenever a page is opened. Sending them by "
                "SMS, WhatsApp or email needs a paid gateway account, which this build does "
                "not include — configure a provider to turn delivery on."
            ) if not delivered else None,
        }

    @staticmethod
    def schedule_hint() -> dict:
        """How this would be run unattended, once a gateway exists."""
        tomorrow_8am = (datetime.utcnow() + timedelta(days=1)).replace(
            hour=8, minute=0, second=0, microsecond=0
        )
        return {
            "endpoint": "POST /notifications/dispatch",
            "suggested_frequency": "Once a day, early morning",
            "next_run_example": tomorrow_8am.isoformat(),
            "how": (
                "Point Windows Task Scheduler or a cron job at the dispatch endpoint. The "
                "endpoint is deliberately idempotent to read — it recomputes what is due "
                "from the stored dates every time rather than keeping a queue."
            ),
            "providers": provider_status(),
        }
