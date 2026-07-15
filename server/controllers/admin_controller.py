import re
from datetime import datetime
from fastapi import HTTPException
from bson import ObjectId
from config.db import get_db
from utils.helpers import serialize_doc

async def get_all_reports(page: int = 1, limit: int = 20, status: str = None, category: str = None, city: str = None, sort: str = "newest", report_type: str = None):
    db = get_db()
    skip = (page - 1) * limit
    
    filt = {}
    if status:
        filt["status"] = status
    if category:
        filt["category"] = category
    if city:
        filt["city"] = re.compile(f"^{city}$", re.IGNORECASE)
    if report_type:
        filt["report_type"] = report_type
        
    sort_list = [("created_at", -1)]
    if sort == "oldest":
        sort_list = [("created_at", 1)]
    elif sort == "upvotes":
        sort_list = [("upvotes", -1), ("created_at", -1)]
        
    reports_cursor = db["pollutionreports"].find(filt)
    if sort != "severity":
        reports_cursor = reports_cursor.sort(sort_list).skip(skip).limit(limit)
        
    reports = await reports_cursor.to_list(length=1000 if sort == "severity" else limit)
    
    # populate user details
    user_ids = list(set([r["user_id"] for r in reports if "user_id" in r]))
    users = await db["users"].find({"_id": {"$in": user_ids}}, {"name": 1, "email": 1, "contribution_score": 1, "reports_count": 1}).to_list(length=len(user_ids))
    users_map = {str(u["_id"]): u for u in users}
    
    mapped_reports = []
    for r in reports:
        u_id_str = str(r["user_id"])
        user_info = users_map.get(u_id_str, {})
        rep_serialized = serialize_doc(r)
        rep_serialized["reporter_name"] = user_info.get("name", "Unknown")
        rep_serialized["reporter_email"] = user_info.get("email")
        rep_serialized["reporter_score"] = user_info.get("contribution_score")
        rep_serialized["reporter_total_reports"] = user_info.get("reports_count")
        rep_serialized["user_id"] = u_id_str
        mapped_reports.append(rep_serialized)
        
    if sort == "severity":
        order = {"critical": 1, "high": 2, "moderate": 3, "low": 4}
        mapped_reports.sort(key=lambda x: order.get(x.get("severity"), 5))
        # apply skip and limit manually after in-memory sort
        mapped_reports = mapped_reports[skip:skip+limit]
        
    total = await db["pollutionreports"].count_documents(filt)
    
    # status counts
    status_counts_cursor = db["pollutionreports"].aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ])
    status_counts = await status_counts_cursor.to_list(length=10)
    status_map = {sc["_id"]: sc["count"] for sc in status_counts if sc["_id"] is not None}
    
    import math
    return {
        "success": True,
        "data": mapped_reports,
        "statusCounts": status_map,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": math.ceil(total / limit)
        }
    }

async def update_report_status(report_id: str, body: dict):
    db = get_db()
    status = body.get("status")
    admin_notes = body.get("admin_notes")
    rejection_reason = body.get("rejection_reason")
    
    valid_statuses = ['pending', 'reviewing', 'resolved', 'rejected']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")
        
    if status == 'rejected' and not rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required when rejecting a report")
        
    try:
        report_obj_id = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    report = await db["pollutionreports"].find_one({"_id": report_obj_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    update_fields = {
        "status": status,
        "updated_at": datetime.utcnow()
    }
    if admin_notes is not None:
        update_fields["admin_notes"] = admin_notes
    if rejection_reason is not None:
        update_fields["rejection_reason"] = rejection_reason
        
    updated = await db["pollutionreports"].find_one_and_update(
        {"_id": report_obj_id},
        {"$set": update_fields},
        return_document=True
    )
    
    return {
        "success": True,
        "message": f"Report status updated to \"{status}\"",
        "data": serialize_doc(updated)
    }

async def reward_citizen(report_id: str, admin_id: str, admin_name: str, body: dict):
    db = get_db()
    try:
        points = int(body.get("points"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Points must be an integer")
        
    message = body.get("message")
    
    if points < 1 or points > 500:
        raise HTTPException(status_code=400, detail="Points must be between 1 and 500")
        
    try:
        report_obj_id = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
        
    report = await db["pollutionreports"].find_one({"_id": report_obj_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    user_id = report["user_id"]
    user = await db["users"].find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # insert reward
    await db["rewards"].insert_one({
        "report_id": report_obj_id,
        "user_id": user_id,
        "admin_id": ObjectId(admin_id),
        "reward_type": "points",
        "points": points,
        "message": message or None,
        "created_at": datetime.utcnow()
    })
    
    # update report
    await db["pollutionreports"].update_one(
        {"_id": report_obj_id},
        {
            "$inc": {"reward_amount": points},
            "$set": {
                "rewarded_by": admin_name,
                "rewarded_at": datetime.utcnow(),
                "status": "resolved",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # update user points
    updated_user = await db["users"].find_one_and_update(
        {"_id": user_id},
        {"$inc": {"contribution_score": points}},
        return_document=True
    )
    
    return {
        "success": True,
        "message": f"Awarded {points} points to {updated_user['name']}! Their new score: {updated_user['contribution_score']}",
        "data": {
            "reward_id": None,
            "citizen_name": updated_user["name"],
            "new_score": updated_user["contribution_score"],
            "points_awarded": points
        }
    }

async def apply_fine(report_id: str, admin_id: str, body: dict):
    db = get_db()
    try:
        fine_amount = float(body.get("fine_amount"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Fine amount must be a number")
        
    polluter_name = body.get("polluter_name")
    polluter_contact = body.get("polluter_contact")
    fine_reason = body.get("fine_reason")
    
    if fine_amount <= 0:
        raise HTTPException(status_code=400, detail="Fine amount must be greater than 0")
        
    try:
        report_obj_id = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
        
    report = await db["pollutionreports"].find_one({"_id": report_obj_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.get("report_type") != "polluter":
        raise HTTPException(status_code=400, detail="Fines can only be applied to polluter reports")
        
    # Create fine
    fine_result = await db["fines"].insert_one({
        "report_id": report_obj_id,
        "issued_by": ObjectId(admin_id),
        "polluter_name": polluter_name or None,
        "polluter_contact": polluter_contact or None,
        "fine_amount": fine_amount,
        "fine_reason": fine_reason or None,
        "fine_category": report.get("category"),
        "status": "issued",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # update report
    await db["pollutionreports"].update_one(
        {"_id": report_obj_id},
        {
            "$set": {
                "fine_amount": fine_amount,
                "fine_status": "issued",
                "status": "resolved",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # user contribution score increment by 20
    await db["users"].update_one(
        {"_id": report["user_id"]},
        {"$inc": {"contribution_score": 20}}
    )
    
    return {
        "success": True,
        "message": f"Fine of ₹{fine_amount} applied successfully for polluter report",
        "data": {
            "fine_id": str(fine_result.inserted_id),
            "fine_amount": fine_amount,
            "polluter_name": polluter_name
        }
    }

async def verify_resolution(report_id: str, body: dict):
    db = get_db()
    verified = body.get("verified") in [True, 'true', 'True']
    admin_notes = body.get("admin_notes")
    
    try:
        report_obj_id = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    report = await db["pollutionreports"].find_one({"_id": report_obj_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if not report.get("resolution_image_url"):
        raise HTTPException(status_code=400, detail="No resolution proof has been uploaded for this report")
        
    new_status = "resolved" if verified else "reviewing"
    
    update_fields = {
        "status": new_status,
        "updated_at": datetime.utcnow()
    }
    if admin_notes is not None:
        update_fields["admin_notes"] = admin_notes
        
    await db["pollutionreports"].update_one(
        {"_id": report_obj_id},
        {"$set": update_fields}
    )
    
    if verified:
        await db["users"].update_one(
            {"_id": report["user_id"]},
            {"$inc": {"contribution_score": 15}}
        )
        
    msg = "Resolution verified! Citizen earned +15 points." if verified else "Resolution proof rejected. Report returned to reviewing."
    return {
        "success": True,
        "message": msg,
        "data": {"status": new_status}
    }

async def get_admin_stats():
    db = get_db()
    
    total_reports = await db["pollutionreports"].count_documents({})
    pending_reports = await db["pollutionreports"].count_documents({"status": "pending"})
    reviewing_reports = await db["pollutionreports"].count_documents({"status": "reviewing"})
    resolved_reports = await db["pollutionreports"].count_documents({"status": "resolved"})
    rejected_reports = await db["pollutionreports"].count_documents({"status": "rejected"})
    total_citizens = await db["users"].count_documents({"role": "user"})
    polluter_reports = await db["pollutionreports"].count_documents({"report_type": "polluter"})
    pending_authorities = await db["users"].count_documents({"role": "municipal_admin", "approval_status": "pending"})
    pending_resolutions = await db["pollutionreports"].count_documents({"resolution_image_url": {"$ne": None}, "status": "reviewing"})
    
    # reward agg
    reward_cursor = db["rewards"].aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$points"}, "count": {"$sum": 1}}}
    ])
    rewards_list = await reward_cursor.to_list(length=1)
    total_rewards = rewards_list[0]["total"] if rewards_list else 0
    reward_count = rewards_list[0]["count"] if rewards_list else 0
    
    # fine agg
    fine_cursor = db["fines"].aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$fine_amount"}, "count": {"$sum": 1}}}
    ])
    fines_list = await fine_cursor.to_list(length=1)
    total_fines_amount = fines_list[0]["total"] if fines_list else 0
    total_fines_count = fines_list[0]["count"] if fines_list else 0
    
    # category breakdown
    by_category_cursor = db["pollutionreports"].aggregate([
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"_id": 0, "category": "$_id", "count": 1}}
    ])
    by_category = await by_category_cursor.to_list(length=100)
    
    # city breakdown
    by_city_cursor = db["pollutionreports"].aggregate([
        {"$match": {"city": {"$ne": None}}},
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "city": "$_id", "count": 1}}
    ])
    by_city = await by_city_cursor.to_list(length=10)
    
    # recent rewards populated
    recent_rewards_cursor = db["rewards"].find().sort("created_at", -1).limit(10)
    recent_rewards = await recent_rewards_cursor.to_list(length=10)
    
    # populate user and report details for recent rewards
    user_ids = list(set([r["user_id"] for r in recent_rewards if "user_id" in r]))
    report_ids = list(set([r["report_id"] for r in recent_rewards if "report_id" in r]))
    
    users = await db["users"].find({"_id": {"$in": user_ids}}, {"name": 1}).to_list(length=len(user_ids))
    reports = await db["pollutionreports"].find({"_id": {"$in": report_ids}}, {"title": 1}).to_list(length=len(report_ids))
    
    users_map = {str(u["_id"]): u for u in users}
    reports_map = {str(r["_id"]): r for r in reports}
    
    mapped_rewards = []
    for r in recent_rewards:
        ser_rew = serialize_doc(r)
        ser_rew["citizen_name"] = users_map.get(str(r["user_id"]), {}).get("name", "Unknown")
        ser_rew["report_title"] = reports_map.get(str(r["report_id"]), {}).get("title", "Unknown")
        mapped_rewards.append(ser_rew)
        
    return {
        "success": True,
        "data": {
            "total_reports": total_reports,
            "pending": pending_reports,
            "reviewing": reviewing_reports,
            "resolved": resolved_reports,
            "rejected": rejected_reports,
            "total_citizens": total_citizens,
            "total_rewards_points": total_rewards,
            "total_rewards_given": reward_count,
            "polluter_reports": polluter_reports,
            "total_fines_amount": total_fines_amount,
            "total_fines_count": total_fines_count,
            "pending_authorities": pending_authorities,
            "pending_resolutions": pending_resolutions,
            "by_category": by_category,
            "by_city": by_city,
            "recent_rewards": mapped_rewards
        }
    }

async def get_citizens(search: str = None, sort: str = "score"):
    db = get_db()
    filt = {"role": "user"}
    
    if search:
        regex = re.compile(search, re.IGNORECASE)
        filt["$or"] = [{"name": regex}, {"email": regex}]
        
    sort_dict = {"contribution_score": -1}
    if sort == "reports":
        sort_dict = {"reports_count": -1}
    elif sort == "newest":
        sort_dict = {"created_at": -1}
        
    citizens_cursor = db["users"].find(filt, {"name": 1, "email": 1, "contribution_score": 1, "reports_count": 1, "verified_reports": 1, "created_at": 1})
    citizens_cursor = citizens_cursor.sort(list(sort_dict.items())).limit(100)
    citizens = await citizens_cursor.to_list(length=100)
    
    return {"success": True, "data": serialize_doc(citizens)}

async def get_pending_authorities():
    db = get_db()
    authorities_cursor = db["users"].find(
        {"role": "municipal_admin"},
        {"name": 1, "email": 1, "organisation": 1, "approval_status": 1, "created_at": 1}
    ).sort([("approval_status", 1), ("created_at", -1)])
    
    authorities = await authorities_cursor.to_list(length=1000)
    return {"success": True, "data": serialize_doc(authorities)}

async def approve_authority(user_id: str, action: str):
    db = get_db()
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be approve or reject")
        
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    authority = await db["users"].find_one({"_id": user_obj_id, "role": "municipal_admin"})
    if not authority:
        raise HTTPException(status_code=404, detail="Municipal authority not found")
        
    new_status = "approved" if action == "approve" else "rejected"
    await db["users"].update_one(
        {"_id": user_obj_id},
        {"$set": {"approval_status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "message": f"Municipal authority \"{authority['name']}\" has been {new_status}",
        "data": {
            "id": user_id,
            "name": authority["name"],
            "approval_status": new_status
        }
    }

async def get_fines():
    db = get_db()
    fines_cursor = db["fines"].find().sort("created_at", -1).limit(100)
    fines = await fines_cursor.to_list(length=100)
    
    report_ids = list(set([f["report_id"] for f in fines if "report_id" in f]))
    user_ids = list(set([f["issued_by"] for f in fines if "issued_by" in f]))
    
    reports = await db["pollutionreports"].find({"_id": {"$in": report_ids}}, {"title": 1, "category": 1}).to_list(length=len(report_ids))
    users = await db["users"].find({"_id": {"$in": user_ids}}, {"name": 1}).to_list(length=len(user_ids))
    
    reports_map = {str(r["_id"]): r for r in reports}
    users_map = {str(u["_id"]): u for u in users}
    
    mapped_fines = []
    for f in fines:
        ser_fine = serialize_doc(f)
        rep = reports_map.get(str(f["report_id"]), {})
        ser_fine["report_title"] = rep.get("title")
        ser_fine["report_category"] = rep.get("category")
        ser_fine["issued_by_name"] = users_map.get(str(f["issued_by"]), {}).get("name", "Unknown")
        mapped_fines.append(ser_fine)
        
    return {"success": True, "data": mapped_fines}
