import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import HTTPException
from bson import ObjectId
from config.db import get_db
from utils.helpers import serialize_doc

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_EXPIRE_DAYS = 7 # Default matching '7d'

def generate_token(user_id: str, email: str, name: str, role: str) -> str:
    payload = {
        "id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def register_user(body: dict):
    name = body.get("name")
    email = body.get("email")
    password = body.get("password")
    role = body.get("role", "user")
    organisation = body.get("organisation")

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Please provide name, email, and password")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    allowed_roles = ["user", "municipal_admin"]
    if role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role")

    if role == "municipal_admin" and not organisation:
        raise HTTPException(status_code=400, detail="Municipality/Organisation name is required for authority registration")

    db = get_db()
    existing_user = await db["users"].find_one({"email": email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    salt = bcrypt.gensalt(12)
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    approval_status = "pending" if role == "municipal_admin" else "approved"

    new_user = {
        "name": name,
        "email": email.lower(),
        "password": hashed_password,
        "role": role,
        "approval_status": approval_status,
        "organisation": organisation if role == "municipal_admin" else None,
        "avatar_url": None,
        "contribution_score": 0,
        "reports_count": 0,
        "verified_reports": 0,
        "badges": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db["users"].insert_one(new_user)
    user_id = str(result.inserted_id)

    if role == "municipal_admin" and approval_status == "pending":
        return {
            "success": True,
            "message": "Registration submitted! Your account is pending approval by the Super Admin. You will be able to log in once approved.",
            "data": {
                "user": {"id": user_id, "name": name, "email": email.lower(), "role": role, "approval_status": approval_status},
                "token": None,
                "pending": True
            }
        }

    token = generate_token(user_id, email.lower(), name, role)
    user_data = {
        "id": user_id,
        "name": name,
        "email": email.lower(),
        "role": role,
        "approval_status": approval_status,
        "organisation": new_user["organisation"],
        "contribution_score": 0,
        "reports_count": 0,
        "verified_reports": 0,
        "badges": [],
        "created_at": new_user["created_at"]
    }

    return {
        "success": True,
        "message": "Registration successful",
        "data": {
            "user": serialize_doc(user_data),
            "token": token
        }
    }

async def login_user(body: dict):
    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Please provide email and password")

    db = get_db()
    user = await db["users"].find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # verify password
    if not bcrypt.checkpw(password.encode('utf-8'), user["password"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("role") == "municipal_admin":
        if user.get("approval_status") == "pending":
            raise HTTPException(
                status_code=403, 
                detail="Your municipal authority account is pending approval by the Super Admin. Please wait for approval before logging in."
            )
        if user.get("approval_status") == "rejected":
            raise HTTPException(
                status_code=403,
                detail="Your municipal authority account registration was rejected. Please contact the administrator."
            )

    token = generate_token(str(user["_id"]), user["email"], user["name"], user.get("role", "user"))
    
    user_data = {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "approval_status": user.get("approval_status", "approved"),
        "organisation": user.get("organisation"),
        "contribution_score": user.get("contribution_score", 0),
        "reports_count": user.get("reports_count", 0),
        "verified_reports": user.get("verified_reports", 0),
        "badges": user.get("badges", []),
        "created_at": user.get("created_at")
    }

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "user": serialize_doc(user_data),
            "token": token
        }
    }

async def get_me(user_id: str):
    db = get_db()
    user = await db["users"].find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "success": True,
        "data": serialize_doc(user)
    }
