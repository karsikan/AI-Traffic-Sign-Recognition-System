from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from app.core.database import Base


class DemeritRecord(Base):
    """
    One offence on the driver's own demerit record.

    Sri Lanka has no public API for a driver's real points, so this is a record the
    driver keeps themselves — entered by hand or carried over from a saved fine. Points
    older than the 12-month window are dropped when the balance is worked out, so the
    total on screen is always the live figure rather than a stored one.
    """

    __tablename__ = "demerit_records"

    id = Column(Integer, primary_key=True, index=True)

    # Who this belongs to. Every read, update and delete is filtered on it, so one
    # driver can never reach another's records.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)

    offence = Column(String(255), nullable=False)
    violation_id = Column(String(80), nullable=True)   # id from the fines catalogue, when picked from it
    section = Column(String(100), nullable=True)
    points = Column(Integer, nullable=False, default=0)
    offence_date = Column(Date, nullable=False, index=True)

    vehicle_no = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
