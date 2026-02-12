"""Pydantic models for invoice tracking."""

from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

# Status values for invoice workflow
INVOICE_STATUSES = Literal[
    'gathering_data',
    'checking',
    'sent',
    'approved',
    'paid',
    'blocked'
]


# Invoice Role models (line items)
class InvoiceRoleCreate(BaseModel):
    """Create a new invoice role/line item."""
    role_name: str
    rate: float = 0
    quantity: float = 0
    sort_order: int = 0


class InvoiceRoleUpdate(BaseModel):
    """Update an invoice role/line item."""
    role_name: Optional[str] = None
    rate: Optional[float] = None
    quantity: Optional[float] = None
    sort_order: Optional[int] = None


class InvoiceRole(BaseModel):
    """Invoice role/line item response model."""
    id: str
    invoice_id: str
    role_name: str
    rate: float
    quantity: float
    total: float  # Computed: rate * quantity
    sort_order: int
    created_at: datetime
    updated_at: datetime


# Invoice Comment models
class InvoiceCommentCreate(BaseModel):
    """Create a new comment on an invoice."""
    content: str


class InvoiceComment(BaseModel):
    """Invoice comment response model."""
    id: str
    invoice_id: str
    author_id: Optional[str] = None
    author_name: str
    content: str
    created_at: datetime


# Invoice models
class InvoiceCreate(BaseModel):
    """Create a new invoice."""
    client_name: str
    period_month: int = Field(ge=1, le=12)
    period_year: int
    currency: str = 'NZD'
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    """Update an invoice."""
    status: Optional[INVOICE_STATUSES] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


class Invoice(BaseModel):
    """Invoice response model."""
    id: str
    client_name: str
    period_month: int
    period_year: int
    status: INVOICE_STATUSES
    currency: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    roles: List[InvoiceRole] = []
    comments: List[InvoiceComment] = []
    total: float = 0  # Computed: sum of role totals


# Utility models
class InvoicePeriod(BaseModel):
    """Period with invoice count."""
    month: int
    year: int
    invoice_count: int


class RolloverRequest(BaseModel):
    """Request to roll invoices to next month."""
    from_month: int = Field(ge=1, le=12)
    from_year: int


class RolloverResult(BaseModel):
    """Result of rollover operation."""
    invoices_created: int
    to_month: int
    to_year: int
