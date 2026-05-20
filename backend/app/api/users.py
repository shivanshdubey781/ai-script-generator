from fastapi import APIRouter, Depends, HTTPException, status
from app.core.deps import get_current_user
from app.core.security import verify_password, hash_password
from app.database.db import users_col, scripts_col
from app.schemas.user import UserResponse, UserUpdate, doc_to_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return doc_to_user(current_user)


@router.put("/me", response_model=UserResponse)
def update_me(payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    updates: dict = {}

    if payload.full_name:
        updates["full_name"] = payload.full_name

    if payload.password:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Current password required to set a new one")
        if not verify_password(payload.current_password, current_user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        if len(payload.password) < 8:
            raise HTTPException(status_code=422, detail="New password must be at least 8 characters")
        updates["hashed_password"] = hash_password(payload.password)

    if updates:
        users_col().update_one({"_id": current_user["_id"]}, {"$set": updates})
        current_user.update(updates)

    return doc_to_user(current_user)


@router.get("/me/stats")
def get_my_stats(current_user: dict = Depends(get_current_user)):
    user_id_str = str(current_user["_id"])
    favorites_count = scripts_col().count_documents({"user_id": user_id_str, "is_favorite": True})
    return {
        "generation_count": current_user.get("generation_count", 0),
        "favorites_count": favorites_count,
    }
