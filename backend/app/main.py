import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import BACKEND_DIR, settings

# Uploads, saved frames and the benchmark's sample images are all addressed relative to
# backend/. uvicorn can legitimately be started from the project root (`--app-dir backend`,
# which is what .vscode and .claude/launch.json do) or from backend/ itself, so pin the
# working directory once here instead of leaving every relative path to chance.
os.chdir(BACKEND_DIR)

from app.core.database import Base, engine  # noqa: E402  (import after chdir)
from app.utils.response import error_response  # noqa: E402

# Import routes
from app.api.routes import auth, predict, health, history, feedback, assistant, emergency, nearby, fines, foreign_driver, model, license, documents, rights, my_fines, locker, incidents, checkpoints, notifications, fatigue, zones, reports, vehicle, expressway, fuel, insurance, compute
from app.routers import signs

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Traffic Sign Recognition & Road Safety API",
    description="Refactored modular REST API with global response contracts.",
    version="2.0.0",
)

# Enable CORS for public frontend use
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media upload directories
os.makedirs("uploads/images", exist_ok=True)
os.makedirs("uploads/videos", exist_ok=True)
os.makedirs("uploads/incidents", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(health.router)
app.include_router(history.router)
app.include_router(feedback.router)
app.include_router(assistant.router)
app.include_router(emergency.router)
app.include_router(nearby.router)
app.include_router(fines.router)
app.include_router(foreign_driver.router)
app.include_router(signs.router)
app.include_router(model.router)
app.include_router(license.router)
app.include_router(documents.router)
app.include_router(rights.router)
app.include_router(my_fines.router)
app.include_router(locker.router)
app.include_router(incidents.router)
app.include_router(checkpoints.router)
app.include_router(notifications.router)
app.include_router(fatigue.router)
app.include_router(zones.router)
app.include_router(reports.router)
app.include_router(vehicle.router)
app.include_router(expressway.router)
app.include_router(fuel.router)
app.include_router(insurance.router)
app.include_router(compute.router)

# ----------------- Global Exception Filtering (Section 13) -----------------

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    error_code = "HTTP_ERROR"
    if exc.status_code == 404:
        error_code = "NOT_FOUND"
    elif exc.status_code == 400:
        error_code = "BAD_REQUEST"
    
    # Custom detection exceptions mapped
    if "No traffic sign" in exc.detail:
        error_code = "NO_SIGN_FOUND"
        
    return error_response(
        message=exc.detail,
        error_code=error_code,
        status_code=exc.status_code
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = errors[0]["msg"] if errors else "Validation failed"
    field = ".".join(str(f) for f in errors[0]["loc"]) if errors else "payload"
    return error_response(
        message=f"Validation failed on field '{field}': {msg}",
        error_code="VALIDATION_ERROR",
        status_code=422
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return error_response(
        message=f"Internal Server Error: {str(exc)}",
        error_code="INTERNAL_SERVER_ERROR",
        status_code=500
    )

@app.get("/", tags=["Health"])
def root():
    return {
        "success": True,
        "message": "Welcome to Sri Lanka Smart Traffic Sign Recognition REST API",
        "data": {
            "docs": "/docs",
            "status": "active"
        }
    }
