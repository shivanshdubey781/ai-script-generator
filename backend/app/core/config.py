from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Absolute path to .env — works no matter which directory uvicorn is launched from
ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    groq_api_key: str = ""
    jwt_secret: str = "change_this_secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "ai_script_generator"
    magic_hour_api_key: str = ""
    environment: str = "development"
    gmail_user: str = ""
    gmail_app_password: str = ""
    otp_expire_minutes: int = 10

    model_config = {"env_file": str(ENV_FILE), "env_file_encoding": "utf-8", "extra": "ignore"}



@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Clear cache so changes to .env are picked up on server restart
get_settings.cache_clear()
settings = get_settings()
