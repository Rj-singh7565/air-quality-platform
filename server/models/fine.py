from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FineBase(BaseModel):
    report_id: str
    issued_by: str
    polluter_name: Optional[str] = None
    polluter_contact: Optional[str] = None
    fine_amount: float
    fine_reason: Optional[str] = None
    fine_category: Optional[str] = None
    status: str = "issued"

class FineResponse(FineBase):
    id: str
    created_at: datetime
    updated_at: datetime
