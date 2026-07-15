from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Access denied. No token provided.")
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please login again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    from config.db import get_db
    db = get_db()
    user_id = current_user.get("id")
    
    user = await db["users"].find_one({"_id": ObjectId(user_id)}, {"role": 1, "approval_status": 1})
    if not user or user.get("role") != "municipal_admin":
        raise HTTPException(status_code=403, detail="Access denied. Municipal admin privileges required.")
    
    if user.get("approval_status") != "approved":
        raise HTTPException(status_code=403, detail="Your account is pending approval.")
        
    return current_user

async def get_super_admin_user(current_user: dict = Depends(get_current_user)):
    from config.db import get_db
    db = get_db()
    user_id = current_user.get("id")
    
    user = await db["users"].find_one({"_id": ObjectId(user_id)}, {"role": 1})
    if not user or user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied. Super admin privileges required.")
        
    return current_user

async def get_any_admin_user(current_user: dict = Depends(get_current_user)):
    from config.db import get_db
    db = get_db()
    user_id = current_user.get("id")
    
    user = await db["users"].find_one({"_id": ObjectId(user_id)}, {"role": 1, "approval_status": 1})
    if not user or user.get("role") not in ["municipal_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")
        
    if user.get("role") == "municipal_admin" and user.get("approval_status") != "approved":
        raise HTTPException(status_code=403, detail="Your account is pending approval.")
        
    return current_user
