"""
Revenue licence, emission testing, and ownership transfer.

The three annual or one-off errands every Sri Lankan vehicle owner has to deal with, and
where each of them actually happens online.

The one piece of real logic here is the plate-to-province lookup. Sri Lanka runs two
different revenue licence portals — the Western Province has its own, everyone else uses
eRL 2.0 — so sending a driver to the wrong one wastes their morning. The province is
readable straight off the number plate.
"""

from datetime import date

# ── Provinces and their plate prefixes ──────────────────────────────────────────

PROVINCES = [
    {"code": "WP", "name": "Western",       "capital": "Colombo"},
    {"code": "CP", "name": "Central",       "capital": "Kandy"},
    {"code": "SP", "name": "Southern",      "capital": "Galle"},
    {"code": "NP", "name": "Northern",      "capital": "Jaffna"},
    {"code": "EP", "name": "Eastern",       "capital": "Trincomalee"},
    {"code": "NW", "name": "North Western", "capital": "Kurunegala"},
    {"code": "NC", "name": "North Central", "capital": "Anuradhapura"},
    {"code": "UP", "name": "Uva",           "capital": "Badulla"},
    {"code": "SG", "name": "Sabaragamuwa",  "capital": "Ratnapura"},
]

# Alternate spellings seen on plates and in everyday use
PREFIX_ALIASES = {
    "WP": "WP", "SP": "SP", "CP": "CP", "NP": "NP", "EP": "EP",
    "NW": "NW", "NC": "NC", "UP": "UP",
    "SG": "SG", "SAB": "SG", "SB": "SG",
}

# ── The two revenue licence portals ─────────────────────────────────────────────

ERL_PORTALS = {
    "WP": {
        "name": "Western Province eRL",
        "url": "https://www.gov.lk/services/erl/es/erl/view/index.action",
        "note": (
            "The Western Province runs its own revenue licence portal, separate from the "
            "national one. Vehicles registered WP must renew here."
        ),
    },
    "OTHER": {
        "name": "eRevenue Licence Service (eRL 2.0)",
        "url": "https://web.erl2.gov.lk/",
        "note": (
            "The national portal, covering every province except Western. It replaced the "
            "older provincial systems."
        ),
    },
}

ERL_LOCATE_URL = "https://web.erl2.gov.lk/locate-us?ln=en"

# What must already be valid before a revenue licence can be issued
REVENUE_PREREQUISITES = [
    {"key": "insurance", "label": "Valid third-party insurance certificate",
     "detail": "Must cover the whole licence period. Renew the insurance first — the portal checks it."},
    {"key": "emission", "label": "Valid emission test certificate",
     "detail": "Required for most vehicle categories. This is the one that catches people out — book the test before you try to renew."},
    {"key": "fitness", "label": "Vehicle fitness certificate",
     "detail": "Required for buses, lorries, three-wheelers and other commercial categories rather than private cars."},
    {"key": "previous", "label": "Previous revenue licence",
     "detail": "Have the number to hand. Any arrears from a lapsed period are payable at renewal."},
]

REVENUE_STEPS = [
    {"step": 1, "title": "Renew the insurance first",
     "detail": "Nothing else can proceed without it, and it is the item most often found expired."},
    {"step": 2, "title": "Get the emission test done",
     "detail": "Book online or drive in. The certificate is issued the same day if the vehicle passes."},
    {"step": 3, "title": "Open the right portal",
     "detail": "Western Province vehicles use the WP portal; everyone else uses eRL 2.0. This page picks the right one from your number plate."},
    {"step": 4, "title": "Enter the vehicle and pay",
     "detail": "Vehicle number, previous licence details, then card or online banking."},
    {"step": 5, "title": "Print or save the licence",
     "detail": "Display it on the windscreen. Police scan the QR code at checkpoints — a licence that exists only on your phone is not displayed."},
]

# ── Emission testing ────────────────────────────────────────────────────────────

EMISSION_PROVIDERS = [
    {
        "name": "LAUGFS Eco Sri",
        "url": "https://www.ecosri.lk/",
        "booking_url": "https://bookings.ecosri.lk/",
        "coverage": "Over 90 fixed centres plus mobile units serving around 140 locations",
        "note": "Online booking is available, but tests are still first-come-first-served — the slot time is approximate.",
    },
    {
        "name": "DriveGreen (CleanCo Lanka)",
        "url": "https://www.drivegreen.lk/",
        "booking_url": "https://www.drivegreen.lk/sri-lanka-vehicle-emission-testing-stations/",
        "coverage": "Fixed centres island-wide",
        "note": "Station list on the site. Government-approved fees apply at every authorised centre.",
    },
]

EMISSION_REQUIREMENTS = [
    "The original Certificate of Registration (CR book) or Vehicle Identification Certificate.",
    "If the vehicle is on lease, a copy of the CR certified by the leasing company.",
    "The vehicle itself, warmed up — a cold engine is more likely to fail.",
]

EMISSION_TIPS = [
    {"tip": "Go early or mid-week",
     "detail": "Centres are busiest at the end of the month, when everyone's revenue licence falls due, and on Mondays. Tuesday to Thursday mornings are usually quieter."},
    {"tip": "Warm the engine first",
     "detail": "Drive for ten minutes before the test. A cold engine runs rich and can fail a vehicle that would otherwise pass."},
    {"tip": "Fix the obvious first",
     "detail": "Visible smoke, a due service, or a dirty air filter will fail the test. A service beforehand costs less than a re-test plus a wasted morning."},
    {"tip": "Do not leave it to the last day",
     "detail": "A failed test means repairs and a re-test. If your revenue licence expires meanwhile you are driving illegally."},
]

# ── Ownership transfer ──────────────────────────────────────────────────────────

TRANSFER_FORMS = [
    {"code": "MTA 6", "name": "Application for transfer of ownership",
     "copies": "Four copies — A, A1, B, B1",
     "who": "Completed by the current registered owner",
     "detail": "The seller keeps A and A1 and hands B and B1 to the buyer. Copy A goes to the Commissioner General by registered post or by hand."},
    {"code": "MTA 8", "name": "Notice of transfer of possession",
     "copies": "Two copies — C and C1",
     "who": "Goes to the buyer",
     "detail": "The buyer submits MTA 6 copy B together with MTA 8 copy C to the transfer branch."},
    {"code": "MTA 3", "name": "Registration or release of absolute ownership",
     "copies": "One",
     "who": "Used with a leasing company",
     "detail": "Needed to record a finance company as absolute owner, and again to release them once the lease is settled."},
    {"code": "CMT 52", "name": "Receipt issued on submission",
     "copies": "One",
     "who": "Given to the buyer",
     "detail": "Your proof the transfer was lodged. Keep it until the new CR arrives."},
]

TRANSFER_DOCUMENTS = [
    "Certificate of Registration (the CR book) — the original",
    "National Identity Card of both buyer and seller",
    "A valid revenue licence",
    "Photographs as specified on the form",
    "A letter of no objection from the seller, certified by a Grama Niladhari or Justice of the Peace",
    "Where a lease existed, the release of absolute ownership from the finance company",
]

TRANSFER_STEPS = [
    {"step": 1, "title": "Seller completes all MTA 6 copies",
     "detail": "Every copy, in the seller's own hand. The seller keeps A and A1 and gives the rest to the buyer."},
    {"step": 2, "title": "Seller sends copy A to the Commissioner General",
     "detail": "By registered post or delivered by hand. This is what protects the seller — until the DMT has it, the vehicle is still legally theirs."},
    {"step": 3, "title": "Buyer submits MTA 6 (B) and MTA 8 (C)",
     "detail": "At the transfer branch of the DMT, 9.00 am to 2.00 pm on weekdays."},
    {"step": 4, "title": "Buyer collects the CMT 52 receipt",
     "detail": "Keep it. It is the only proof the transfer is in progress."},
    {"step": 5, "title": "Wait for the new CR",
     "detail": "The updated Certificate of Registration is issued in the new owner's name."},
]

# What to check before money changes hands
BUYER_CHECKLIST = [
    {"key": "absolute_owner", "label": "Is there an absolute owner on the CR?",
     "risk": "critical",
     "detail": "If a finance or leasing company is listed as absolute owner, the seller does not fully own the vehicle. It cannot be transferred until they release it in writing. Do not pay until you have seen that release."},
    {"key": "open_papers", "label": "Are you being offered 'open papers'?",
     "risk": "critical",
     "detail": "A signed MTA 6 with the buyer's side left blank, so the vehicle is never registered to you. You get no legal ownership, you cannot insure it properly, and every fine and offence stays with the registered owner. Walk away."},
    {"key": "cr_original", "label": "Is the CR the original, and does it match?",
     "risk": "critical",
     "detail": "Check the chassis and engine numbers on the CR against the numbers stamped on the vehicle itself. A mismatch means a rebuilt, stolen, or misdescribed vehicle."},
    {"key": "seller_identity", "label": "Is the seller the registered owner?",
     "risk": "critical",
     "detail": "Compare their NIC with the name on the CR. If they are selling on someone else's behalf, insist on a written authority."},
    {"key": "revenue_current", "label": "Is the revenue licence current?",
     "risk": "important",
     "detail": "Arrears follow the vehicle, not the seller. Any lapsed period becomes your bill."},
    {"key": "emission_valid", "label": "Is there a valid emission certificate?",
     "risk": "important",
     "detail": "Without it you cannot renew the revenue licence after the transfer."},
    {"key": "fines_outstanding", "label": "Are there unpaid fines or a pending court case?",
     "risk": "important",
     "detail": "Ask, and ask at the police station named on any paperwork you are shown."},
    {"key": "insurance_history", "label": "Has it been in a major accident?",
     "risk": "advisory",
     "detail": "An insurer can confirm claim history against the registration number. Panel gaps, mismatched paint and fresh underbody welds are the visible signs."},
    {"key": "inspection", "label": "Have you had it inspected independently?",
     "risk": "advisory",
     "detail": "A mechanic of your choosing, not the seller's. An hour and a few thousand rupees against the price of the vehicle."},
]

DMT_TRANSFER_URL = "https://dmt.gov.lk/index.php?option=com_content&view=article&id=24&Itemid=148&lang=en"
DMT_FORMS_URL = "https://dmt.gov.lk/index.php?option=com_content&view=article&id=17&Itemid=133&lang=en"

DATA_NOTE = (
    "Portal links and form names were checked against the official sites on 2026-08-13. "
    "Procedures and forms are changed from time to time by the Department of Motor Traffic "
    "— the MTA 6 and MTA 8 forms were last amended in December 2022. Confirm on the DMT "
    "site before relying on any of this, and note that fees are not listed here because "
    "they are not published in a form that can be kept current."
)

VERIFIED_ON = "2026-08-13"


def parse_plate(plate: str) -> dict:
    """
    Read the province off a number plate.

    Sri Lankan plates carry a province prefix — "WP CAB-1234" is Western Province. Older
    plates without one cannot be placed, and the driver is asked instead.
    """
    raw = (plate or "").strip().upper()
    cleaned = raw.replace("-", " ").replace(".", " ")
    tokens = [t for t in cleaned.split() if t]

    province_code = None
    if tokens:
        first = tokens[0]
        if first in PREFIX_ALIASES:
            province_code = PREFIX_ALIASES[first]
        else:
            # Handles "WPCAB1234" written without a space
            for alias, code in PREFIX_ALIASES.items():
                if first.startswith(alias) and len(first) > len(alias):
                    province_code = code
                    break

    province = next((p for p in PROVINCES if p["code"] == province_code), None)
    portal = ERL_PORTALS["WP"] if province_code == "WP" else ERL_PORTALS["OTHER"]

    return {
        "plate": raw,
        "province_code": province_code,
        "province": province["name"] if province else None,
        "province_capital": province["capital"] if province else None,
        "recognised": province is not None,
        "portal": portal if province else None,
        "message": (
            f"{province['name']} Province — renew at the {portal['name']}."
            if province else
            "No province prefix found on that plate. Older plates do not carry one — "
            "pick your province manually below."
        ),
    }


def revenue_licence_info(plate: str | None = None) -> dict:
    """Everything the revenue licence side of the clearance page needs."""
    parsed = parse_plate(plate) if plate else None
    return {
        "parsed": parsed,
        "provinces": PROVINCES,
        "portals": ERL_PORTALS,
        "locate_office_url": ERL_LOCATE_URL,
        "prerequisites": REVENUE_PREREQUISITES,
        "steps": REVENUE_STEPS,
        "data_note": DATA_NOTE,
        "verified_on": VERIFIED_ON,
    }


def emission_info() -> dict:
    return {
        "providers": EMISSION_PROVIDERS,
        "requirements": EMISSION_REQUIREMENTS,
        "tips": EMISSION_TIPS,
        "queue_note": (
            "Neither provider publishes live queue data, so this app cannot tell you how "
            "busy a centre is right now. The timing advice below is general — month-end "
            "and Mondays are the known crushes."
        ),
        "data_note": DATA_NOTE,
        "verified_on": VERIFIED_ON,
    }


def transfer_info() -> dict:
    return {
        "forms": TRANSFER_FORMS,
        "documents": TRANSFER_DOCUMENTS,
        "steps": TRANSFER_STEPS,
        "buyer_checklist": BUYER_CHECKLIST,
        "dmt_transfer_url": DMT_TRANSFER_URL,
        "dmt_forms_url": DMT_FORMS_URL,
        "counter_hours": "9.00 am to 2.00 pm, weekdays",
        "data_note": DATA_NOTE,
        "verified_on": VERIFIED_ON,
        "today": date.today().isoformat(),
    }
