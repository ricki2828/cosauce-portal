"""Pydantic models for payables tracking."""

from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

PAYABLE_STATUSES = Literal[
    'pending',
    'approved',
    'rejected',
    'loaded',
    'paid',
]

PAYABLE_PRIORITIES = Literal['low', 'medium', 'high', 'urgent']


class PayableCreate(BaseModel):
    """Create a new payable."""
    vendor_name: str
    item_description: str
    amount: float
    currency: str = 'NZD'
    due_date: Optional[str] = None
    category: Optional[str] = None
    priority: PAYABLE_PRIORITIES = 'medium'
    assigned_to: Optional[str] = None
    in_budget: bool = True
    budget_notes: Optional[str] = None
    notes: Optional[str] = None


class PayableUpdate(BaseModel):
    """Update a payable."""
    vendor_name: Optional[str] = None
    item_description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[PAYABLE_PRIORITIES] = None
    assigned_to: Optional[str] = None
    in_budget: Optional[bool] = None
    budget_notes: Optional[str] = None
    notes: Optional[str] = None


class PayableCommentCreate(BaseModel):
    """Create a new comment on a payable."""
    content: str


class PayableComment(BaseModel):
    """Payable comment response model."""
    id: str
    payable_id: str
    author_id: Optional[str] = None
    author_name: str
    content: str
    created_at: str


class PayableStatusHistory(BaseModel):
    """Payable status history entry."""
    id: str
    payable_id: str
    old_status: Optional[str] = None
    new_status: str
    changed_by: str
    notes: Optional[str] = None
    changed_at: str


class Payable(BaseModel):
    """Payable response model."""
    id: str
    vendor_name: str
    item_description: str
    assigned_to: Optional[str] = None
    amount: float
    currency: str
    due_date: Optional[str] = None
    category: Optional[str] = None
    priority: str
    in_budget: bool = True
    budget_notes: Optional[str] = None
    notes: Optional[str] = None
    attachment_path: Optional[str] = None
    attachment_filename: Optional[str] = None
    status: str
    xero_bill_id: Optional[str] = None
    submitted_by: str
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    loaded_at: Optional[str] = None
    paid_at: Optional[str] = None
    created_at: str
    updated_at: str
    comments: List[PayableComment] = []
    status_history: List[PayableStatusHistory] = []
