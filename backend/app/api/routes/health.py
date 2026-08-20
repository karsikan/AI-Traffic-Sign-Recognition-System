from fastapi import APIRouter
from app.utils.response import success_response

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def health_check():
    return success_response(
        message="Server is running",
        data={"status": "ok"}
    )
