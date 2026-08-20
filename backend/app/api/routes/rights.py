"""
Drivers' Rights and Police Protocol.

Everything a driver needs the moment a traffic officer waves them down: what the officer
may and may not do, what the driver must produce, how a breath test is meant to be run,
the protocol when the driver is a woman, and who to call if something goes wrong.

The police-stop checklist itself lives in ``services/document_service.py`` and is reused
here so the scanner page and this page never drift apart.

English content only, matching ``license.py`` and ``fines.py`` — the frontend supplies its
own trilingual UI labels.
"""

from fastapi import APIRouter

from app.services import document_service
from app.utils.response import success_response

router = APIRouter(prefix="/rights", tags=["Drivers' Rights"])

# ── What you may do, and what you must do ───────────────────────────────────────

DRIVER_RIGHTS = [
    {
        "id": "identify_officer",
        "right": "You may ask who is stopping you",
        "detail": (
            "A traffic officer on duty should be in uniform and carrying an official number. "
            "You may politely ask for the name and number, and you may write it down. That "
            "number is printed on any charge sheet or permit issued to you."
        ),
        "basis": "Police Departmental Orders",
        "strength": "right",
    },
    {
        "id": "reason_for_stop",
        "right": "You may ask why you were stopped",
        "detail": (
            "You are entitled to be told the offence alleged against you before anything is "
            "written. Ask calmly and once — arguing at the roadside helps nobody."
        ),
        "basis": "Motor Traffic Act",
        "strength": "right",
    },
    {
        "id": "read_before_signing",
        "right": "You may read the charge sheet before you sign it",
        "detail": (
            "Check the offence, the section, the amount and the dates. Your signature "
            "acknowledges receipt of the charge — it is not an admission of guilt unless the "
            "form says so. If a box is blank when you sign, ask for it to be filled in first."
        ),
        "basis": "Section 215A M.T.A.",
        "strength": "right",
    },
    {
        "id": "refuse_spot_fine",
        "right": "You may decline the spot fine and go to court instead",
        "detail": (
            "A spot fine is an option, not an order. If you believe you did not commit the "
            "offence you may decline to settle it and have a Magistrate decide. Say so at the "
            "roadside — the officer then issues the papers for court."
        ),
        "basis": "Section 215A M.T.A.",
        "strength": "right",
    },
    {
        "id": "receipt_for_licence",
        "right": "If your licence is taken, you must be given a permit in its place",
        "detail": (
            "An officer who withholds your driving licence must issue the yellow Temporary "
            "Permit under Section 135. It legally replaces your licence — normally for two "
            "months — and carries the court date and the station holding your licence. Never "
            "let a licence be taken without that permit."
        ),
        "basis": "Section 135 M.T.A.",
        "strength": "right",
    },
    {
        "id": "no_cash_at_roadside",
        "right": "No officer may collect fine money at the roadside",
        "detail": (
            "Spot fines are paid at a post office against the charge sheet, never in cash to "
            "the officer. A demand for money on the spot is a bribe — note the officer's "
            "number, the place and the time, and report it to CIABOC on 1954."
        ),
        "basis": "Bribery Act",
        "strength": "right",
    },
    {
        "id": "witness",
        "right": "You may have someone present",
        "detail": (
            "You may call a family member or friend and tell them where you are. You may also "
            "record the interaction in a public place, provided you do not obstruct the officer "
            "or interfere with the stop."
        ),
        "basis": "General law",
        "strength": "qualified",
    },
    {
        "id": "vehicle_search",
        "right": "A search of the vehicle should have a reason",
        "detail": (
            "An officer may search a vehicle where there are grounds to suspect an offence. You "
            "may ask what is being looked for and ask that the search happen in your presence."
        ),
        "basis": "Code of Criminal Procedure",
        "strength": "qualified",
    },
]

DRIVER_DUTIES = [
    {
        "id": "must_stop",
        "duty": "You must stop when signalled",
        "detail": "Failing to stop for a police officer in uniform is itself an offence, and a far more serious one than whatever you were stopped for.",
    },
    {
        "id": "must_produce",
        "duty": "You must produce your documents",
        "detail": "Driving licence, revenue licence and insurance certificate. Goods and passenger vehicles must also produce the relevant permit. Not carrying your licence is a Section 135 offence in its own right.",
    },
    {
        "id": "must_identify",
        "duty": "You must give your correct name and address",
        "detail": "Giving false particulars is a separate offence and turns a spot fine into a court matter.",
    },
    {
        "id": "must_submit_breath",
        "duty": "You must submit to a breath test when required",
        "detail": "Refusal is treated as seriously as a positive reading — LKR 25,000, six demerit points and the licence withheld.",
    },
    {
        "id": "must_not_obstruct",
        "duty": "You must not obstruct the officer",
        "detail": "Recording is allowed; blocking, shouting, grabbing documents back or driving off is obstruction and is charged separately.",
    },
]

# ── Breath test ─────────────────────────────────────────────────────────────────

BREATHALYSER_PROTOCOL = {
    "limits": [
        {"driver": "Private vehicle (car, van, motorcycle)", "bac_limit": "0.08%", "note": "80 mg of alcohol per 100 ml of blood."},
        {"driver": "Bus, lorry, taxi and other professional drivers", "bac_limit": "0.00%", "note": "Zero tolerance — any reading at all is an offence."},
        {"driver": "Learner driver", "bac_limit": "0.00%", "note": "Treated the same as a professional driver."},
    ],
    "steps": [
        {"step": 1, "title": "The officer must have a reason",
         "detail": "A breath test follows a traffic offence, an accident, or a checkpoint operation. At an organised checkpoint every driver may be tested."},
        {"step": 2, "title": "Check the device and the mouthpiece",
         "detail": "You may ask to see that a fresh, sealed mouthpiece is fitted before you blow. It is reasonable to ask when the device was last calibrated."},
        {"step": 3, "title": "Blow as instructed",
         "detail": "One long, steady breath until the officer tells you to stop. A short or interrupted breath reads as a refusal, so do it properly the first time."},
        {"step": 4, "title": "You are entitled to see the reading",
         "detail": "Ask to see the display. Note the figure, the time and the officer's number for your own record."},
        {"step": 5, "title": "You may ask for a blood test",
         "detail": "If you dispute the roadside reading you may ask to be taken to a government hospital for a blood or urine test. That result, not the roadside device, is what the court relies on."},
        {"step": 6, "title": "If the reading is over the limit",
         "detail": "The licence is withheld and you are issued the yellow Section 135 permit with a court date. Do not drive the vehicle — arrange another driver or leave it parked safely."},
    ],
    "note": (
        "Mouthwash, some cough syrups and a recent meal can affect a roadside reading. That is "
        "exactly what the hospital blood test is for — ask for it at the roadside, not afterwards."
    ),
}

# ── Women drivers ───────────────────────────────────────────────────────────────

WOMEN_DRIVER_PROTOCOL = {
    "summary": (
        "The general rules on searching and arresting women apply on the road as anywhere else. "
        "A woman driver may be stopped, questioned, breath-tested and charged by any officer — "
        "but a body search or an arrest brings in additional protections."
    ),
    "points": [
        {
            "id": "female_officer_search",
            "title": "A body search must be done by a woman officer",
            "detail": "Where a search of the person is necessary, it must be carried out by a woman police officer and with decency. A male officer may not search a woman driver's person.",
            "level": "must",
        },
        {
            "id": "night_arrest",
            "title": "Arrest between 6 PM and 6 AM",
            "detail": "A woman should not ordinarily be arrested at night except in the presence of a woman officer, and where it is unavoidable the reasons are recorded. Ask that a woman officer be called.",
            "level": "must",
        },
        {
            "id": "custody",
            "title": "Detention must be separate",
            "detail": "A woman held at a station must be kept separately from male detainees and under the supervision of a woman officer.",
            "level": "must",
        },
        {
            "id": "inform_someone",
            "title": "You may tell someone where you are",
            "detail": "Whether or not you are arrested, you may call a family member and tell them the station name and the officer's number. Do this early, not later.",
            "level": "right",
        },
        {
            "id": "no_female_officer",
            "title": "If no woman officer is available",
            "detail": "Ask for one to be called and for the wait to be recorded. Ask the officer to note in the book that you requested one. Do not consent to a body search by a male officer.",
            "level": "action",
        },
        {
            "id": "report",
            "title": "If the protocol is broken",
            "detail": "Note the officer's number, the station and the time, then complain to the OIC, the Police Public Complaints line, or the Human Rights Commission on 1996.",
            "level": "action",
        },
    ],
}

# ── Who to call ─────────────────────────────────────────────────────────────────

HOTLINES = [
    {"id": "police_emergency", "name": "Police Emergency", "number": "119",
     "purpose": "Any emergency, crime in progress, or an accident with injuries.",
     "kind": "emergency", "available": "24 hours"},
    {"id": "ambulance", "name": "Suwa Seriya Ambulance", "number": "1990",
     "purpose": "Free national ambulance service. Call first at any accident with injuries.",
     "kind": "emergency", "available": "24 hours"},
    {"id": "accident_service", "name": "Accident Service — National Hospital, Colombo", "number": "011-2691111",
     "purpose": "Trauma and accident admissions.", "kind": "emergency", "available": "24 hours"},
    {"id": "traffic_police", "name": "Traffic Police Headquarters", "number": "011-2691111",
     "purpose": "Queries about a charge sheet, a withheld licence, or traffic arrangements.",
     "kind": "traffic", "available": "Office hours"},
    {"id": "traffic_hotline", "name": "Traffic Information Hotline", "number": "1987",
     "purpose": "Road conditions, congestion and traffic information.", "kind": "traffic", "available": "24 hours"},
    {"id": "police_hq", "name": "Police Headquarters", "number": "011-2421111",
     "purpose": "General police enquiries and station contact details.", "kind": "traffic", "available": "24 hours"},
    {"id": "ciaboc", "name": "CIABOC — Bribery or Corruption Commission", "number": "1954",
     "purpose": "Report a demand for a bribe by any public officer, including at a traffic stop.",
     "kind": "complaint", "available": "Office hours"},
    {"id": "police_complaints", "name": "Police Public Complaints Division", "number": "011-2440440",
     "purpose": "Complaints about the conduct of a police officer.", "kind": "complaint", "available": "Office hours"},
    {"id": "hrc", "name": "Human Rights Commission of Sri Lanka", "number": "1996",
     "purpose": "Unlawful arrest, detention, or treatment in custody.", "kind": "complaint", "available": "Office hours"},
    {"id": "womens_helpline", "name": "Women's Helpline", "number": "1938",
     "purpose": "Support and complaints where a woman has been mistreated.", "kind": "complaint", "available": "24 hours"},
    {"id": "rda", "name": "Road Development Authority", "number": "011-2862761",
     "purpose": "Road damage, missing signs, unsafe road works.", "kind": "traffic", "available": "Office hours"},
]

# ── Reporting a bribe or misconduct ─────────────────────────────────────────────

COMPLAINT_STEPS = [
    {"step": 1, "title": "Write down the details straight away",
     "detail": "The officer's number, the place, the date and time, the vehicle you were driving, and exactly what was said. Memory fades within hours — write it in your phone before you drive off."},
    {"step": 2, "title": "Keep every paper",
     "detail": "The charge sheet, the temporary permit, any receipt. Photograph them. Without the officer's number a complaint is very hard to pursue."},
    {"step": 3, "title": "For a bribe, call CIABOC on 1954",
     "detail": "The Commission to Investigate Allegations of Bribery or Corruption takes complaints by phone, in writing, or in person. Reporting a demand for a bribe is not itself an offence."},
    {"step": 4, "title": "For conduct, complain to the OIC first",
     "detail": "Go to the Officer-in-Charge of the station named on your papers and ask that your complaint be entered in the information book. Ask for the entry number."},
    {"step": 5, "title": "Escalate if nothing happens",
     "detail": "Police Public Complaints Division, then the National Police Commission. For unlawful arrest or treatment in custody, the Human Rights Commission on 1996."},
    {"step": 6, "title": "Never pay to make it go away",
     "detail": "Paying a bribe leaves you with no charge sheet, no receipt, and no way to prove the matter is settled. The offence stays open on the system."},
]

DISCLAIMER = (
    "Guidance for drivers, not legal advice. Rights and procedures come from the Motor Traffic "
    "Act, the Code of Criminal Procedure and police departmental orders, and are applied by "
    "officers case by case. Verify hotline numbers before relying on them in an emergency, and "
    "consult a lawyer for anything going to court."
)


@router.get("/overview")
async def get_overview():
    """Everything the Drivers' Rights page needs in one call."""
    return success_response("Drivers' rights and police protocol", {
        "rights":            DRIVER_RIGHTS,
        "duties":            DRIVER_DUTIES,
        "police_stop_guide": document_service.POLICE_STOP_GUIDE,
        "breathalyser":      BREATHALYSER_PROTOCOL,
        "women_drivers":     WOMEN_DRIVER_PROTOCOL,
        "hotlines":          HOTLINES,
        "complaint_steps":   COMPLAINT_STEPS,
        "payment_channels":  document_service.FINE_PAYMENT_CHANNELS,
        "payment_note":      document_service.FINE_PAYMENT_NOTE,
        "disclaimer":        DISCLAIMER,
    })


@router.get("/hotlines")
async def get_hotlines(kind: str | None = None):
    """Emergency, traffic and complaint numbers. ``kind`` filters to one group."""
    items = HOTLINES if not kind or kind == "all" else [h for h in HOTLINES if h["kind"] == kind]
    return success_response("Hotlines listed successfully", items)


@router.get("/breathalyser")
async def get_breathalyser():
    return success_response("Breath test procedure", BREATHALYSER_PROTOCOL)


@router.get("/women-drivers")
async def get_women_driver_protocol():
    return success_response("Protocol for women drivers", WOMEN_DRIVER_PROTOCOL)


@router.get("/complaint-steps")
async def get_complaint_steps():
    return success_response("How to report a bribe or misconduct", {
        "steps": COMPLAINT_STEPS,
        "hotlines": [h for h in HOTLINES if h["kind"] == "complaint"],
    })
