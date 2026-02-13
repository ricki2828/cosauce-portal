"""Pydantic models for cashflow tracking."""

from typing import List, Optional
from pydantic import BaseModel


# ==================== ACCOUNT MODELS ====================

class CashflowAccountCreate(BaseModel):
    """Create a new cashflow account."""
    account_type: str  # revenue, expense, summary, loan, vendor, receivable, capex, owner
    category: str
    subcategory: Optional[str] = None
    line_item: str
    display_order: int = 0

class CashflowAccountUpdate(BaseModel):
    """Update a cashflow account."""
    line_item: Optional[str] = None
    subcategory: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[int] = None

class CashflowAccount(BaseModel):
    """Cashflow account response."""
    id: str
    account_type: str
    category: str
    subcategory: Optional[str] = None
    line_item: str
    display_order: int
    is_computed: bool
    is_active: bool


# ==================== CELL UPDATE MODELS ====================

class CashflowCellUpdate(BaseModel):
    """Update a single monthly cell."""
    account_id: str
    month: int  # 1-12
    year: int
    amount: float
    is_actual: bool = True
    notes: Optional[str] = None

class CashflowBulkUpdate(BaseModel):
    """Bulk update multiple cells."""
    entries: List[CashflowCellUpdate]


# ==================== EXISTING MODELS ====================

class CashflowMonthly(BaseModel):
    """Monthly cashflow entry."""
    id: str
    month: int
    year: int
    category: str
    subcategory: Optional[str] = None
    line_item: Optional[str] = None
    amount: float
    currency: str = 'ZAR'
    is_actual: bool = True
    notes: Optional[str] = None
    source: str = 'excel_import'
    imported_at: str
    account_id: Optional[str] = None


class CashflowDaily(BaseModel):
    """Daily cashflow entry."""
    id: str
    date: str
    category: str
    line_item: Optional[str] = None
    amount: float
    currency: str = 'ZAR'
    description: Optional[str] = None
    is_actual: bool = True
    source: str = 'manual_entry'
    created_at: str


class FXRateCreate(BaseModel):
    """Create a new FX rate."""
    from_currency: str
    to_currency: str
    rate: float
    effective_date: str
    source: str = 'manual'


class FXRate(BaseModel):
    """FX rate response model."""
    id: str
    from_currency: str
    to_currency: str
    rate: float
    effective_date: str
    source: str = 'manual'
    created_at: str


class CashflowImport(BaseModel):
    """Cashflow import history entry."""
    id: str
    filename: str
    import_type: str
    rows_imported: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    imported_by: str
    imported_at: str


class CashflowMonthlySummary(BaseModel):
    """Monthly summary for cashflow overview."""
    month: int
    year: int
    total_revenue: float
    total_expenses: float
    net: float
    bank_balance: float = 0


class CashflowSummary(BaseModel):
    """Aggregated cashflow summary response."""
    year: int
    months: List[CashflowMonthlySummary] = []
    total_revenue: float = 0
    total_expenses: float = 0
    net: float = 0
