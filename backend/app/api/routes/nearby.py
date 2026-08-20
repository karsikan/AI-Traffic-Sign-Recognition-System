from fastapi import APIRouter, Query

from app.schemas.nearby import NearbyRequest
from app.services.nearby_service import BUILTIN_ONLY, OSM_CATEGORY, NearbyService
from app.services.emergency_service import SRI_LANKA_SERVICES
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/nearby", tags=["Nearby Services"])


@router.post("/services")
async def nearby_services(
    payload: NearbyRequest,
    radius_m: int = Query(15000, ge=500, le=50000,
                          description="How far to search, in metres"),
):
    """
    Places near a position, from OpenStreetMap where possible.

    The response says which source answered. When it falls back to the built-in list it
    also carries a warning — that list only covers the main cities and the nearest result
    can be a hundred kilometres away.
    """
    try:
        res = NearbyService.find_nearby_services(
            latitude=payload.latitude,
            longitude=payload.longitude,
            category=payload.category,
            radius_m=radius_m,
        )
        return success_response("Nearby services fetched", res)
    except Exception as e:
        if hasattr(e, "status_code"):
            return error_response(getattr(e, "detail", str(e)), "NEARBY_ERROR",
                                  getattr(e, "status_code"))
        return error_response(str(e), "SERVER_ERROR", 500)


@router.get("/categories")
async def categories():
    """What can be searched for, and whether live map data backs it."""
    return success_response("Categories", {
        "categories": [
            {
                "key": key,
                "live": key in OSM_CATEGORY and key not in BUILTIN_ONLY,
                "builtin_count": len(SRI_LANKA_SERVICES.get(key, [])),
            }
            for key in sorted(set(SRI_LANKA_SERVICES) | set(OSM_CATEGORY))
        ],
        "note": (
            "Categories marked live are looked up on OpenStreetMap and cover the whole "
            "country. The others fall back to a short built-in list of the main cities."
        ),
    })
