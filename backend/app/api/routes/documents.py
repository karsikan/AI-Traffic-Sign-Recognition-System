from fastapi import APIRouter, File, UploadFile

from app.services import document_service
from app.utils.response import success_response, error_response

router = APIRouter(prefix="/documents", tags=["Road Document Scanner"])

PERMIT_GUIDE = [
    {"step": 1, "title": "Licence withheld at the roadside",
     "detail": "When you are charged with certain offences, the police officer keeps your driving licence and issues the yellow Temporary Permit (Section 135 M.T.A.) in its place."},
    {"step": 2, "title": "Drive on the permit",
     "detail": "The permit legally replaces your licence for the period printed in the 'Period of Validity' box — normally two months. Carry it and produce it whenever asked."},
    {"step": 3, "title": "Attend court on the printed date",
     "detail": "The court and court date are written on the permit. Attend, or a warrant may be issued."},
    {"step": 4, "title": "Settle the matter",
     "detail": "Pay the fine ordered by the court, or settle the spot fine at the police station shown under 'Place of Issue'."},
    {"step": 5, "title": "Collect your original licence",
     "detail": "Once the case is settled, the OIC of the station that withheld the licence returns it. The permit is then surrendered."},
    {"step": 6, "title": "If the permit runs out first",
     "detail": "If the case is not over before the permit expires, the validity must be extended by the court, or by the OIC of the police station holding your original licence. Do not drive on an expired permit — that is a Section 130 offence."},
]


@router.post("/scan")
async def scan_document(file: UploadFile = File(...)):
    """Read a photo of any supported road document and return its fields plus expiry status."""
    if not file.filename:
        return error_response("Uploaded file is empty.", "EMPTY_UPLOAD", 400)
    if file.content_type and not file.content_type.startswith("image/"):
        return error_response("Invalid file type. Please upload an image of the document.", "INVALID_FILE_TYPE", 400)
    try:
        content = await file.read()
        res = document_service.scan_document(content)
        return success_response("Document scanned successfully", res)
    except ValueError as e:
        return error_response(str(e), "UNKNOWN_DOCUMENT", 422)
    except RuntimeError as e:
        return error_response(str(e), "AI_UNAVAILABLE", 503)
    except Exception as e:
        return error_response(str(e), "SERVER_ERROR", 500)


@router.get("/types")
async def list_document_types():
    """The document types the scanner supports — used by the frontend to list them."""
    return success_response("Supported document types", [
        {
            "key": key,
            "label": spec["label"],
            "hint": spec["hint"],
            "expires": bool(spec["expiry_field"]),
        }
        for key, spec in document_service.DOC_TYPES.items()
    ])


@router.get("/permit-guide")
async def get_permit_guide():
    """What a temporary permit is and what the holder must do — no upload required."""
    return success_response("Temporary permit guide", {
        "section": "135 Motor Traffic Act",
        "typical_validity_days": 60,
        "steps": PERMIT_GUIDE,
        "spot_fine_schedule": document_service.SPOT_FINE_SCHEDULE,
    })


@router.get("/police-stop-guide")
async def get_police_stop_guide():
    """What to do when police stop you, and how to settle a spot fine — no upload required."""
    return success_response("Police stop and fine payment guide", {
        "steps": document_service.POLICE_STOP_GUIDE,
        "payment_channels": document_service.FINE_PAYMENT_CHANNELS,
        "payment_note": document_service.FINE_PAYMENT_NOTE,
        "spot_fine_schedule": document_service.SPOT_FINE_SCHEDULE,
    })
