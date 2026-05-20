"""
Video assembly service using FFmpeg.
Downloads raw video, merges with voiceover audio, removes watermarks, outputs final MP4.
FFmpeg must be installed and in PATH.
"""
import os
import uuid
import logging
import tempfile
import subprocess
import requests

logger = logging.getLogger(__name__)

OUTPUT_DIR = os.path.join(tempfile.gettempdir(), "ai-script-videos")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def ffmpeg_available() -> bool:
    """Check if FFmpeg is installed and accessible."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"], capture_output=True, timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _run(cmd: list[str], timeout: int = 180) -> subprocess.CompletedProcess:
    """Run an FFmpeg command and log stderr on failure."""
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        logger.error("FFmpeg command failed:\n%s\nSTDERR:\n%s", " ".join(cmd), result.stderr[-1000:])
    return result


def _probe_dimensions(video_path: str) -> tuple[int, int]:
    """Return (width, height) of a video file using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=p=0",
                video_path,
            ],
            capture_output=True, text=True, timeout=10,
        )
        parts = result.stdout.strip().split(",")
        if len(parts) == 2:
            return int(parts[0]), int(parts[1])
    except Exception:
        pass
    return 0, 0


def download_video(video_url: str) -> str:
    """Download video from CDN URL to a local temp file."""
    file_id = str(uuid.uuid4())
    video_path = os.path.join(OUTPUT_DIR, f"{file_id}_raw.mp4")
    response = requests.get(video_url, timeout=120, stream=True)
    response.raise_for_status()
    with open(video_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    logger.info("Downloaded raw video to %s", video_path)
    return video_path


def _convert_audio_to_wav(mp3_path: str) -> str:
    """
    Convert MP3 → WAV (PCM 44100 Hz stereo).
    FFmpeg handles WAV far more reliably than MP3 in filter_complex.
    """
    wav_path = mp3_path.replace(".mp3", ".wav")
    cmd = [
        "ffmpeg", "-y",
        "-i", mp3_path,
        "-ar", "44100",
        "-ac", "2",
        "-f", "wav",
        wav_path,
    ]
    result = _run(cmd, timeout=60)
    if result.returncode != 0 or not os.path.exists(wav_path):
        logger.warning("MP3→WAV conversion failed, using MP3 directly")
        return mp3_path   # fallback: use MP3 directly
    return wav_path


def merge_video_and_audio(video_path: str, audio_path: str) -> str:
    """
    Single-pass FFmpeg pipeline:
      1. Watermark removal  — drawbox covers bottom 8% (where logo sits)
      2. Audio merge        — voiceover replaces/adds audio track
      3. Audio normalise    — loudnorm to -14 LUFS
      4. Web-optimised MP4  — H.264 + AAC, faststart

    The MP3 from gTTS is first converted to WAV to avoid filter_complex
    compatibility issues that cause silent audio or filter parse errors.
    """
    output_id = str(uuid.uuid4())
    output_path = os.path.join(OUTPUT_DIR, f"{output_id}_final.mp4")

    # ── Convert MP3 → WAV for reliable filter_complex handling ───────────────
    wav_path = None
    if audio_path.endswith(".mp3"):
        wav_path = _convert_audio_to_wav(audio_path)
        effective_audio = wav_path
    else:
        effective_audio = audio_path

    # ── Probe video dimensions for precise watermark overlay ─────────────────
    width, height = _probe_dimensions(video_path)
    if width == 0 or height == 0:
        width, height = 1080, 1920   # portrait default (Reels)

    # Cover bottom 9% — Magic Hour watermark sits in bottom ~7%
    overlay_h = max(70, int(height * 0.09))

    # ── Build FFmpeg filter_complex ───────────────────────────────────────────
    # [0:v] → drawbox (watermark removal) → [vout]
    # [1:a] → loudnorm (audio normalisation) → [aout]
    filter_complex = (
        f"[0:v]drawbox=x=0:y=ih-{overlay_h}:w=iw:h={overlay_h}"
        f":color=black@0.9:t=fill[vout];"
        f"[1:a]loudnorm=I=-14:LRA=11:TP=-1.5[aout]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", effective_audio,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-map", "[aout]",
        "-shortest",                  # cut to shorter of video/audio
        "-c:v", "libx264",
        "-crf", "22",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",        # max browser compatibility
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-movflags", "+faststart",
        output_path,
    ]

    result = _run(cmd, timeout=180)

    # ── Cleanup intermediate WAV ─────────────────────────────────────────────
    if wav_path and wav_path != audio_path and os.path.exists(wav_path):
        try:
            os.remove(wav_path)
        except OSError:
            pass

    if result.returncode != 0:
        raise RuntimeError(
            f"Video assembly failed. FFmpeg error:\n{result.stderr[-800:]}"
        )

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("Output file is empty — FFmpeg produced no output")

    logger.info("Assembly complete: %s (%d bytes)", output_path, os.path.getsize(output_path))
    return output_path


def remove_watermark(video_path: str) -> str:
    """
    Watermark-only removal (no audio merge).
    Used as fallback when audio merge fails.
    """
    output_id = str(uuid.uuid4())
    output_path = os.path.join(OUTPUT_DIR, f"{output_id}_clean.mp4")

    width, height = _probe_dimensions(video_path)
    if width == 0 or height == 0:
        width, height = 1080, 1920

    overlay_h = max(70, int(height * 0.09))

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"drawbox=x=0:y=ih-{overlay_h}:w=iw:h={overlay_h}:color=black@0.9:t=fill",
        "-c:v", "libx264",
        "-crf", "20",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        output_path,
    ]
    result = _run(cmd, timeout=120)
    if result.returncode != 0 or not os.path.exists(output_path):
        logger.warning("Watermark removal failed, returning original")
        return video_path
    return output_path


def cleanup_temp_files(*paths: str) -> None:
    """Delete temporary video/audio files after serving."""
    for path in paths:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
