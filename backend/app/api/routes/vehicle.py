"""
Revenue licence, emission testing and ownership transfer.
"""

from fastapi import APIRouter, Query

from app.services import vehicle_service
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/vehicle", tags=["Vehicle Clearance"])


@router.get("/revenue-licence")
async def revenue_licence(
    plate: str | None = Query(None, description="Vehicle number, e.g. WP CAB-1234"),
):
    """
    Where to renew, prerequisites and steps. Given a plate, the province is read off it and
    the correct portal returned — Western Province uses a different one from everywhere else.
    """
    try:
        return success_response("Revenue licence information",
                                vehicle_service.revenue_licence_info(plate))
    except Exception as e:
        return error_response(str(e), "REVENUE_INFO_ERROR", 500)


@router.get("/plate")
async def parse_plate(plate: str = Query(..., min_length=2, description="Vehicle number")):
    """Read the province off a number plate."""
    return success_response("Plate parsed", vehicle_service.parse_plate(plate))


@router.get("/provinces")
async def provinces():
    return success_response("Provinces", {
        "provinces": vehicle_service.PROVINCES,
        "portals": vehicle_service.ERL_PORTALS,
    })


@router.get("/emission")
async def emission():
    """Testing providers, what to bring, and how to avoid the queue."""
    return success_response("Emission testing information", vehicle_service.emission_info())


@router.get("/transfer")
async def transfer():
    """MTA forms, the transfer sequence, and the checklist for buying second-hand."""
    return success_response("Ownership transfer information", vehicle_service.transfer_info())
