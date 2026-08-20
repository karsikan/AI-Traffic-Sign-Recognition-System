from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, Boolean, ForeignKey
from app.core.database import Base


class SpotFine(Base):
    """
    A spot-fine charge sheet the driver is keeping track of.

    Rows are created either by hand on the My Fines page or straight from the
    Document Scanner once it has read a charge sheet photo. Everything about the
    14 / 28 / court deadline is derived at read time in ``spot_fine_service`` —
    only the facts printed on the paper are stored here.
    """

    __tablename__ = "spot_fines"

    id = Column(Integer, primary_key=True, index=True)

    # Who this belongs to. Every read, update and delete is filtered on it, so one
    # driver can never reach another's records.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)

    # As printed on the charge sheet
    reference_no = Column(String(100), nullable=True, index=True)
    offence = Column(String(255), nullable=False)
    section = Column(String(100), nullable=True)
    fine_amount_lkr = Column(Float, nullable=False)
    issued_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    place_of_offence = Column(String(255), nullable=True)
    vehicle_no = Column(String(50), nullable=True)
    police_station = Column(String(200), nullable=True)
    officer_no = Column(String(100), nullable=True)
    court = Column(String(200), nullable=True)
    court_date = Column(Date, nullable=True)

    # Was the driving licence kept by the officer (yellow Section 135 permit issued)
    licence_withheld = Column(Boolean, default=False, nullable=False)
    licence_recovered = Column(Boolean, default=False, nullable=False)

    # pending | paid | court
    status = Column(String(20), default="pending", nullable=False, index=True)
    paid_date = Column(Date, nullable=True)
    receipt_no = Column(String(100), nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
