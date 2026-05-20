"""
Hook Engine — Generates 3 hook style variants for a given topic.
Used as a standalone utility or called before the main script generation.
"""

HOOK_STYLES = {
    "curiosity": {
        "description": "Make the viewer feel they're missing something crucial",
        "template": "Kya aap jaante hain ki {topic} ke baare mein {secret}? Most people don't...",
        "opening_words": ["Kya aap jaante hain", "Sach bolunga", "Jo main aaj bataunga", "Yeh secret"],
    },
    "shock": {
        "description": "Open with a surprising fact or number",
        "template": "{number}% log {topic} mein yeh galti karte hain — aur aap bhi shayad yahi kar rahe hain.",
        "opening_words": ["Shocking fact:", "Yeh number sunke aap hairan ho jaoge:", "Did you know that", "Research says"],
    },
    "story": {
        "description": "Start with a relatable personal story",
        "template": "Ek saal pehle, mujhe bhi {problem} ki problem thi. Tab tak mujhe {solution} ke baare mein pata nahi tha.",
        "opening_words": ["Ek saal pehle", "Mere ek client ne", "Jab main khud", "Yeh mere saath bhi hua"],
    },
}


def get_hook_style_info(style: str) -> dict:
    """Return metadata for a given hook style."""
    return HOOK_STYLES.get(style.lower(), HOOK_STYLES["curiosity"])


def generate_hook_variants(topic: str, niche: str) -> list[dict]:
    """
    Generate 3 hook variant templates for a given topic and niche.
    Returns a list of dicts with style info — used as context for the AI prompt.
    """
    variants = []
    for style_name, style_data in HOOK_STYLES.items():
        variants.append({
            "hook_style": style_name,
            "description": style_data["description"],
            "example_opening": style_data["opening_words"][0],
            "niche": niche,
            "topic": topic,
        })
    return variants


def format_hook_instructions() -> str:
    """Return formatted hook instructions string for injection into prompts."""
    lines = []
    for style, data in HOOK_STYLES.items():
        lines.append(f"- {style.upper()}: {data['description']}")
    return "\n".join(lines)
