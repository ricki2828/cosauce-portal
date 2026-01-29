"""
Talent Org Chart API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from datetime import datetime
import aiosqlite
import uuid

from ..config import DATA_DIR
from ..middleware.auth import get_current_user
from ..models.talent import (
    EmployeeCreate, EmployeeUpdate, Employee, EmployeeWithReports,
    OrgNode, Department, TalentStats
)

router = APIRouter()


# ============================================
# Helper Functions
# ============================================

def build_org_tree(employees: List[dict], root_id: Optional[str] = None) -> List[dict]:
    """
    Build hierarchical tree structure from flat employee list
    Args:
        employees: Flat list of all employees
        root_id: Manager ID to build tree from (None = top level)
    Returns:
        List of OrgNode dictionaries with recursive 'reports' field
    """
    # Find all employees with given manager_id
    reports = [e for e in employees if e.get('manager_id') == root_id]

    org_nodes = []
    for emp in reports:
        # Copy employee data
        node = {**emp}
        # Recursively build subtree
        node['reports'] = build_org_tree(employees, emp['id'])
        org_nodes.append(node)

    return org_nodes


def check_director_or_admin(current_user):
    """Check if user is director or admin, raise 403 if not"""
    if current_user['role'] not in ['admin', 'director']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only directors and admins can perform this action"
        )


# ============================================
# Employees Endpoints
# ============================================

@router.get("/employees", response_model=List[Employee])
async def list_employees(
    status: Optional[str] = None,
    department: Optional[str] = None,
    account_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    List all employees with optional filters
    Only directors and admins can access this endpoint
    """
    check_director_or_admin(current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        query = "SELECT * FROM team_members WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status)
        if department:
            query += " AND department = ?"
            params.append(department)
        if account_id:
            query += " AND account_id = ?"
            params.append(account_id)

        query += " ORDER BY name"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


@router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(
    employee_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get single employee by ID
    Only directors and admins can access this endpoint
    """
    check_director_or_admin(current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM team_members WHERE id = ?",
            (employee_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Employee not found"
                )
            return dict(row)


@router.get("/org-tree", response_model=List[OrgNode])
async def get_org_tree(
    status: Optional[str] = 'active',
    department: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get full org tree structure (recursive hierarchy)
    Returns list of root nodes (employees with no manager) with nested reports
    Only directors and admins can access this endpoint
    """
    check_director_or_admin(current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Get all employees (filtered by status/department if specified)
        query = "SELECT * FROM team_members WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status)
        if department:
            query += " AND department = ?"
            params.append(department)

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            employees = [dict(row) for row in rows]

        # Build tree starting from roots (manager_id is NULL)
        org_tree = build_org_tree(employees, root_id=None)
        return org_tree


@router.post("/employees", response_model=Employee)
async def create_employee(
    employee: EmployeeCreate,
    current_user = Depends(get_current_user)
):
    """
    Create new employee
    Only directors and admins can create employees
    """
    check_director_or_admin(current_user)

    employee_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        try:
            await db.execute(
                """
                INSERT INTO team_members
                (id, name, email, role, department, account_id, manager_id, status, start_date, performance, potential, layout_direction, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    employee_id,
                    employee.name,
                    employee.email,
                    employee.role,
                    employee.department,
                    employee.account_id,
                    employee.manager_id,
                    employee.status,
                    employee.start_date,
                    employee.performance,
                    employee.potential,
                    employee.layout_direction or 'horizontal',
                    now,
                    now
                )
            )
            await db.commit()
        except aiosqlite.IntegrityError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database integrity error: {str(e)}"
            )

    # Return created employee
    return await get_employee(employee_id, current_user)


@router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(
    employee_id: str,
    employee_update: EmployeeUpdate,
    current_user = Depends(get_current_user)
):
    """
    Update employee
    Only directors and admins can update employees
    """
    check_director_or_admin(current_user)

    # Check employee exists
    existing = await get_employee(employee_id, current_user)

    # Build dynamic update query
    # Use exclude_unset=True to only get fields that were explicitly provided
    update_data = employee_update.dict(exclude_unset=True)

    updates = []
    params = []

    # Validate manager_id if provided
    if 'manager_id' in update_data and update_data['manager_id'] == employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee cannot be their own manager"
        )

    # Build update query for all provided fields
    for field, value in update_data.items():
        updates.append(f"{field} = ?")
        params.append(value)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    # Always update updated_at timestamp
    updates.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(employee_id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        try:
            await db.execute(
                f"UPDATE team_members SET {', '.join(updates)} WHERE id = ?",
                params
            )
            await db.commit()
        except aiosqlite.IntegrityError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database integrity error: {str(e)}"
            )

    return await get_employee(employee_id, current_user)


@router.delete("/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete employee (soft delete - mark as offboarded)
    Cannot delete employees with active direct reports
    Only directors and admins can delete employees
    """
    check_director_or_admin(current_user)

    # Check employee exists
    existing = await get_employee(employee_id, current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Check if employee has active direct reports
        async with db.execute(
            """
            SELECT COUNT(*) as count
            FROM team_members
            WHERE manager_id = ? AND status IN ('active', 'onboarding', 'pending')
            """,
            (employee_id,)
        ) as cursor:
            row = await cursor.fetchone()
            reports_count = row['count']

        if reports_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete employee with {reports_count} active direct reports. "
                       "Please reassign their reports first or mark them as offboarded."
            )

        # Soft delete: mark as offboarded
        await db.execute(
            "UPDATE team_members SET status = 'offboarded', updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), employee_id)
        )
        await db.commit()

    return {"message": "Employee offboarded successfully", "id": employee_id}


# ============================================
# Departments Endpoints
# ============================================

@router.get("/departments", response_model=List[Department])
async def get_departments(
    current_user = Depends(get_current_user)
):
    """
    Get list of unique departments with employee counts
    Only shows departments with active employees
    Only directors and admins can access this endpoint
    """
    check_director_or_admin(current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT
                department as id,
                department as name,
                COUNT(*) as employee_count
            FROM team_members
            WHERE department IS NOT NULL
              AND department != ''
              AND status IN ('active', 'onboarding', 'pending')
            GROUP BY department
            ORDER BY department
            """
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


# ============================================
# Stats Endpoints
# ============================================

@router.get("/stats", response_model=TalentStats)
async def get_talent_stats(
    current_user = Depends(get_current_user)
):
    """
    Get org chart statistics
    Only directors and admins can access this endpoint
    """
    check_director_or_admin(current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Get overall counts by status
        async with db.execute(
            """
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'onboarding' THEN 1 ELSE 0 END) as onboarding,
                SUM(CASE WHEN status = 'offboarded' THEN 1 ELSE 0 END) as offboarded
            FROM team_members
            """
        ) as cursor:
            row = await cursor.fetchone()
            stats = dict(row)

        # Get counts by department
        async with db.execute(
            """
            SELECT department, COUNT(*) as count
            FROM team_members
            WHERE department IS NOT NULL
              AND department != ''
              AND status IN ('active', 'onboarding', 'pending')
            GROUP BY department
            ORDER BY count DESC
            """
        ) as cursor:
            dept_rows = await cursor.fetchall()
            stats['by_department'] = {row['department']: row['count'] for row in dept_rows}

        return stats
