"""
Derived values for records the server does not hold.

Fines, documents, demerit points and incidents live in the driver's own browser — nothing
personal is stored here. But the rules that turn a record into something useful are worth
keeping in one place: the 14 / 28 / court windows, the expiry bands, the rolling
twelve-month demerit balance. Reimplementing those in TypeScript would mean two versions
to keep in step, and the tested one is this one.

So the browser posts a record, gets the derived fields back, and nothing is written. Every
endpoint here is stateless: no session, no user, no row. The models are instantiated but
never added to a session — they are only a convenient shape for the existing functions.
"""

from datetime import date

from fastapi import APIRouter

from app.models.demerit_record import DemeritRecord
from app.models.spot_fine import SpotFine
from app.models.user_document import UserDocument
from app.schemas.compute import (
    DemeritBatch,
    DocumentBatch,
    FineBatch,
    RemindersBatch,
)
from app.services import demerit_service, locker_service, spot_fine_service
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/compute", tags=["Derived Values"])


def _fine_from(payload) -> SpotFine:
    """An unsaved SpotFine, purely so the existing functions can read it."""
    return SpotFine(
        id=payload.id,
        offence=payload.offence,
        fine_amount_lkr=payload.fine_amount_lkr,
        issued_date=payload.issued_date,
        due_date=payload.due_date,
        court_date=payload.court_date,
        court=payload.court,
        status=payload.status or "pending",
        paid_date=payload.paid_date,
        licence_withheld=bool(payload.licence_withheld),
        licence_recovered=bool(payload.licence_recovered),
    )


def _document_from(payload) -> UserDocument:
    return UserDocument(
        id=payload.id,
        doc_type=payload.doc_type,
        label=payload.label,
        document_no=payload.document_no,
        issued_date=payload.issued_date,
        expiry_date=payload.expiry_date,
        remind_days_before=payload.remind_days_before or 30,
    )


def _record_from(payload) -> DemeritRecord:
    return DemeritRecord(
        id=payload.id,
        offence=payload.offence,
        points=payload.points,
        offence_date=payload.offence_date,
        section=payload.section,
    )


@router.post("/fines")
async def compute_fines(payload: FineBatch):
    """
    Countdown, payment timeline and licence-retrieval steps for each fine sent, plus the
    same summary the tracker used to build from the database.
    """
    try:
        today = payload.today or date.today()
        fines = [_fine_from(f) for f in payload.fines]

        out = []
        for fine in fines:
            item = {
                "id": fine.id,
                "countdown": spot_fine_service.build_countdown(fine, today),
                "timeline": spot_fine_service.build_timeline(fine),
            }
            court = spot_fine_service.build_court_countdown(fine, today)
            if court:
                item["court_countdown"] = court
            if fine.licence_withheld and not fine.licence_recovered:
                item["licence_retrieval"] = spot_fine_service.LICENCE_RETRIEVAL_STEPS
            out.append(item)

        # The same headline numbers, counted over what was sent rather than queried
        pending = [f for f in fines if f.status != "paid"]
        counts = {"normal": 0, "double": 0, "court": 0}
        payable = 0.0
        next_deadline = None
        next_id = None
        for fine in pending:
            c = spot_fine_service.build_countdown(fine, today)
            counts[c["stage"]] = counts.get(c["stage"], 0) + 1
            if c["payable_now_lkr"]:
                payable += c["payable_now_lkr"]
            if c["days_left"] is not None:
                from datetime import timedelta
                deadline = today + timedelta(days=c["days_left"])
                if next_deadline is None or deadline < next_deadline:
                    next_deadline, next_id = deadline, fine.id

        return success_response("Fines computed", {
            "fines": out,
            "summary": {
                "total": len(fines),
                "pending": len(pending),
                "paid": sum(1 for f in fines if f.status == "paid"),
                "in_normal_window": counts["normal"],
                "in_double_window": counts["double"],
                "gone_to_court": counts["court"],
                "total_payable_now_lkr": round(payable, 2),
                "licences_withheld": sum(
                    1 for f in pending if f.licence_withheld and not f.licence_recovered
                ),
                "next_deadline": next_deadline.isoformat() if next_deadline else None,
                "next_deadline_fine_id": next_id,
            },
        })
    except Exception as e:
        return error_response(str(e), "COMPUTE_ERROR", 500)


@router.post("/documents")
async def compute_documents(payload: DocumentBatch):
    """Expiry status per document, plus which need attention."""
    try:
        today = payload.today or date.today()
        docs = [_document_from(d) for d in payload.documents]

        out, expired, expiring = [], [], []
        counts = {"valid": 0, "expiring": 0, "expired": 0,
                  "not_applicable": 0, "unknown": 0}
        for doc in docs:
            expiry = locker_service.build_expiry(doc, today)
            spec = locker_service.DOC_TYPES.get(doc.doc_type, {})
            item = {
                "id": doc.id,
                "doc_label": spec.get("label", doc.doc_type),
                "expiry": expiry,
            }
            counts[expiry["status"]] = counts.get(expiry["status"], 0) + 1
            if expiry["status"] == "expired":
                expired.append(item)
            elif expiry["status"] == "expiring":
                expiring.append(item)
            out.append(item)

        return success_response("Documents computed", {
            "documents": out,
            "alerts": {"expired": expired, "expiring": expiring,
                       "count": len(expired) + len(expiring)},
            "summary": {
                "total": len(docs), **counts,
                "needs_attention": counts["expired"] + counts["expiring"],
            },
        })
    except Exception as e:
        return error_response(str(e), "COMPUTE_ERROR", 500)


@router.post("/demerit")
async def compute_demerit(payload: DemeritBatch):
    """Rolling twelve-month balance and the tier it falls in."""
    try:
        today = payload.today or date.today()
        records = [_record_from(r) for r in payload.records]

        serialised = [demerit_service.serialise(r, today) for r in records]
        # The same shape the database-backed version returned, built by the same code —
        # the page renders the whole tier ladder and the next-drop line from it, so
        # hand-rolling a subset here would quietly break them.
        balance = demerit_service.balance_from_records(records, today)

        return success_response("Demerit computed", {
            "records": serialised,
            "balance": balance,
        })
    except Exception as e:
        return error_response(str(e), "COMPUTE_ERROR", 500)


@router.post("/reminders")
async def compute_reminders(payload: RemindersBatch):
    """
    Everything worth telling the driver today, built from the records they sent — the
    same shape the home page banner already renders.
    """
    try:
        today = payload.today or date.today()
        reminders = []

        for f in payload.fines:
            fine = _fine_from(f)
            if fine.status == "paid":
                continue
            c = spot_fine_service.build_countdown(fine, today)
            stage, days_left = c["stage"], c["days_left"]
            if stage == "court":
                urgency, title = "overdue", "Payment period has ended"
            elif stage == "double":
                urgency, title = "critical", "Double fine now payable"
            elif days_left is not None and days_left <= 3:
                urgency, title = "warning", "Fine due in a few days"
            else:
                continue
            amount = c["payable_now_lkr"]
            reminders.append({
                "kind": "fine", "ref_id": fine.id, "urgency": urgency, "title": title,
                "message": (
                    f"{fine.offence} — "
                    + (f"LKR {amount:,.0f} payable now. " if amount else "")
                    + c["message"] + " Pay at govpay.lk or a post office."
                ),
                "due_date": c["normal_end"], "action_url": "/my-fines",
            })

            if fine.court_date:
                days = (fine.court_date - today).days
                if 0 <= days <= 14:
                    reminders.append({
                        "kind": "court", "ref_id": fine.id,
                        "urgency": "critical" if days <= 3 else "warning",
                        "title": "Court date approaching",
                        "message": (
                            f"{fine.court or 'Court'} on {fine.court_date.isoformat()} "
                            f"— in {days} day(s). Attend, or a warrant may be issued."
                        ),
                        "due_date": fine.court_date.isoformat(), "action_url": "/my-fines",
                    })

        for d in payload.documents:
            doc = _document_from(d)
            expiry = locker_service.build_expiry(doc, today)
            spec = locker_service.DOC_TYPES.get(doc.doc_type, {})
            label = spec.get("label", doc.doc_type)
            if expiry["status"] == "expired":
                reminders.append({
                    "kind": "document", "ref_id": doc.id, "urgency": "overdue",
                    "title": f"{label} has expired", "message": expiry["message"],
                    "due_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
                    "action_url": "/locker",
                })
            elif expiry["status"] == "expiring":
                days = expiry["days_remaining"]
                reminders.append({
                    "kind": "document", "ref_id": doc.id,
                    "urgency": "critical" if days <= 7 else "warning",
                    "title": f"{label} expires soon", "message": expiry["message"],
                    "due_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
                    "action_url": "/locker",
                })

        order = {"overdue": 0, "critical": 1, "warning": 2, "info": 3}
        reminders.sort(key=lambda r: (order.get(r["urgency"], 9), r.get("due_date") or ""))

        by_urgency: dict[str, int] = {}
        for r in reminders:
            by_urgency[r["urgency"]] = by_urgency.get(r["urgency"], 0) + 1

        return success_response("Reminders computed", {
            "reminders": reminders,
            "count": len(reminders),
            "by_urgency": by_urgency,
            "checked_on": today.isoformat(),
        })
    except Exception as e:
        return error_response(str(e), "COMPUTE_ERROR", 500)
