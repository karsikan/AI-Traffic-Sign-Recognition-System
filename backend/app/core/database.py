import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError

from app.core.config import BACKEND_DIR, settings

# Pinned to backend/ rather than the working directory. Started from the project root,
# a relative path would create a second, empty smart_traffic.db there — and the imported
# places would appear to have vanished.
SQLITE_PATH = os.path.join(BACKEND_DIR, "smart_traffic.db")

# Attempt to connect to MySQL first; fallback to local SQLite if it fails
try:
    if settings.DB_HOST == "sqlite":
        raise OperationalError("SQLite requested in config", None, None)
    
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False,
    )
    # Test connection to make sure server is up and database exists
    with engine.connect() as conn:
        pass
    print("Database: Connected to MySQL successfully.")
except Exception as e:
    print(f"Database warning: MySQL connection failed ({e}). Falling back to local SQLite.")
    sqlite_url = f"sqlite:///{SQLITE_PATH}"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        echo=False,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
