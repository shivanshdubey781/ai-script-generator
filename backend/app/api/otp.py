"""
OTP API router — /api/otp/send, /api/otp/verify, /api/otp/resend
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.database.db import users_col
from app.services.otp_service import create_otp, verify_otp
from app.services.email_service import send_otp_email

router = APIRouter(prefix="/otp", tags=["otp"])


class SendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "registration"   # "registration" | "password_reset"


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: str = "registration"


@router.post("/send")
async def send_otp(request: SendOTPRequest):
    """
    Send OTP to email.
    For registration: allowed even if user exists but is not verified.
    For password_reset: user must exist (but we don't reveal if they don't).
    """
    user = users_col().find_one({"email": request.email})

    if request.purpose == "registration":
        if user and user.get("is_email_verified"):
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists. Please login."
            )

    elif request.purpose == "password_reset":
        if not user:
            # Security: don't reveal whether email exists
            return {"message": "If this email is registered, you will receive an OTP shortly."}

    # Generate and send OTP
    code = create_otp(request.email, request.purpose)
    sent = send_otp_email(request.email, code, request.purpose)

    if not sent:
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP email. Please try again."
        )

    return {
        "message": f"OTP sent to {request.email}. Valid for 10 minutes.",
        "email": request.email
    }


@router.post("/verify")
async def verify_otp_endpoint(request: VerifyOTPRequest):
    """
    Verify OTP code.
    For registration: marks user's email as verified.
    For password_reset: returns reset_confirmed flag.
    """
    result = verify_otp(request.email, request.code, request.purpose)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["reason"])

    if request.purpose == "registration":
        # Mark user email as verified in MongoDB
        users_col().update_one(
            {"email": request.email},
            {"$set": {"is_email_verified": True}}
        )
        return {
            "success": True,
            "message": "Email verified successfully! You can now login."
        }

    elif request.purpose == "password_reset":
        return {
            "success": True,
            "message": "OTP verified. You may now reset your password.",
            "reset_confirmed": True
        }


@router.post("/resend")
async def resend_otp(request: SendOTPRequest):
    """Resend OTP — same as /send but explicit endpoint for UI clarity."""
    return await send_otp(request)
