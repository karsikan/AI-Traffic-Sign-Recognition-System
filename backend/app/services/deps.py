"""
Request dependencies for authentication.

``get_current_user`` is the gate on everything personal — fines, documents, incidents,
demerit records, reports. ``get_optional_user`` is for endpoints that are public to read
but want to know who is asking, such as posting a hazard report.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

# auto_error=False so the optional variant can fall through without a 401
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Sign in to use this.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """The signed-in driver, or 401. Every personal endpoint depends on this."""
    if not token:
        raise CREDENTIALS_ERROR

    subject = decode_token(token)
    if subject is None:
        raise CREDENTIALS_ERROR

    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise CREDENTIALS_ERROR

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise CREDENTIALS_ERROR
    return user


def get_optional_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Who is asking, if anyone. Never raises — used where reading is public."""
    if not token:
        return None
    subject = decode_token(token)
    if subject is None:
        return None
    try:
        user = db.query(User).filter(User.id == int(subject)).first()
    except (TypeError, ValueError):
        return None
    return user if user and user.is_active else None
