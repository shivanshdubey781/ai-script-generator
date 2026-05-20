from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TemplateCreate(BaseModel):
    niche: str
    template_text: str
    is_active: bool = True


class TemplateUpdate(BaseModel):
    niche: Optional[str] = None
    template_text: Optional[str] = None
    is_active: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: str
    niche: str
    template_text: str
    created_by: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def doc_to_template(doc: dict) -> TemplateResponse:
    """Convert a raw MongoDB template document to a TemplateResponse."""
    d = dict(doc)
    d["id"] = str(d.pop("_id", d.get("id", "")))
    return TemplateResponse(**d)
