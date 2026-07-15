from fastapi import HTTPException
from bson import ObjectId
from config.db import get_db
from utils.helpers import serialize_doc

async def get_leaderboard(limit: int = 20):
    db = get_db()
    users_cursor = db["users"].find(
        {},
        {"name": 1, "avatar_url": 1, "contribution_score": 1, "reports_count": 1, "verified_reports": 1, "badges": 1, "created_at": 1}
    ).sort("contribution_score", -1).limit(limit)
    
    users = await users_cursor.to_list(length=limit)
    
    leaderboard = []
    for index, user in enumerate(users):
        user_serialized = serialize_doc(user)
        user_serialized["rank"] = index + 1
        user_serialized["badges"] = user_serialized.get("badges") or []
        leaderboard.append(user_serialized)
        
    return {"success": True, "data": leaderboard}

async def get_user_profile(user_id: str):
    db = get_db()
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    user = await db["users"].find_one(
        {"_id": obj_id},
        {"name": 1, "avatar_url": 1, "contribution_score": 1, "reports_count": 1, "verified_reports": 1, "badges": 1, "created_at": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    reports_cursor = db["pollutionreports"].find(
        {"user_id": obj_id},
        {"title": 1, "category": 1, "severity": 1, "ai_verified": 1, "status": 1, "upvotes": 1, "downvotes": 1, "created_at": 1, "latitude": 1, "longitude": 1}
    ).sort("created_at", -1).limit(10)
    
    reports = await reports_cursor.to_list(length=10)
    
    return {
        "success": True,
        "data": {
            "user": serialize_doc(user),
            "recent_reports": serialize_doc(reports)
        }
    }

async def get_platform_stats():
    db = get_db()
    total_users = await db["users"].count_documents({})
    total_reports = await db["pollutionreports"].count_documents({})
    verified_reports = await db["pollutionreports"].count_documents({"ai_verified": True})
    
    # distinct cities excluding None
    distinct_cities = await db["pollutionreports"].distinct("city", {"city": {"$ne": None}})
    
    return {
        "success": True,
        "data": {
            "total_users": total_users,
            "total_reports": total_reports,
            "verified_reports": verified_reports,
            "cities_covered": len(distinct_cities)
        }
    }
