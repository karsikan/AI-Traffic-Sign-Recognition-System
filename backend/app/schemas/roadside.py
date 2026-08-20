from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Incident recorder ───────────────────────────────────────────────────────────

class IncidentCreate(BaseModel):
    incident_type: str = Field(default="other", max_length=30)
    title: Optional[str] = None
    description: Optional[str] = None
    officer_no: Optional[str] = None
    officer_name: Optional[str] = None
    police_station: Optional[str] = None
    vehicle_no: Optional[str] = None
    other_party: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    location_note: Optional[str] = None
    occurred_at: Optional[datetime] = None


class IncidentUpdate(BaseModel):
    incident_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    officer_no: Optional[str] = None
    officer_name: Optional[str] = None
    police_station: Optional[str] = None
    vehicle_no: Optional[str] = None
    other_party: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    location_note: Optional[str] = None
    occurred_at: Optional[datetime] = None


# ── Checkpoint reports ──────────────────────────────────────────────────────────

class CheckpointCreate(BaseModel):
    kind: str = Field(max_length=30)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    road_name: Optional[str] = None
    note: Optional[str] = None
