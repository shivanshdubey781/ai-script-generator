from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ScriptRequest(BaseModel):
    topic: str
    niche: str
    platform: str
    tone: str
    language: str
    duration_sec: int
    audience: str


class ScriptResponse(BaseModel):
    id: str
    user_id: str
    topic: str
    niche: str
    platform: str
    tone: str
    language: str
    duration_sec: int
    audience: str
    output_json: str
    is_favorite: bool
    created_at: datetime
    token_count: int

    model_config = {"from_attributes": True}


class PaginatedScripts(BaseModel):
    items: List[ScriptResponse]
    total: int
    page: int
    limit: int
    pages: int


def doc_to_script(doc: dict) -> ScriptResponse:
    """Convert a raw MongoDB script document to a ScriptResponse."""
    d = dict(doc)
    d["id"] = str(d.pop("_id", d.get("id", "")))
    return ScriptResponse(**d)
