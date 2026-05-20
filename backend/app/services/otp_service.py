"""
OTP service — MongoDB-backed (no SQLAlchemy).
Generates, stores, and verifies 6-digit OTPs.
"""
import random
import string
import os
from datetime import datetime, timedelta, timezone

from app.database.db import get_collection

OTP_EXPIRE_MINUTES = int(os.environ.get("OTP_EXPIRE_MINUTES", 10))
MAX_ATTEMPTS = 5


def _otp_col():
    """Return the otp_verifications MongoDB collection."""
    return get_collection("otp_verifications")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def generate_otp() -> str:
    """Generate a secure 6-digit numeric OTP."""
    return ''.join(random.choices(string.digits, k=6))


def create_otp(email: str, purpose: str = "registration") -> str:
    """
    Generate OTP, save to MongoDB, return the code.
    Invalidates any previous unused OTPs for this email+purpose.
    """
    col = _otp_col()

    # Invalidate old OTPs for this email + purpose
    col.update_many(
        {"email": email, "purpose": purpose, "is_used": False},
        {"$set": {"is_used": True}}
    )

    # Generate new OTP
    code = generate_otp()
    expires_at = _now() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    col.insert_one({
        "email": email,
        "otp_code": code,
        "purpose": purpose,
        "is_used": False,
        "attempts": 0,
        "expires_at": expires_at,
        "created_at": _now(),
    })

    return code


def verify_otp(email: str, code: str, purpose: str = "registration") -> dict:
    """
    Verify OTP code.
    Returns {"success": True} or {"success": False, "reason": "..."}
    """
    col = _otp_col()

    otp = col.find_one(
        {"email": email, "purpose": purpose, "is_used": False},
        sort=[("created_at", -1)]
    )

    if not otp:
        return {"success": False, "reason": "No OTP found. Please request a new one."}

    # Check attempts
    if otp.get("attempts", 0) >= MAX_ATTEMPTS:
        return {"success": False, "reason": "Too many attempts. Please request a new OTP."}

    # Increment attempts
    col.update_one({"_id": otp["_id"]}, {"$inc": {"attempts": 1}})

    # Check expiry — handle both offset-aware and naive datetimes
    expires_at = otp["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if _now() > expires_at:
        return {"success": False, "reason": "OTP has expired. Please request a new one."}

    # Check code
    if otp["otp_code"] != code.strip():
        remaining = MAX_ATTEMPTS - otp.get("attempts", 0) - 1
        return {
            "success": False,
            "reason": f"Invalid OTP. {remaining} attempt(s) remaining."
        }

    # Mark as used
    col.update_one({"_id": otp["_id"]}, {"$set": {"is_used": True}})

    return {"success": True}
