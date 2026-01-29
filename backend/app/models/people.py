"""
Pydantic models for People Module
Phase 3: Requisitions + Onboarding
"""

from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr

# ============================================
# Requisition Role Models (for multi-role support)
# ============================================

class RequisitionRoleBase(BaseModel):
    role_type: str  # e.g., "Team Leader", "Agent", "Senior Agent"
    requested_count: int = 1

class RequisitionRoleCreate(RequisitionRoleBase):
    pass

class RequisitionRole(RequisitionRoleBase):
    id: str
    requisition_id: str
    filled_count: int = 0
    created_at: datetime
    updated_at: datetime

    @property
    def remaining_count(self) -> int:
        return max(0, self.requested_count - self.filled_count)

class RequisitionRoleResponse(BaseModel):
    """Response model with computed remaining"""
    id: str
    requisition_id: str
    role_type: str
    requested_count: int
    filled_count: int
    remaining_count: int

# ============================================
# Requisitions Models
# ============================================

class RequisitionBase(BaseModel):
    title: str  # e.g., "2 Jan Intake", "March Hiring"
    department: str
    location: Optional[str] = None
    employment_type: Literal['full_time', 'part_time', 'contract', 'intern'] = 'full_time'
    priority: Optional[Literal['low', 'medium', 'high', 'urgent']] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    target_start_date: Optional[date] = None  # Date needed
    comments: Optional[str] = None

class RequisitionCreate(RequisitionBase):
    roles: list[RequisitionRoleCreate] = []  # Multiple role lines

class RequisitionUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    status: Optional[Literal['pending', 'open', 'interviewing', 'offer_made', 'filled', 'cancelled']] = None
    location: Optional[str] = None
    employment_type: Optional[Literal['full_time', 'part_time', 'contract', 'intern']] = None
    priority: Optional[Literal['low', 'medium', 'high', 'urgent']] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    target_start_date: Optional[date] = None
    comments: Optional[str] = None

class RequisitionRoleUpdate(BaseModel):
    role_type: Optional[str] = None
    requested_count: Optional[int] = None
    filled_count: Optional[int] = None

class Requisition(RequisitionBase):
    id: str
    status: Literal['pending', 'open', 'interviewing', 'offer_made', 'filled', 'cancelled']
    headcount: int = 0  # Legacy field - now computed from roles
    filled_date: Optional[date] = None
    created_by: str
    created_at: datetime  # This is the "date requested"
    updated_at: datetime

class RequisitionCommentCreate(BaseModel):
    """Create a new comment on a requisition"""
    content: str

class RequisitionComment(BaseModel):
    """Comment on a requisition"""
    id: str
    requisition_id: str
    author_id: Optional[str] = None
    author_name: str
    content: str
    created_at: datetime

class RequisitionCommentLatest(BaseModel):
    """Latest comment on a requisition (for list view)"""
    content: str
    author_name: str
    created_at: datetime

class RequisitionWithRoles(Requisition):
    """Requisition with all role lines included"""
    roles: list[RequisitionRoleResponse] = []
    latest_comment: Optional[RequisitionCommentLatest] = None

    @property
    def total_requested(self) -> int:
        return sum(r.requested_count for r in self.roles)

    @property
    def total_filled(self) -> int:
        return sum(r.filled_count for r in self.roles)

    @property
    def total_remaining(self) -> int:
        return sum(r.remaining_count for r in self.roles)

class RequisitionStats(BaseModel):
    total: int
    open: int
    interviewing: int
    offer_made: int
    filled: int
    cancelled: int

# ============================================
# Onboarding Template Models
# ============================================

class TemplateTaskBase(BaseModel):
    task_title: str
    task_description: Optional[str] = None
    category: Optional[str] = None
    day_offset: int = 0  # Days after hire date (0 = day 1, -1 = before start)
    assigned_to_role: Optional[Literal['manager', 'hr', 'it', 'buddy']] = None
    order_index: int = 0

class TemplateTaskCreate(TemplateTaskBase):
    pass

class TemplateTaskUpdate(BaseModel):
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    category: Optional[str] = None
    day_offset: Optional[int] = None
    assigned_to_role: Optional[Literal['manager', 'hr', 'it', 'buddy']] = None
    order_index: Optional[int] = None

class TemplateTask(TemplateTaskBase):
    id: str
    template_id: str

class OnboardingTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    role_type: Optional[str] = None

class OnboardingTemplateCreate(OnboardingTemplateBase):
    pass

class OnboardingTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    role_type: Optional[str] = None

class OnboardingTemplate(OnboardingTemplateBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class OnboardingTemplateWithTasks(OnboardingTemplate):
    tasks: list[TemplateTask] = []

# ============================================
# New Hire Models
# ============================================

class NewHireBase(BaseModel):
    name: str  # Maps to team_members.name
    email: Optional[EmailStr] = None
    role: str  # Maps to team_members.role (job title)
    department: Optional[str] = None
    start_date: Optional[date] = None
    manager_id: Optional[str] = None
    onboarding_template_id: Optional[str] = None

class NewHireCreate(NewHireBase):
    pass

class NewHireUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    department: Optional[str] = None
    start_date: Optional[date] = None
    manager_id: Optional[str] = None
    status: Optional[Literal['pending', 'onboarding', 'active', 'completed', 'cancelled']] = None

class NewHire(NewHireBase):
    id: str
    status: Literal['pending', 'onboarding', 'active', 'completed', 'cancelled']  # Maps from team_members.status
    created_at: datetime
    updated_at: datetime

# ============================================
# Onboarding Task Models
# ============================================

class OnboardingTaskBase(BaseModel):
    task_title: str
    task_description: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[date] = None
    assigned_to: Optional[str] = None  # User ID or role string

class OnboardingTaskUpdate(BaseModel):
    status: Optional[Literal['pending', 'in_progress', 'completed', 'blocked']] = None
    notes: Optional[str] = None

class OnboardingTask(OnboardingTaskBase):
    id: str
    new_hire_id: str  # team_member_id
    status: Literal['pending', 'in_progress', 'completed', 'blocked']
    completed: bool = False  # Maps to onboarding_progress.completed (0/1)
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    notes: Optional[str] = None
    order_index: int = 0

class NewHireWithTasks(NewHire):
    tasks: list[OnboardingTask] = []

# ============================================
# Response Models
# ============================================

class NewHireStats(BaseModel):
    total: int
    pending: int
    onboarding: int
    active: int
    completed: int
    cancelled: int

# ============================================
# Onboarding Checklist Models (actual schema)
# ============================================

class StageCreate(BaseModel):
    stage_label: str
    stage_category: Optional[str] = None

class ChecklistStage(BaseModel):
    id: str
    checklist_item_id: str
    stage_label: str
    stage_category: Optional[str] = None
    stage_order: int
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    notes: Optional[str] = None

class ChecklistStageUpdate(BaseModel):
    is_completed: Optional[bool] = None
    notes: Optional[str] = None

class ChecklistItemCreate(BaseModel):
    item_name: str
    order_index: int
    stages: list[StageCreate] = []

class ChecklistItemUpdate(BaseModel):
    item_name: Optional[str] = None
    order_index: Optional[int] = None

class ChecklistItemReorder(BaseModel):
    item_id: str
    new_order: int

class ChecklistItem(BaseModel):
    id: str
    team_member_id: str
    item_name: str
    order_index: int
    created_at: datetime
    stages: list[ChecklistStage] = []
