"""
MongoDB document helpers for VideoJob.
Collection: video_jobs
"""
from datetime import datetime, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def make_video_job(
    user_id: str,
    prompt: str,
    voiceover_text: str,
    aspect_ratio: str = "9:16",
    duration_seconds: int = 5,
    resolution: str = "480p",
    script_id: str = None,
) -> dict:
    """Create a new video job document ready to insert into MongoDB."""
    return {
        "user_id": user_id,
        "script_id": script_id,
        "prompt": prompt,
        "voiceover_text": voiceover_text,
        "aspect_ratio": aspect_ratio,
        "duration_seconds": duration_seconds,
        "resolution": resolution,
        "status": "pending",
        "progress": 0,
        "error_message": None,
        "video_url": None,
        "audio_path": None,
        "final_video_path": None,
        "provider": "video_engine",
        "provider_job_id": None,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
