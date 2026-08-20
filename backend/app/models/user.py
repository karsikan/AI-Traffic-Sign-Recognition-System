from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.core.database import Base


class User(Base):
    """
    A registered driver.

    Deliberately minimal: an account exists so that one person's fines, documents and
    incidents stay theirs. Nothing beyond what is needed to sign in and address them is
    stored here — no NIC, no licence number, no vehicle. Those live on the records the
    driver chooses to save, and are deleted with the account.

    A separate legacy ``models.py`` in this package declares its own User with
    relationships to an older schema. It is not imported anywhere and must not be —
    registering both would map two classes onto the same tables.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    preferred_language = Column(String(10), default="en", nullable=False)  # en | ta | si

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
