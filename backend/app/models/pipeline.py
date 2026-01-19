"""
Pydantic models for Sales Pipeline Opportunities
Manual opportunity tracking for dashboard Kanban
"""

from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel

# ============================================
# Pipeline Opportunity Models
# ============================================

class PipelineOpportunityBase(BaseModel):
    client_name: str
    size: Optional[str] = None  # e.g., "50-100 employees", "$500K ARR", "Enterprise"
    likelihood: Literal['high', 'medium', 'low'] = 'medium'
    target_date: Optional[date] = None  # Target close date
    notes: Optional[str] = None

class PipelineOpportunityCreate(PipelineOpportunityBase):
    status: Literal['new', 'meeting', 'assessing', 'implementation', 'blocked'] = 'new'

class PipelineOpportunityUpdate(BaseModel):
    client_name: Optional[str] = None
    size: Optional[str] = None
    likelihood: Optional[Literal['high', 'medium', 'low']] = None
    status: Optional[Literal['new', 'meeting', 'assessing', 'implementation', 'blocked']] = None
    target_date: Optional[date] = None
    notes: Optional[str] = None

class PipelineOpportunity(PipelineOpportunityBase):
    id: str
    status: Literal['new', 'meeting', 'assessing', 'implementation', 'blocked']
    created_by: str
    created_at: datetime
    updated_at: datetime

class PipelineStats(BaseModel):
    total: int
    new: int
    meeting: int
    assessing: int
    implementation: int
