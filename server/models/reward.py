from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RewardBase(BaseModel):
    report_id: str
    user_id: str
    admin_id: Optional[str] = None
    reward_type: str = "points"
    points: int = 0
    message: Optional[str] = None

class RewardResponse(RewardBase):
    id: str
    created_at: datetime
