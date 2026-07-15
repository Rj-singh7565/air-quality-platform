from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReportVoteBase(BaseModel):
    report_id: str
    user_id: str
    vote_type: str # upvote / downvote

class ReportVoteResponse(ReportVoteBase):
    id: str
    created_at: datetime
