import os
import re
from datetime import datetime, timedelta
from fastapi import HTTPException
from bson import ObjectId
from config.db import get_db
from utils.helpers import serialize_doc

async def create_report(user_id: str, body: dict, file_name: str = None):
    title = body.get("title")
    description = body.get("description")
    report_type = body.get("report_type", "issue")
    category = body.get("category")
    severity = body.get("severity", "moderate")
    latitude = body.get("latitude")
    longitude = body.get("longitude")
    address = body.get("address")
    city = body.get("city")
    
    ai_verified_val = body.get("ai_verified")
    ai_verified = ai_verified_val in ['true', True, 'True']
    ai_confidence = float(body.get("ai_confidence") or 0)
    ai_classification = body.get("ai_classification")

    if not title or not category or latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="Please provide title, category, and location")

    valid_categories = ['smoke', 'burning_waste', 'dust', 'industrial', 'vehicle', 'construction', 'other']
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {', '.join(valid_categories)}")

    if report_type not in ['issue', 'polluter']:
        raise HTTPException(status_code=400, detail="Report type must be issue or polluter")

    image_url = f"/uploads/{file_name}" if file_name else None

    db = get_db()
    
    report_doc = {
        "user_id": ObjectId(user_id),
        "title": title,
        "description": description or None,
        "report_type": report_type,
        "category": category,
        "severity": severity,
        "image_url": image_url,
        "resolution_image_url": None,
        "ai_verified": ai_verified,
        "ai_confidence": ai_confidence,
        "ai_classification": ai_classification or None,
        "status": "pending",
        "admin_notes": None,
        "rejection_reason": None,
        "fine_amount": 0.0,
        "fine_status": "none",
        "reward_amount": 0,
        "rewarded_by": None,
        "rewarded_at": None,
        "latitude": float(latitude),
        "longitude": float(longitude),
        "address": address or None,
        "city": city or None,
        "upvotes": 0,
        "downvotes": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db["pollutionreports"].insert_one(report_doc)
    report_id = str(result.inserted_id)
    report_doc["id"] = report_id
    report_doc["_id"] = report_id

    bonus_points = 15 if ai_verified else 10
    
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {
            "$inc": {
                "reports_count": 1,
                "contribution_score": bonus_points,
                "verified_reports": 1 if ai_verified else 0
            }
        }
    )

    return {
        "success": True,
        "message": f"Report created successfully! You earned +{bonus_points} points.",
        "data": serialize_doc(report_doc)
    }

async def upload_resolution_proof(report_id: str, user_id: str, file_name: str):
    db = get_db()
    try:
        report_obj_id = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID format")

    report = await db["pollutionreports"].find_one({"_id": report_obj_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if str(report["user_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Only the original reporter can upload resolution proof")

    if report["status"] not in ["pending", "reviewing", "resolved"]:
        raise HTTPException(status_code=400, detail="Cannot upload resolution for rejected reports")

    resolution_image_url = f"/uploads/{file_name}"
    
    updated_report = await db["pollutionreports"].find_one_and_update(
        {"_id": report_obj_id},
        {"$set": {"resolution_image_url": resolution_image_url, "status": "reviewing", "updated_at": datetime.utcnow()}},
        return_document=True
    )

    return {
        "success": True,
        "message": "Resolution proof uploaded! The municipal authority will verify it.",
        "data": serialize_doc(updated_report)
    }

async def get_reports(page: int = 1, limit: int = 20, category: str = None, city: str = None, status: str = None, report_type: str = None):
    db = get_db()
    skip = (page - 1) * limit
    
    filt = {}
    if category:
        filt["category"] = category
    if city:
        filt["city"] = re.compile(f"^{city}$", re.IGNORECASE)
    if status:
        filt["status"] = status
    if report_type:
        filt["report_type"] = report_type

    reports_cursor = db["pollutionreports"].find(filt).sort("created_at", -1).skip(skip).limit(limit)
    reports = await reports_cursor.to_list(length=limit)

    # populate user details
    user_ids = list(set([r["user_id"] for r in reports if "user_id" in r]))
    users = await db["users"].find({"_id": {"$in": user_ids}}, {"name": 1, "avatar_url": 1}).to_list(length=len(user_ids))
    users_map = {str(u["_id"]): u for u in users}

    mapped_reports = []
    for r in reports:
        u_id_str = str(r["user_id"])
        user_info = users_map.get(u_id_str, {})
        
        rep_serialized = serialize_doc(r)
        rep_serialized["reporter_name"] = user_info.get("name", "Unknown")
        rep_serialized["reporter_avatar"] = user_info.get("avatar_url", None)
        rep_serialized["user_id"] = u_id_str
        mapped_reports.append(rep_serialized)

    total = await db["pollutionreports"].count_documents(filt)
    
    import math
    return {
        "success": True,
        "data": mapped_reports,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": math.ceil(total / limit)
        }
    }

async def get_my_reports(user_id: str, page: int = 1, limit: int = 20, status: str = None):
    db = get_db()
    skip = (page - 1) * limit
    
    filt = {"user_id": ObjectId(user_id)}
    if status:
        filt["status"] = status
        
    reports_cursor = db["pollutionreports"].find(filt).sort("created_at", -1).skip(skip).limit(limit)
    reports = await reports_cursor.to_list(length=limit)
    total = await db["pollutionreports"].count_documents(filt)
    
    import math
    return {
        "success": True,
        "data": serialize_doc(reports),
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": math.ceil(total / limit)
        }
    }

async def get_nearby_reports(latitude: float, longitude: float, radius: float = 5000):
    db = get_db()
    degree_radius = radius / 111000.0
    
    filt = {
        "latitude": {"$gte": latitude - degree_radius, "$lte": latitude + degree_radius},
        "longitude": {"$gte": longitude - degree_radius, "$lte": longitude + degree_radius}
    }
    
    reports_cursor = db["pollutionreports"].find(filt).sort("created_at", -1).limit(50)
    reports = await reports_cursor.to_list(length=50)
    
    # populate user details
    user_ids = list(set([r["user_id"] for r in reports if "user_id" in r]))
    users = await db["users"].find({"_id": {"$in": user_ids}}, {"name": 1}).to_list(length=len(user_ids))
    users_map = {str(u["_id"]): u for u in users}
    
    mapped_reports = []
    for r in reports:
        u_id_str = str(r["user_id"])
        user_info = users_map.get(u_id_str, {})
        rep_serialized = serialize_doc(r)
        rep_serialized["reporter_name"] = user_info.get("name", "Unknown")
        rep_serialized["user_id"] = u_id_str
        mapped_reports.append(rep_serialized)
        
    return {"success": True, "data": mapped_reports}

async def get_hotspots(city: str = None, days: int = 30):
    db = get_db()
    date_threshold = datetime.utcnow() - timedelta(days=days)
    
    match_stage = {"created_at": {"$gte": date_threshold}}
    if city:
        match_stage["city"] = re.compile(f"^{city}$", re.IGNORECASE)
        
    pipeline = [
        {"$match": match_stage},
        {
            "$group": {
                "_id": {"city": "$city", "category": "$category"},
                "report_count": {"$sum": 1},
                "avg_longitude": {"$avg": "$longitude"},
                "avg_latitude": {"$avg": "$latitude"},
                "avg_confidence": {"$avg": "$ai_confidence"},
                "latest_report": {"$max": "$created_at"}
            }
        },
        {"$match": {"report_count": {"$gte": 2}}},
        {"$sort": {"report_count": -1}},
        {"$limit": 20},
        {
            "$project": {
                "_id": 0,
                "city": "$_id.city",
                "category": "$_id.category",
                "report_count": 1,
                "avg_longitude": 1,
                "avg_latitude": 1,
                "avg_confidence": 1,
                "latest_report": 1
            }
        }
    ]
    
    hotspots = await db["pollutionreports"].aggregate(pipeline).to_list(length=20)
    return {"success": True, "data": serialize_doc(hotspots)}

async def vote_report(report_id: str, user_id: str, vote_type: str):
    db = get_db()
    try:
        report_obj_id = ObjectId(report_id)
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    if vote_type not in ["upvote", "downvote"]:
        raise HTTPException(status_code=400, detail="Vote type must be upvote or downvote")
        
    existing_vote = await db["reportvotes"].find_one({"report_id": report_obj_id, "user_id": user_obj_id})
    
    is_new_upvote = False
    if existing_vote:
        await db["reportvotes"].update_one(
            {"_id": existing_vote["_id"]},
            {"$set": {"vote_type": vote_type}}
        )
    else:
        await db["reportvotes"].insert_one({
            "report_id": report_obj_id,
            "user_id": user_obj_id,
            "vote_type": vote_type,
            "created_at": datetime.utcnow()
        })
        if vote_type == "upvote":
            is_new_upvote = True
            
    upvotes = await db["reportvotes"].count_documents({"report_id": report_obj_id, "vote_type": "upvote"})
    downvotes = await db["reportvotes"].count_documents({"report_id": report_obj_id, "vote_type": "downvote"})
    
    await db["pollutionreports"].update_one(
        {"_id": report_obj_id},
        {"$set": {"upvotes": upvotes, "downvotes": downvotes}}
    )
    
    if is_new_upvote:
        report = await db["pollutionreports"].find_one({"_id": report_obj_id})
        if report:
            await db["users"].update_one(
                {"_id": report["user_id"]},
                {"$inc": {"contribution_score": 2}}
            )
            
    return {"success": True, "message": "Vote recorded", "data": {"upvotes": upvotes, "downvotes": downvotes}}
