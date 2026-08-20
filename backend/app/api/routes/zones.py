"""
Speed zones and accident blackspots.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import zones_service
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/zones", tags=["Speed Zones & Blackspots"])


@router.get("/limits")
async def road_class_limits():
    """Statutory speed limits by road class, plus the zone kinds the app knows about."""
    return success_response("Speed limits", {
        "road_classes": zones_service.ROAD_CLASS_LIMITS,
        "zone_kinds": zones_service.ZONE_KINDS,
        "data_note": zones_service.DATA_NOTE,
    })


@router.get("/all")
async def list_zones():
    """Every named zone, for drawing on a map or listing."""
    return success_response("Zones listed", {
        "zones": zones_service.ZONES,
        "count": len(zones_service.ZONES),
        "data_note": zones_service.DATA_NOTE,
    })


@router.get("/current")
async def current_zone(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    """Which zone the driver is in right now, and what is coming up."""
    return success_response("Current zone", zones_service.current_zone(latitude, longitude))


@router.get("/speed-check")
async def speed_check(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    speed_kmh: float | None = Query(None, ge=0, le=400),
    road_class: str = Query("urban"),
):
    """
    The live check the speedometer page calls: current speed against the limit that
    actually applies where the driver is.
    """
    try:
        return success_response(
            "Speed assessed",
            zones_service.assess_speed(latitude, longitude, speed_kmh, road_class),
        )
    except Exception as e:
        return error_response(str(e), "SPEED_CHECK_ERROR", 500)


@router.get("/blackspots")
async def blackspots(
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
    radius_km: float = Query(10.0, gt=0, le=200),
    db: Session = Depends(get_db),
):
    """
    Accident blackspots. With a position, only those nearby and an alert for anything
    imminent; without one, the whole list.
    """
    try:
        if latitude is None or longitude is None:
            items = zones_service.all_blackspots(db)
            return success_response("Blackspots listed", {
                "blackspots": items,
                "count": len(items),
                "data_note": zones_service.DATA_NOTE,
            })
        return success_response(
            "Nearby blackspots",
            zones_service.blackspots_near(latitude, longitude, radius_km, db),
        )
    except Exception as e:
        return error_response(str(e), "BLACKSPOT_ERROR", 500)
