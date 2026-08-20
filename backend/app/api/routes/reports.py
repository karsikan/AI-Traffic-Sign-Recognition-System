"""
PDF report export.

The driver's records live in their browser, so they arrive in the request rather than
being read from a table. Nothing is stored — the PDF is built and streamed straight back.
"""

from datetime import date

from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel

from app.models.demerit_record import DemeritRecord
from app.models.spot_fine import SpotFine
from app.models.user_document import UserDocument
from app.schemas.compute import DemeritIn, DocumentIn, FineIn
from app.services import demerit_service, locker_service, report_service, spot_fine_service
from app.utils.response import error_response

router = APIRouter(prefix="/reports", tags=["Reports"])


class DetectionIn(BaseModel):
    sign_name: str | None = None
    confidence: float | None = None
    source_type: str | None = None
    created_at: str | None = None


class ReportRequest(BaseModel):
    driver_name: str | None = None
    fines: list[FineIn] = []
    documents: list[DocumentIn] = []
    demerit: list[DemeritIn] = []
    detections: list[DetectionIn] = []
    today: date | None = None


@router.post("/driver.pdf")
async def driver_report_pdf(payload: ReportRequest):
    """
    Fines, demerit points, documents and recent detections as one PDF, built from the
    records posted in. Returned as a download rather than the usual JSON envelope.
    """
    try:
        today = payload.today or date.today()

        # Unsaved instances, purely so the existing derivation functions can read them
        fine_models = [
            SpotFine(
                id=f.id, offence=f.offence, fine_amount_lkr=f.fine_amount_lkr,
                issued_date=f.issued_date, due_date=f.due_date, court=f.court,
                court_date=f.court_date, status=f.status or "pending",
                paid_date=f.paid_date, licence_withheld=bool(f.licence_withheld),
                licence_recovered=bool(f.licence_recovered),
            )
            for f in payload.fines
        ]
        fines = []
        for model in fine_models:
            fines.append({
                "offence": model.offence,
                "issued_date": model.issued_date.isoformat(),
                "status": model.status,
                "countdown": spot_fine_service.build_countdown(model, today),
            })

        pending = [f for f in fine_models if f.status != "pending" and f.status == "paid"]
        outstanding = [f for f in fine_models if f.status != "paid"]
        payable = 0.0
        next_deadline = None
        for model in outstanding:
            c = spot_fine_service.build_countdown(model, today)
            if c["payable_now_lkr"]:
                payable += c["payable_now_lkr"]
            if c["days_left"] is not None:
                from datetime import timedelta
                deadline = today + timedelta(days=c["days_left"])
                if next_deadline is None or deadline < next_deadline:
                    next_deadline = deadline
        summary = {
            "pending": len(outstanding),
            "total_payable_now_lkr": round(payable, 2),
            "next_deadline": next_deadline.isoformat() if next_deadline else None,
        }

        demerit_models = [
            DemeritRecord(id=r.id, offence=r.offence, points=r.points,
                          offence_date=r.offence_date, section=r.section)
            for r in payload.demerit
        ]
        demerit_records = [demerit_service.serialise(r, today) for r in demerit_models]
        active_points = sum(r["points"] for r in demerit_records if r["active"])
        tier = demerit_service._tier_for(active_points)
        system = demerit_service.DEMERIT_SYSTEM
        balance = {
            "total_points": active_points,
            "threshold": system["suspension_threshold"],
            "window_months": system["window_months"],
            "tier_label": tier["label"],
            "advice": tier["advice"],
        }

        documents = []
        for d in payload.documents:
            model = UserDocument(
                id=d.id, doc_type=d.doc_type, label=d.label, document_no=d.document_no,
                issued_date=d.issued_date, expiry_date=d.expiry_date,
                remind_days_before=d.remind_days_before or 30,
            )
            spec = locker_service.DOC_TYPES.get(d.doc_type, {})
            documents.append({
                "label": d.label,
                "doc_label": spec.get("label", d.doc_type),
                "document_no": d.document_no,
                "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
                "expiry": locker_service.build_expiry(model, today),
            })

        pdf = report_service.build_driver_report(
            fines=fines, summary=summary, balance=balance,
            demerit_records=demerit_records, documents=documents,
            detections=[d.model_dump() for d in payload.detections],
            driver_name=payload.driver_name, today=today,
        )
        filename = report_service.report_filename(payload.driver_name)
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf)),
            },
        )
    except ImportError:
        return error_response(
            "PDF support is not installed. Run: pip install reportlab",
            "PDF_UNAVAILABLE", 503,
        )
    except Exception as e:
        return error_response(str(e), "REPORT_ERROR", 500)
