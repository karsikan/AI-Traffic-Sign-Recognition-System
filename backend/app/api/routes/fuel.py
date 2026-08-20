"""
Fuel prices and trip cost.
"""

from fastapi import APIRouter, Query

from app.services import fuel_service
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/fuel", tags=["Fuel & Energy"])


@router.get("/prices")
async def prices():
    """Last known prices, with how old they are stated plainly."""
    return success_response("Fuel prices", fuel_service.price_board())


@router.get("/reference")
async def reference():
    """Common route distances and typical mileage figures, for the estimator."""
    return success_response("Reference data", fuel_service.reference_data())


@router.get("/estimate")
async def estimate(
    distance_km: float = Query(..., gt=0, le=5000),
    km_per_litre: float = Query(..., gt=0, le=100),
    fuel: str = Query("petrol_92"),
    price_lkr: float | None = Query(None, gt=0, le=10000,
                                    description="Today's pump price — overrides the stored figure"),
    return_trip: bool = Query(False),
):
    """What a trip costs in fuel. Pass ``price_lkr`` for an exact answer."""
    try:
        return success_response(
            "Trip cost estimated",
            fuel_service.estimate_trip(distance_km, km_per_litre, fuel, price_lkr, return_trip),
        )
    except ValueError as e:
        return error_response(str(e), "INVALID_INPUT", 400)
    except Exception as e:
        return error_response(str(e), "ESTIMATE_ERROR", 500)


@router.get("/compare")
async def compare(
    distance_km: float = Query(..., gt=0, le=5000),
    km_per_litre: float = Query(..., gt=0, le=100),
    return_trip: bool = Query(False),
):
    """The same trip costed against every grade."""
    try:
        return success_response(
            "Fuel comparison",
            fuel_service.compare_fuels(distance_km, km_per_litre, return_trip),
        )
    except ValueError as e:
        return error_response(str(e), "INVALID_INPUT", 400)
    except Exception as e:
        return error_response(str(e), "COMPARE_ERROR", 500)
