"""Nearby essential services via OpenStreetMap Overpass API — 100% FREE, no key.

Replaces the Google Places dependency. Uses the public Overpass endpoint to find
petrol stations, hospitals, police, garages, restaurants and pharmacies near a
coordinate, and the Nominatim service for reverse geocoding (optional).
"""
import math

import requests

from app.core.config import settings

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Map our service types to OpenStreetMap tags.
OSM_TAGS = {
    "petrol": [("amenity", "fuel")],
    "hospital": [("amenity", "hospital"), ("amenity", "clinic")],
    "police": [("amenity", "police")],
    "garage": [("shop", "car_repair"), ("amenity", "car_repair")],
    "restaurant": [("amenity", "restaurant"), ("amenity", "fast_food")],
    "pharmacy": [("amenity", "pharmacy")],
    # A spot fine is paid at a post office, so "the nearest post office" is one of the
    # most consequential answers this app gives. It must not come from a ten-item list.
    "post_office": [("amenity", "post_office")],
    "hotel": [("tourism", "hotel"), ("tourism", "guest_house")],
}


def _haversine(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0  # km
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _build_query(lat, lng, tags, radius) -> str:
    clauses = []
    for k, v in tags:
        for el in ("node", "way", "relation"):
            clauses.append(f'{el}["{k}"="{v}"](around:{radius},{lat},{lng});')
    return f"[out:json][timeout:25];({''.join(clauses)});out center 30;"


def find_nearby_google(lat: float, lng: float, service_type: str, radius: int = 5000):
    GOOGLE_TYPES = {
        "petrol": "gas_station",
        "hospital": "hospital",
        "police": "police",
        "garage": "car_repair",
        "restaurant": "restaurant",
        "pharmacy": "pharmacy",
    }
    gtype = GOOGLE_TYPES.get(service_type, "hospital")
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": gtype,
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return {"configured": True, "results": [], "message": f"Google Places lookup failed: {exc}", "source": "Google"}

    results = []
    google_places = data.get("results", [])[:10]  # Grab top 10 for details search

    def fetch_details(item):
        place_id = item.get("place_id")
        if not place_id:
            return None
        details_url = "https://maps.googleapis.com/maps/api/place/details/json"
        details_params = {
            "place_id": place_id,
            "fields": "formatted_phone_number",
            "key": settings.GOOGLE_MAPS_API_KEY,
        }
        try:
            r = requests.get(details_url, params=details_params, timeout=5)
            if r.status_code == 200:
                return r.json().get("result", {}).get("formatted_phone_number")
        except Exception:
            pass
        return None

    # Fetch phone numbers in parallel to speed up details retrieval
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=5) as executor:
        phones = list(executor.map(fetch_details, google_places))

    for idx, item in enumerate(google_places):
        plat = item["geometry"]["location"]["lat"]
        plng = item["geometry"]["location"]["lng"]
        results.append({
            "name": item["name"],
            "address": item.get("vicinity", ""),
            "rating": item.get("rating"),
            "latitude": plat,
            "longitude": plng,
            "distance_km": round(_haversine(lat, lng, plat, plng), 2),
            "open_now": item.get("opening_hours", {}).get("open_now"),
            "phone": phones[idx],
        })

    return {"configured": True, "results": sorted(results, key=lambda x: x["distance_km"]), "source": "Google Places"}


def find_nearby_osm(lat: float, lng: float, service_type: str, radius: int = 5000,
                    timeout: int = 30):
    tags = OSM_TAGS.get(service_type)
    if not tags:
        return {"configured": True, "results": [],
                "message": f"Unknown service type '{service_type}'."}

    query = _build_query(lat, lng, tags, radius)
    headers = {"User-Agent": settings.OSM_USER_AGENT}
    try:
        resp = requests.post(OVERPASS_URL, data={"data": query},
                             headers=headers, timeout=timeout)
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
    except Exception as exc:
        return {"configured": True, "results": [],
                "message": f"OpenStreetMap lookup failed ({exc}). Try again shortly."}

    results = []
    for el in elements:
        if "lat" in el and "lon" in el:
            plat, plng = el["lat"], el["lon"]
        elif "center" in el:
            plat, plng = el["center"]["lat"], el["center"]["lon"]
        else:
            continue
        t = el.get("tags", {})
        name = t.get("name") or t.get("operator") or service_type.title()
        addr_parts = [t.get("addr:street"), t.get("addr:city"), t.get("addr:suburb")]
        address = ", ".join(p for p in addr_parts if p) or t.get("addr:full") or ""
        results.append({
            "name": name,
            "address": address,
            "rating": None,
            "latitude": plat,
            "longitude": plng,
            "distance_km": round(_haversine(lat, lng, plat, plng), 2),
            "open_now": None,
            "phone": t.get("phone") or t.get("contact:phone"),
        })

    # de-duplicate by name+coords, sort by distance, cap at 20
    seen, unique = set(), []
    for r in sorted(results, key=lambda x: x["distance_km"]):
        key = (r["name"], round(r["latitude"], 4), round(r["longitude"], 4))
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)
    return {"configured": True, "results": unique[:20], "source": "OpenStreetMap"}


def find_nearby(lat: float, lng: float, service_type: str, radius: int = 5000,
                timeout: int = 30):
    if settings.GOOGLE_MAPS_API_KEY:
        return find_nearby_google(lat, lng, service_type, radius)
    else:
        return find_nearby_osm(lat, lng, service_type, radius, timeout)
