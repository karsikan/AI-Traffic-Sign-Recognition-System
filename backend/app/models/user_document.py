from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from app.core.database import Base


class UserDocument(Base):
    """
    A document the driver has saved to the locker so its expiry can be watched.

    Only the details needed to track renewal are kept — never the document image.
    ``doc_type`` matches a key in ``document_service.DOC_TYPES`` so the locker and the
    scanner speak the same language and a scanned document can be filed in one step.
    """

    __tablename__ = "user_documents"

    id = Column(Integer, primary_key=True, index=True)

    # Who this belongs to. Every read, update and delete is filtered on it, so one
    # driver can never reach another's records.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)

    doc_type = Column(String(50), nullable=False, index=True)
    label = Column(String(150), nullable=True)          # what the driver calls it
    document_no = Column(String(120), nullable=True)
    holder_name = Column(String(150), nullable=True)
    vehicle_no = Column(String(50), nullable=True)
    issuer = Column(String(200), nullable=True)

    issued_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)           # null for a CR book, which never expires

    # Days before expiry the driver wants to be warned
    remind_days_before = Column(Integer, default=30, nullable=False)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
