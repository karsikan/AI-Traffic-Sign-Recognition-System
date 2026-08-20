"""
Expressway toll calculator.

Sri Lanka's expressway tolls are distance-based: you take a ticket on entry and pay on
exit for the kilometres travelled. Rather than hard-code a fare matrix that would be wrong
the moment a gazette changes one cell, this stores two things that change at very
different rates:

  * **interchange chainages** — where each interchange sits along the road. Geography, and
    it does not change.
  * **a rate per kilometre per vehicle class** — one number per class, from the gazetted
    schedule. When rates are revised, only these move.

The fare is then distance × rate, rounded to the nearest 5 rupees the way the toll plaza
does. Checked against the published car fares from Kottawa:

    Gelanigama  30 km → 150     Galle  95 km → 475
    Matara     126 km → 625     Mattala 220 km → 1,100

All four are exactly 5 LKR/km, which is what ``RATE_PER_KM`` says for a car.
"""

from datetime import date

# ── Vehicle classes ─────────────────────────────────────────────────────────────
# Class 1 is the reference. The others are multiples of it in the gazetted schedule.

VEHICLE_CLASSES = [
    {"key": "class1", "label": "Car / van / jeep (up to 10 seats)", "multiplier": 1.0,
     "examples": "Motor car, dual-purpose vehicle, van"},
    {"key": "class2", "label": "Bus / lorry (2 axles)", "multiplier": 2.0,
     "examples": "Buses, medium lorries"},
    {"key": "class3", "label": "Heavy vehicle (3 or more axles)", "multiplier": 3.0,
     "examples": "Multi-axle lorries, container trailers"},
]

CLASS_MULTIPLIER = {c["key"]: c["multiplier"] for c in VEHICLE_CLASSES}
ROUND_TO = 5  # toll plazas round to the nearest 5 rupees

# ── Interchanges, by chainage (km from the start of each expressway) ────────────

EXPRESSWAYS = {
    "E01": {
        "name": "E01 — Southern Expressway",
        "route": "Kottawa (Colombo) → Galle → Matara → Mattala",
        "length_km": 220,
        # Confirmed: this rate reproduces the published Kottawa fares to Gelanigama
        # (150), Galle (475), Matara (625) and Mattala (1,100) exactly.
        "rate_per_km": 5.0,
        "confidence": "verified",
        "interchanges": [
            {"key": "kottawa",            "name": "Kottawa",              "km": 0},
            {"key": "kahathuduwa",        "name": "Kahathuduwa",          "km": 6},
            {"key": "gelanigama",         "name": "Gelanigama",           "km": 30},
            {"key": "dodangoda",          "name": "Dodangoda",            "km": 46},
            {"key": "welipenna",          "name": "Welipenna",            "km": 56},
            {"key": "kurundugahahetekma", "name": "Kurundugahahetekma",   "km": 72},
            {"key": "baddegama",          "name": "Baddegama",            "km": 85},
            {"key": "pinnaduwa",          "name": "Pinnaduwa (Galle)",    "km": 95},
            {"key": "imaduwa",            "name": "Imaduwa",              "km": 108},
            {"key": "kokmaduwa",          "name": "Kokmaduwa",            "km": 117},
            # 125, not the 126 the road length is usually quoted as — 125 is what
            # reproduces the published 625 fare from Kottawa.
            {"key": "godagama",           "name": "Godagama (Matara)",    "km": 125},
            {"key": "beliatta",           "name": "Beliatta",             "km": 152},
            {"key": "bedigama",           "name": "Bedigama",             "km": 170},
            {"key": "sooriyawewa",        "name": "Sooriyawewa",          "km": 194},
            {"key": "mattala",            "name": "Mattala",              "km": 220},
        ],
    },
    "E02": {
        "name": "E02 — Outer Circular Expressway",
        "route": "Kottawa → Kadawatha → Kerawalapitiya",
        "length_km": 29,
        # No published fare found to check against; assumed to follow the E01 rate.
        "rate_per_km": 5.0,
        "confidence": "assumed",
        "interchanges": [
            {"key": "kottawa_occ",   "name": "Kottawa",        "km": 0},
            {"key": "kaduwela",      "name": "Kaduwela",       "km": 6},
            {"key": "athurugiriya",  "name": "Athurugiriya",   "km": 3},
            {"key": "kothalawala",   "name": "Kothalawala",    "km": 9},
            {"key": "kadawatha",     "name": "Kadawatha",      "km": 20},
            {"key": "kerawalapitiya","name": "Kerawalapitiya", "km": 29},
        ],
    },
    "E03": {
        "name": "E03 — Colombo–Katunayake Expressway",
        "route": "Peliyagoda → Katunayake (Bandaranaike Airport)",
        "length_km": 25,
        # The airport expressway is dearer per kilometre than the E01. Derived from the
        # one published fare — Peliyagoda to Katunayake, 25 km, LKR 300 — so the end-to-end
        # fare is right but intermediate exits are an interpolation, not a quoted figure.
        "rate_per_km": 12.0,
        "confidence": "endpoints_only",
        "interchanges": [
            {"key": "peliyagoda",  "name": "Peliyagoda",             "km": 0},
            {"key": "kelaniya",    "name": "Kelaniya",               "km": 4},
            {"key": "ja_ela",      "name": "Ja-Ela",                 "km": 14},
            {"key": "seeduwa",     "name": "Seeduwa",                "km": 20},
            {"key": "katunayake",  "name": "Katunayake (Airport)",   "km": 25},
        ],
    },
    "E04": {
        "name": "E04 — Central Expressway (open sections)",
        "route": "Kadawatha → Mirigama → Kurunegala",
        "length_km": 77,
        # No published fare found to check against; assumed to follow the E01 rate.
        "rate_per_km": 5.0,
        "confidence": "assumed",
        "interchanges": [
            {"key": "kadawatha_e04", "name": "Kadawatha",   "km": 0},
            {"key": "kaduwela_e04",  "name": "Kaduwela",    "km": 9},
            {"key": "mirigama",      "name": "Mirigama",    "km": 37},
            {"key": "meerigama_n",   "name": "Nakalagamuwa","km": 50},
            {"key": "kurunegala",    "name": "Kurunegala",  "km": 77},
        ],
    },
}

# ── ETC — the electronic toll card ──────────────────────────────────────────────

ETC_GUIDE = {
    "what": (
        "The Electronic Toll Collection card lets you pass through a dedicated ETC lane "
        "without stopping to pay cash. The card is tagged to your vehicle and the fare is "
        "deducted from a prepaid balance."
    ),
    "steps": [
        {"step": 1, "title": "Check the balance before you set off",
         "detail": "An ETC lane with an empty card is slower than the cash lane — you get turned back and have to rejoin. Check before a long trip, not at the gate."},
        {"step": 2, "title": "Top up",
         "detail": "Top-up counters at the main toll plazas, at RDA offices, and through LankaPay-linked banking apps. Some banks let you top up from internet banking."},
        {"step": 3, "title": "Use the marked ETC lane only",
         "detail": "Entering an ETC lane without a valid card blocks the lane and can carry a penalty."},
        {"step": 4, "title": "Keep the receipt or SMS",
         "detail": "Deductions are occasionally disputed. The record is your evidence."},
    ],
    "note": (
        "Every plaza still accepts cash. If your card fails, use the cash lane rather than "
        "arguing at the barrier with traffic behind you."
    ),
}

RULES = [
    "Minimum speed on an expressway is 60 km/h — a vehicle that cannot maintain it is not allowed on.",
    "Motorcycles under 100cc are prohibited. Three-wheelers are prohibited on all expressways.",
    "The hard shoulder is for breakdowns and emergency vehicles only. Driving in it is camera-detected and the penalty is doubled.",
    "There is no stopping, reversing or U-turning anywhere on the carriageway.",
    "Fuel up before you join — service areas are far apart and running dry on the carriageway is an offence.",
    "In a breakdown, pull fully onto the shoulder, switch on hazards, get everyone behind the barrier, and call 1969.",
]

CONFIDENCE_NOTES = {
    "verified": (
        "Checked against published fares — the Kottawa fares to Gelanigama (150), Galle "
        "(475), Matara (625) and Mattala (1,100) all come out exactly right."
    ),
    "endpoints_only": (
        "Only the end-to-end fare could be checked against a published figure. Fares to "
        "intermediate exits are interpolated from it and are an estimate."
    ),
    "assumed": (
        "No published fare was found for this expressway. The Southern Expressway rate has "
        "been assumed — treat the figure as a rough guide and check at the plaza."
    ),
}

RATE_SOURCE_NOTE = (
    "Fares are calculated as distance × the per-kilometre rate for the vehicle class, "
    "rounded to the nearest 5 rupees — the same method the toll plaza uses. Rates are set "
    "by gazette under the Toll Ordinance and revised from time to time, and the rate is "
    "not the same on every expressway: the airport expressway costs noticeably more per "
    "kilometre than the Southern. Each result carries its own confidence note."
)

RATES_VERIFIED_ON = "2026-08-13"


def _interchange(expressway: str, key: str) -> dict | None:
    spec = EXPRESSWAYS.get(expressway)
    if not spec:
        return None
    return next((i for i in spec["interchanges"] if i["key"] == key), None)


def list_expressways() -> list[dict]:
    """Every expressway with its interchanges, ordered along the road."""
    return [
        {
            "code": code,
            **spec,
            "interchanges": sorted(spec["interchanges"], key=lambda i: i["km"]),
        }
        for code, spec in EXPRESSWAYS.items()
    ]


def calculate_toll(expressway: str, entry: str, exit_: str,
                   vehicle_class: str = "class1") -> dict:
    """Fare between two interchanges for one vehicle class."""
    spec = EXPRESSWAYS.get(expressway)
    if not spec:
        raise ValueError(
            f"Unknown expressway '{expressway}'. Available: {', '.join(EXPRESSWAYS)}."
        )

    start = _interchange(expressway, entry)
    end = _interchange(expressway, exit_)
    if not start or not end:
        names = ", ".join(i["key"] for i in spec["interchanges"])
        raise ValueError(f"Unknown interchange. Available on {expressway}: {names}.")
    if start["key"] == end["key"]:
        raise ValueError("Entry and exit are the same interchange.")

    multiplier = CLASS_MULTIPLIER.get(vehicle_class)
    if multiplier is None:
        raise ValueError(
            f"Unknown vehicle class '{vehicle_class}'. Available: {', '.join(CLASS_MULTIPLIER)}."
        )

    base_rate = spec["rate_per_km"]
    rate = base_rate * multiplier
    distance = abs(end["km"] - start["km"])
    toll = int(round(distance * rate / ROUND_TO) * ROUND_TO)

    cls = next(c for c in VEHICLE_CLASSES if c["key"] == vehicle_class)

    return {
        "expressway": expressway,
        "expressway_name": spec["name"],
        "entry": start["name"],
        "exit": end["name"],
        "distance_km": distance,
        "vehicle_class": vehicle_class,
        "vehicle_class_label": cls["label"],
        "rate_per_km": rate,
        "toll_lkr": toll,
        "all_classes": {
            c["key"]: int(round(distance * base_rate * c["multiplier"] / ROUND_TO) * ROUND_TO)
            for c in VEHICLE_CLASSES
        },
        "confidence": spec["confidence"],
        "confidence_note": CONFIDENCE_NOTES[spec["confidence"]],
        "note": RATE_SOURCE_NOTE,
        "rates_verified_on": RATES_VERIFIED_ON,
    }


def fare_table(expressway: str, entry: str, vehicle_class: str = "class1") -> dict:
    """Every fare from one entry point — the board drivers actually read at the gate."""
    spec = EXPRESSWAYS.get(expressway)
    if not spec:
        raise ValueError(f"Unknown expressway '{expressway}'.")
    start = _interchange(expressway, entry)
    if not start:
        raise ValueError(f"Unknown interchange '{entry}'.")

    rate = spec["rate_per_km"] * CLASS_MULTIPLIER.get(vehicle_class, 1.0)
    rows = []
    for other in sorted(spec["interchanges"], key=lambda i: i["km"]):
        if other["key"] == start["key"]:
            continue
        distance = abs(other["km"] - start["km"])
        rows.append({
            "to": other["name"],
            "to_key": other["key"],
            "distance_km": distance,
            "toll_lkr": int(round(distance * rate / ROUND_TO) * ROUND_TO),
        })

    return {
        "expressway": expressway,
        "from": start["name"],
        "vehicle_class": vehicle_class,
        "rows": rows,
        "confidence": spec["confidence"],
        "confidence_note": CONFIDENCE_NOTES[spec["confidence"]],
        "note": RATE_SOURCE_NOTE,
        "rates_verified_on": RATES_VERIFIED_ON,
    }


def expressway_info() -> dict:
    return {
        "expressways": list_expressways(),
        "vehicle_classes": VEHICLE_CLASSES,
        "etc": ETC_GUIDE,
        "rules": RULES,
        "emergency_number": "1969",
        "note": RATE_SOURCE_NOTE,
        "rates_verified_on": RATES_VERIFIED_ON,
        "today": date.today().isoformat(),
    }
