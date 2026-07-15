from fastapi import APIRouter, Depends, Body
from middleware.auth import get_current_user
from controllers.auth_controller import register_user, login_user, get_me

router = APIRouter(prefix="/auth")

@router.post("/register")
async def register(body: dict = Body(...)):
    return await register_user(body)

@router.post("/login")
async def login(body: dict = Body(...)):
    return await login_user(body)

@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return await get_me(current_user["id"])
