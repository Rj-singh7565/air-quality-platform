from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PollutionReportBase(BaseModel):
    title: str
    description: Optional[str] = None
    report_type: str = "issue"
    category: str
    severity: str = "moderate"
    latitude: float
    longitude: float
    address: Optional[str] = None
    city: Optional[str] = None

class PollutionReportCreate(BaseModel):
    title: str
    description: Optional[str] = None
    report_type: str = "issue"
    category: str
    severity: str = "moderate"
    latitude: float
    longitude: float
    address: Optional[str] = None
    city: Optional[str] = None
    ai_verified: Optional[bool] = False
    ai_confidence: Optional[float] = 0.0
    ai_classification: Optional[str] = None

class PollutionReportResponse(PollutionReportBase):
    id: str
    user_id: str
    image_url: Optional[str] = None
    resolution_image_url: Optional[str] = None
    ai_verified: bool = False
    ai_confidence: float = 0.0
    ai_classification: Optional[str] = None
    status: str = "pending"
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    fine_amount: float = 0.0
    fine_status: str = "none"
    reward_amount: int = 0
    rewarded_by: Optional[str] = None
    rewarded_at: Optional[datetime] = None
    upvotes: int = 0
    downvotes: int = 0
    created_at: datetime
    updated_at: datetime
