"""
MongoDB client and database singleton.
Collections:
  - users
  - scripts
  - prompt_templates
"""
from pymongo import MongoClient, ASCENDING, DESCENDING
from app.core.config import settings

# Global client instance
_client: MongoClient = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_uri)
    return _client


def get_database():
    """Return the ai_script_generator database handle."""
    return get_client()[settings.mongodb_db]


def get_collection(name: str):
    """Return a specific collection by name."""
    return get_database()[name]


# Convenience accessors
def users_col():
    return get_collection("users")


def scripts_col():
    return get_collection("scripts")


def templates_col():
    return get_collection("prompt_templates")


def otp_col():
    return get_collection("otp_verifications")

