import os
import uuid
import shutil
from fastapi import APIRouter, Depends, Query, File, UploadFile, Form
from middleware.auth import get_current_user
from controllers.report_controller import (
    create_report, get_reports, get_nearby_reports, get_hotspots, get_my_reports, vote_report, upload_resolution_proof
)

router = APIRouter(prefix="/reports")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/")
async def list_reports(
    page: int = Query(1),
    limit: int = Query(20),
    category: str = Query(None),
    city: str = Query(None),
    status: str = Query(None),
    report_type: str = Query(None)
):
    return await get_reports(page, limit, category, city, status, report_type)

@router.get("/nearby")
async def nearby(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius: float = Query(5000)
):
    return await get_nearby_reports(latitude, longitude, radius)

@router.get("/hotspots")
async def hotspots(
    city: str = Query(None),
    days: int = Query(30)
):
    return await get_hotspots(city, days)

@router.get("/my")
async def my_reports(
    current_user: dict = Depends(get_current_user),
    page: int = Query(1),
    limit: int = Query(20),
    status: str = Query(None)
):
    return await get_my_reports(current_user["id"], page, limit, status)

@router.post("/")
async def create(
    current_user: dict = Depends(get_current_user),
    title: str = Form(...),
    description: str = Form(None),
    report_type: str = Form("issue"),
    category: str = Form(...),
    severity: str = Form("moderate"),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str = Form(None),
    city: str = Form(None),
    ai_verified: str = Form("false"),
    ai_confidence: float = Form(0.0),
    ai_classification: str = Form(None),
    image: UploadFile = File(None)
):
    file_name = None
    if image:
        ext = os.path.splitext(image.filename)[1]
        file_name = f"report-{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
    body = {
        "title": title,
        "description": description,
        "report_type": report_type,
        "category": category,
        "severity": severity,
        "latitude": latitude,
        "longitude": longitude,
        "address": address,
        "city": city,
        "ai_verified": ai_verified,
        "ai_confidence": ai_confidence,
        "ai_classification": ai_classification
    }
    return await create_report(current_user["id"], body, file_name)

@router.post("/{report_id}/vote")
async def vote(
    report_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    return await vote_report(report_id, current_user["id"], body.get("vote_type"))

@router.post("/{report_id}/resolve")
async def resolve(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    resolution_image: UploadFile = File(...)
):
    ext = os.path.splitext(resolution_image.filename)[1]
    file_name = f"report-{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(resolution_image.file, buffer)
        
    return await upload_resolution_proof(report_id, current_user["id"], file_name)
