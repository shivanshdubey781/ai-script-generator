import requests
import time
import os
import uuid
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

JSON2VIDEO_API_KEY = os.environ.get("JSON2VIDEO_API_KEY")
if JSON2VIDEO_API_KEY:
    JSON2VIDEO_API_KEY = JSON2VIDEO_API_KEY.strip()
BASE_URL = "https://api.json2video.com/v2"
HEADERS = {
    "x-api-key": JSON2VIDEO_API_KEY,
    "Content-Type": "application/json"
}


def build_movie_payload(
    prompt: str,
    voiceover_text: str,
    aspect_ratio: str = "9:16",
    duration_seconds: int = 5,
    style: str = "cinematic"
) -> dict:
    """
    Build a JSON2Video movie payload from script/prompt inputs.

    Structure:
    - Scene 1 (1.5s): Animated hook text
    - Scene 2 (duration-3s): Main content — full prompt text with voiceover
    - Scene 3 (1.5s): CTA / outro text

    The voice element uses JSON2Video's built-in TTS —
    no need for gTTS or FFmpeg audio merging for this service.

    Aspect ratios:
      "9:16" → 1080x1920 (Reels / TikTok)
      "16:9" → 1920x1080 (YouTube)
      "1:1"  → 1080x1080 (Instagram square)
    """

    # Map aspect ratio to resolution
    resolution_map = {
        "9:16": "instagram-story",   # 1080x1920
        "16:9": "full-hd",           # 1920x1080
        "1:1":  "instagram-square",  # 1080x1080
    }
    resolution = resolution_map.get(aspect_ratio, "instagram-story")

    # Keep scenes readable — split voiceover into hook + body
    words = voiceover_text.strip().split()
    hook_word_count = min(10, len(words) // 3)
    hook_text = " ".join(words[:hook_word_count]) if hook_word_count > 0 else words[0]
    body_text = " ".join(words[hook_word_count:]) if hook_word_count < len(words) else voiceover_text
    
    # Main scene duration: at least 3 seconds
    main_duration = max(3, duration_seconds - 3)

    payload = {
        "comment": f"AI Script Generator — {prompt[:50]}",
        "resolution": resolution,
        "quality": "high",
        "scenes": [

            # ── Scene 1: Hook (1.5 seconds) ──────────────────────
            {
                "comment": "Hook scene",
                "background-color": "#0f0f1a",
                "duration": 1.5,
                "elements": [
                    {
                        "type": "text",
                        "style": "009",        # Bold animated style
                        "text": hook_text,
                        "duration": 1.5,
                        "start": 0,
                        "settings": {
                            "font-size": "60px",
                            "color": "#6366f1",
                            "text-align": "center",
                            "vertical-position": "center"
                        }
                    }
                ]
            },

            # ── Scene 2: Main content + voiceover ────────────────
            {
                "comment": "Main script scene with voiceover",
                "background-color": "#1a1a2e",
                "duration": main_duration,
                "elements": [
                    # Main body text
                    {
                        "type": "text",
                        "style": "001",
                        "text": body_text[:300],   # cap at 300 chars for readability
                        "width": "80%",
                        "duration": main_duration,
                        "start": 0,
                        "settings": {
                            "font-size": "40px",
                            "color": "#e2e2f0",
                            "text-align": "center",
                            "vertical-position": "center"
                        }
                    },
                    # Built-in TTS voiceover — reads the full voiceover_text aloud
                    {
                        "type": "voice",
                        "voice": "en-US-JennyNeural",   # Natural English female voice
                        "text": voiceover_text[:500],    # TTS text (max 500 chars per scene)
                        "duration": main_duration,
                        "start": 0,
                        "volume": 1.0
                    },
                    # Niche label badge (top left)
                    {
                        "type": "text",
                        "text": "AI Script Generator",
                        "x": 30,
                        "y": 30,
                        "duration": main_duration,
                        "start": 0,
                        "settings": {
                            "font-size": "24px",
                            "color": "#8888aa"
                        }
                    }
                ]
            },

            # ── Scene 3: CTA / Outro (1.5 seconds) ───────────────
            {
                "comment": "CTA outro",
                "background-color": "#6366f1",
                "duration": 1.5,
                "elements": [
                    {
                        "type": "text",
                        "style": "009",
                        "text": "Follow for more ↑",
                        "duration": 1.5,
                        "start": 0,
                        "settings": {
                            "font-size": "55px",
                            "color": "#ffffff",
                            "text-align": "center",
                            "vertical-position": "center"
                        }
                    }
                ]
            }
        ]
    }

    return payload


def generate_video(
    prompt: str,
    voiceover_text: str,
    aspect_ratio: str = "9:16",
    duration_seconds: int = 5
) -> dict:
    """
    Submit video generation job to JSON2Video.

    Returns: {"project_id": "...", "status": "queued"}
    """
    payload = build_movie_payload(
        prompt=prompt,
        voiceover_text=voiceover_text,
        aspect_ratio=aspect_ratio,
        duration_seconds=duration_seconds
    )

    try:
        response = requests.post(
            f"{BASE_URL}/movies",
            headers=HEADERS,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        return {
            "project_id": data.get("project"),
            "status": "queued",
            "success": data.get("success", False)
        }

    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"JSON2Video API error: {e.response.status_code} — {e.response.text}")
    except Exception as e:
        raise RuntimeError(f"JSON2Video request failed: {str(e)}")


def poll_video_status(project_id: str, max_wait_seconds: int = 300) -> dict:
    """
    Poll JSON2Video until the video is rendered or failed.

    Statuses: queued → rendering → done | failed

    Returns:
      {"status": "complete", "video_url": "https://..."}
      {"status": "failed",   "error": "..."}
      {"status": "timeout",  "error": "..."}
    """
    elapsed = 0
    poll_interval = 5   # seconds between polls

    while elapsed < max_wait_seconds:
        try:
            response = requests.get(
                f"{BASE_URL}/movies?project={project_id}",
                headers=HEADERS,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            movie = data.get("movie", {})
            status = movie.get("status", "queued")

            if status == "done":
                video_url = movie.get("url")
                if not video_url:
                    return {"status": "failed", "error": "Video done but no URL returned"}
                return {"status": "complete", "video_url": video_url}

            elif status == "failed":
                error_msg = movie.get("error_message", "Unknown render error")
                return {"status": "failed", "error": error_msg}

            # Still rendering — wait and try again
            time.sleep(poll_interval)
            elapsed += poll_interval

        except Exception as e:
            # Don't fail on a single poll error — retry
            time.sleep(poll_interval)
            elapsed += poll_interval

    return {
        "status": "timeout",
        "error": f"Video generation timed out after {max_wait_seconds} seconds"
    }


def get_available_voices() -> list:
    """
    Available English TTS voices in JSON2Video.
    Use these values in the 'voice' field of voice elements.
    """
    return [
        {"id": "en-US-JennyNeural",    "label": "Jenny (US Female, Natural)"},    # default
        {"id": "en-US-GuyNeural",      "label": "Guy (US Male, Confident)"},
        {"id": "en-GB-SoniaNeural",    "label": "Sonia (UK Female, Professional)"},
        {"id": "en-IN-NeerjaNeural",   "label": "Neerja (India Female)"},         # great for Indian content
        {"id": "en-IN-PrabhatNeural",  "label": "Prabhat (India Male)"},          # great for Indian content
    ]
