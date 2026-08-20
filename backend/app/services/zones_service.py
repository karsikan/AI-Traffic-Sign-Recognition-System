"""
Speed zones and accident blackspots — both answer "what should I know about where I am
right now", so they share the proximity machinery.

Two very different kinds of data live here, and the distinction matters:

  * **Speed limits by road class** are law. The figures come from the Motor Traffic Act
    and match what ``license.py`` already tells drivers.
  * **Zone and blackspot coordinates are illustrative.** Sri Lanka publishes no
    machine-readable register of school-zone geofences, and no coordinate-level blackspot
    list from the RDA or the National Council for Road Safety is public. The entries below
    are well-known locations placed at approximate coordinates so the feature can be
    demonstrated and evaluated. Every response says so — see ``DATA_NOTE``.

Blackspots also come from a second, genuinely live source: accident reports the app's own
users have filed. Those are clustered on demand, and are marked ``source: "reports"``.
"""

from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.checkpoint import CheckpointReport
from app.services.emergency_service import haversine_distance

# ── Speed limits by road class (statutory) ──────────────────────────────────────

ROAD_CLASS_LIMITS = [
    {"key": "expressway", "label": "Expressway (E01–E04)", "limit_kmh": 100,
     "note": "100 km/h for cars and light vehicles; 80 km/h for buses and lorries. Motorcycles under 100cc are banned."},
    {"key": "highway", "label": "A-class highway", "limit_kmh": 70,
     "note": "70 km/h outside built-up areas unless signed otherwise."},
    {"key": "urban", "label": "Built-up area", "limit_kmh": 50,
     "note": "50 km/h is the default in any built-up area unless a sign says otherwise."},
    {"key": "school", "label": "School zone", "limit_kmh": 30,
     "note": "Reduced limit near schools during opening and closing times."},
    {"key": "hospital", "label": "Hospital zone", "limit_kmh": 30,
     "note": "Reduced limit and no horn near hospitals."},
]

_CLASS_LIMIT = {c["key"]: c["limit_kmh"] for c in ROAD_CLASS_LIMITS}

# ── Named zones (illustrative coordinates) ──────────────────────────────────────
# radius_m is how close you must be for the zone to apply.

ZONES = [
    # Schools
    {"id": "royal_college", "name": "Royal College, Colombo 7", "kind": "school",
     "lat": 6.9061, "lon": 79.8612, "radius_m": 400, "limit_kmh": 30,
     "active_hours": "06:30–08:00 and 13:00–14:30 on school days"},
    {"id": "ananda_college", "name": "Ananda College, Colombo 10", "kind": "school",
     "lat": 6.9270, "lon": 79.8690, "radius_m": 400, "limit_kmh": 30,
     "active_hours": "06:30–08:00 and 13:00–14:30 on school days"},
    {"id": "visakha_vidyalaya", "name": "Visakha Vidyalaya, Colombo 5", "kind": "school",
     "lat": 6.8863, "lon": 79.8636, "radius_m": 350, "limit_kmh": 30,
     "active_hours": "06:30–08:00 and 13:00–14:30 on school days"},
    {"id": "trinity_kandy", "name": "Trinity College, Kandy", "kind": "school",
     "lat": 7.2966, "lon": 80.6414, "radius_m": 400, "limit_kmh": 30,
     "active_hours": "06:30–08:00 and 13:00–14:30 on school days"},
    {"id": "richmond_galle", "name": "Richmond College, Galle", "kind": "school",
     "lat": 6.0561, "lon": 80.2200, "radius_m": 400, "limit_kmh": 30,
     "active_hours": "06:30–08:00 and 13:00–14:30 on school days"},
    {"id": "jaffna_central", "name": "Jaffna Central College", "kind": "school",
     "lat": 9.6683, "lon": 80.0140, "radius_m": 350, "limit_kmh": 30,
     "active_hours": "06:30–08:00 and 13:00–14:30 on school days"},

    # Hospitals
    {"id": "nhsl", "name": "National Hospital, Colombo", "kind": "hospital",
     "lat": 6.9200, "lon": 79.8686, "radius_m": 500, "limit_kmh": 30,
     "active_hours": "At all times"},
    {"id": "lady_ridgeway", "name": "Lady Ridgeway Children's Hospital, Colombo", "kind": "hospital",
     "lat": 6.9118, "lon": 79.8676, "radius_m": 400, "limit_kmh": 30,
     "active_hours": "At all times"},
    {"id": "kandy_general", "name": "Teaching Hospital, Kandy", "kind": "hospital",
     "lat": 7.2911, "lon": 80.6350, "radius_m": 450, "limit_kmh": 30,
     "active_hours": "At all times"},
    {"id": "karapitiya", "name": "Teaching Hospital, Karapitiya, Galle", "kind": "hospital",
     "lat": 6.0712, "lon": 80.2225, "radius_m": 450, "limit_kmh": 30,
     "active_hours": "At all times"},
    {"id": "jaffna_teaching", "name": "Jaffna Teaching Hospital", "kind": "hospital",
     "lat": 9.6614, "lon": 80.0205, "radius_m": 450, "limit_kmh": 30,
     "active_hours": "At all times"},
]

ZONE_KINDS = [
    {"key": "school", "label": "School zone", "icon": "graduation-cap"},
    {"key": "hospital", "label": "Hospital zone", "icon": "cross"},
]

# ── Seed blackspots (illustrative) ──────────────────────────────────────────────
# Stretches repeatedly named in public reporting as high-risk. Approximate positions.

SEED_BLACKSPOTS = [
    {"id": "kadawatha_a1", "name": "Kadawatha junction, A1", "lat": 7.0000, "lon": 79.9500,
     "radius_m": 800, "risk": "high", "reason": "Heavy junction with merging expressway traffic."},
    {"id": "nittambuwa_a1", "name": "Nittambuwa stretch, A1", "lat": 7.1300, "lon": 80.0950,
     "radius_m": 1000, "risk": "high", "reason": "Fast straight through a built-up area with roadside shops."},
    {"id": "kegalle_a1", "name": "Kegalle bends, A1", "lat": 7.2530, "lon": 80.3450,
     "radius_m": 900, "risk": "medium", "reason": "Sharp bends on a descending gradient."},
    {"id": "pasyala_a1", "name": "Pasyala, A1", "lat": 7.1000, "lon": 80.0600,
     "radius_m": 800, "risk": "medium", "reason": "Frequent overtaking on a narrow carriageway."},
    {"id": "galle_road_moratuwa", "name": "Galle Road, Moratuwa, A2", "lat": 6.7730, "lon": 79.8820,
     "radius_m": 900, "risk": "high", "reason": "Dense pedestrian activity and bus stops on a fast road."},
    {"id": "elephant_pass_a9", "name": "Elephant Pass, A9", "lat": 9.5000, "lon": 80.4100,
     "radius_m": 1200, "risk": "medium", "reason": "Long straight causeway encouraging high speeds, strong crosswinds."},
    {"id": "kandy_road_peradeniya", "name": "Peradeniya junction, A1", "lat": 7.2600, "lon": 80.5970,
     "radius_m": 700, "risk": "medium", "reason": "Congested junction with heavy pedestrian crossing."},
    {"id": "e01_galanigama", "name": "Galanigama interchange, E01", "lat": 6.7550, "lon": 79.9600,
     "radius_m": 1000, "risk": "medium", "reason": "Merge point where entering traffic meets expressway speeds."},
    {"id": "avissawella_a4", "name": "Avissawella stretch, A4", "lat": 6.9540, "lon": 80.2080,
     "radius_m": 900, "risk": "medium", "reason": "Heavy goods traffic on a winding route."},
    {"id": "hikkaduwa_a2", "name": "Hikkaduwa, A2", "lat": 6.1400, "lon": 80.1000,
     "radius_m": 800, "risk": "medium", "reason": "Tourist area with pedestrians crossing to the beach."},
]

RISK_ORDER = {"high": 0, "medium": 1, "low": 2}

# How far ahead a warning is worth giving, and how many reports make a cluster
BLACKSPOT_ALERT_RADIUS_M = 1500
CLUSTER_RADIUS_KM = 0.4
CLUSTER_MIN_REPORTS = 2
CLUSTER_LOOKBACK_DAYS = 365

DATA_NOTE = (
    "Speed limits by road class are statutory. Zone and blackspot coordinates are "
    "illustrative — Sri Lanka publishes no machine-readable school-zone geofence register "
    "and no public coordinate-level blackspot list, so well-known locations have been "
    "placed at approximate positions to demonstrate the feature. Blackspots marked "
    "'reports' are derived from accident reports filed by users of this app and are real "
    "data, however few. Always drive to the posted signs, not to this screen."
)


def _metres(km: float) -> float:
    return km * 1000.0


def current_zone(lat: float, lon: float) -> dict:
    """
    Which named zone the driver is inside, if any, and the limit that therefore applies.

    Where zones overlap the tightest limit wins — that is the safe reading.
    """
    inside = []
    for zone in ZONES:
        distance_m = _metres(haversine_distance(lat, lon, zone["lat"], zone["lon"]))
        if distance_m <= zone["radius_m"]:
            inside.append({**zone, "distance_m": round(distance_m)})

    inside.sort(key=lambda z: (z["limit_kmh"], z["distance_m"]))

    # Anything close but not yet inside is worth flagging as approaching
    approaching = []
    for zone in ZONES:
        distance_m = _metres(haversine_distance(lat, lon, zone["lat"], zone["lon"]))
        if zone["radius_m"] < distance_m <= zone["radius_m"] + 600:
            approaching.append({**zone, "distance_m": round(distance_m)})
    approaching.sort(key=lambda z: z["distance_m"])

    active = inside[0] if inside else None
    return {
        "in_zone": active is not None,
        "zone": active,
        "other_zones": inside[1:],
        "approaching": approaching[:2],
        "applicable_limit_kmh": active["limit_kmh"] if active else None,
    }


def assess_speed(lat: float, lon: float, speed_kmh: float | None,
                 road_class: str = "urban") -> dict:
    """
    Compare the driver's speed against whatever limit applies where they are, and say
    plainly whether they are over it.
    """
    zone_info = current_zone(lat, lon)
    limit = zone_info["applicable_limit_kmh"] or _CLASS_LIMIT.get(road_class, 50)
    basis = (
        f"{zone_info['zone']['name']} ({zone_info['zone']['kind']} zone)"
        if zone_info["in_zone"] else
        next((c["label"] for c in ROAD_CLASS_LIMITS if c["key"] == road_class), "Built-up area")
    )

    if speed_kmh is None:
        status, over_by, message, speak = "unknown", None, "Speed unavailable — GPS has no speed reading yet.", False
    else:
        over_by = round(speed_kmh - limit, 1)
        if over_by > 10:
            status, speak = "over", True
            message = f"Slow down. {round(speed_kmh)} in a {limit} zone — {basis}."
        elif over_by > 0:
            status, speak = "near", True
            message = f"You are over the {limit} limit for {basis}."
        elif over_by > -5:
            status, speak = "near", False
            message = f"At the {limit} limit for {basis}."
        else:
            status, speak = "ok", False
            message = f"Within the {limit} limit for {basis}."

    result = {
        "speed_kmh": round(speed_kmh, 1) if speed_kmh is not None else None,
        "limit_kmh": limit,
        "limit_basis": basis,
        "road_class": road_class,
        "status": status,
        "over_by_kmh": over_by,
        "message": message,
        "speak": speak,
        **zone_info,
    }

    # An approaching school zone deserves a warning before you are in it
    if not zone_info["in_zone"] and zone_info["approaching"]:
        nxt = zone_info["approaching"][0]
        result["approach_warning"] = (
            f"{nxt['name']} ahead in {nxt['distance_m']} m — limit {nxt['limit_kmh']}."
        )
        if speed_kmh is not None and speed_kmh > nxt["limit_kmh"]:
            result["speak"] = True
            result["message"] = result["approach_warning"]

    return result


def cluster_reported_accidents(db: Session, now: datetime | None = None) -> list[dict]:
    """
    Blackspots the app has worked out for itself: accident reports filed by users, grouped
    by proximity.

    A report's weight is ``1 + confirmations``, not 1. ``checkpoint_service`` folds a
    second report within 250 m into the first as a confirmation rather than storing a new
    row, so counting rows alone would badly undercount a spot several drivers have flagged.
    """
    now = now or datetime.utcnow()
    cutoff = now - timedelta(days=CLUSTER_LOOKBACK_DAYS)

    reports = (
        db.query(CheckpointReport)
        .filter(CheckpointReport.kind == "accident", CheckpointReport.reported_at >= cutoff)
        .all()
    )

    clusters: list[list[CheckpointReport]] = []
    for report in reports:
        for cluster in clusters:
            head = cluster[0]
            if haversine_distance(report.latitude, report.longitude,
                                  head.latitude, head.longitude) <= CLUSTER_RADIUS_KM:
                cluster.append(report)
                break
        else:
            clusters.append([report])

    derived = []
    for i, cluster in enumerate(clusters):
        weight = sum(1 + (r.confirmations or 0) for r in cluster)
        if weight < CLUSTER_MIN_REPORTS:
            continue
        lat = sum(r.latitude for r in cluster) / len(cluster)
        lon = sum(r.longitude for r in cluster) / len(cluster)
        names = [r.road_name for r in cluster if r.road_name]
        derived.append({
            "id": f"cluster_{i + 1}",
            "name": names[0] if names else f"Reported cluster near {lat:.4f}, {lon:.4f}",
            "lat": lat,
            "lon": lon,
            "radius_m": int(_metres(CLUSTER_RADIUS_KM)),
            "risk": "high" if weight >= 4 else "medium",
            "reason": f"{weight} accidents reported here by app users in the last year.",
            "source": "reports",
            "report_count": weight,
            "last_reported": max(r.reported_at for r in cluster).isoformat(),
        })
    return derived


def all_blackspots(db: Session | None = None) -> list[dict]:
    """Seed list plus anything the app's own reports have revealed."""
    items = [{**b, "source": "seed", "report_count": None} for b in SEED_BLACKSPOTS]
    if db is not None:
        items += cluster_reported_accidents(db)
    items.sort(key=lambda b: RISK_ORDER.get(b["risk"], 3))
    return items


def blackspots_near(lat: float, lon: float, radius_km: float = 10.0,
                    db: Session | None = None) -> dict:
    """Blackspots within the radius, nearest first, with an alert for anything imminent."""
    items = []
    for spot in all_blackspots(db):
        distance_m = _metres(haversine_distance(lat, lon, spot["lat"], spot["lon"]))
        if distance_m <= _metres(radius_km):
            items.append({
                **spot,
                "distance_m": round(distance_m),
                "distance_km": round(distance_m / 1000, 2),
                "approaching": distance_m <= BLACKSPOT_ALERT_RADIUS_M,
                "inside": distance_m <= spot["radius_m"],
            })
    items.sort(key=lambda b: b["distance_m"])

    imminent = next((b for b in items if b["approaching"]), None)
    return {
        "blackspots": items,
        "count": len(items),
        "alert": (
            {
                "name": imminent["name"],
                "risk": imminent["risk"],
                "distance_m": imminent["distance_m"],
                "reason": imminent["reason"],
                "message": (
                    f"Accident blackspot ahead — {imminent['name']}, "
                    f"{imminent['distance_m']} metres. {imminent['reason']}"
                ),
            }
            if imminent else None
        ),
        "radius_km": radius_km,
        "data_note": DATA_NOTE,
    }
