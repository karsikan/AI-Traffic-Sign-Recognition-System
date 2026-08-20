"""
Fuel prices and trip cost.

Fuel prices in Sri Lanka move often — sometimes monthly — so hard-coding them would make
this page confidently wrong within weeks. Two things follow from that:

  * every price carries the date it was last checked, and the API reports how stale it is;
  * the cost estimator accepts a price from the caller, so a driver who knows today's
    figure gets an exact answer regardless of what is stored here.

The arithmetic is the part that never goes out of date, and that is what the estimator is
really for.
"""

from datetime import date, datetime

# ── Last known prices ───────────────────────────────────────────────────────────
# Checked 2026-08-13. Treat as a starting value, not as today's price.

PRICES_CHECKED_ON = "2026-08-13"
PRICE_SOURCE_URL = "https://ceypetco.gov.lk/marketing-sales/"

FUELS = [
    {"key": "petrol_92",   "label": "Petrol 92 Octane",  "price_lkr": 414,
     "note": "The common grade for most cars and motorcycles."},
    {"key": "petrol_95",   "label": "Petrol 95 Octane",  "price_lkr": 495,
     "note": "Higher octane, for engines that require it."},
    {"key": "auto_diesel", "label": "Auto Diesel",       "price_lkr": 382,
     "note": "Standard diesel."},
    {"key": "super_diesel","label": "Super Diesel",      "price_lkr": 478,
     "note": "Low-sulphur diesel."},
    {"key": "kerosene",    "label": "Kerosene",          "price_lkr": 285,
     "note": "Not a motor fuel — listed for reference."},
]

PRICE_BY_KEY = {f["key"]: f["price_lkr"] for f in FUELS}

SUPPLIERS = [
    {"name": "Ceypetco (Ceylon Petroleum Corporation)", "url": "https://ceypetco.gov.lk/",
     "note": "State supplier. Price revisions are announced here first."},
    {"name": "Lanka IOC (LIOC)", "url": "https://www.lankaioc.com/",
     "note": "Usually matches Ceypetco within a day of a revision."},
    {"name": "Sinopec", "url": None,
     "note": "Operates a growing network of stations; pricing generally tracks the others."},
]

# How long before a stored price should be treated as unreliable
STALE_AFTER_DAYS = 30

DATA_NOTE = (
    "Fuel prices change by announcement, often monthly. The figures here were checked on "
    f"{PRICES_CHECKED_ON} and are a starting value only — always confirm at the pump or on "
    "the Ceypetco site. The estimator accepts your own price, which is the reliable way to "
    "use it."
)

# Common routes, for a quick estimate without typing a distance
COMMON_ROUTES = [
    {"from": "Colombo", "to": "Kandy",         "distance_km": 115},
    {"from": "Colombo", "to": "Galle",         "distance_km": 125},
    {"from": "Colombo", "to": "Matara",        "distance_km": 160},
    {"from": "Colombo", "to": "Jaffna",        "distance_km": 400},
    {"from": "Colombo", "to": "Trincomalee",   "distance_km": 260},
    {"from": "Colombo", "to": "Anuradhapura",  "distance_km": 205},
    {"from": "Colombo", "to": "Nuwara Eliya",  "distance_km": 175},
    {"from": "Colombo", "to": "Batticaloa",    "distance_km": 315},
    {"from": "Colombo", "to": "Kurunegala",    "distance_km": 95},
    {"from": "Kandy",   "to": "Nuwara Eliya",  "distance_km": 75},
    {"from": "Kandy",   "to": "Jaffna",        "distance_km": 330},
    {"from": "Galle",   "to": "Matara",        "distance_km": 45},
]

# Rough mileage by vehicle type, for drivers who have never measured their own
TYPICAL_MILEAGE = [
    {"vehicle": "Motorcycle",              "km_per_litre": 40},
    {"vehicle": "Three-wheeler",           "km_per_litre": 30},
    {"vehicle": "Small car (under 1000cc)","km_per_litre": 18},
    {"vehicle": "Car (1000–1500cc)",       "km_per_litre": 14},
    {"vehicle": "Car (over 1500cc)",       "km_per_litre": 10},
    {"vehicle": "Van / SUV",               "km_per_litre": 9},
    {"vehicle": "Light lorry",             "km_per_litre": 7},
]


def _days_since_check(today: date | None = None) -> int:
    today = today or date.today()
    checked = datetime.strptime(PRICES_CHECKED_ON, "%Y-%m-%d").date()
    return (today - checked).days


def price_board(today: date | None = None) -> dict:
    """Stored prices, with an honest statement of how old they are."""
    age = _days_since_check(today)
    stale = age > STALE_AFTER_DAYS

    return {
        "fuels": FUELS,
        "suppliers": SUPPLIERS,
        "checked_on": PRICES_CHECKED_ON,
        "days_since_checked": age,
        "stale": stale,
        "staleness_message": (
            f"These prices were last checked {age} day(s) ago and may well have changed. "
            f"Check {PRICE_SOURCE_URL} or the pump, and enter the real figure in the "
            f"estimator below."
            if stale else
            f"Last checked {age} day(s) ago. Prices can change at any announcement — "
            f"confirm at the pump for anything that matters."
        ),
        "source_url": PRICE_SOURCE_URL,
        "data_note": DATA_NOTE,
    }


def estimate_trip(distance_km: float, km_per_litre: float,
                  fuel: str = "petrol_92", price_lkr: float | None = None,
                  return_trip: bool = False, today: date | None = None) -> dict:
    """
    What a trip costs in fuel.

    ``price_lkr`` overrides the stored price — pass the figure from the pump and the answer
    is exact rather than approximate.
    """
    if distance_km <= 0:
        raise ValueError("Distance must be greater than zero.")
    if km_per_litre <= 0:
        raise ValueError("Mileage must be greater than zero.")

    unit_price = price_lkr if price_lkr and price_lkr > 0 else PRICE_BY_KEY.get(fuel)
    if unit_price is None:
        raise ValueError(
            f"Unknown fuel '{fuel}'. Available: {', '.join(PRICE_BY_KEY)}."
        )
    used_stored_price = not (price_lkr and price_lkr > 0)

    total_km = distance_km * (2 if return_trip else 1)
    litres = total_km / km_per_litre
    cost = litres * unit_price

    fuel_label = next((f["label"] for f in FUELS if f["key"] == fuel), fuel)

    return {
        "distance_km": round(total_km, 1),
        "one_way_km": round(distance_km, 1),
        "return_trip": return_trip,
        "km_per_litre": km_per_litre,
        "fuel": fuel,
        "fuel_label": fuel_label,
        "price_per_litre_lkr": round(unit_price, 2),
        "price_source": "your figure" if not used_stored_price else f"stored, checked {PRICES_CHECKED_ON}",
        "litres_needed": round(litres, 2),
        "cost_lkr": round(cost, 2),
        "cost_per_km_lkr": round(cost / total_km, 2) if total_km else 0,
        "note": (
            "Fuel only — tolls, parking and wear are not included. Real consumption is "
            "worse in traffic and better on an open road, so treat this as a floor rather "
            "than a precise figure."
        ),
        "warning": (
            None if not used_stored_price else
            f"Using a stored price from {PRICES_CHECKED_ON}. Enter today's pump price for "
            f"an accurate answer."
        ),
    }


def compare_fuels(distance_km: float, km_per_litre: float,
                  return_trip: bool = False) -> dict:
    """The same trip costed against each grade — useful when a car can take either."""
    motor_fuels = [f for f in FUELS if f["key"] != "kerosene"]
    rows = []
    for f in motor_fuels:
        est = estimate_trip(distance_km, km_per_litre, f["key"], None, return_trip)
        rows.append({
            "fuel": f["key"],
            "label": f["label"],
            "price_per_litre_lkr": f["price_lkr"],
            "cost_lkr": est["cost_lkr"],
            "litres_needed": est["litres_needed"],
        })
    rows.sort(key=lambda r: r["cost_lkr"])
    return {
        "rows": rows,
        "cheapest": rows[0]["label"] if rows else None,
        "checked_on": PRICES_CHECKED_ON,
        "data_note": DATA_NOTE,
    }


def reference_data() -> dict:
    return {
        "common_routes": COMMON_ROUTES,
        "typical_mileage": TYPICAL_MILEAGE,
        "mileage_note": (
            "These are rough figures for drivers who have not measured their own. To find "
            "yours: fill the tank, note the odometer, drive normally, fill up again, then "
            "divide the kilometres covered by the litres it took."
        ),
    }
