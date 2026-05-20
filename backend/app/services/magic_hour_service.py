"""
AI Video generation service — text-to-video with voiceover.
"""
import os
import time
import requests
from typing import Optional
from app.core.config import settings

BASE_URL = "https://api.magichour.ai/v1"


def _headers() -> dict:
    key = settings.magic_hour_api_key
    if not key:
        raise RuntimeError("Video API key not configured. Please add it to .env")
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _aspect_to_orientation(aspect_ratio: str) -> str:
    """
    Map aspect ratio string to the API's orientation field.
    9:16  → portrait   (Reels / TikTok)
    16:9  → landscape  (YouTube)
    1:1   → square     (Posts)
    """
    mapping = {
        "9:16": "portrait",
        "16:9": "landscape",
        "1:1":  "square",
    }
    return mapping.get(aspect_ratio, "portrait")


def generate_text_to_video(
    prompt: str,
    duration_seconds: int = 5,
    aspect_ratio: str = "9:16",
    resolution: str = "480p",
) -> dict:
    """
    Submit a text-to-video job.
    Returns: {"job_id": "...", "status": "queued", "credits_used": N}

    Resolution tiers:
      360p — free tier (default)
      480p — free tier
      720p — paid tier only
    """
    payload = {
        "name": f"AI Video — {prompt[:40]}",
        "style": {"prompt": prompt},
        "end_seconds": duration_seconds,
        "resolution": resolution,
        "orientation": _aspect_to_orientation(aspect_ratio),
    }
    response = requests.post(
        f"{BASE_URL}/text-to-video",
        headers=_headers(),
        json=payload,
        timeout=30,
    )
    if not response.ok:
        try:
            detail = response.json()
        except Exception:
            detail = response.text

        # ── 402: Credit-insufficient — extract clean message ─────────────────
        if response.status_code == 402:
            msg = detail.get("message", str(detail)) if isinstance(detail, dict) else str(detail)
            raise RuntimeError(f"Insufficient credits: {msg}")

        raise RuntimeError(f"Video API error {response.status_code}: {detail}")

    data = response.json()
    return {
        "job_id": data.get("id"),
        "status": data.get("status", "queued"),
        "credits_used": data.get("credits_charged", 0),
    }


def poll_video_status(job_id: str, max_wait_seconds: int = 180) -> dict:
    """
    Poll until video is complete or failed.
    Returns: {"status": "complete", "video_url": "..."} or {"status": "failed", "error": "..."}
    """
    elapsed = 0
    poll_interval = 5

    while elapsed <= max_wait_seconds:
        response = requests.get(
            f"{BASE_URL}/video-projects/{job_id}",
            headers=_headers(),
            timeout=30,
        )
        if not response.ok:
            time.sleep(poll_interval)
            elapsed += poll_interval
            continue

        data = response.json()
        status = data.get("status", "queued")

        if status == "complete":
            outputs = data.get("downloads", [])
            video_url = outputs[0].get("url") if outputs else None
            return {"status": "complete", "video_url": video_url}

        elif status == "failed":
            return {"status": "failed", "error": data.get("error_message", "Video generation failed")}

        time.sleep(poll_interval)
        elapsed += poll_interval

    return {"status": "timeout", "error": "Video generation timed out — please try again"}


def get_video_url(job_id: str) -> Optional[str]:
    """Quick check — return URL if done, None if still processing."""
    result = poll_video_status(job_id, max_wait_seconds=0)
    return result.get("video_url")
