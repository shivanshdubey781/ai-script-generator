from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import List

from app.core.deps import get_current_user, get_admin_user
from app.database.db import users_col, scripts_col, templates_col
from app.models.user import make_template, now_utc
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse, doc_to_template

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/templates", response_model=List[TemplateResponse])
def list_templates(_: dict = Depends(get_admin_user)):
    docs = list(templates_col().find().sort("created_at", -1))
    return [doc_to_template(d) for d in docs]


@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(payload: TemplateCreate, current_user: dict = Depends(get_admin_user)):
    doc = make_template(
        niche=payload.niche,
        template_text=payload.template_text,
        created_by=str(current_user["_id"]),
        is_active=payload.is_active,
    )
    result = templates_col().insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc_to_template(doc)


@router.put("/templates/{template_id}", response_model=TemplateResponse)
def update_template(template_id: str, payload: TemplateUpdate, _: dict = Depends(get_admin_user)):
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template id")

    updates: dict = {"updated_at": now_utc()}
    if payload.niche is not None:
        updates["niche"] = payload.niche
    if payload.template_text is not None:
        updates["template_text"] = payload.template_text
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active

    result = templates_col().find_one_and_update(
        {"_id": oid}, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return doc_to_template(result)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: str, _: dict = Depends(get_admin_user)):
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template id")

    result = templates_col().delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")


@router.get("/stats")
def get_stats(_: dict = Depends(get_admin_user)):
    """Platform-wide statistics."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = users_col().count_documents({})
    total_scripts = scripts_col().count_documents({})
    scripts_today = scripts_col().count_documents({"created_at": {"$gte": today_start}})

    # Top niches using aggregation
    pipeline = [
        {"$group": {"_id": "$niche", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "niche": "$_id", "count": 1}},
    ]
    top_niches = list(scripts_col().aggregate(pipeline))

    return {
        "total_users": total_users,
        "total_scripts": total_scripts,
        "scripts_today": scripts_today,
        "top_niches": top_niches,
    }
