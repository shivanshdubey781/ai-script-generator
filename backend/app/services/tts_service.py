"""
TTS (Text-to-Speech) service using gTTS.
Completely free — no API key needed.
Generates English/Hindi voiceover MP3 files.
"""
import os
import uuid
import tempfile
from gtts import gTTS

# Use system temp dir (works on both Windows and Linux)
AUDIO_DIR = os.path.join(tempfile.gettempdir(), "ai-script-audio")
os.makedirs(AUDIO_DIR, exist_ok=True)


def generate_voiceover(text: str, language: str = "en") -> str:
    """
    Generate a voiceover MP3 from text using gTTS.

    Args:
        text:     The script/narration text to speak.
        language: Language code — "en" (English) or "hi" (Hindi).

    Returns:
        Absolute path to the generated MP3 file.
    """
    file_id = str(uuid.uuid4())
    output_path = os.path.join(AUDIO_DIR, f"{file_id}.mp3")
    tts = gTTS(text=text, lang=language, slow=False)
    tts.save(output_path)
    return output_path


def cleanup_audio(audio_path: str) -> None:
    """Delete a temporary audio file after video assembly."""
    if audio_path and os.path.exists(audio_path):
        try:
            os.remove(audio_path)
        except OSError:
            pass
