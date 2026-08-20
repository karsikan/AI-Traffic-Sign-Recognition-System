import os

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ — the folder two levels above this file. Model weights are resolved against
# it rather than the working directory: uvicorn can be started from backend/ or from the
# project root with --app-dir, and a relative weights path silently fails in the second
# case. The loaders then treat the weights as missing and the pipeline quietly falls back
# to Gemini Vision, which looks like a model problem but is only a path problem.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Settings(BaseSettings):
    APP_NAME: str = "Smart Traffic Sign Recognition API"
    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"

    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "smart_traffic"

    # Google Gemini (free tier). gemini-2.5-flash is on the free tier in 2026.
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Nearby search & geocoding use OpenStreetMap (Overpass + Nominatim) — 100% free,
    # no API key required. A descriptive User-Agent is requested by OSM usage policy.
    OSM_USER_AGENT: str = "SmartTrafficFYP/1.0 (educational project)"

    # Optional: only used if you later switch back to Google Maps. Not required.
    GOOGLE_MAPS_API_KEY: str = ""

    YOLO_WEIGHTS: str = os.path.join(BACKEND_DIR, "app", "ml", "weights", "yolov8_traffic.pt")
    RESNET_WEIGHTS: str = os.path.join(BACKEND_DIR, "app", "ml", "weights", "resnet50_gtsrb.pth")

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Absolute, for the same reason as the weights above — and this one bites harder:
    # settings are built at import time, so a relative .env is resolved against whatever
    # directory uvicorn was launched from. Miss it and GEMINI_API_KEY is empty, the
    # vision fallback silently returns nothing, and the app reports "no sign found".
    model_config = SettingsConfigDict(env_file=os.path.join(BACKEND_DIR, ".env"), extra="ignore")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )


settings = Settings()
