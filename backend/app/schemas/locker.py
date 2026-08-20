from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Digital locker ──────────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    doc_type: str = Field(min_length=2, max_length=50)
    label: Optional[str] = None
    document_no: Optional[str] = None
    holder_name: Optional[str] = None
    vehicle_no: Optional[str] = None
    issuer: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    remind_days_before: int = Field(default=30, ge=1, le=365)
    notes: Optional[str] = None


class DocumentUpdate(BaseModel):
    doc_type: Optional[str] = None
    label: Optional[str] = None
    document_no: Optional[str] = None
    holder_name: Optional[str] = None
    vehicle_no: Optional[str] = None
    issuer: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    remind_days_before: Optional[int] = Field(default=None, ge=1, le=365)
    notes: Optional[str] = None


class DocumentOut(BaseModel):
    id: int
    doc_type: str
    label: Optional[str]
    document_no: Optional[str]
    holder_name: Optional[str]
    vehicle_no: Optional[str]
    issuer: Optional[str]
    issued_date: Optional[date]
    expiry_date: Optional[date]
    remind_days_before: int
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Demerit points ──────────────────────────────────────────────────────────────

class DemeritCreate(BaseModel):
    offence: str = Field(min_length=2, max_length=255)
    points: int = Field(ge=0, le=12)
    offence_date: date
    violation_id: Optional[str] = None
    section: Optional[str] = None
    vehicle_no: Optional[str] = None
    notes: Optional[str] = None


class DemeritOut(BaseModel):
    id: int
    offence: str
    violation_id: Optional[str]
    section: Optional[str]
    points: int
    offence_date: date
    vehicle_no: Optional[str]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
