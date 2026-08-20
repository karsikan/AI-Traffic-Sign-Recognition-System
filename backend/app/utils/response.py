from datetime import datetime
from fastapi.responses import JSONResponse

def success_response(message: str, data: any = None, status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data if data is not None else {},
            "timestamp": datetime.utcnow().isoformat()
        }
    )

def error_response(message: str, error_code: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "error_code": error_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
