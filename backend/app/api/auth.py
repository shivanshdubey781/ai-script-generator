from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import hash_password, verify_password, create_access_token
from app.database.db import users_col
from app.models.user import make_user
from app.schemas.user import UserCreate, UserResponse, TokenResponse, doc_to_user
from app.services.otp_service import create_otp
from app.services.email_service import send_otp_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate):
    """
    Register a new user account.
    Returns a requires_verification flag — frontend must show OTP step.
    Access token is NOT returned here; user must verify email first.
    """
    if users_col().find_one({"email": payload.email, "is_email_verified": True}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    # If a previous unverified account exists for this email, delete it first
    users_col().delete_many({"email": payload.email, "is_email_verified": False})

    doc = make_user(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    result = users_col().insert_one(doc)
    doc["_id"] = result.inserted_id

    # Send OTP email
    otp_code = create_otp(payload.email, "registration")
    send_otp_email(payload.email, otp_code, "registration")

    return {
        "message": "Account created. Please verify your email.",
        "email": payload.email,
        "requires_verification": True,
        # No access_token yet — granted only after email is verified
    }


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate and return a JWT token."""
    user = users_col().find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Block login if email not verified
    if not user.get("is_email_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email first. Check your inbox for the OTP."
        )

    token = create_access_token({"sub": str(user["_id"])})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=doc_to_user(user),
    )
