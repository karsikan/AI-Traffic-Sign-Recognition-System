"""
Import Sri Lanka's hospitals, police stations, post offices and fuel stations from
OpenStreetMap into the local database.

Run once to populate, then whenever the data should be refreshed:

    cd backend
    .venv/Scripts/python.exe -m app.scripts.import_places
    .venv/Scripts/python.exe -m app.scripts.import_places --category police
    .venv/Scripts/python.exe -m app.scripts.import_places --dry-run

Why bulk rather than live: the public Overpass endpoint answers in seconds and
rate-limits under load. That is tolerable when someone is browsing, and not tolerable on
the emergency screen. The whole country is a few thousand rows, so it is fetched once
here and every user lookup becomes a local query.

Safe to re-run — rows are matched on the OpenStreetMap id and updated in place.
"""

import argparse
import sys
import time

import requests

from app.core.database import Base, SessionLocal, engine
from app.models.place import Place

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Sri Lanka, generously bounded: south, west, north, east
BBOX = (5.7, 79.4, 10.0, 82.1)

CATEGORIES = {
    "hospital":    [("amenity", "hospital"), ("amenity", "clinic")],
    "police":      [("amenity", "police")],
    "post_office": [("amenity", "post_office")],
    "petrol":      [("amenity", "fuel")],
    "pharmacy":    [("amenity", "pharmacy")],
    "garage":      [("shop", "car_repair")],
}

# The public endpoint is shared. Ask politely: one category at a time, with a pause.
PAUSE_BETWEEN_CATEGORIES = 5
REQUEST_TIMEOUT = 180
USER_AGENT = "RoadSafetyAI/1.0 (final year project; contact via repository)"


def build_query(tags: list[tuple[str, str]]) -> str:
    south, west, north, east = BBOX
    bbox = f"{south},{west},{north},{east}"
    parts = []
    for key, value in tags:
        for kind in ("node", "way", "relation"):
            parts.append(f'{kind}["{key}"="{value}"]({bbox});')
    return f"[out:json][timeout:{REQUEST_TIMEOUT}];({''.join(parts)});out center;"


def fetch(category: str) -> list[dict]:
    query = build_query(CATEGORIES[category])
    resp = requests.post(OVERPASS_URL, data={"data": query},
                         headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT + 30)
    resp.raise_for_status()

    rows = []
    for el in resp.json().get("elements", []):
        if "lat" in el and "lon" in el:
            lat, lon = el["lat"], el["lon"]
        elif "center" in el:
            lat, lon = el["center"]["lat"], el["center"]["lon"]
        else:
            continue

        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("operator")
        if not name:
            # An unnamed point is no use to somebody trying to find a place
            continue

        address = ", ".join(p for p in [
            tags.get("addr:street"), tags.get("addr:city"), tags.get("addr:suburb"),
        ] if p) or tags.get("addr:full")

        rows.append({
            "category": category,
            "name": name[:255],
            "latitude": lat,
            "longitude": lon,
            "address": (address or None) and address[:255],
            "phone": (tags.get("phone") or tags.get("contact:phone") or None),
            "osm_id": str(el.get("id")),
            "osm_type": el.get("type"),
        })
    return rows


def store(rows: list[dict], category: str) -> tuple[int, int]:
    """Insert new places and update ones already imported. Returns (added, updated)."""
    db = SessionLocal()
    added = updated = 0
    try:
        existing = {
            p.osm_id: p
            for p in db.query(Place).filter(Place.category == category).all()
            if p.osm_id
        }
        for row in rows:
            found = existing.get(row["osm_id"])
            if found:
                for key, value in row.items():
                    setattr(found, key, value)
                updated += 1
            else:
                db.add(Place(**row))
                added += 1
        db.commit()
    finally:
        db.close()
    return added, updated


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--category", choices=sorted(CATEGORIES),
                        help="Import one category instead of all")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch and report counts without writing")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    categories = [args.category] if args.category else sorted(CATEGORIES)

    total = 0
    for i, category in enumerate(categories):
        if i:
            time.sleep(PAUSE_BETWEEN_CATEGORIES)
        print(f"  {category:<12} fetching…", end=" ", flush=True)
        started = time.time()
        try:
            rows = fetch(category)
        except Exception as e:
            print(f"FAILED ({str(e)[:70]})")
            continue

        if args.dry_run:
            print(f"{len(rows):>5} found in {time.time() - started:.1f}s (dry run)")
            total += len(rows)
            continue

        added, updated = store(rows, category)
        total += len(rows)
        print(f"{len(rows):>5} found in {time.time() - started:>5.1f}s "
              f"— {added} added, {updated} updated")

    print(f"\n  {total} places {'found' if args.dry_run else 'in the database'}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
