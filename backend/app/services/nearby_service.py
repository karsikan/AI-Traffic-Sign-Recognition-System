"""
Nearby services.

Two sources, used in that order:

  1. **OpenStreetMap (Overpass)** — real data, everywhere in the country, no API key.
     Someone in Batticaloa gets the Batticaloa police station half a kilometre away.
  2. **A small built-in list** — about sixty places in the main cities, used only when
     Overpass is unreachable or rate-limited.

The fallback exists because Overpass is a free public endpoint that returns 429 under
load, and a road-safety app must still answer when it does. But the fallback is what the
app used to serve *always*, and outside the main cities it is close to useless — a driver
in Ampara was being told the nearest police station was in Kandy, 114 km away. So every
response says which source it came from, and the fallback carries a warning the UI shows.

Results are cached briefly: several pages ask for the same categories around the same
position, and the free endpoint should not be asked twice for that.
"""

import math
import re
import threading
import time

from fastapi import HTTPException

from app.core.logging import logger
from app.services import maps_service
from app.services.emergency_service import SRI_LANKA_SERVICES, haversine_distance

# Categories the built-in list covers but OpenStreetMap does not map the same way
OSM_CATEGORY = {
    "hospital": "hospital",
    "police": "police",
    "petrol": "petrol",
    "garage": "garage",
    "restaurant": "restaurant",
    "pharmacy": "pharmacy",
    "post_office": "post_office",
    "hotel": "hotel",
}

# service_station has no clean Overpass equivalent — a manufacturer's service centre is
# not a tag — so it stays on the built-in list.
BUILTIN_ONLY = {"service_station"}

DEFAULT_RADIUS_M = 15000

# Past this, "nearest" stops being a useful word and the driver needs telling.
FAR_RESULT_KM = 25

# Cache key is rounded to ~1 km so two drivers on the same street share an answer
_CACHE: dict[tuple, tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 600
_CACHE_LOCK = threading.Lock()
_CACHE_MAX = 500

# OpenStreetMap files dental surgeries, ayurvedic clinics and veterinary practices under
# amenity=hospital. They are real places, but not somewhere to take a crash casualty, so
# they are dropped from the hospital category. The rows stay in the table — this is a
# question of what to show, not what to keep.
_NOT_EMERGENCY_CARE = re.compile(
    r"(dental|dentist|odent|ayurved\w*|veterinar\w*|eye clinic|optical|"
    r"channel\w* cent\w*|laborator\w*|pharmac\w*)",
    re.IGNORECASE,
)

# Distance alone puts a chest clinic ahead of a teaching hospital that is a street
# further on. For a crash, the kind of place matters as much as how near it is, so a
# hospital that takes emergencies is pulled forward — but only within a few kilometres,
# because past that the nearer place really is the better answer.
_REAL_HOSPITAL = re.compile(
    r"\b(teaching|general|base|district|national|provincial|university|"
    r"emergency|accident)\b.*\bhospital\b|\bhospital\b.*\b(teaching|general|base|"
    r"district|national|provincial)\b|^hospital$",
    re.IGNORECASE,
)
_SPECIALIST_ONLY = re.compile(
    r"\b(cancer|chest|maternity|children|eye|psychiatric|leprosy|rehab|"
    r"fertility|skin|cardiac)\b",
    re.IGNORECASE,
)
# How much a proper emergency hospital may be "moved closer" when ranking, in km
_HOSPITAL_PREFERENCE_KM = 3.0

FALLBACK_WARNING = (
    "Live map data was unavailable, so this is a short built-in list covering the main "
    "cities only. Outside them the nearest result may be a long way off — check the "
    "distance before relying on it, and call 119 in an emergency."
)


def _cache_key(lat: float, lon: float, category: str, radius: int) -> tuple:
    return (round(lat, 2), round(lon, 2), category, radius)


def _cache_get(key: tuple) -> dict | None:
    with _CACHE_LOCK:
        hit = _CACHE.get(key)
        if not hit:
            return None
        stored_at, value = hit
        if time.time() - stored_at > _CACHE_TTL_SECONDS:
            _CACHE.pop(key, None)
            return None
        return value


def _cache_put(key: tuple, value: dict) -> None:
    with _CACHE_LOCK:
        if len(_CACHE) >= _CACHE_MAX:
            oldest = min(_CACHE, key=lambda k: _CACHE[k][0])
            _CACHE.pop(oldest, None)
        _CACHE[key] = (time.time(), value)


def _maps_url(lat: float, lon: float) -> str:
    return f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"


def _from_builtin(lat: float, lon: float, category: str) -> list[dict]:
    """The old hardcoded list, kept only as a fallback."""
    out = []
    for loc in SRI_LANKA_SERVICES.get(category, []):
        distance = haversine_distance(lat, lon, loc["lat"], loc["lon"])
        out.append({
            "name": loc["name"],
            "address": loc["city"],
            "distance_km": distance,
            "maps_url": _maps_url(loc["lat"], loc["lon"]),
            "phone": loc.get("phone"),
            "latitude": loc["lat"],
            "longitude": loc["lon"],
        })
    out.sort(key=lambda x: x["distance_km"])
    return out


def _from_database(lat: float, lon: float, category: str, radius_m: int) -> list[dict] | None:
    """
    The imported OpenStreetMap places, queried locally.

    A bounding box narrows the rows in SQL, then the exact distance is computed in Python
    — the box is cheap and indexed, and there are only ever a handful of rows left to
    measure. Instant, no rate limit, and it still answers when Overpass is down.
    """
    from app.core.database import SessionLocal
    from app.models.place import Place

    radius_km = radius_m / 1000
    # A degree of latitude is ~111 km; longitude shrinks with the cosine of latitude,
    # which at Sri Lanka's latitudes is close enough to 1 to pad slightly and move on.
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * max(0.5, math.cos(math.radians(lat))))

    db = SessionLocal()
    try:
        rows = (
            db.query(Place)
            .filter(
                Place.category == category,
                Place.latitude.between(lat - dlat, lat + dlat),
                Place.longitude.between(lon - dlon, lon + dlon),
            )
            .all()
        )
    except Exception as e:
        logger.warning(f"Place table lookup failed for {category}: {e}")
        return None
    finally:
        db.close()

    if not rows:
        return None

    out = []
    for p in rows:
        if category == "hospital" and _NOT_EMERGENCY_CARE.search(p.name):
            continue
        distance = haversine_distance(lat, lon, p.latitude, p.longitude)
        if distance > radius_km:
            continue                      # the box is square, the radius is round
        out.append({
            "name": p.name,
            "address": p.address or "",
            "distance_km": distance,
            "maps_url": _maps_url(p.latitude, p.longitude),
            "phone": p.phone,
            "latitude": p.latitude,
            "longitude": p.longitude,
        })
    if not out:
        return None

    if category == "hospital":
        def rank(place: dict) -> float:
            score = place["distance_km"]
            # Specialist first: "National Eye Hospital" matches both patterns, and it
            # is the wrong place to take someone with crash injuries.
            if _SPECIALIST_ONLY.search(place["name"]):
                score += _HOSPITAL_PREFERENCE_KM
            elif _REAL_HOSPITAL.search(place["name"]):
                score -= _HOSPITAL_PREFERENCE_KM
            return score
        out.sort(key=rank)
    else:
        out.sort(key=lambda x: x["distance_km"])
    return out[:20]


def _from_osm(lat: float, lon: float, category: str, radius: int,
              timeout: int = 30) -> list[dict] | None:
    """Live OpenStreetMap results, or None if the lookup could not be made."""
    osm_type = OSM_CATEGORY.get(category)
    if not osm_type:
        return None

    try:
        res = maps_service.find_nearby(lat, lon, osm_type, radius=radius, timeout=timeout)
    except Exception as e:
        logger.warning(f"Overpass lookup failed for {category}: {e}")
        return None

    rows = res.get("results") or []
    if not rows:
        # A genuine "nothing within the radius" is indistinguishable here from a failed
        # call, so treat both as no answer and let the fallback speak.
        if res.get("message"):
            logger.info(f"Overpass returned no data for {category}: {res['message'][:120]}")
        return None

    out = []
    for r in rows:
        r_lat = r.get("latitude", r.get("lat"))
        r_lon = r.get("longitude", r.get("lng", r.get("lon")))
        out.append({
            "name": r.get("name") or "Unnamed",
            "address": r.get("address") or r.get("vicinity") or "",
            "distance_km": r.get("distance_km"),
            "maps_url": _maps_url(r_lat, r_lon) if r_lat and r_lon else None,
            "phone": r.get("phone"),
            "latitude": r_lat,
            "longitude": r_lon,
        })
    out.sort(key=lambda x: (x["distance_km"] is None, x["distance_km"]))
    return out


class NearbyService:
    @staticmethod
    def find_nearby_services(latitude: float, longitude: float, category: str,
                             radius_m: int = DEFAULT_RADIUS_M,
                             timeout: int = 30) -> dict:
        known = set(SRI_LANKA_SERVICES) | set(OSM_CATEGORY)
        if category not in known:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported services category: {category}",
            )

        key = _cache_key(latitude, longitude, category, radius_m)
        cached = _cache_get(key)
        if cached:
            return {**cached, "cached": True}

        services = None
        source = "builtin"

        # 1. The imported places table — instant, and covers the whole country.
        if category not in BUILTIN_ONLY:
            services = _from_database(latitude, longitude, category, radius_m)
            if services:
                source = "database"

        # 2. Overpass live, only if nothing was imported for this category yet. This is
        #    what makes a fresh checkout work before anyone runs the import script.
        if not services and category not in BUILTIN_ONLY:
            services = _from_osm(latitude, longitude, category, radius_m, timeout)
            if services:
                source = "openstreetmap"

        # 3. The short built-in list, so there is always an answer.
        if not services:
            services = _from_builtin(latitude, longitude, category)

        # Warn on the fallback, but also warn whenever the nearest result is simply far
        # away — a correct answer 200 km off is still the wrong thing to act on, and the
        # driver should know before setting out.
        nearest_km = services[0]["distance_km"] if services else None
        warning = None
        if source == "builtin" and category not in BUILTIN_ONLY:
            warning = FALLBACK_WARNING
        elif nearest_km is not None and nearest_km > FAR_RESULT_KM:
            warning = (
                f"The nearest result is {nearest_km:.0f} km away. There may well be "
                f"somewhere closer that is not on the map — ask locally before travelling."
            )

        result = {
            "category": category,
            "services": services,
            "count": len(services),
            "source": source,
            "nearest_km": nearest_km,
            "radius_km": round(radius_m / 1000, 1),
            "cached": False,
            "warning": warning,
            "note": {
                "database": "OpenStreetMap data, imported and served locally.",
                "openstreetmap": "Live from OpenStreetMap contributors.",
                "builtin": "Built-in list — main cities only.",
            }[source],
        }
        _cache_put(key, result)
        return result
