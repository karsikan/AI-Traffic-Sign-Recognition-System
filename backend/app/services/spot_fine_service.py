"""
Spot-fine tracking.

Nothing about a deadline is stored — it is worked out from the issue date every time a
fine is read, so a row that was "9 days left" yesterday is "8 days left" today without
anything having to run in the background.

The timeline follows the periods printed on a Section 215A charge sheet:

    day 1 – 14    normal fine    payable at a post office
    day 15 – 28   double fine    twice the printed amount, still at a post office
    day 29 +      court          no longer settleable at a post office

Where the charge sheet prints its own "pay before" date that date ends the normal
window instead of day 14, and the double window runs for a fortnight after it.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.api.routes.fines import PAYMENT_WINDOW
from app.models.spot_fine import SpotFine

NORMAL_DAYS = PAYMENT_WINDOW["normal_days"]        # 14
DOUBLE_DAYS = PAYMENT_WINDOW["double_days"]        # 28
DOUBLE_SPAN = DOUBLE_DAYS - NORMAL_DAYS            # 14

# How the countdown is coloured in the UI
URGENCY_SAFE = "safe"          # more than 3 days of the normal window left
URGENCY_WARNING = "warning"    # 3 days or fewer left
URGENCY_CRITICAL = "critical"  # into the double-fine window
URGENCY_OVERDUE = "overdue"    # past the double window — court

LICENCE_RETRIEVAL_STEPS = [
    {"step": 1, "title": "Pay the fine first",
     "detail": "Nothing can be collected until the fine is settled. GovPay at govpay.lk is the quickest route — you need the fine sheet number, vehicle number, licence number, the police station, and the officer's mobile number, all of which are on the charge sheet."},
    {"step": 2, "title": "Paying through GovPay? The licence comes back on the spot",
     "detail": "The officer receives a payment confirmation SMS and releases your licence there and then. No second trip to the station."},
    {"step": 3, "title": "Paid at a post office? Keep the receipt",
     "detail": "The receipt is the only proof the matter is settled. Photograph it too — a lost receipt can mean paying again."},
    {"step": 4, "title": "Go to the station that issued the charge",
     "detail": "Your licence is held by the police station named on the charge sheet or the yellow permit, not by any station."},
    {"step": 5, "title": "Ask for the OIC",
     "detail": "The Officer-in-Charge releases the licence. Take the receipt, the charge sheet, the yellow temporary permit and your NIC."},
    {"step": 6, "title": "Hand back the temporary permit",
     "detail": "The Section 135 permit is surrendered when the original licence is returned. Check the licence is yours before you leave the counter."},
    {"step": 7, "title": "If the case went to court",
     "detail": "Where a Magistrate has heard the matter, the court order settles it — take the court receipt to the station instead of the payment receipt."},
]


def _owned(db: Session, fine_id: int, user_id: int) -> SpotFine | None:
    """
    Look a fine up by id *and* owner.

    Matching on both in one query is what stops one driver reaching another's record by
    guessing an id — a miss is indistinguishable from the row not existing.
    """
    return (
        db.query(SpotFine)
        .filter(SpotFine.id == fine_id, SpotFine.user_id == user_id)
        .first()
    )


def _normal_end(fine: SpotFine) -> date:
    """Last day the printed amount can be paid."""
    return fine.due_date or (fine.issued_date + timedelta(days=NORMAL_DAYS))


def _double_end(fine: SpotFine) -> date:
    """Last day twice the printed amount can be paid."""
    return _normal_end(fine) + timedelta(days=DOUBLE_SPAN)


def build_timeline(fine: SpotFine) -> list[dict]:
    """The three windows with real dates, so the page can draw a calendar strip."""
    normal_end, double_end = _normal_end(fine), _double_end(fine)
    amount = float(fine.fine_amount_lkr or 0)
    return [
        {
            "stage": "normal",
            "label": "Normal fine",
            "from_date": fine.issued_date.isoformat(),
            "to_date": normal_end.isoformat(),
            "amount_lkr": round(amount, 2),
            "detail": "Pay the printed amount at any post office. Keep the receipt.",
        },
        {
            "stage": "double",
            "label": "Double fine",
            "from_date": (normal_end + timedelta(days=1)).isoformat(),
            "to_date": double_end.isoformat(),
            "amount_lkr": round(amount * 2, 2),
            "detail": "The first window has closed. Twice the printed amount is payable, still at a post office.",
        },
        {
            "stage": "court",
            "label": "Court action",
            "from_date": (double_end + timedelta(days=1)).isoformat(),
            "to_date": None,
            "amount_lkr": None,
            "detail": "A Magistrate now sets the penalty, and a warrant may be issued if you do not attend.",
        },
    ]


def build_countdown(fine: SpotFine, today: date | None = None) -> dict:
    """Which window the fine is in today, what is payable, and how long is left."""
    today = today or date.today()
    amount = float(fine.fine_amount_lkr or 0)
    normal_end, double_end = _normal_end(fine), _double_end(fine)

    if fine.status == "paid":
        return {
            "stage": "paid",
            "urgency": URGENCY_SAFE,
            "days_left": None,
            "days_elapsed": (today - fine.issued_date).days,
            "payable_now_lkr": 0,
            "multiplier": 0,
            "normal_end": normal_end.isoformat(),
            "double_end": double_end.isoformat(),
            "percent_elapsed": 100,
            "message": (
                f"Settled on {fine.paid_date.isoformat()}." if fine.paid_date else "Settled."
            ),
        }

    days_elapsed = (today - fine.issued_date).days
    total_days = (double_end - fine.issued_date).days or 1
    percent = round(min(100, max(0, days_elapsed / total_days * 100)), 1)

    if today <= normal_end:
        days_left = (normal_end - today).days
        stage, multiplier, payable = "normal", 1, amount
        urgency = URGENCY_WARNING if days_left <= 3 else URGENCY_SAFE
        if days_left == 0:
            message = "Due TODAY. Pay at a post office before it closes, or the amount doubles tomorrow."
        else:
            message = f"{days_left} day(s) left to pay the normal amount."
    elif today <= double_end:
        days_left = (double_end - today).days
        stage, multiplier, payable = "double", 2, amount * 2
        urgency = URGENCY_CRITICAL
        overdue_by = (today - normal_end).days
        message = (
            f"The normal window closed {overdue_by} day(s) ago — twice the amount is now due. "
            f"{days_left} day(s) left before the case goes to court."
        )
    else:
        days_left = None
        stage, multiplier, payable = "court", None, None
        urgency = URGENCY_OVERDUE
        overdue_by = (today - double_end).days
        message = (
            f"The payment period ended {overdue_by} day(s) ago. This can no longer be settled at a "
            f"post office — contact the issuing police station immediately and attend court on the printed date."
        )

    return {
        "stage": stage,
        "urgency": urgency,
        "days_left": days_left,
        "days_elapsed": days_elapsed,
        "payable_now_lkr": round(payable, 2) if payable is not None else None,
        "multiplier": multiplier,
        "normal_end": normal_end.isoformat(),
        "double_end": double_end.isoformat(),
        "percent_elapsed": percent,
        "message": message,
    }


def build_court_countdown(fine: SpotFine, today: date | None = None) -> dict | None:
    """Days until the court date printed on the charge sheet, if there is one."""
    if not fine.court_date:
        return None
    today = today or date.today()
    days = (fine.court_date - today).days
    if days < 0:
        message = f"The court date passed {abs(days)} day(s) ago."
    elif days == 0:
        message = "Court hearing is TODAY."
    else:
        message = f"Court hearing in {days} day(s)."
    return {"court_date": fine.court_date.isoformat(), "days_until": days, "message": message}


def serialise(fine: SpotFine, today: date | None = None) -> dict:
    """A stored fine plus everything derived from today's date."""
    from app.schemas.spot_fine import SpotFineOut

    data = SpotFineOut.model_validate(fine).model_dump(mode="json")
    data["countdown"] = build_countdown(fine, today)
    data["timeline"] = build_timeline(fine)

    court = build_court_countdown(fine, today)
    if court:
        data["court_countdown"] = court

    # Only worth showing while the licence is actually still at the station
    if fine.licence_withheld and not fine.licence_recovered:
        data["licence_retrieval"] = LICENCE_RETRIEVAL_STEPS

    return data


class SpotFineService:
    @staticmethod
    def list_fines(db: Session, user_id: int, status: str | None = None,
                   today: date | None = None) -> list[dict]:
        query = db.query(SpotFine).filter(SpotFine.user_id == user_id)
        if status and status != "all":
            query = query.filter(SpotFine.status == status)
        rows = query.order_by(SpotFine.issued_date.desc(), SpotFine.id.desc()).all()
        return [serialise(f, today) for f in rows]

    @staticmethod
    def get_fine(db: Session, fine_id: int, user_id: int, today: date | None = None) -> dict | None:
        fine = _owned(db, fine_id, user_id)
        return serialise(fine, today) if fine else None

    @staticmethod
    def create_fine(db: Session, user_id: int, payload: dict,
                    today: date | None = None) -> dict:
        fine = SpotFine(**payload, user_id=user_id)
        db.add(fine)
        db.commit()
        db.refresh(fine)
        return serialise(fine, today)

    @staticmethod
    def update_fine(db: Session, fine_id: int, user_id: int, changes: dict,
                    today: date | None = None) -> dict | None:
        fine = _owned(db, fine_id, user_id)
        if not fine:
            return None
        for key, value in changes.items():
            setattr(fine, key, value)
        db.commit()
        db.refresh(fine)
        return serialise(fine, today)

    @staticmethod
    def mark_paid(db: Session, fine_id: int, user_id: int, paid_date: date | None,
                  receipt_no: str | None, today: date | None = None) -> dict | None:
        fine = _owned(db, fine_id, user_id)
        if not fine:
            return None
        fine.status = "paid"
        fine.paid_date = paid_date or (today or date.today())
        if receipt_no:
            fine.receipt_no = receipt_no
        db.commit()
        db.refresh(fine)
        return serialise(fine, today)

    @staticmethod
    def delete_fine(db: Session, fine_id: int, user_id: int) -> bool:
        fine = _owned(db, fine_id, user_id)
        if not fine:
            return False
        db.delete(fine)
        db.commit()
        return True

    @staticmethod
    def summary(db: Session, user_id: int, today: date | None = None) -> dict:
        """Headline numbers for the top of the My Fines page."""
        today = today or date.today()
        rows = db.query(SpotFine).filter(SpotFine.user_id == user_id).all()

        pending = [f for f in rows if f.status != "paid"]
        counts = {"normal": 0, "double": 0, "court": 0}
        payable_now = 0.0
        next_deadline: date | None = None
        next_fine_id: int | None = None

        for fine in pending:
            countdown = build_countdown(fine, today)
            counts[countdown["stage"]] = counts.get(countdown["stage"], 0) + 1
            if countdown["payable_now_lkr"]:
                payable_now += countdown["payable_now_lkr"]
            if countdown["days_left"] is not None:
                deadline = today + timedelta(days=countdown["days_left"])
                if next_deadline is None or deadline < next_deadline:
                    next_deadline, next_fine_id = deadline, fine.id

        return {
            "total": len(rows),
            "pending": len(pending),
            "paid": sum(1 for f in rows if f.status == "paid"),
            "in_normal_window": counts["normal"],
            "in_double_window": counts["double"],
            "gone_to_court": counts["court"],
            "total_payable_now_lkr": round(payable_now, 2),
            "licences_withheld": sum(1 for f in pending if f.licence_withheld and not f.licence_recovered),
            "next_deadline": next_deadline.isoformat() if next_deadline else None,
            "next_deadline_fine_id": next_fine_id,
        }

    @staticmethod
    def preview(amount_lkr: float, issued: date, due: date | None = None,
                today: date | None = None) -> dict:
        """
        The late-payment calculator on its own — no row is stored. Lets a driver check
        what a fine would cost today before deciding whether to save it.
        """
        stub = SpotFine(
            user_id=0,
            offence="preview",
            fine_amount_lkr=amount_lkr,
            issued_date=issued,
            due_date=due,
            status="pending",
            licence_withheld=False,
            licence_recovered=False,
        )
        return {
            "countdown": build_countdown(stub, today),
            "timeline": build_timeline(stub),
        }
