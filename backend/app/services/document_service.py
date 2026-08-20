"""
Road Document Scanner service.

Reads a photo of any Sri Lankan road/vehicle document with Gemini Vision, works out
which of the six supported types it is, extracts that type's fields, and returns a
common expiry status so the frontend can render every type with the same layout.

Supported types
  temporary_permit     Yellow Section 135 M.T.A. permit issued when police withhold a licence
  driving_licence      DMT driving licence (smart card or older paper)
  revenue_licence      Annual vehicle revenue licence (road tax)
  insurance            Motor insurance certificate / cover note
  vehicle_registration Certificate of Registration (CR book)
  emission_test        Vehicle emission test / roadworthiness (VRC) certificate
"""

from datetime import date, datetime

from app.services.gemini_service import extract_road_document

# ── Spot-fine schedule printed on the reverse of the permit (Section 215A) ──────
SPOT_FINE_SCHEDULE = [
    {"serial": "01", "section": "21, 22, 23, 24, 24(අ)", "provision": "Identification Plates"},
    {"serial": "02", "section": "38", "provision": "Revenue Licence should be displayed on Motor vehicles and produced when required"},
    {"serial": "03", "section": "45", "provision": "Prohibition on the use of motor vehicle contravening the provision of Revenue"},
    {"serial": "04", "section": "128(අ)/a", "provision": "Driving Emergency Service Vehicle & Public Service Vehicle without a Licence"},
    {"serial": "05", "section": "128(අ)/b", "provision": "Driving Special Purpose Vehicle without obtaining a Licence"},
    {"serial": "06", "section": "128(අ)/c", "provision": "Driving a Vehicle loaded with Chemicals, hazardous WASTE without a Licence"},
    {"serial": "07", "section": "130", "provision": "Not having a Licence to Drive a Specific class of vehicles"},
    {"serial": "08", "section": "135", "provision": "Failure to carrying Driving Licence when driving"},
    {"serial": "09", "section": "139(අ)/a", "provision": "Instructing without an Instructor's Licence"},
    {"serial": "10", "section": "140, 141", "provision": "Exceeding speed limit"},
]

# Keywords → schedule serial, used to guess the provision from a handwritten offence
_OFFENCE_KEYWORDS = {
    "01": ["number plate", "identification plate", "no plate"],
    "02": ["revenue licence", "revenue license", "road tax"],
    "04": ["public service", "emergency service"],
    "05": ["special purpose"],
    "06": ["chemical", "hazardous", "waste"],
    "07": ["without a licence", "without licence", "without a license", "no licence", "unlicensed"],
    "08": ["not carrying", "failure to carry", "did not produce", "without carrying"],
    "09": ["instructor"],
    "10": ["speed", "speeding", "exceeding"],
}

# ── Document registry ───────────────────────────────────────────────────────────
# expiry_field / start_field drive the shared expiry banner. warn_days is how many
# days before expiry the banner turns amber — short for a permit, long for a licence.
DOC_TYPES: dict[str, dict] = {
    "temporary_permit": {
        "label": "Temporary Permit (Section 135 M.T.A.)",
        "hint": "yellow police form issued in lieu of a withheld driving licence",
        "expiry_field": "valid_to",
        "start_field": "valid_from",
        "warn_days": 7,
        "expired_note": (
            "Driving on an expired permit is an offence under Section 130. Get it extended by "
            "the court, or by the OIC of the police station holding your original licence."
        ),
        "fields": [
            ("permit_no", "Permit No"), ("section", "Section"),
            ("driver_name", "Driver Name"), ("address", "Address"), ("nic_no", "NIC No"),
            ("vehicle_no", "Vehicle No"), ("date_of_issue", "Date of Issue"),
            ("time_of_issue", "Time of Issue"), ("officer_no", "Police Officer's No"),
            ("valid_from", "Valid From"), ("valid_to", "Valid To"),
            ("categories_permitted", "Categories"), ("fee_lkr", "Fee (LKR)"),
            ("payment_ref", "Payment Ref"), ("place_of_issue", "Place of Issue"),
            ("court", "Court"), ("court_date", "Court Date"),
            ("offence_description", "Nature of Offence"),
        ],
    },
    "driving_licence": {
        "label": "Driving Licence",
        "hint": "DMT driving licence — smart card or older paper licence",
        "expiry_field": "date_of_expiry",
        "start_field": "date_of_issue",
        "warn_days": 30,
        "expired_note": (
            "Driving on an expired licence is an offence under Section 130. Renew online at "
            "e.gov.lk or at your nearest DMT office."
        ),
        "fields": [
            ("licence_no", "Licence No"), ("full_name", "Full Name"),
            ("address", "Address"), ("nic_no", "NIC No"),
            ("date_of_birth", "Date of Birth"), ("blood_group", "Blood Group"),
            ("date_of_issue", "Date of Issue"), ("date_of_expiry", "Date of Expiry"),
            ("categories_permitted", "Categories"), ("issuing_authority", "Issuing Authority"),
        ],
    },
    "revenue_licence": {
        "label": "Revenue Licence (Road Tax)",
        "hint": "annual vehicle revenue licence displayed on the windscreen",
        "expiry_field": "valid_to",
        "start_field": "valid_from",
        "warn_days": 14,
        "expired_note": (
            "An expired revenue licence is a Section 38/45 offence — LKR 10,000 fine and the "
            "vehicle may be impounded. Renew at the Provincial Revenue office or online."
        ),
        "fields": [
            ("licence_no", "Licence No"), ("vehicle_no", "Vehicle No"),
            ("vehicle_class", "Vehicle Class"), ("owner_name", "Owner Name"),
            ("valid_from", "Valid From"), ("valid_to", "Valid To"),
            ("fee_lkr", "Fee (LKR)"), ("issuing_authority", "Issuing Authority"),
        ],
    },
    "insurance": {
        "label": "Motor Insurance Certificate",
        "hint": "insurance certificate or cover note from an insurer",
        "expiry_field": "valid_to",
        "start_field": "valid_from",
        "warn_days": 14,
        "expired_note": (
            "Driving without valid third-party insurance is an offence and leaves you personally "
            "liable for all accident costs. Renew before driving."
        ),
        "fields": [
            ("policy_no", "Policy No"), ("insurer_name", "Insurer"),
            ("insured_name", "Insured Name"), ("vehicle_no", "Vehicle No"),
            ("cover_type", "Cover Type"), ("sum_insured", "Sum Insured (LKR)"),
            ("valid_from", "Valid From"), ("valid_to", "Valid To"),
        ],
    },
    "vehicle_registration": {
        "label": "Certificate of Registration (CR Book)",
        "hint": "vehicle registration book / certificate issued by the DMT",
        "expiry_field": None,          # a CR does not expire
        "start_field": None,
        "warn_days": None,
        "expired_note": None,
        "fields": [
            ("registration_no", "Registration No"), ("chassis_no", "Chassis No"),
            ("engine_no", "Engine No"), ("owner_name", "Owner Name"),
            ("address", "Address"), ("make", "Make"), ("model", "Model"),
            ("year_of_manufacture", "Year of Manufacture"), ("fuel_type", "Fuel Type"),
            ("class_of_vehicle", "Class of Vehicle"),
            ("date_of_registration", "Date of Registration"),
        ],
    },
    "spot_fine_charge_sheet": {
        "label": "Police Spot-Fine Charge Sheet (Section 215A)",
        "hint": "the fine ticket a police officer writes out at the roadside, payable at a post office",
        "expiry_field": "payment_due_date",
        "start_field": "date_of_offence",
        "warn_days": 3,
        "expired_note": (
            "The payment period has passed. The matter now goes to court — attend on the court "
            "date or a warrant may be issued. Contact the issuing police station immediately."
        ),
        "fields": [
            ("charge_sheet_no", "Charge Sheet No"), ("section", "Section"),
            ("offence_description", "Offence"), ("fine_amount_lkr", "Fine Amount (LKR)"),
            ("driver_name", "Driver Name"), ("nic_no", "NIC No"),
            ("vehicle_no", "Vehicle No"), ("date_of_offence", "Date of Offence"),
            ("time_of_offence", "Time of Offence"), ("place_of_offence", "Place of Offence"),
            ("payment_due_date", "Pay Before"), ("police_station", "Police Station"),
            ("officer_no", "Police Officer's No"), ("court", "Court"),
            ("court_date", "Court Date"),
        ],
    },
    "court_summons": {
        "label": "Court Summons / Charge Notice",
        "hint": "a notice requiring the driver to appear before a Magistrate's Court",
        "expiry_field": None,          # a summons does not expire — it has a hearing date
        "start_field": None,
        "warn_days": None,
        "expired_note": None,
        "fields": [
            ("summons_no", "Summons No"), ("case_no", "Case No"),
            ("court", "Court"), ("hearing_date", "Hearing Date"),
            ("accused_name", "Name"), ("nic_no", "NIC No"),
            ("vehicle_no", "Vehicle No"), ("offence_description", "Offence"),
            ("section", "Section"), ("police_station", "Police Station"),
        ],
    },
    "emission_test": {
        "label": "Emission Test / Roadworthiness Certificate",
        "hint": "vehicle emission test certificate or VRC roadworthiness certificate",
        "expiry_field": "valid_to",
        "start_field": "test_date",
        "warn_days": 14,
        "expired_note": (
            "A current emission certificate is required to renew your revenue licence. "
            "Book a re-test at an authorised testing station."
        ),
        "fields": [
            ("certificate_no", "Certificate No"), ("vehicle_no", "Vehicle No"),
            ("test_date", "Test Date"), ("valid_to", "Valid Until"),
            ("testing_station", "Testing Station"), ("result", "Result"),
        ],
    },
}

# ── "The police stopped me" guidance ────────────────────────────────────────────
POLICE_STOP_GUIDE = [
    {"step": 1, "title": "Stop safely and stay in the vehicle",
     "detail": "Pull over to the left, switch off the engine, turn on hazard lights. Stay seated unless asked to step out. Keep your hands visible."},
    {"step": 2, "title": "Produce your documents",
     "detail": "An officer may ask for your driving licence, revenue licence, insurance certificate and, for goods or passenger vehicles, the relevant permit. Failure to carry your licence is itself a Section 135 offence."},
    {"step": 3, "title": "Note the officer's number",
     "detail": "Every officer has an official number. It is written on any charge sheet or permit issued to you. Note it down — you will need it for any query or appeal."},
    {"step": 4, "title": "If you are charged",
     "detail": "For a spot-fine offence you receive a Charge Sheet under Section 215A. For offences where the licence is withheld, you receive the yellow Temporary Permit under Section 135 instead of your licence."},
    {"step": 5, "title": "Check what is written before you sign",
     "detail": "Read the offence, the section, the fine amount and the dates. If you disagree, you may decline to admit the offence and have the matter decided in court instead of paying the spot fine."},
    {"step": 6, "title": "Pay or attend court on time",
     "detail": "Pay the spot fine within the period printed on the charge sheet — online through GovPay at govpay.lk, from a banking or fintech app, or at a post office — or attend court on the printed date. Missing both can lead to a warrant."},
    {"step": 7, "title": "Get your licence back",
     "detail": "Paying through GovPay sends a confirmation SMS to the officer, who then releases your licence on the spot. If you paid at a post office, take the receipt to the OIC of the station shown on your papers."},
]

FINE_PAYMENT_CHANNELS = [
    {
        "channel": "GovPay (online)",
        "detail": (
            "The government's own portal, rolled out island-wide in February 2026. Pay from a "
            "banking or fintech app in minutes. You need the fine sheet number, vehicle number, "
            "driving licence number, the police station on the sheet, and the traffic officer's "
            "mobile number."
        ),
        "url": "https://govpay.lk/en/spot-fine",
        "urls": {
            "en": "https://govpay.lk/en/spot-fine",
            "si": "https://govpay.lk/si/spot-fine",
            "ta": "https://govpay.lk/ta/spot-fine",
        },
        "note": "The officer releases your licence once the payment confirmation SMS reaches them.",
        "recommended": True,
    },
    {
        "channel": "Banking & fintech apps",
        "detail": (
            "The same GovPay payment from inside an app you already have — BOC Flex, ComBank "
            "Digital, HNB Digital, Sampath Vishwa, Seylan, FriMi, Genie, Helakuru, iPay, NEOS, "
            "NSB Pay, Peoples Pay and others. Pick Sri Lanka Police, then Traffic Fine."
        ),
        "url": None,
        "note": "eZ Cash and mCash also accept traffic fines, including over the counter at agents.",
        "recommended": False,
    },
    {
        "channel": "Post Office",
        "detail": (
            "The traditional route, still open. Take the charge sheet to any post office or "
            "sub-post office and pay the amount printed on it. Selected outlets stay open until "
            "8 PM or 9 PM for fine payments."
        ),
        "url": "https://slpost.gov.lk/vehicle-fine-payment-2/",
        "note": "Keep the receipt — you need it at the police station to get a withheld licence back.",
        "recommended": False,
    },
    {
        "channel": "Police Station",
        "detail": "Some stations accept payment at the counter shown under 'Place of Issue' on the charge sheet.",
        "url": "https://www.police.lk/",
        "note": None,
        "recommended": False,
    },
]

FINE_PAYMENT_NOTE = (
    "Keep the payment receipt or the GovPay confirmation. You need it to prove the matter is "
    "settled and, where your licence was withheld, to get the original licence back."
)

_DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%d.%m.%Y"]


def build_type_spec() -> str:
    """Describe every supported type and its fields for the Gemini prompt."""
    lines = []
    for key, spec in DOC_TYPES.items():
        names = ", ".join(f for f, _ in spec["fields"])
        lines.append(f'- "{key}" = {spec["label"]} ({spec["hint"]})\n    fields: {names}')
    return "\n".join(lines)


def _parse_date(value) -> date | None:
    """Accept the several shapes Gemini may return for a handwritten date."""
    if not value or not isinstance(value, str):
        return None
    text = value.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def build_expiry(fields: dict, spec: dict, today: date | None = None) -> dict:
    """Shared expiry banner — days remaining, progress bar and a traffic-light status."""
    today = today or date.today()

    if not spec.get("expiry_field"):
        return {
            "status": "not_applicable",
            "message": f"{spec['label']} does not expire.",
            "days_remaining": None, "total_days": None,
            "percent_elapsed": None, "expired": False,
        }

    end = _parse_date(fields.get(spec["expiry_field"]))
    start = _parse_date(fields.get(spec["start_field"])) if spec.get("start_field") else None

    if not end:
        return {
            "status": "unknown",
            "message": "The expiry date could not be read. Check the document manually.",
            "days_remaining": None, "total_days": None,
            "percent_elapsed": None, "expired": None,
        }

    days_remaining = (end - today).days
    total_days = (end - start).days if start and end > start else None
    percent = None
    if total_days:
        elapsed = max(0, min(total_days, (today - start).days))
        percent = round(elapsed / total_days * 100, 1)

    warn = spec.get("warn_days") or 14
    if days_remaining < 0:
        status = "expired"
        message = f"EXPIRED {abs(days_remaining)} day(s) ago. {spec.get('expired_note') or ''}".strip()
    elif days_remaining <= warn:
        status = "expiring"
        message = f"Expires in {days_remaining} day(s) — renew now."
    else:
        status = "valid"
        message = f"Valid — {days_remaining} day(s) remaining."

    return {
        "status": status, "message": message,
        "days_remaining": days_remaining, "total_days": total_days,
        "percent_elapsed": percent, "expired": days_remaining < 0,
    }


def build_payment_reminder(fields: dict, today: date | None = None) -> dict | None:
    """Countdown and payment channels for a police spot-fine charge sheet."""
    today = today or date.today()
    due = _parse_date(fields.get("payment_due_date"))
    amount = fields.get("fine_amount_lkr")
    if not due and amount in (None, ""):
        return None

    days_left = (due - today).days if due else None
    if days_left is None:
        message = "No payment deadline could be read — check the charge sheet and pay without delay."
    elif days_left < 0:
        message = (
            f"Payment was due {abs(days_left)} day(s) ago. The matter now proceeds to court — "
            f"contact the issuing police station immediately."
        )
    elif days_left == 0:
        message = "Payment is due TODAY. Pay at a post office before it closes."
    else:
        message = f"Pay within {days_left} day(s) to avoid the case going to court."

    return {
        "due_date": due.isoformat() if due else None,
        "days_left": days_left,
        "amount_lkr": amount,
        "message": message,
        "channels": FINE_PAYMENT_CHANNELS,
        "note": FINE_PAYMENT_NOTE,
    }


def build_court_reminder(court_date, today: date | None = None) -> dict | None:
    """Countdown to a court/hearing date written on a permit, charge sheet or summons."""
    today = today or date.today()
    hearing = _parse_date(court_date)
    if not hearing:
        return None
    days = (hearing - today).days
    if days < 0:
        message = f"Court date passed {abs(days)} day(s) ago."
    elif days == 0:
        message = "Court hearing is TODAY."
    else:
        message = f"Court hearing in {days} day(s)."
    return {"court_date": hearing.isoformat(), "days_until": days, "message": message}


def decode_categories(codes) -> list[dict]:
    """Map A/A1…G/G1 codes to what the holder may actually drive."""
    from app.api.routes.license import LICENCE_CATEGORIES

    by_code = {c["code"]: c for c in LICENCE_CATEGORIES}
    decoded = []
    for code in codes or []:
        key = str(code).strip().upper()
        info = by_code.get(key)
        decoded.append({
            "code": key,
            "vehicle": info["vehicle"] if info else "Category not in the DMT list — check with the DMT",
            "min_age": info["min_age"] if info else None,
            "description": info["description"] if info else None,
        })
    return decoded


def match_offence(offence_description) -> dict | None:
    """Guess which Section 215A spot-fine provision a handwritten offence falls under."""
    if not offence_description or not isinstance(offence_description, str):
        return None
    text = offence_description.lower()
    for serial, keywords in _OFFENCE_KEYWORDS.items():
        if any(k in text for k in keywords):
            entry = next((e for e in SPOT_FINE_SCHEDULE if e["serial"] == serial), None)
            if entry:
                return {**entry, "matched_on": offence_description}
    return None


def _present_fields(fields: dict, spec: dict) -> list[dict]:
    """Ordered label/value pairs, skipping anything the AI could not read."""
    out = []
    for key, label in spec["fields"]:
        value = fields.get(key)
        if value in (None, "", [], {}):
            continue
        if isinstance(value, list):
            value = ", ".join(str(v) for v in value)
        out.append({"key": key, "label": label, "value": str(value)})
    return out


def scan_document(image_bytes: bytes) -> dict:
    """
    Full pipeline: photo → document type + fields → expiry status, and for a
    temporary permit also the court countdown, decoded categories and fine provision.
    """
    result = extract_road_document(image_bytes, build_type_spec())

    if result is None:
        raise RuntimeError(
            "AI reader unavailable. Check that GEMINI_API_KEY is set in backend/.env, "
            "then try again."
        )

    doc_type = result.get("document_type")
    spec = DOC_TYPES.get(doc_type)
    if not spec:
        raise ValueError(
            "This does not look like a Sri Lankan road document. Supported: "
            + ", ".join(s["label"] for s in DOC_TYPES.values())
        )

    fields = result.get("fields") or {}
    extras: dict = {}

    if fields.get("categories_permitted"):
        extras["categories"] = decode_categories(fields["categories_permitted"])

    # Court / hearing countdown — permits and charge sheets carry a court date,
    # a summons carries a hearing date.
    court = build_court_reminder(fields.get("court_date") or fields.get("hearing_date"))
    if court:
        extras["court"] = court

    # Which Section 215A provision the offence falls under
    offence = match_offence(fields.get("offence_description"))
    if offence:
        extras["offence"] = offence

    # Spot fine — how much, by when, and where to pay
    if doc_type == "spot_fine_charge_sheet":
        payment = build_payment_reminder(fields)
        if payment:
            extras["payment"] = payment

    # Anything police-issued gets the "you were stopped — what now" checklist
    if doc_type in ("temporary_permit", "spot_fine_charge_sheet", "court_summons"):
        extras["police_stop_guide"] = POLICE_STOP_GUIDE

    return {
        "document_type":  doc_type,
        "document_label": spec["label"],
        "fields":         _present_fields(fields, spec),
        "expiry":         build_expiry(fields, spec),
        "extras":         extras,
        "confidence":     result.get("confidence"),
        "notice": (
            "AI-extracted values may be misread. Always verify against the original "
            "document — this reading has no legal standing."
        ),
    }
