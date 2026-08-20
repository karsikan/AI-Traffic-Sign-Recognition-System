"""
Accounts.

An account exists for one reason: so that a driver's fines, documents and incidents are
theirs and nobody else's. Registration asks for a name, an email and a password — nothing
more. NIC, licence and vehicle numbers live on the records the driver chooses to save,
and go when the account goes.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    PasswordChange,
    RegisterRequest,
    UserOut,
    UserUpdate,
)
from app.services.deps import get_current_user
from app.utils.response import error_response, success_response

router = APIRouter(prefix="/auth", tags=["Accounts"])


def _auth_payload(user: User) -> dict:
    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    ).model_dump(mode="json")


@router.post("/register")
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()

    if db.query(User).filter(User.email == email).first():
        return error_response(
            "An account already exists for that email. Sign in instead.",
            "EMAIL_TAKEN", 409,
        )

    try:
        user = User(
            full_name=payload.full_name.strip(),
            email=email,
            hashed_password=hash_password(payload.password),
            preferred_language=payload.preferred_language,
            last_login_at=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return success_response("Account created", _auth_payload(user), status_code=201)
    except Exception as e:
        db.rollback()
        return error_response(str(e), "REGISTER_ERROR", 500)


@router.post("/login")
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()

    # Same message whether the email is unknown or the password is wrong — telling them
    # apart lets someone enumerate who has an account.
    if not user or not verify_password(payload.password, user.hashed_password):
        return error_response("Email or password is incorrect.", "BAD_CREDENTIALS", 401)
    if not user.is_active:
        return error_response("This account has been deactivated.", "ACCOUNT_DISABLED", 403)

    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return success_response("Signed in", _auth_payload(user))


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return success_response("Current user", UserOut.model_validate(user).model_dump(mode="json"))


@router.patch("/me")
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return error_response("Nothing to update.", "EMPTY_UPDATE", 400)
    try:
        for key, value in changes.items():
            setattr(user, key, value)
        db.commit()
        db.refresh(user)
        return success_response("Profile updated", UserOut.model_validate(user).model_dump(mode="json"))
    except Exception as e:
        db.rollback()
        return error_response(str(e), "UPDATE_ERROR", 500)


@router.post("/change-password")
async def change_password(
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        return error_response("Current password is incorrect.", "BAD_CREDENTIALS", 401)
    try:
        user.hashed_password = hash_password(payload.new_password)
        db.commit()
        return success_response("Password changed", {"id": user.id})
    except Exception as e:
        db.rollback()
        return error_response(str(e), "PASSWORD_ERROR", 500)


@router.delete("/me")
async def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Close the account and remove everything on it.

    Required by the Personal Data Protection Act — a person can withdraw and have their
    data erased. The foreign keys cascade, so fines, documents, demerit records and
    incidents go with the account.
    """
    try:
        db.delete(user)
        db.commit()
        return success_response("Account and all its records deleted", {"id": user.id})
    except Exception as e:
        db.rollback()
        return error_response(str(e), "DELETE_ERROR", 500)


@router.post("/logout")
async def logout():
    """
    Tokens are stateless and simply expire, so there is nothing to revoke server-side.
    The client drops the token; this endpoint exists so the app has something to call.
    """
    return success_response("Signed out", {})
