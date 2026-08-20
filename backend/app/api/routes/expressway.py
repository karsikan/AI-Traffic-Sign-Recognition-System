"""
Expressway toll calculator and ETC guidance.
"""

from fastapi import APIRouter, Query

from app.services import expressway_service
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/expressway", tags=["Expressway Assistant"])


@router.get("/info")
async def info():
    """Expressways, interchanges, vehicle classes, ETC guidance and the rules."""
    return success_response("Expressway information", expressway_service.expressway_info())


@router.get("/toll")
async def toll(
    expressway: str = Query(..., description="E01 | E02 | E03 | E04"),
    entry: str = Query(..., description="Entry interchange key"),
    exit: str = Query(..., description="Exit interchange key"),
    vehicle_class: str = Query("class1", description="class1 | class2 | class3"),
):
    """The fare between two interchanges, with every class shown alongside."""
    try:
        return success_response(
            "Toll calculated",
            expressway_service.calculate_toll(expressway.upper(), entry, exit, vehicle_class),
        )
    except ValueError as e:
        return error_response(str(e), "INVALID_ROUTE", 400)
    except Exception as e:
        return error_response(str(e), "TOLL_ERROR", 500)


@router.get("/fare-table")
async def fare_table(
    expressway: str = Query(..., description="E01 | E02 | E03 | E04"),
    entry: str = Query(..., description="Entry interchange key"),
    vehicle_class: str = Query("class1"),
):
    """Every fare from one entry point — the board at the gate, in one call."""
    try:
        return success_response(
            "Fare table",
            expressway_service.fare_table(expressway.upper(), entry, vehicle_class),
        )
    except ValueError as e:
        return error_response(str(e), "INVALID_ROUTE", 400)
    except Exception as e:
        return error_response(str(e), "FARE_TABLE_ERROR", 500)


@router.get("/etc")
async def etc():
    """What the ETC card is, how to top it up, and what happens when it fails."""
    return success_response("ETC guidance", expressway_service.ETC_GUIDE)
