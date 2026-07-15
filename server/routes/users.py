from fastapi import APIRouter, Query
from controllers.user_controller import get_leaderboard, get_user_profile, get_platform_stats

router = APIRouter(prefix="/users")

@router.get("/leaderboard")
async def leaderboard(limit: int = Query(20)):
    return await get_leaderboard(limit)

@router.get("/stats")
async def stats():
    return await get_platform_stats()

@router.get("/{user_id}/profile")
async def profile(user_id: str):
    return await get_user_profile(user_id)
