"""
MongoDB document helpers.
Instead of SQLAlchemy models, we work with plain dicts + these helpers.
"""
from datetime import datetime, timezone
from bson import ObjectId


def _str_id(doc: dict) -> dict:
    """Convert MongoDB _id (ObjectId) to string 'id' in-place and return the doc."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ── User document shape ────────────────────────────────────────────────────────
def make_user(email: str, hashed_password: str, full_name: str) -> dict:
    return {
        "email": email,
        "hashed_password": hashed_password,
        "full_name": full_name,
        "role": "user",
        "is_active": True,
        "is_email_verified": False,
        "created_at": now_utc(),
        "generation_count": 0,
    }



# ── Script document shape ──────────────────────────────────────────────────────
def make_script(
    user_id: str, topic: str, niche: str, platform: str,
    tone: str, language: str, duration_sec: int, audience: str,
    output_json: str, token_count: int = 0,
) -> dict:
    return {
        "user_id": user_id,
        "topic": topic,
        "niche": niche,
        "platform": platform,
        "tone": tone,
        "language": language,
        "duration_sec": duration_sec,
        "audience": audience,
        "output_json": output_json,
        "is_favorite": False,
        "created_at": now_utc(),
        "token_count": token_count,
    }


# ── PromptTemplate document shape ─────────────────────────────────────────────
def make_template(niche: str, template_text: str, created_by: str, is_active: bool = True) -> dict:
    return {
        "niche": niche,
        "template_text": template_text,
        "created_by": created_by,
        "is_active": is_active,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
