from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from bson import ObjectId
from typing import Optional
import json
import math

from app.core.deps import get_current_user
from app.database.db import scripts_col, users_col
from app.models.user import make_script, now_utc
from app.schemas.script import ScriptRequest, ScriptResponse, PaginatedScripts, doc_to_script
from app.services.groq_service import generate_scripts
from app.services.prompt_builder import build_prompt
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/scripts", tags=["scripts"])


@router.post("/generate", response_model=ScriptResponse)
@limiter.limit("20/hour")
def generate(
    request: Request,
    payload: ScriptRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate 3 AI script variations."""
    try:
        prompt = build_prompt(
            topic=payload.topic, niche=payload.niche, platform=payload.platform,
            tone=payload.tone, language=payload.language,
            duration_sec=payload.duration_sec, audience=payload.audience,
        )
        result = generate_scripts(prompt)
        usage = result.pop("_usage", {})
        token_count = usage.get("total_tokens", 0)
        output_json_str = json.dumps(result)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI generation failed: {str(e)}")

    user_id_str = str(current_user["_id"])
    doc = make_script(
        user_id=user_id_str, topic=payload.topic, niche=payload.niche,
        platform=payload.platform, tone=payload.tone, language=payload.language,
        duration_sec=payload.duration_sec, audience=payload.audience,
        output_json=output_json_str, token_count=token_count,
    )
    result_insert = scripts_col().insert_one(doc)
    doc["_id"] = result_insert.inserted_id

    # Increment generation_count
    users_col().update_one({"_id": current_user["_id"]}, {"$inc": {"generation_count": 1}})

    return doc_to_script(doc)


@router.get("/favorites", response_model=list[ScriptResponse])
def get_favorites(current_user: dict = Depends(get_current_user)):
    """Return all favorited scripts for the current user."""
    user_id_str = str(current_user["_id"])
    docs = list(
        scripts_col()
        .find({"user_id": user_id_str, "is_favorite": True})
        .sort("created_at", -1)
    )
    return [doc_to_script(d) for d in docs]


@router.get("/history", response_model=PaginatedScripts)
def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    niche: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Paginated script history for the current user."""
    user_id_str = str(current_user["_id"])
    query: dict = {"user_id": user_id_str}
    if niche:
        query["niche"] = {"$regex": niche, "$options": "i"}
    if search:
        query["topic"] = {"$regex": search, "$options": "i"}

    col = scripts_col()
    total = col.count_documents(query)
    pages = math.ceil(total / limit) if total > 0 else 1
    docs = list(col.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit))

    return PaginatedScripts(
        items=[doc_to_script(d) for d in docs],
        total=total, page=page, limit=limit, pages=pages,
    )


@router.post("/{script_id}/favorite", response_model=ScriptResponse)
def toggle_favorite(script_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle is_favorite on a script."""
    try:
        oid = ObjectId(script_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid script id")

    user_id_str = str(current_user["_id"])
    doc = scripts_col().find_one({"_id": oid, "user_id": user_id_str})
    if not doc:
        raise HTTPException(status_code=404, detail="Script not found")

    new_val = not doc.get("is_favorite", False)
    scripts_col().update_one({"_id": oid}, {"$set": {"is_favorite": new_val}})
    doc["is_favorite"] = new_val
    return doc_to_script(doc)


@router.delete("/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_script(script_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a script owned by the current user."""
    try:
        oid = ObjectId(script_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid script id")

    user_id_str = str(current_user["_id"])
    result = scripts_col().delete_one({"_id": oid, "user_id": user_id_str})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Script not found")
