"""
Video generation API — MongoDB-adapted version.
Routes:
  POST /api/video/generate    → submit job, returns job_id immediately
  GET  /api/video/status/{id} → poll until done
  GET  /api/video/download/{id} → download final MP4
  GET  /api/video/history     → last 20 jobs for current user
"""
import os
import logging
import threading
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.database.db import get_collection
from app.models.video_job import make_video_job, now_utc
from app.services import magic_hour_service, tts_service, video_assembly

router = APIRouter(prefix="/video", tags=["video"])


def video_jobs_col():
    return get_collection("video_jobs")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class VideoGenerateRequest(BaseModel):
    prompt: str
    voiceover_text: str
    aspect_ratio: str = "9:16"       # "9:16" | "16:9" | "1:1"
    duration_seconds: int = 5         # 5 or 8
    resolution: str = "480p"          # "480p" | "720p" (tier-dependent)
    script_id: Optional[str] = None


class VideoJobResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    video_url: Optional[str] = None
    error: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _job_to_response(doc: dict, base_url: str = "/api") -> VideoJobResponse:
    job_id = str(doc.get("_id", doc.get("id", "")))
    status = doc.get("status", "pending")
    return VideoJobResponse(
        job_id=job_id,
        status=status,
        progress=doc.get("progress", 0),
        video_url=f"{base_url}/video/download/{job_id}" if status == "done" else None,
        error=doc.get("error_message"),
    )


def _update_job(job_id: str, **kwargs):
    """Update video job fields in MongoDB."""
    kwargs["updated_at"] = now_utc()
    video_jobs_col().update_one(
        {"_id": ObjectId(job_id)},
        {"$set": kwargs},
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=VideoJobResponse)
def generate_video(
    request: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Submit a video generation job. Returns job_id immediately — poll /status/{id}."""
    if len(request.prompt.strip()) < 10:
        raise HTTPException(status_code=400, detail="Prompt must be at least 10 characters")
    if len(request.voiceover_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Voiceover text must be at least 10 characters")

    doc = make_video_job(
        user_id=str(current_user["_id"]),
        prompt=request.prompt,
        voiceover_text=request.voiceover_text,
        aspect_ratio=request.aspect_ratio,
        duration_seconds=request.duration_seconds,
        resolution=request.resolution,
        script_id=request.script_id,
    )
    doc["progress"] = 5
    result = video_jobs_col().insert_one(doc)
    job_id = str(result.inserted_id)

    # Run the pipeline in a background thread
    background_tasks.add_task(_run_pipeline, job_id, doc)

    return VideoJobResponse(job_id=job_id, status="pending", progress=5)


@router.get("/status/{job_id}", response_model=VideoJobResponse)
def get_video_status(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Poll this every 5 seconds until status == 'done' or 'failed'."""
    try:
        oid = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job id")

    doc = video_jobs_col().find_one({"_id": oid, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")

    return _job_to_response(doc)


@router.get("/download/{job_id}")
def download_video(job_id: str):
    """
    Stream the final video to the browser — NO auth required.
    The browser's native <video> tag and <a download> cannot send
    JWT Authorization headers, so we use job_id (24-char ObjectId)
    as a sufficient access control token.
    """
    try:
        oid = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job id")

    doc = video_jobs_col().find_one({"_id": oid, "status": "done"})
    if not doc:
        raise HTTPException(status_code=404, detail="Video not ready or not found")

    final_path = doc.get("final_video_path") or doc.get("video_url")
    if not final_path:
        raise HTTPException(status_code=404, detail="Video file not found")

    # ── Case 1: Local assembled file (FFmpeg was available) ──────────────────
    if final_path and os.path.exists(str(final_path)):
        return FileResponse(
            path=final_path,
            media_type="video/mp4",
            filename=f"ai-video-{job_id}.mp4",
            headers={"Accept-Ranges": "bytes"},
        )

    # ── Case 2: CDN URL — proxy bytes server-side so browser can play it ─────
    if final_path and str(final_path).startswith("http"):
        import requests as req_lib
        from fastapi.responses import StreamingResponse

        try:
            cdn_resp = req_lib.get(str(final_path), stream=True, timeout=60)
            cdn_resp.raise_for_status()

            content_length = cdn_resp.headers.get("Content-Length")

            def stream_generator():
                for chunk in cdn_resp.iter_content(chunk_size=65536):
                    if chunk:
                        yield chunk

            headers = {
                "Content-Disposition": f'inline; filename="ai-video-{job_id}.mp4"',
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache",
            }
            if content_length:
                headers["Content-Length"] = content_length

            return StreamingResponse(
                stream_generator(),
                media_type="video/mp4",
                headers=headers,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Could not stream video: {e}")

    raise HTTPException(status_code=404, detail="Video file not found")



@router.get("/history")
def get_video_history(current_user: dict = Depends(get_current_user)):
    """Last 20 video jobs for the current user."""
    docs = list(
        video_jobs_col()
        .find({"user_id": str(current_user["_id"])})
        .sort("created_at", -1)
        .limit(20)
    )
    return [
        {
            "job_id": str(d["_id"]),
            "status": d.get("status", "pending"),
            "progress": d.get("progress", 0),
            "prompt": (d.get("prompt", "")[:80] + "...") if len(d.get("prompt", "")) > 80 else d.get("prompt", ""),
            "aspect_ratio": d.get("aspect_ratio", "9:16"),
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            "video_url": f"/api/video/download/{d['_id']}" if d.get("status") == "done" else None,
        }
        for d in docs
    ]


# ── Background pipeline ───────────────────────────────────────────────────────

def _run_pipeline(job_id: str, job: dict):
    """
    Full video generation pipeline (runs in FastAPI BackgroundTask):
    1. Submit to Magic Hour → get provider_job_id
    2. Poll Magic Hour until video URL is ready (~60s)
    3. Download raw video from Magic Hour
    4. Generate English voiceover with gTTS
    5. Merge video + audio with FFmpeg (or skip if FFmpeg not available)
    6. Mark job done
    """
    raw_video_path = None
    audio_path = None

    try:
        # ── Step 1: Submit to Magic Hour ─────────────────────────
        _update_job(job_id, status="generating_video", progress=10)
        try:
            result = magic_hour_service.generate_text_to_video(
                prompt=job["prompt"],
                duration_seconds=job.get("duration_seconds", 5),
                aspect_ratio=job.get("aspect_ratio", "9:16"),
                resolution=job.get("resolution", "480p"),
            )
            provider_job_id = result["job_id"]
            _update_job(job_id, provider_job_id=provider_job_id, progress=20)
        except Exception as e:
            _update_job(job_id, status="failed", error_message=str(e))
            return

        # ── Step 2: Poll until video ready ───────────────────────
        _update_job(job_id, progress=30)
        try:
            poll = magic_hour_service.poll_video_status(provider_job_id, max_wait_seconds=180)
            if poll["status"] != "complete":
                _update_job(job_id, status="failed", error_message=poll.get("error", "Video generation failed"))
                return
            video_url = poll["video_url"]
            _update_job(job_id, video_url=video_url, progress=50)
        except Exception as e:
            _update_job(job_id, status="failed", error_message=f"Polling failed: {e}")
            return

        # ── Step 3: Download video ────────────────────────────────
        _update_job(job_id, status="adding_voice", progress=55)
        try:
            raw_video_path = video_assembly.download_video(video_url)
            _update_job(job_id, progress=65)
        except Exception as e:
            _update_job(job_id, status="failed", error_message=f"Download failed: {e}")
            return

        # ── Step 4: Generate voiceover ────────────────────────────
        _update_job(job_id, progress=70)
        try:
            audio_path = tts_service.generate_voiceover(
                text=job["voiceover_text"], language="en"
            )
            _update_job(job_id, audio_path=audio_path, progress=80)
        except Exception as e:
            _update_job(job_id, status="failed", error_message=f"Voiceover failed: {e}")
            return

        # ── Step 5: Merge + watermark removal with FFmpeg ─────────
        _update_job(job_id, status="assembling", progress=85)
        if video_assembly.ffmpeg_available():
            try:
                # merge_video_and_audio: watermark removal + audio merge in one pass
                final_path = video_assembly.merge_video_and_audio(raw_video_path, audio_path)
                video_assembly.cleanup_temp_files(raw_video_path, audio_path)
                _update_job(job_id, final_video_path=final_path, progress=100, status="done")
                logger.info("Job %s completed successfully: %s", job_id, final_path)
            except Exception as e:
                logger.error("Job %s merge failed: %s", job_id, e)
                # Full merge failed — try watermark-only removal as fallback
                try:
                    clean_path = video_assembly.remove_watermark(raw_video_path)
                    video_assembly.cleanup_temp_files(audio_path)
                    _update_job(
                        job_id,
                        final_video_path=clean_path,
                        progress=100,
                        status="done",
                        error_message="Voiceover skipped (merge error)",
                    )
                except Exception as e2:
                    logger.error("Job %s watermark removal also failed: %s", job_id, e2)
                    # Last resort — serve raw video
                    _update_job(
                        job_id,
                        final_video_path=raw_video_path,
                        progress=100,
                        status="done",
                        error_message="Processing skipped",
                    )
        else:
            # FFmpeg not installed — stream CDN URL via proxy (watermark visible)
            _update_job(
                job_id,
                final_video_path=video_url,
                progress=100,
                status="done",
                error_message="FFmpeg not installed — install FFmpeg to enable watermark removal",
            )

    except Exception as e:
        _update_job(job_id, status="failed", error_message=f"Pipeline error: {e}")
