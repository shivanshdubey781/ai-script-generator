# pyrefly: ignore [missing-import]
from openai import OpenAI
import os
import json
import time
from app.core.config import get_settings

SYSTEM_PROMPT = """[ignoring loop detection]
You are an expert viral social media script writer specializing in Indian markets.
You understand what makes content go viral on Instagram Reels, Facebook Reels, and YouTube Shorts.
You are fluent in English, Hindi, and Hinglish.
You know the psychology of hooks, storytelling, and calls-to-action.
You specialize in niches: insurance, astrology, trading, real estate, fitness, and education.

CRITICAL: Always respond with valid JSON only. No markdown. No explanation outside JSON.
Each of the 3 variations MUST have completely different and unique content — do NOT repeat sentences or phrases across variations.

Return exactly this JSON structure with 3 script variations:
{
  "variations": [
    {
      "variation_number": 1,
      "hook_style": "curiosity",
      "hook": "...",
      "script": "...",
      "cta": "...",
      "caption": "...",
      "hashtags": ["#tag1", "#tag2"],
      "shot_suggestions": ["Shot 1: ...", "Shot 2: ..."],
      "voiceover_style": "..."
    },
    {
      "variation_number": 2,
      "hook_style": "shock",
      "hook": "...",
      "script": "...",
      "cta": "...",
      "caption": "...",
      "hashtags": ["#tag1", "#tag2"],
      "shot_suggestions": ["Shot 1: ...", "Shot 2: ..."],
      "voiceover_style": "..."
    },
    {
      "variation_number": 3,
      "hook_style": "story",
      "hook": "...",
      "script": "...",
      "cta": "...",
      "caption": "...",
      "hashtags": ["#tag1", "#tag2"],
      "shot_suggestions": ["Shot 1: ...", "Shot 2: ..."],
      "voiceover_style": "..."
    }
  ]
}"""


def get_groq_client() -> OpenAI:
    """Return a configured Groq client using the OpenAI SDK."""
    api_key = get_settings().groq_api_key
    return OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1",
    )


def generate_scripts(prompt: str, retries: int = 3) -> dict:
    """Call Groq API with retry + exponential backoff + model fallback. Return parsed JSON."""
    client = get_groq_client()
    # Fallback models in priority order (all active as of May 2026)
    models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b"]
    last_exc = None

    for attempt in range(retries):
        model = models[min(attempt, len(models) - 1)]
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.75,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            parsed = json.loads(content)
            # Attach token usage info
            parsed["_usage"] = {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            }
            return parsed
        except Exception as e:
            last_exc = e
            err_str = str(e).lower()
            # If loop detection error, switch model immediately (no sleep)
            if "looping" in err_str or "loop detection" in err_str:
                continue
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # exponential backoff for other errors

    raise last_exc
