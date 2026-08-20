"""
Shapes for the stateless compute endpoints.

These mirror the records the browser holds. Everything optional except what the
calculations genuinely need, because a half-filled record should still get an answer
rather than a validation error — the driver typing a fine in at the roadside will not
have every field.
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class FineIn(BaseModel):
    id: Optional[int] = None
    offence: str = ""
    fine_amount_lkr: float = 0
    issued_date: date
    due_date: Optional[date] = None
    court: Optional[str] = None
    court_date: Optional[date] = None
    status: Optional[str] = "pending"
    paid_date: Optional[date] = None
    licence_withheld: bool = False
    licence_recovered: bool = False


class DocumentIn(BaseModel):
    id: Optional[int] = None
    doc_type: str
    label: Optional[str] = None
    document_no: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    remind_days_before: Optional[int] = Field(default=30, ge=1, le=365)


class DemeritIn(BaseModel):
    id: Optional[int] = None
    offence: str = ""
    points: int = 0
    offence_date: date
    section: Optional[str] = None


class FineBatch(BaseModel):
    fines: list[FineIn] = []
    # Overridable so the calculations can be tested against a fixed date
    today: Optional[date] = None


class DocumentBatch(BaseModel):
    documents: list[DocumentIn] = []
    today: Optional[date] = None


class DemeritBatch(BaseModel):
    records: list[DemeritIn] = []
    today: Optional[date] = None


class RemindersBatch(BaseModel):
    fines: list[FineIn] = []
    documents: list[DocumentIn] = []
    today: Optional[date] = None
