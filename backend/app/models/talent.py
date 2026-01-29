"""
Pydantic models for Talent Org Chart Module
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr


# ============================================
# Employee Models (team_members table)
# ============================================

class EmployeeBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    role: str  # Job title
    department: Optional[str] = None  # Department (HR, Technology, etc.)
    account_id: Optional[str] = None  # Client account (if applicable)
    manager_id: Optional[str] = None  # Reports to
    status: Literal['pending', 'onboarding', 'active', 'offboarded'] = 'active'
    start_date: Optional[str] = None  # ISO date string
    performance: Optional[Literal['Excellent', 'High', 'Good', 'Low', 'Very Low']] = None
    potential: Optional[Literal['Excellent', 'High', 'Good', 'Low', 'Very Low']] = None
    layout_direction: Optional[Literal['horizontal', 'vertical', 'grouped']] = 'horizontal'


class EmployeeCreate(EmployeeBase):
    """Create new employee"""
    pass


class EmployeeUpdate(BaseModel):
    """Update employee (all fields optional)"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    department: Optional[str] = None
    account_id: Optional[str] = None
    manager_id: Optional[str] = None
    status: Optional[Literal['pending', 'onboarding', 'active', 'offboarded']] = None
    start_date: Optional[str] = None
    performance: Optional[Literal['Excellent', 'High', 'Good', 'Low', 'Very Low']] = None
    potential: Optional[Literal['Excellent', 'High', 'Good', 'Low', 'Very Low']] = None
    layout_direction: Optional[Literal['horizontal', 'vertical', 'grouped']] = None


class Employee(EmployeeBase):
    """Employee with metadata"""
    id: str
    created_at: datetime
    updated_at: datetime


class EmployeeWithReports(Employee):
    """Employee with count of direct reports"""
    reports_count: int = 0


class OrgNode(Employee):
    """Recursive org tree node"""
    reports: list['OrgNode'] = []


# ============================================
# Department Models
# ============================================

class Department(BaseModel):
    """Department summary"""
    id: str
    name: str
    employee_count: int


# ============================================
# Stats Models
# ============================================

class TalentStats(BaseModel):
    """Org chart statistics"""
    total: int
    active: int
    pending: int
    onboarding: int
    offboarded: int
    by_department: dict[str, int] = {}
