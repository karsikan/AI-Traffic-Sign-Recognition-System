from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from app.core.database import Base


class Incident(Base):
    """
    A record the driver makes at the roadside — an accident, or a dispute with an officer.

    The point is a timestamped, located note written while the details are fresh, with any
    photos or audio attached. Files live under ``uploads/incidents`` and only their paths
    are stored here.
    """

    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)

    # Who this belongs to. Every read, update and delete is filtered on it, so one
    # driver can never reach another's records.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)

    # accident | police_dispute | breakdown | other
    incident_type = Column(String(30), nullable=False, default="other", index=True)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)

    # Who and where
    officer_no = Column(String(100), nullable=True)
    officer_name = Column(String(150), nullable=True)
    police_station = Column(String(200), nullable=True)
    vehicle_no = Column(String(50), nullable=True)
    other_party = Column(Text, nullable=True)      # other driver / vehicle / witness details

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_note = Column(String(255), nullable=True)

    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class IncidentMedia(Base):
    """A photo, an audio note or a short video attached to an incident."""

    __tablename__ = "incident_media"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, nullable=False, index=True)

    # photo | audio | video
    media_type = Column(String(20), nullable=False)
    file_path = Column(String(500), nullable=False)     # served under /uploads
    original_name = Column(String(255), nullable=True)
    size_bytes = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
