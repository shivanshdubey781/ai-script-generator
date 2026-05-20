import os
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

NICHE_FILE_MAP = {
    "insurance": "insurance.txt",
    "astrology": "astrology.txt",
    "trading": "trading.txt",
    "real estate": "realestate.txt",
    "realestate": "realestate.txt",
    "fitness": "fitness.txt",
    "general": "general.txt",
}


def load_niche_template(niche: str) -> str:
    """Load niche-specific prompt template from file."""
    filename = NICHE_FILE_MAP.get(niche.lower().strip(), "general.txt")
    filepath = PROMPTS_DIR / filename
    if filepath.exists():
        return filepath.read_text(encoding="utf-8")
    return ""


def build_prompt(
    topic: str,
    niche: str,
    platform: str,
    tone: str,
    language: str,
    duration_sec: int,
    audience: str,
) -> str:
    """
    Combine the niche template with the user's specific request parameters
    to build the final prompt string sent to the AI.
    """
    niche_context = load_niche_template(niche)

    platform_guidance = {
        "instagram": "max 150 words for 30s, 300 words for 60s, punchy and visual, use trending audio cues",
        "facebook": "slightly longer, emotional, community-focused, longer captions work better",
        "youtube": "longer with clear chapters, SEO-friendly language, detailed descriptions",
    }.get(platform.lower(), "engaging and platform-appropriate")

    prompt = f"""NICHE CONTEXT:
{niche_context}

SCRIPT REQUEST:
- Topic: {topic}
- Platform: {platform} (optimize for {platform} algorithm — {platform_guidance})
- Tone: {tone}
- Language: {language} (write the entire script in this language)
- Duration: {duration_sec} seconds
- Target Audience: {audience}

Generate 3 script variations. Use these 3 hook styles:
1. CURIOSITY hook — make viewer feel they're missing something crucial
2. SHOCK/STAT hook — open with a surprising fact or number
3. STORY hook — start with a relatable personal story

For Hindi/Hinglish: Write naturally as a real Indian creator would speak.
For English: Keep it conversational and engaging.

Platform optimization:
- Instagram: max 150 words for 30s, 300 words for 60s, punchy and visual
- Facebook: slightly longer, emotional, community-focused
- YouTube: longer with clear chapters, SEO-friendly language

Each variation must have: hook, full script body, CTA, caption, hashtags (8-12 relevant tags),
shot suggestions (3-5 specific shots), and voiceover style description."""

    return prompt
