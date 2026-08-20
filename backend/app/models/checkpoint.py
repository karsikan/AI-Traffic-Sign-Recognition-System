from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from app.core.database import Base


class CheckpointReport(Base):
    """
    A driver-reported police checkpoint, speed camera or speed gun.

    Reports are deliberately short-lived — a checkpoint that was there three hours ago
    tells the next driver nothing. Nothing deletes them on a timer; the service simply
    stops returning reports older than the type's own lifetime, and a confirmation from
    another driver pushes that clock forward.
    """

    __tablename__ = "checkpoint_reports"

    id = Column(Integer, primary_key=True, index=True)

    # Unlike a fine or a document, a report is meant to be seen by every driver nearby —
    # that is the whole point of it. So it is not filtered by owner. The reporter is
    # recorded only so a spammer can be traced and their reports removed, and it is never
    # returned to other users.
    reported_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"),
                         nullable=True, index=True)

    # police_checkpoint | speed_gun | speed_camera | breathalyser | road_block
    kind = Column(String(30), nullable=False, index=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    road_name = Column(String(200), nullable=True)
    note = Column(Text, nullable=True)

    # How many other drivers said it is still there, and when the last one did
    confirmations = Column(Integer, default=0, nullable=False)
    last_confirmed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Set when a driver reports it has gone
    cleared_at = Column(DateTime, nullable=True)

    reported_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
