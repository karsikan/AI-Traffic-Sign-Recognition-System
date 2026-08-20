"""
Traffic Fine Calculator and Violation Guide.

Two things live here:

  * the original currency calculator (``GET /fines/offences``, ``GET /fines/currencies``,
    ``POST /fines``) which the Fine Calculator and Tourist Guide pages already use, and
  * the full violation catalogue (``GET /fines/violations``) that drives the searchable
    Fine & Violation Guide — every offence carries its Motor Traffic Act section, the
    spot-fine amount, demerit points, and whether it can be settled at a post office or
    must be decided in court.

Offence text is English only, the same way ``license.py`` serves its content — the
frontend keeps its own trilingual UI labels.
"""

from fastapi import APIRouter

from app.schemas.schemas import FineRequest, FineResponse
from app.services.currency_service import lkr_to_currency, SUPPORTED
from app.utils.response import success_response, error_response

router = APIRouter(prefix="/fines", tags=["Traffic Fine Calculator"])

# Kept exactly as it was — FineCalculator.tsx and the tourist guide read this shape.
COMMON_FINES = {
    "Exceeding speed limit": 3000,
    "Not wearing seat belt": 1000,
    "Using mobile phone while driving": 2000,
    "Driving without licence": 25000,
    "Ignoring traffic signal / sign": 2000,
    "Drunk driving": 25000,
    "No insurance": 2500,
    "Overtaking on a bend": 2000,
}

# ── Violation catalogue ─────────────────────────────────────────────────────────
# payable:  "spot"   settled with a Section 215A charge sheet at a post office
#           "court"  the driver must appear before a Magistrate
#           "either" officer's discretion — spot fine if admitted, otherwise court
# licence:  "none" | "withheld" (yellow Section 135 permit issued) | "suspension"

CATEGORIES = [
    {"key": "speed",      "label": "Speed",                "icon": "gauge"},
    {"key": "documents",  "label": "Documents",            "icon": "file-text"},
    {"key": "licence",    "label": "Licence",              "icon": "id-card"},
    {"key": "alcohol",    "label": "Alcohol & Drugs",      "icon": "wine"},
    {"key": "safety",     "label": "Occupant Safety",      "icon": "shield"},
    {"key": "signals",    "label": "Signals & Signs",      "icon": "traffic-cone"},
    {"key": "distraction","label": "Distraction",          "icon": "smartphone"},
    {"key": "manner",     "label": "Manner of Driving",    "icon": "car"},
    {"key": "parking",    "label": "Parking & Stopping",   "icon": "square-parking"},
    {"key": "vehicle",    "label": "Vehicle Condition",    "icon": "wrench"},
]

VIOLATIONS = [
    # ── Speed ──────────────────────────────────────────────────────────────────
    {
        "id": "speed_upto_10",
        "offence": "Exceeding the speed limit by up to 10 km/h",
        "category": "speed",
        "section": "140, 141",
        "fine_lkr": 3000,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "Serial 10 on the Section 215A spot-fine schedule. Fixed cameras on A1, A2, A3, A6, A9 and the expressways issue this automatically to the registered owner.",
    },
    {
        "id": "speed_10_to_20",
        "offence": "Exceeding the speed limit by 10–20 km/h",
        "category": "speed",
        "section": "140, 141",
        "fine_lkr": 5000,
        "demerit_points": 2,
        "payable": "spot",
        "licence": "none",
        "note": "Camera fines on the expressways are doubled at night.",
    },
    {
        "id": "speed_over_20",
        "offence": "Exceeding the speed limit by more than 20 km/h",
        "category": "speed",
        "section": "140, 141",
        "fine_lkr": 15000,
        "demerit_points": 4,
        "payable": "either",
        "licence": "withheld",
        "note": "At this margin the officer may withhold the licence and issue a yellow Section 135 temporary permit with a court date.",
    },
    {
        "id": "speed_limiter_tamper",
        "offence": "Tampering with a speed limiter (bus or heavy goods vehicle)",
        "category": "speed",
        "section": "140",
        "fine_lkr": 25000,
        "demerit_points": 6,
        "payable": "court",
        "licence": "suspension",
        "note": "A criminal offence. Buses must be limited to 80 km/h intercity and 60 km/h urban; lorries over 10 tonnes to 60 km/h.",
    },

    # ── Documents ──────────────────────────────────────────────────────────────
    {
        "id": "no_revenue_licence",
        "offence": "Driving without a valid revenue licence (road tax)",
        "category": "documents",
        "section": "38, 45",
        "fine_lkr": 10000,
        "demerit_points": 2,
        "payable": "spot",
        "licence": "none",
        "note": "Serials 02 and 03 on the spot-fine schedule. The vehicle may also be impounded. Police scan the QR code at checkpoints.",
    },
    {
        "id": "no_insurance",
        "offence": "Driving without valid third-party insurance",
        "category": "documents",
        "section": "99",
        "fine_lkr": 2500,
        "demerit_points": 3,
        "payable": "either",
        "licence": "none",
        "note": "Beyond the fine you are personally liable for every rupee of accident damage. Always the more expensive offence to commit.",
    },
    {
        "id": "no_emission_certificate",
        "offence": "No valid emission test / roadworthiness certificate",
        "category": "documents",
        "section": "119",
        "fine_lkr": 2500,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "A current certificate is required before the revenue licence can be renewed.",
    },
    {
        "id": "no_identification_plate",
        "offence": "Missing, obscured or altered number plates",
        "category": "documents",
        "section": "21, 22, 23, 24",
        "fine_lkr": 5000,
        "demerit_points": 2,
        "payable": "spot",
        "licence": "none",
        "note": "Serial 01 on the spot-fine schedule. Decorative or non-standard plates count as altered.",
    },

    # ── Licence ────────────────────────────────────────────────────────────────
    {
        "id": "not_carrying_licence",
        "offence": "Failure to carry your driving licence while driving",
        "category": "licence",
        "section": "135",
        "fine_lkr": 1000,
        "demerit_points": 0,
        "payable": "spot",
        "licence": "none",
        "note": "Serial 08 on the spot-fine schedule. Holding a licence is not enough — it must be with you.",
    },
    {
        "id": "no_licence",
        "offence": "Driving without holding a driving licence",
        "category": "licence",
        "section": "128, 130",
        "fine_lkr": 25000,
        "demerit_points": 6,
        "payable": "court",
        "licence": "none",
        "note": "Serial 07 on the schedule. The vehicle owner who permitted it is charged separately.",
    },
    {
        "id": "wrong_category",
        "offence": "Driving a class of vehicle not covered by your licence",
        "category": "licence",
        "section": "130",
        "fine_lkr": 15000,
        "demerit_points": 4,
        "payable": "court",
        "licence": "none",
        "note": "For example driving a lorry on a category B licence, or a three-wheeler without category G.",
    },
    {
        "id": "expired_licence",
        "offence": "Driving on an expired driving licence",
        "category": "licence",
        "section": "130",
        "fine_lkr": 15000,
        "demerit_points": 3,
        "payable": "either",
        "licence": "none",
        "note": "Renew online at e.gov.lk up to six months before expiry — there is no grace period after it.",
    },
    {
        "id": "learner_violation",
        "offence": "Learner driver breaching permit conditions",
        "category": "licence",
        "section": "126",
        "fine_lkr": 5000,
        "demerit_points": 2,
        "payable": "spot",
        "licence": "none",
        "note": "L-boards front and rear, a licence holder in the passenger seat, no expressways, and no driving between 11 PM and 5 AM.",
    },
    {
        "id": "no_instructor_licence",
        "offence": "Giving driving instruction without an instructor's licence",
        "category": "licence",
        "section": "139",
        "fine_lkr": 10000,
        "demerit_points": 3,
        "payable": "spot",
        "licence": "none",
        "note": "Serial 09 on the spot-fine schedule.",
    },

    # ── Alcohol & drugs ────────────────────────────────────────────────────────
    {
        "id": "drunk_driving",
        "offence": "Driving under the influence of alcohol (over 0.08% BAC)",
        "category": "alcohol",
        "section": "151, 152",
        "fine_lkr": 25000,
        "demerit_points": 6,
        "payable": "court",
        "licence": "withheld",
        "note": "The licence is withheld at the roadside and you receive a yellow Section 135 permit with a court date. Expect a 6-month suspension on conviction.",
    },
    {
        "id": "drunk_driving_professional",
        "offence": "Professional driver (bus, lorry, taxi) with any alcohol reading",
        "category": "alcohol",
        "section": "151, 152",
        "fine_lkr": 25000,
        "demerit_points": 6,
        "payable": "court",
        "licence": "suspension",
        "note": "Zero tolerance — the limit is 0.00%, not 0.08%. Immediate suspension plus a criminal charge.",
    },
    {
        "id": "refusing_breath_test",
        "offence": "Refusing a breath or blood test",
        "category": "alcohol",
        "section": "152A",
        "fine_lkr": 25000,
        "demerit_points": 6,
        "payable": "court",
        "licence": "withheld",
        "note": "Refusal is treated as seriously as a positive reading. You may ask for a blood test at a government hospital instead.",
    },

    # ── Occupant safety ────────────────────────────────────────────────────────
    {
        "id": "no_seatbelt",
        "offence": "Driver or passenger not wearing a seat belt",
        "category": "safety",
        "section": "142",
        "fine_lkr": 2500,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "Charged per unbelted person, and rear seats have been enforced since 2023. No warnings are given.",
    },
    {
        "id": "no_helmet",
        "offence": "Rider or pillion not wearing a helmet",
        "category": "safety",
        "section": "142",
        "fine_lkr": 2500,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "Charged per person. The helmet must carry SLS or ECE 22 certification.",
    },
    {
        "id": "no_child_seat",
        "offence": "Child under 8 years or under 135 cm without a child seat",
        "category": "safety",
        "section": "142",
        "fine_lkr": 2500,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "Infants under 13 kg must be rear-facing.",
    },
    {
        "id": "overloading_passengers",
        "offence": "Carrying more passengers than the licensed capacity",
        "category": "safety",
        "section": "130, 213",
        "fine_lkr": 5000,
        "demerit_points": 2,
        "payable": "either",
        "licence": "none",
        "note": "Three-wheelers: three in the rear, none in front. The spot fine is small, but a bus or van carrying well over its licensed capacity is dealt with in court, where the penalty is far higher.",
    },

    # ── Signals & signs ────────────────────────────────────────────────────────
    {
        "id": "red_light",
        "offence": "Failing to stop at a red light",
        "category": "signals",
        "section": "146",
        "fine_lkr": 3000,
        "demerit_points": 3,
        "payable": "spot",
        "licence": "none",
        "note": "Junction cameras in Colombo capture this automatically and post the charge to the registered owner.",
    },
    {
        "id": "ignoring_sign",
        "offence": "Disobeying a traffic sign or road marking",
        "category": "signals",
        "section": "146",
        "fine_lkr": 2000,
        "demerit_points": 2,
        "payable": "spot",
        "licence": "none",
        "note": "Includes no-entry, one-way, mandatory-direction and prohibition signs.",
    },
    {
        "id": "crossing_solid_line",
        "offence": "Crossing a solid centre line or lane line",
        "category": "signals",
        "section": "146",
        "fine_lkr": 2000,
        "demerit_points": 2,
        "payable": "spot",
        "licence": "none",
        "note": "A solid yellow centre line means no overtaking in either direction.",
    },
    {
        "id": "pedestrian_crossing",
        "offence": "Failing to give way at a pedestrian crossing",
        "category": "signals",
        "section": "147",
        "fine_lkr": 3000,
        "demerit_points": 3,
        "payable": "spot",
        "licence": "none",
        "note": "The white zigzag lines either side of a crossing are also a no-stopping and no-parking zone.",
    },

    # ── Distraction ────────────────────────────────────────────────────────────
    {
        "id": "mobile_phone",
        "offence": "Using a mobile phone while driving",
        "category": "distraction",
        "section": "148",
        "fine_lkr": 6000,
        "demerit_points": 3,
        "payable": "spot",
        "licence": "none",
        "note": "Applies while stopped at traffic lights too. Hands-free is allowed only if the phone is mounted. A repeat offence can be sent to court instead of settled on the spot, where the penalty is set by the Magistrate.",
    },
    {
        "id": "mobile_phone_motorcycle",
        "offence": "Using a mobile phone while riding a motorcycle",
        "category": "distraction",
        "section": "148",
        "fine_lkr": 6000,
        "demerit_points": 3,
        "payable": "spot",
        "licence": "withheld",
        "note": "Even hands-free use is prohibited on a motorcycle.",
    },

    # ── Manner of driving ──────────────────────────────────────────────────────
    {
        "id": "dangerous_driving",
        "offence": "Dangerous or reckless driving",
        "category": "manner",
        "section": "149",
        "fine_lkr": 25000,
        "demerit_points": 6,
        "payable": "court",
        "licence": "withheld",
        "note": "The licence is withheld immediately. On conviction the court may suspend it for up to 12 months.",
    },
    {
        "id": "careless_driving",
        "offence": "Careless driving / driving without due consideration",
        "category": "manner",
        "section": "148",
        "fine_lkr": 5000,
        "demerit_points": 3,
        "payable": "either",
        "licence": "none",
        "note": "The usual charge after a minor collision where no one is injured.",
    },
    {
        "id": "overtaking_bend",
        "offence": "Overtaking on a bend, brow of a hill or pedestrian crossing",
        "category": "manner",
        "section": "146",
        "fine_lkr": 2000,
        "demerit_points": 3,
        "payable": "spot",
        "licence": "none",
        "note": "Also covers overtaking on the left except where the vehicle ahead is turning right.",
    },
    {
        "id": "emergency_lane",
        "offence": "Driving on an expressway emergency lane (hard shoulder)",
        "category": "manner",
        "section": "146",
        "fine_lkr": 10000,
        "demerit_points": 3,
        "payable": "spot",
        "licence": "none",
        "note": "Camera-detected and carries a doubled penalty. The hard shoulder is for breakdowns and emergency vehicles only.",
    },
    {
        "id": "failing_to_stop_accident",
        "offence": "Failing to stop after an accident",
        "category": "manner",
        "section": "159, 160",
        "fine_lkr": 25000,
        "demerit_points": 6,
        "payable": "court",
        "licence": "suspension",
        "note": "You must stop, give your details, and report to the nearest police station. Leaving the scene is a separate and more serious charge than the accident itself.",
    },

    # ── Parking ────────────────────────────────────────────────────────────────
    {
        "id": "illegal_parking",
        "offence": "Parking in a prohibited place",
        "category": "parking",
        "section": "144",
        "fine_lkr": 1000,
        "demerit_points": 0,
        "payable": "spot",
        "licence": "none",
        "note": "Municipal wardens may also issue this. The vehicle can be towed at the owner's cost.",
    },
    {
        "id": "obstruction",
        "offence": "Causing an obstruction to traffic",
        "category": "parking",
        "section": "144",
        "fine_lkr": 2000,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "Includes double parking, blocking a junction, and stopping on a yellow box.",
    },
    {
        "id": "no_parking_lights",
        "offence": "Parked on an unlit road at night without parking lights",
        "category": "parking",
        "section": "104",
        "fine_lkr": 1500,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "Use hazard lights for a breakdown, and place a warning triangle where you have one.",
    },

    # ── Vehicle condition ──────────────────────────────────────────────────────
    {
        "id": "defective_lights",
        "offence": "Defective headlights, brake lights or indicators",
        "category": "vehicle",
        "section": "104",
        "fine_lkr": 1500,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "Motorcycles must run headlights during daylight on A-class roads and expressways.",
    },
    {
        "id": "defective_brakes",
        "offence": "Defective brakes or steering",
        "category": "vehicle",
        "section": "119",
        "fine_lkr": 10000,
        "demerit_points": 4,
        "payable": "court",
        "licence": "none",
        "note": "The vehicle is taken off the road until it passes re-inspection.",
    },
    {
        "id": "excess_tint_or_lights",
        "offence": "Illegal window tint, or unauthorised flashing or coloured lights",
        "category": "vehicle",
        "section": "104",
        "fine_lkr": 5000,
        "demerit_points": 1,
        "payable": "spot",
        "licence": "none",
        "note": "Blue and red flashing lights are reserved for emergency service vehicles.",
    },
    {
        "id": "overloading_goods",
        "offence": "Overloading a goods vehicle",
        "category": "vehicle",
        "section": "213",
        "fine_lkr": 2500,
        "demerit_points": 2,
        "payable": "either",
        "licence": "none",
        "note": "Charged per excess tonne. Weighbridges operate at Katunayake, Awissawella and Matara. A repeat offence means the vehicle is seized.",
    },
    {
        "id": "hazardous_goods",
        "offence": "Carrying chemicals or hazardous waste without the required licence",
        "category": "vehicle",
        "section": "128(c)",
        "fine_lkr": 15000,
        "demerit_points": 4,
        "payable": "court",
        "licence": "none",
        "note": "Serial 06 on the spot-fine schedule. An ADR permit, hazard plates, a fire extinguisher and a trained-driver certificate are all required.",
    },
]

# ── Where the amounts come from ─────────────────────────────────────────────────
#
# Sri Lanka runs two separate penalty schedules and the catalogue above was written
# as though there were one, which made several offences look far more expensive than
# what a driver actually pays at the post office:
#
#   Spot fines  — Gazette Extraordinary 2054/9 of 15 January 2018. Rs 500 to Rs 3,000
#                 across 33 offences, settled at a post office if liability is admitted.
#   Court fines — Motor Traffic (Amendment) Act No. 10 of 2019. Rs 3,000 to Rs 50,000,
#                 set by a Magistrate, and the only route for the serious offences that
#                 the 2018 gazette deliberately left off the spot-fine list.
#
# Only amounts confirmed against reporting of those two instruments are marked verified
# below. The rest keep their original figure and are labelled unverified, because a
# plausible guess dressed as a fine amount is the thing most likely to send a driver to
# a post office with the wrong money. Confirm the remainder against the gazette itself
# before treating this catalogue as authoritative.

GAZETTE_2018 = "Gazette Extraordinary 2054/9 of 15 January 2018 — spot-fine schedule"
ACT_10_2019 = "Motor Traffic (Amendment) Act No. 10 of 2019 — court fines"

# id -> spot fine, court range, and which instrument each came from.
VERIFIED_AMOUNTS = {
    # Rs 1,000 band — the largest group in the 2018 gazette (22 offences)
    "no_seatbelt":             {"spot": 1000, "spot_source": GAZETTE_2018},
    "no_helmet":               {"spot": 1000, "spot_source": GAZETTE_2018},
    "mobile_phone":            {"spot": 1000, "spot_source": GAZETTE_2018},
    "mobile_phone_motorcycle": {"spot": 1000, "spot_source": GAZETTE_2018},
    "red_light":               {"spot": 1000, "spot_source": GAZETTE_2018},
    "no_revenue_licence":      {"spot": 1000, "spot_source": GAZETTE_2018},
    "not_carrying_licence":    {"spot": 1000, "spot_source": GAZETTE_2018},
    "defective_lights":        {"spot": 1000, "spot_source": GAZETTE_2018},

    # Rs 2,000 band — road-rule and police-direction offences
    "no_instructor_licence":   {"spot": 2000, "spot_source": GAZETTE_2018},
    "ignoring_sign":           {"spot": 2000, "spot_source": GAZETTE_2018},

    # Rs 500 band
    "no_emission_certificate": {"spot": 500, "spot_source": GAZETTE_2018},
    "overloading_passengers":  {"spot": 500, "spot_source": GAZETTE_2018},

    # Speeding: one flat Rs 3,000 spot fine whatever the margin. The margin decides the
    # court fine instead, and the court bands are set as percentages over the limit —
    # not the km/h steps this catalogue splits them by, so the offence names below stay
    # approximate even though the amounts are right.
    "speed_upto_10":  {"spot": 3000, "spot_source": GAZETTE_2018,
                       "court": [3000, 5000], "court_source": ACT_10_2019},
    "speed_10_to_20": {"spot": 3000, "spot_source": GAZETTE_2018,
                       "court": [5000, 10000], "court_source": ACT_10_2019},
    "speed_over_20":  {"spot": 3000, "spot_source": GAZETTE_2018,
                       "court": [15000, 25000], "court_source": ACT_10_2019},

    # Court-only offences. The 2019 Act set these ranges; the 2018 gazette removed
    # driving without a licence from the spot-fine list altogether.
    "drunk_driving":              {"court": [25000, 30000], "court_source": ACT_10_2019},
    "drunk_driving_professional": {"court": [25000, 30000], "court_source": ACT_10_2019},
    "refusing_breath_test":       {"court": [25000, 30000], "court_source": ACT_10_2019},
    "no_licence":                 {"court": [25000, 30000], "court_source": ACT_10_2019},
    # The catalogue had this at Rs 2,500 — an understatement of roughly ten times, and
    # the one error here that could leave a driver expecting a small fine for the
    # offence that carries the heaviest one.
    "no_insurance":               {"court": [25000, 50000], "court_source": ACT_10_2019},
}


def _apply_amount_provenance() -> None:
    """
    Attach spot and court amounts to each offence, and say which are actually sourced.

    Runs once at import. `fine_lkr` keeps working as the headline figure so existing
    callers are unaffected, but it now prefers the spot fine where one is confirmed —
    which is the number a driver at a post office counter is asking about.
    """
    for v in VIOLATIONS:
        known = VERIFIED_AMOUNTS.get(v["id"])
        if not known:
            v["spot_fine_lkr"] = v["fine_lkr"] if v["payable"] in ("spot", "either") else None
            v["court_fine_lkr"] = None
            v["amount_status"] = "unverified"
            v["amount_source"] = "Original project figure — not yet confirmed against the gazette"
            continue

        v["spot_fine_lkr"] = known.get("spot")
        v["court_fine_lkr"] = known.get("court")
        v["amount_status"] = "verified"
        v["amount_source"] = " · ".join(
            s for s in (known.get("spot_source"), known.get("court_source")) if s
        )
        if known.get("spot") is not None:
            v["fine_lkr"] = known["spot"]
        elif known.get("court"):
            v["fine_lkr"] = known["court"][0]


_apply_amount_provenance()

AMOUNT_NOTE = (
    "Spot fines and court fines are different schedules. A spot fine — Rs 500 to Rs 3,000 "
    "under the 2018 gazette — is what you settle at a post office when you admit liability. "
    "A court fine, Rs 3,000 to Rs 50,000 under the 2019 Amendment Act, is what a Magistrate "
    "imposes, and the serious offences can only go that way. Amounts marked unverified below "
    "are this project's own figures and have not been confirmed against the gazette."
)

# ── Payment windows and the demerit system ──────────────────────────────────────

PAYMENT_WINDOW = {
    "normal_days": 14,
    "double_days": 28,
    "stages": [
        {
            "stage": "normal",
            "from_day": 1, "to_day": 14,
            "label": "Normal fine",
            "multiplier": 1,
            "detail": "Pay the amount printed on the charge sheet at any post office or sub-post office. Keep the receipt.",
        },
        {
            "stage": "double",
            "from_day": 15, "to_day": 28,
            "label": "Double fine",
            "multiplier": 2,
            "detail": "The window has passed. Twice the printed amount is now payable, still at the post office.",
        },
        {
            "stage": "court",
            "from_day": 29, "to_day": None,
            "label": "Court action",
            "multiplier": None,
            "detail": "The fine can no longer be settled at a post office. The case goes before a Magistrate, who sets the penalty, and a warrant may be issued if you do not attend.",
        },
    ],
}

# The scheme announced for Sri Lanka works the opposite way round to how this was first
# built. A driver is granted an allowance of 24 points and offences *deduct* from it;
# reaching zero cancels the licence for at least a year, rather than a 12-point ceiling
# suspending it for a few months. The allowance runs over two years, not twelve months.
# Points below are still stored per offence — only the arithmetic and the labels change.
DEMERIT_SYSTEM = {
    "status": "pilot",
    "law_from": "2026-02",
    "pilot_from": "2026-09",
    "starting_points": 24,
    "window_months": 24,
    # Kept under the old key so existing callers keep working: the number of points that,
    # once deducted, exhausts the allowance.
    "suspension_threshold": 24,
    "direction": "deducted",
    "tiers": [
        {"from_points": 0,  "to_points": 7,  "status": "safe",     "label": "Clear",         "advice": "Most of the allowance is intact. No action."},
        {"from_points": 8,  "to_points": 15, "status": "caution",  "label": "Caution",       "advice": "A third of the allowance is gone. Two serious offences would take you close to the edge."},
        {"from_points": 16, "to_points": 23, "status": "warning",  "label": "Final warning", "advice": "Fewer than eight points left. One serious offence could exhaust the allowance."},
        {"from_points": 24, "to_points": None,"status": "suspended","label": "Allowance exhausted", "advice": "All 24 points deducted. The licence is cancelled for at least one year and the licensing exam must be retaken."},
    ],
    "note": (
        "A driver starts with 24 points and offences deduct from that allowance over a "
        "two-year window. Serious offences — drunk driving, causing an accident by "
        "excessive speed — take 6 to 8 points at once; common ones such as a red light or "
        "phone use take 2 or 3. Exhausting the allowance cancels the licence for a minimum "
        "of one year."
    ),
    "status_note": (
        "Announced as law in February 2026, with a pilot rollout from September 2026 — so "
        "it is not yet enforced nationwide. This page models the announced scheme so a "
        "driver can see where they would stand; it is not a record held by the Department "
        "of Motor Traffic."
    ),
}

DISCLAIMER = (
    "Reference information for guidance only. Fine amounts and demerit points are set by the "
    "Motor Traffic Act and are revised by gazette — always confirm against the charge sheet the "
    "officer issues you, or with the issuing police station. This has no legal standing."
)


def _summary() -> dict:
    """Headline numbers for the guide page."""
    amounts = [v["fine_lkr"] for v in VIOLATIONS]
    return {
        "total_violations": len(VIOLATIONS),
        "lowest_fine_lkr": min(amounts),
        "highest_fine_lkr": max(amounts),
        "court_only": sum(1 for v in VIOLATIONS if v["payable"] == "court"),
        "licence_at_risk": sum(1 for v in VIOLATIONS if v["licence"] != "none"),
    }


# ── Original endpoints — unchanged behaviour ────────────────────────────────────

@router.get("/offences")
async def list_offences():
    return success_response("Offences listed successfully", COMMON_FINES)


@router.get("/currencies")
async def supported_currencies():
    return success_response("Supported currencies listed successfully", SUPPORTED)


@router.post("")
async def calculate_fine(payload: FineRequest):
    try:
        converted, rate = lkr_to_currency(payload.amount_lkr, payload.target_currency)
        res = FineResponse(
            offence=payload.offence,
            amount_lkr=payload.amount_lkr,
            target_currency=payload.target_currency.upper(),
            converted_amount=converted,
            exchange_rate=rate,
        )
        return success_response("Fine calculated successfully", res.dict())
    except ValueError as e:
        return error_response(str(e), "INVALID_CURRENCY", 400)
    except Exception as e:
        return error_response(str(e), "CONVERSION_ERROR", 500)


# ── Violation guide ─────────────────────────────────────────────────────────────

@router.get("/violations")
async def list_violations(category: str | None = None, q: str | None = None):
    """
    The full catalogue. ``category`` filters to one group and ``q`` matches the offence
    text, section number or note — the guide page filters in the browser, but the same
    parameters are here so the endpoint is useful on its own.
    """
    items = VIOLATIONS
    if category and category != "all":
        items = [v for v in items if v["category"] == category]
    if q:
        needle = q.strip().lower()
        items = [
            v for v in items
            if needle in v["offence"].lower()
            or needle in v["section"].lower()
            or needle in v["note"].lower()
        ]
    return success_response("Violations listed successfully", {
        "violations": items,
        "categories": CATEGORIES,
        "summary": _summary(),
        "payment_window": PAYMENT_WINDOW,
        "demerit_system": DEMERIT_SYSTEM,
        "amount_note": AMOUNT_NOTE,
        "verified_count": sum(1 for v in VIOLATIONS if v["amount_status"] == "verified"),
        "disclaimer": DISCLAIMER,
    })


@router.get("/violations/{violation_id}")
async def get_violation(violation_id: str):
    violation = next((v for v in VIOLATIONS if v["id"] == violation_id), None)
    if not violation:
        return error_response(f"No violation with id '{violation_id}'.", "NOT_FOUND", 404)
    return success_response("Violation found", {**violation, "disclaimer": DISCLAIMER})


@router.get("/categories")
async def list_categories():
    counts = {c["key"]: 0 for c in CATEGORIES}
    for v in VIOLATIONS:
        counts[v["category"]] = counts.get(v["category"], 0) + 1
    return success_response("Categories listed successfully", [
        {**c, "count": counts.get(c["key"], 0)} for c in CATEGORIES
    ])


@router.get("/payment-window")
async def get_payment_window():
    """The 14 / 28 / court timeline used by the late-payment calculator."""
    return success_response("Spot fine payment window", PAYMENT_WINDOW)


@router.get("/demerit-system")
async def get_demerit_system():
    """Threshold, tiers and advice for the demerit points system."""
    return success_response("Demerit points system", DEMERIT_SYSTEM)
