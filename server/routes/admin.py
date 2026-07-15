from fastapi import APIRouter, Depends, Query, Body
from middleware.auth import get_any_admin_user, get_super_admin_user
from controllers.admin_controller import (
    get_all_reports, update_report_status, reward_citizen, apply_fine, verify_resolution,
    get_admin_stats, get_citizens, get_pending_authorities, approve_authority, get_fines
)

router = APIRouter(prefix="/admin")

@router.get("/stats")
async def stats(admin_user: dict = Depends(get_any_admin_user)):
    return await get_admin_stats()

@router.get("/reports")
async def reports(
    page: int = Query(1),
    limit: int = Query(20),
    status: str = Query(None),
    category: str = Query(None),
    city: str = Query(None),
    sort: str = Query("newest"),
    report_type: str = Query(None),
    admin_user: dict = Depends(get_any_admin_user)
):
    return await get_all_reports(page, limit, status, category, city, sort, report_type)

@router.put("/reports/{report_id}/status")
async def report_status(
    report_id: str,
    body: dict = Body(...),
    admin_user: dict = Depends(get_any_admin_user)
):
    return await update_report_status(report_id, body)

@router.post("/reports/{report_id}/reward")
async def reward(
    report_id: str,
    body: dict = Body(...),
    admin_user: dict = Depends(get_any_admin_user)
):
    return await reward_citizen(report_id, admin_user["id"], admin_user["name"], body)

@router.post("/reports/{report_id}/fine")
async def fine(
    report_id: str,
    body: dict = Body(...),
    admin_user: dict = Depends(get_any_admin_user)
):
    return await apply_fine(report_id, admin_user["id"], body)

@router.post("/reports/{report_id}/verify-resolution")
async def resolution_verify(
    report_id: str,
    body: dict = Body(...),
    admin_user: dict = Depends(get_any_admin_user)
):
    return await verify_resolution(report_id, body)

@router.get("/citizens")
async def citizens(
    search: str = Query(None),
    sort: str = Query("score"),
    admin_user: dict = Depends(get_any_admin_user)
):
    return await get_citizens(search, sort)

@router.get("/fines")
async def list_fines(admin_user: dict = Depends(get_any_admin_user)):
    return await get_fines()

# Super admin routes
@router.get("/authorities")
async def pending_authorities(admin_user: dict = Depends(get_super_admin_user)):
    return await get_pending_authorities()

@router.put("/authorities/{user_id}/approve")
async def authority_approve(
    user_id: str,
    body: dict = Body(...),
    admin_user: dict = Depends(get_super_admin_user)
):
    return await approve_authority(user_id, body.get("action"))
