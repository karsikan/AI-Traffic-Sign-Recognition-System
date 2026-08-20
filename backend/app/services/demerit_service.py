"""
Demerit points tracker.

Sri Lanka publishes no per-driver points API, so this is the driver's own record: they
enter each offence, and the balance is recomputed on every read. Points older than the
window simply stop counting — nothing has to expire them on a schedule.

The announced scheme grants an allowance of 24 points and deducts from it, so what this
tracker sums is points *spent*: the allowance left is the allowance minus that total, and
exhausting it cancels the licence rather than suspending it. The allowance, the window and
the advice tiers all come from ``DEMERIT_SYSTEM`` in the fines catalogue so the guide page
and this tracker can never disagree.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.api.routes.fines import DEMERIT_SYSTEM, VIOLATIONS
from app.models.demerit_record import DemeritRecord

ALLOWANCE = DEMERIT_SYSTEM["starting_points"]           # 24
WINDOW_MONTHS = DEMERIT_SYSTEM["window_months"]         # 24
WINDOW_DAYS = 365 * WINDOW_MONTHS // 12

# Kept for callers that still speak in threshold terms — the allowance is the point at
# which a driver has spent everything they had.
THRESHOLD = ALLOWANCE


def _tier_for(points: int) -> dict:
    """Which advice tier a running total falls into."""
    for tier in DEMERIT_SYSTEM["tiers"]:
        upper = tier["to_points"]
        if points >= tier["from_points"] and (upper is None or points <= upper):
            return tier
    return DEMERIT_SYSTEM["tiers"][-1]


def _expires_on(record: DemeritRecord) -> date:
    """The day this offence's points stop counting."""
    return record.offence_date + timedelta(days=WINDOW_DAYS)


def serialise(record: DemeritRecord, today: date | None = None) -> dict:
    from app.schemas.locker import DemeritOut

    today = today or date.today()
    expires = _expires_on(record)
    days_until = (expires - today).days

    data = DemeritOut.model_validate(record).model_dump(mode="json")
    data["expires_on"] = expires.isoformat()
    data["days_until_expiry"] = days_until
    data["active"] = days_until >= 0
    data["message"] = (
        f"These {record.points} point(s) drop off in {days_until} day(s)."
        if days_until >= 0
        else f"Expired {abs(days_until)} day(s) ago — no longer counted."
    )
    return data


def balance_from_records(rows, today: date | None = None) -> dict:
    """
    The balance for a set of records, wherever they came from.

    Used both by the stored path and by /compute/demerit, where the records arrive from
    the driver's own browser. One implementation so the two can never disagree.
    """
    today = today or date.today()
    cutoff = today - timedelta(days=WINDOW_DAYS)
    active = [r for r in rows if r.offence_date > cutoff]
    total = sum(r.points for r in active)

    tier = _tier_for(total)
    remaining = max(0, ALLOWANCE - total)

    # When does the balance next fall, and by how much
    next_drop = None
    if active:
        soonest = min(active, key=_expires_on)
        drop_date = _expires_on(soonest)
        points_dropping = sum(r.points for r in active if _expires_on(r) == drop_date)
        next_drop = {
        "date": drop_date.isoformat(),
        "days_until": (drop_date - today).days,
        "points": points_dropping,
        "balance_after": total - points_dropping,
        }

    if total >= ALLOWANCE:
        headline = (
        f"All {ALLOWANCE} points deducted within {WINDOW_MONTHS} months — the allowance "
        "is exhausted."
        )
    elif remaining <= 4:
        headline = f"{remaining} of {ALLOWANCE} points left. One serious offence would exhaust the allowance."
    else:
        headline = f"{remaining} of {ALLOWANCE} points left after {total} deducted in the last {WINDOW_MONTHS} months."

    return {
        "total_points": total,
        "points_deducted": total,
        "allowance": ALLOWANCE,
        "points_remaining": remaining,
        "threshold": ALLOWANCE,
        "window_months": WINDOW_MONTHS,
        "points_to_suspension": remaining,
        "percent_of_threshold": round(min(100, total / ALLOWANCE * 100), 1),
        "percent_of_allowance_used": round(min(100, total / ALLOWANCE * 100), 1),
        "status": tier["status"],
        "tier_label": tier["label"],
        "advice": tier["advice"],
        "headline": headline,
        "active_records": len(active),
        "expired_records": len(rows) - len(active),
        "next_drop": next_drop,
        "tiers": DEMERIT_SYSTEM["tiers"],
        "note": DEMERIT_SYSTEM["note"],
        "scheme_status": DEMERIT_SYSTEM["status"],
        "scheme_status_note": DEMERIT_SYSTEM["status_note"],
        "disclaimer": (
        "This is your own record, not the official one, and the scheme itself is still in "
        "pilot — the DMT holds the figure that counts. Use this to keep track, not as proof "
        "of your standing."
        ),
    }




class DemeritService:
    @staticmethod
    def list_records(db: Session, user_id: int, today: date | None = None) -> list[dict]:
        rows = (
            db.query(DemeritRecord).filter(DemeritRecord.user_id == user_id)
            .order_by(DemeritRecord.offence_date.desc(), DemeritRecord.id.desc())
            .all()
        )
        return [serialise(r, today) for r in rows]

    @staticmethod
    def add_record(db: Session, user_id: int, payload: dict, today: date | None = None) -> dict:
        record = DemeritRecord(**payload, user_id=user_id)
        db.add(record)
        db.commit()
        db.refresh(record)
        return serialise(record, today)

    @staticmethod
    def delete_record(db: Session, record_id: int, user_id: int) -> bool:
        record = (db.query(DemeritRecord)
                  .filter(DemeritRecord.id == record_id, DemeritRecord.user_id == user_id)
                  .first())
        if not record:
            return False
        db.delete(record)
        db.commit()
        return True

    @staticmethod
    def balance(db: Session, user_id: int, today: date | None = None) -> dict:
        """The live total, the tier it falls in, and when the next points drop off."""
        rows = db.query(DemeritRecord).filter(DemeritRecord.user_id == user_id).all()
        return balance_from_records(rows, today)

    @staticmethod
    def catalogue() -> list[dict]:
        """
        Offences that actually carry points, for the picker on the tracker page. Choosing
        one fills in the offence text, section and points in a single tap.
        """
        return [
            {
                "id": v["id"],
                "offence": v["offence"],
                "section": v["section"],
                "points": v["demerit_points"],
                "category": v["category"],
            }
            for v in VIOLATIONS
            if v["demerit_points"] > 0
        ]
