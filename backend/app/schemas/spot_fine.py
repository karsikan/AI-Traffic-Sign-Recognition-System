from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class SpotFineCreate(BaseModel):
    """What the driver types in, or what the scanner read off the charge sheet."""

    offence: str = Field(min_length=2, max_length=255)
    fine_amount_lkr: float = Field(ge=0)
    issued_date: date

    reference_no: Optional[str] = None
    section: Optional[str] = None
    due_date: Optional[date] = None
    place_of_offence: Optional[str] = None
    vehicle_no: Optional[str] = None
    police_station: Optional[str] = None
    officer_no: Optional[str] = None
    court: Optional[str] = None
    court_date: Optional[date] = None
    licence_withheld: bool = False
    notes: Optional[str] = None


class SpotFineUpdate(BaseModel):
    """Every field optional — only what is sent gets changed."""

    offence: Optional[str] = None
    fine_amount_lkr: Optional[float] = Field(default=None, ge=0)
    issued_date: Optional[date] = None
    reference_no: Optional[str] = None
    section: Optional[str] = None
    due_date: Optional[date] = None
    place_of_offence: Optional[str] = None
    vehicle_no: Optional[str] = None
    police_station: Optional[str] = None
    officer_no: Optional[str] = None
    court: Optional[str] = None
    court_date: Optional[date] = None
    licence_withheld: Optional[bool] = None
    licence_recovered: Optional[bool] = None
    notes: Optional[str] = None


class SpotFineMarkPaid(BaseModel):
    paid_date: Optional[date] = None
    receipt_no: Optional[str] = None


class SpotFineOut(BaseModel):
    id: int
    reference_no: Optional[str]
    offence: str
    section: Optional[str]
    fine_amount_lkr: float
    issued_date: date
    due_date: Optional[date]
    place_of_offence: Optional[str]
    vehicle_no: Optional[str]
    police_station: Optional[str]
    officer_no: Optional[str]
    court: Optional[str]
    court_date: Optional[date]
    licence_withheld: bool
    licence_recovered: bool
    status: str
    paid_date: Optional[date]
    receipt_no: Optional[str]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
