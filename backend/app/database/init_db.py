"""
Initialize MongoDB collections and indexes.
Called once on application startup.
"""
from pymongo import ASCENDING, DESCENDING
from app.database.db import users_col, scripts_col, templates_col


def init_db():
    """Create indexes for all collections."""

    # ── users ──────────────────────────────────────────────────────────
    users_col().create_index([("email", ASCENDING)], unique=True, name="email_unique")

    # ── scripts ────────────────────────────────────────────────────────
    scripts_col().create_index([("user_id", ASCENDING)], name="scripts_user_id")
    scripts_col().create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="scripts_user_date")
    scripts_col().create_index([("user_id", ASCENDING), ("is_favorite", ASCENDING)], name="scripts_user_favorite")
    scripts_col().create_index([("niche", ASCENDING)], name="scripts_niche")

    # ── prompt_templates ───────────────────────────────────────────────
    templates_col().create_index([("niche", ASCENDING)], name="templates_niche")
    templates_col().create_index([("is_active", ASCENDING)], name="templates_active")

    print("MongoDB: indexes ensured on ai_script_generator database.")
