"""
People API endpoints
Phase 3: Requisitions + Onboarding
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from datetime import datetime, timedelta
import aiosqlite
import uuid

from ..config import DATA_DIR
from ..middleware.auth import get_current_user, get_current_director
from ..models.people import (
    # Requisitions
    RequisitionCreate, RequisitionUpdate, Requisition, RequisitionStats,
    RequisitionWithRoles, RequisitionRoleCreate, RequisitionRoleUpdate,
    RequisitionRoleResponse, RequisitionCommentCreate, RequisitionComment,
    # Templates
    OnboardingTemplateCreate, OnboardingTemplateUpdate, OnboardingTemplate,
    OnboardingTemplateWithTasks, TemplateTaskCreate, TemplateTaskUpdate, TemplateTask,
    # New Hires
    NewHireCreate, NewHireUpdate, NewHire, NewHireWithTasks,
    OnboardingTaskUpdate, OnboardingTask, NewHireStats
)

router = APIRouter()

# ============================================
# Requisitions Endpoints
# ============================================

@router.get("/requisitions", response_model=List[RequisitionWithRoles])
async def list_requisitions(
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """List all requisitions with roles"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        query = "SELECT * FROM requisitions"
        params = []

        if status:
            query += " WHERE status = ?"
            params.append(status)

        query += " ORDER BY created_at DESC"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            requisitions = [dict(row) for row in rows]

        # Fetch roles and latest comment for each requisition
        for req in requisitions:
            # Fetch roles
            async with db.execute("""
                SELECT id, requisition_id, role_type, requested_count, filled_count,
                       created_at, updated_at
                FROM requisition_roles
                WHERE requisition_id = ?
                ORDER BY created_at
            """, (req['id'],)) as cursor:
                roles = await cursor.fetchall()
                req['roles'] = [
                    {
                        **dict(role),
                        'remaining_count': max(0, role['requested_count'] - role['filled_count'])
                    }
                    for role in roles
                ]

            # Fetch latest comment
            async with db.execute("""
                SELECT content, author_name, created_at
                FROM requisition_comments
                WHERE requisition_id = ?
                ORDER BY created_at DESC
                LIMIT 1
            """, (req['id'],)) as cursor:
                comment_row = await cursor.fetchone()
                if comment_row:
                    req['latest_comment'] = {
                        'content': comment_row['content'],
                        'author_name': comment_row['author_name'],
                        'created_at': comment_row['created_at']
                    }
                else:
                    req['latest_comment'] = None

        return requisitions

@router.get("/requisitions/stats", response_model=RequisitionStats)
async def get_requisition_stats(
    current_user = Depends(get_current_user)
):
    """Get requisition statistics"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status = 'interviewing' THEN 1 ELSE 0 END) as interviewing,
                SUM(CASE WHEN status = 'offer_made' THEN 1 ELSE 0 END) as offer_made,
                SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as filled,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM requisitions
        """) as cursor:
            row = await cursor.fetchone()
            return dict(row)

@router.get("/requisitions/{id}", response_model=RequisitionWithRoles)
async def get_requisition(
    id: str,
    current_user = Depends(get_current_user)
):
    """Get single requisition by ID with roles"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("SELECT * FROM requisitions WHERE id = ?", (id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Requisition not found")
            req = dict(row)

        # Fetch roles
        async with db.execute("""
            SELECT id, requisition_id, role_type, requested_count, filled_count,
                   created_at, updated_at
            FROM requisition_roles
            WHERE requisition_id = ?
            ORDER BY created_at
        """, (id,)) as cursor:
            roles = await cursor.fetchall()
            req['roles'] = [
                {
                    **dict(role),
                    'remaining_count': max(0, role['requested_count'] - role['filled_count'])
                }
                for role in roles
            ]

        return req

@router.post("/requisitions", response_model=RequisitionWithRoles)
async def create_requisition(
    data: RequisitionCreate,
    current_user = Depends(get_current_director)  # Directors/admins only
):
    """Create new requisition with role lines"""
    requisition_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # Calculate total headcount from roles
    total_headcount = sum(role.requested_count for role in data.roles) if data.roles else 0

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("""
            INSERT INTO requisitions (
                id, title, department, location, employment_type, status,
                headcount, priority, description, requirements,
                target_start_date, comments, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            requisition_id, data.title, data.department, data.location,
            data.employment_type, total_headcount, data.priority,
            data.description, data.requirements,
            data.target_start_date.isoformat() if data.target_start_date else None,
            data.comments,
            current_user["id"], now, now
        ))

        # Create role lines
        for role in data.roles:
            role_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO requisition_roles (
                    id, requisition_id, role_type, requested_count, filled_count,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, 0, ?, ?)
            """, (role_id, requisition_id, role.role_type, role.requested_count, now, now))

        await db.commit()

        # Return created requisition with roles
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM requisitions WHERE id = ?", (requisition_id,)) as cursor:
            row = await cursor.fetchone()
            req = dict(row)

        async with db.execute("""
            SELECT id, requisition_id, role_type, requested_count, filled_count,
                   created_at, updated_at
            FROM requisition_roles
            WHERE requisition_id = ?
        """, (requisition_id,)) as cursor:
            roles = await cursor.fetchall()
            req['roles'] = [
                {
                    **dict(role),
                    'remaining_count': max(0, role['requested_count'] - role['filled_count'])
                }
                for role in roles
            ]

        return req

@router.put("/requisitions/{id}", response_model=RequisitionWithRoles)
async def update_requisition(
    id: str,
    data: RequisitionUpdate,
    current_user = Depends(get_current_director)
):
    """Update requisition"""
    # Build dynamic update query
    updates = []
    params = []

    for field, value in data.model_dump(exclude_unset=True).items():
        if field in ['title', 'department', 'location', 'employment_type', 'status',
                     'priority', 'description', 'requirements', 'target_start_date', 'comments']:
            updates.append(f"{field} = ?")
            params.append(value.isoformat() if hasattr(value, 'isoformat') else value)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            f"UPDATE requisitions SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await db.commit()

        # Return updated requisition with roles
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM requisitions WHERE id = ?", (id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Requisition not found")
            req = dict(row)

        async with db.execute("""
            SELECT id, requisition_id, role_type, requested_count, filled_count,
                   created_at, updated_at
            FROM requisition_roles
            WHERE requisition_id = ?
        """, (id,)) as cursor:
            roles = await cursor.fetchall()
            req['roles'] = [
                {
                    **dict(role),
                    'remaining_count': max(0, role['requested_count'] - role['filled_count'])
                }
                for role in roles
            ]

        return req

@router.post("/requisitions/{id}/fill")
async def fill_requisition(
    id: str,
    current_user = Depends(get_current_director)
):
    """Mark requisition as filled"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("""
            UPDATE requisitions
            SET status = 'filled', filled_date = ?, updated_at = ?
            WHERE id = ?
        """, (datetime.utcnow().isoformat(), datetime.utcnow().isoformat(), id))
        await db.commit()

        return {"status": "success", "message": "Requisition marked as filled"}

@router.delete("/requisitions/{id}")
async def delete_requisition(
    id: str,
    current_user = Depends(get_current_director)
):
    """Delete requisition and its roles"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Roles are deleted via CASCADE, but explicit for clarity
        await db.execute("DELETE FROM requisition_roles WHERE requisition_id = ?", (id,))
        await db.execute("DELETE FROM requisitions WHERE id = ?", (id,))
        await db.commit()
        return {"status": "success", "message": "Requisition deleted"}

# ============================================
# Requisition Roles Endpoints
# ============================================

@router.post("/requisitions/{req_id}/roles", response_model=RequisitionRoleResponse)
async def add_requisition_role(
    req_id: str,
    data: RequisitionRoleCreate,
    current_user = Depends(get_current_director)
):
    """Add a role line to an existing requisition"""
    role_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Verify requisition exists
        async with db.execute("SELECT id FROM requisitions WHERE id = ?", (req_id,)) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Requisition not found")

        # Add role
        await db.execute("""
            INSERT INTO requisition_roles (
                id, requisition_id, role_type, requested_count, filled_count,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, 0, ?, ?)
        """, (role_id, req_id, data.role_type, data.requested_count, now, now))

        # Update requisition headcount
        await db.execute("""
            UPDATE requisitions SET headcount = (
                SELECT SUM(requested_count) FROM requisition_roles WHERE requisition_id = ?
            ), updated_at = ? WHERE id = ?
        """, (req_id, now, req_id))

        await db.commit()

        return {
            "id": role_id,
            "requisition_id": req_id,
            "role_type": data.role_type,
            "requested_count": data.requested_count,
            "filled_count": 0,
            "remaining_count": data.requested_count
        }

@router.put("/requisitions/{req_id}/roles/{role_id}", response_model=RequisitionRoleResponse)
async def update_requisition_role(
    req_id: str,
    role_id: str,
    data: RequisitionRoleUpdate,
    current_user = Depends(get_current_director)
):
    """Update a role line (change counts, mark filled)"""
    updates = []
    params = []
    now = datetime.utcnow().isoformat()

    for field, value in data.model_dump(exclude_unset=True).items():
        if field in ['role_type', 'requested_count', 'filled_count']:
            updates.append(f"{field} = ?")
            params.append(value)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates.append("updated_at = ?")
    params.append(now)
    params.append(role_id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            f"UPDATE requisition_roles SET {', '.join(updates)} WHERE id = ?",
            params
        )

        # Update requisition headcount
        await db.execute("""
            UPDATE requisitions SET headcount = (
                SELECT SUM(requested_count) FROM requisition_roles WHERE requisition_id = ?
            ), updated_at = ? WHERE id = ?
        """, (req_id, now, req_id))

        await db.commit()

        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, requisition_id, role_type, requested_count, filled_count
            FROM requisition_roles WHERE id = ?
        """, (role_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Role not found")
            role = dict(row)
            role['remaining_count'] = max(0, role['requested_count'] - role['filled_count'])
            return role

@router.delete("/requisitions/{req_id}/roles/{role_id}")
async def delete_requisition_role(
    req_id: str,
    role_id: str,
    current_user = Depends(get_current_director)
):
    """Delete a role line from requisition"""
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("DELETE FROM requisition_roles WHERE id = ?", (role_id,))

        # Update requisition headcount
        await db.execute("""
            UPDATE requisitions SET headcount = COALESCE((
                SELECT SUM(requested_count) FROM requisition_roles WHERE requisition_id = ?
            ), 0), updated_at = ? WHERE id = ?
        """, (req_id, now, req_id))

        await db.commit()
        return {"status": "success", "message": "Role deleted"}

@router.post("/requisitions/{req_id}/roles/{role_id}/fill")
async def increment_role_filled(
    req_id: str,
    role_id: str,
    count: int = 1,
    current_user = Depends(get_current_director)
):
    """Increment filled count for a role (when someone is hired)"""
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("""
            UPDATE requisition_roles
            SET filled_count = filled_count + ?, updated_at = ?
            WHERE id = ?
        """, (count, now, role_id))

        # Update requisition timestamp
        await db.execute("""
            UPDATE requisitions SET updated_at = ? WHERE id = ?
        """, (now, req_id))

        await db.commit()

        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, requisition_id, role_type, requested_count, filled_count
            FROM requisition_roles WHERE id = ?
        """, (role_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Role not found")
            role = dict(row)
            role['remaining_count'] = max(0, role['requested_count'] - role['filled_count'])
            return role

@router.post("/requisitions/{requisition_id}/comments", response_model=RequisitionComment, status_code=status.HTTP_201_CREATED)
async def add_requisition_comment(
    requisition_id: str,
    comment: RequisitionCommentCreate,
    current_user = Depends(get_current_user)
):
    """Add a comment to a requisition"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Check if requisition exists
        async with db.execute("SELECT id FROM requisitions WHERE id = ?", (requisition_id,)) as cursor:
            existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Requisition not found")

        comment_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        # Get author name
        async with db.execute("SELECT name FROM users WHERE id = ?", (current_user['id'],)) as cursor:
            user_row = await cursor.fetchone()
            author_name = user_row[0] if user_row else "Unknown"

        # Insert comment
        await db.execute("""
            INSERT INTO requisition_comments (id, requisition_id, author_id, author_name, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (comment_id, requisition_id, current_user['id'], author_name, comment.content, now))

        # Update requisition's updated_at timestamp
        await db.execute("""
            UPDATE requisitions SET updated_at = ? WHERE id = ?
        """, (now, requisition_id))

        await db.commit()

        return RequisitionComment(
            id=comment_id,
            requisition_id=requisition_id,
            author_id=current_user['id'],
            author_name=author_name,
            content=comment.content,
            created_at=now
        )

# ============================================
# Onboarding Templates Endpoints
# ============================================

@router.get("/onboarding-templates", response_model=List[OnboardingTemplate])
async def list_templates(
    current_user = Depends(get_current_user)
):
    """List all onboarding templates"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("""
            SELECT * FROM onboarding_templates ORDER BY name
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

@router.get("/onboarding-templates/{id}", response_model=OnboardingTemplateWithTasks)
async def get_template(
    id: str,
    current_user = Depends(get_current_user)
):
    """Get template with tasks"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Get template
        async with db.execute("SELECT * FROM onboarding_templates WHERE id = ?", (id,)) as cursor:
            template_row = await cursor.fetchone()
            if not template_row:
                raise HTTPException(status_code=404, detail="Template not found")
            template = dict(template_row)

        # Get tasks
        async with db.execute("""
            SELECT id, template_id, title as task_title, description as task_description,
                   category, day_offset, assigned_to_role, sort_order as order_index
            FROM onboarding_checklist_items
            WHERE template_id = ?
            ORDER BY sort_order
        """, (id,)) as cursor:
            tasks = await cursor.fetchall()
            template['tasks'] = [dict(row) for row in tasks]

        return template

@router.post("/onboarding-templates", response_model=OnboardingTemplate)
async def create_template(
    data: OnboardingTemplateCreate,
    current_user = Depends(get_current_director)
):
    """Create onboarding template"""
    template_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("""
            INSERT INTO onboarding_templates (
                id, name, role_type, description, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (template_id, data.name, data.role_type, data.description,
              current_user["id"], now, now))
        await db.commit()

        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM onboarding_templates WHERE id = ?", (template_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row)

@router.put("/onboarding-templates/{id}", response_model=OnboardingTemplate)
async def update_template(
    id: str,
    data: OnboardingTemplateUpdate,
    current_user = Depends(get_current_director)
):
    """Update onboarding template"""
    updates = []
    params = []

    for field, value in data.model_dump(exclude_unset=True).items():
        updates.append(f"{field} = ?")
        params.append(value)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            f"UPDATE onboarding_templates SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await db.commit()

        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM onboarding_templates WHERE id = ?", (id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Template not found")
            return dict(row)

@router.delete("/onboarding-templates/{id}")
async def delete_template(
    id: str,
    current_user = Depends(get_current_director)
):
    """Delete onboarding template"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("DELETE FROM onboarding_templates WHERE id = ?", (id,))
        await db.commit()
        return {"status": "success", "message": "Template deleted"}

@router.post("/onboarding-templates/{id}/tasks", response_model=TemplateTask)
async def add_template_task(
    id: str,
    data: TemplateTaskCreate,
    current_user = Depends(get_current_director)
):
    """Add task to template"""
    task_id = str(uuid.uuid4())

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("""
            INSERT INTO onboarding_checklist_items (
                id, template_id, title, description, category,
                day_offset, assigned_to_role, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (task_id, id, data.task_title, data.task_description, data.category,
              data.day_offset, data.assigned_to_role, data.order_index))
        await db.commit()

        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, template_id, title as task_title, description as task_description,
                   category, day_offset, assigned_to_role, sort_order as order_index
            FROM onboarding_checklist_items WHERE id = ?
        """, (task_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row)

@router.put("/onboarding-templates/{template_id}/tasks/{task_id}", response_model=TemplateTask)
async def update_template_task(
    template_id: str,
    task_id: str,
    data: TemplateTaskUpdate,
    current_user = Depends(get_current_director)
):
    """Update template task"""
    # Map model fields to database columns
    field_mapping = {
        'task_title': 'title',
        'task_description': 'description',
        'order_index': 'sort_order'
    }

    updates = []
    params = []

    for field, value in data.model_dump(exclude_unset=True).items():
        db_field = field_mapping.get(field, field)
        updates.append(f"{db_field} = ?")
        params.append(value)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(task_id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            f"UPDATE onboarding_checklist_items SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await db.commit()

        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, template_id, title as task_title, description as task_description,
                   category, day_offset, assigned_to_role, sort_order as order_index
            FROM onboarding_checklist_items WHERE id = ?
        """, (task_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Task not found")
            return dict(row)

@router.delete("/onboarding-templates/{template_id}/tasks/{task_id}")
async def delete_template_task(
    template_id: str,
    task_id: str,
    current_user = Depends(get_current_director)
):
    """Delete template task"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("DELETE FROM onboarding_checklist_items WHERE id = ?", (task_id,))
        await db.commit()
        return {"status": "success", "message": "Task deleted"}

# ============================================
# New Hires Endpoints
# ============================================

@router.get("/new-hires", response_model=List[NewHire])
async def list_new_hires(
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """List all new hires"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        query = """
            SELECT id, name, email, role, department, start_date, manager_id,
                   onboarding_template_id, status, created_at, updated_at
            FROM team_members
        """
        params = []

        if status:
            query += " WHERE status = ?"
            params.append(status)

        query += " ORDER BY start_date DESC"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

@router.get("/new-hires/stats", response_model=NewHireStats)
async def get_new_hire_stats(
    current_user = Depends(get_current_user)
):
    """Get new hire statistics"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM team_members
        """) as cursor:
            row = await cursor.fetchone()
            return dict(row)

@router.get("/new-hires/{id}", response_model=NewHireWithTasks)
async def get_new_hire(
    id: str,
    current_user = Depends(get_current_user)
):
    """Get new hire with onboarding tasks"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Get new hire
        async with db.execute("""
            SELECT id, name, email, role, department, start_date, manager_id,
                   onboarding_template_id, status, created_at, updated_at
            FROM team_members WHERE id = ?
        """, (id,)) as cursor:
            hire_row = await cursor.fetchone()
            if not hire_row:
                raise HTTPException(status_code=404, detail="New hire not found")
            hire = dict(hire_row)

        # Get onboarding tasks
        async with db.execute("""
            SELECT id, team_member_id as new_hire_id, task_title, task_description,
                   category, due_date, assigned_to, status, completed, completed_at,
                   completed_by, notes, order_index
            FROM onboarding_progress
            WHERE team_member_id = ?
            ORDER BY order_index
        """, (id,)) as cursor:
            tasks = await cursor.fetchall()
            hire['tasks'] = [dict(row) for row in tasks]

        return hire

@router.post("/new-hires", response_model=NewHire)
async def create_new_hire(
    data: NewHireCreate,
    current_user = Depends(get_current_director)
):
    """Create new hire and auto-apply onboarding template"""
    hire_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Create new hire
        await db.execute("""
            INSERT INTO team_members (
                id, name, email, role, department, start_date, manager_id,
                onboarding_template_id, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        """, (hire_id, data.name, data.email, data.role, data.department,
              data.start_date.isoformat(), data.manager_id,
              data.onboarding_template_id, now, now))

        # If template specified, apply it
        if data.onboarding_template_id:
            # Get template tasks
            async with db.execute("""
                SELECT id, title, description, category, day_offset, assigned_to_role, sort_order
                FROM onboarding_checklist_items
                WHERE template_id = ?
                ORDER BY sort_order
            """, (data.onboarding_template_id,)) as cursor:
                template_tasks = await cursor.fetchall()

                # Create onboarding progress tasks
                for task in template_tasks:
                    progress_id = str(uuid.uuid4())
                    # Calculate due date (start_date + day_offset)
                    due_date = data.start_date + timedelta(days=task[4])  # day_offset

                    await db.execute("""
                        INSERT INTO onboarding_progress (
                            id, team_member_id, checklist_item_id, task_title, task_description,
                            category, due_date, assigned_to, status, completed, order_index
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
                    """, (progress_id, hire_id, task[0], task[1], task[2],
                          task[3], due_date.isoformat(), task[5], task[6]))

        await db.commit()

        # Return created new hire
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, name, email, role, department, start_date, manager_id,
                   onboarding_template_id, status, created_at, updated_at
            FROM team_members WHERE id = ?
        """, (hire_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row)

@router.put("/new-hires/{id}", response_model=NewHire)
async def update_new_hire(
    id: str,
    data: NewHireUpdate,
    current_user = Depends(get_current_director)
):
    """Update new hire info"""
    updates = []
    params = []

    for field, value in data.model_dump(exclude_unset=True).items():
        if field in ['name', 'email', 'role', 'department', 'start_date', 'manager_id', 'status']:
            updates.append(f"{field} = ?")
            params.append(value.isoformat() if hasattr(value, 'isoformat') else value)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            f"UPDATE team_members SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await db.commit()

        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, name, email, role, department, start_date, manager_id,
                   onboarding_template_id, status, created_at, updated_at
            FROM team_members WHERE id = ?
        """, (id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="New hire not found")
            return dict(row)

@router.delete("/new-hires/{id}")
async def delete_new_hire(
    id: str,
    current_user = Depends(get_current_director)
):
    """Delete new hire"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("DELETE FROM team_members WHERE id = ?", (id,))
        await db.commit()
        return {"status": "success", "message": "New hire deleted"}

@router.put("/new-hires/{hire_id}/tasks/{task_id}", response_model=OnboardingTask)
async def update_onboarding_task(
    hire_id: str,
    task_id: str,
    data: OnboardingTaskUpdate,
    current_user = Depends(get_current_user)  # Anyone can update tasks
):
    """Update onboarding task status"""
    updates = []
    params = []

    for field, value in data.model_dump(exclude_unset=True).items():
        updates.append(f"{field} = ?")
        params.append(value)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(task_id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            f"UPDATE onboarding_progress SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await db.commit()

        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, team_member_id as new_hire_id, task_title, task_description,
                   category, due_date, assigned_to, status, completed, completed_at,
                   completed_by, notes, order_index
            FROM onboarding_progress WHERE id = ?
        """, (task_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Task not found")
            return dict(row)

@router.post("/new-hires/{hire_id}/tasks/{task_id}/complete")
async def complete_onboarding_task(
    hire_id: str,
    task_id: str,
    current_user = Depends(get_current_user)
):
    """Mark onboarding task as complete"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("""
            UPDATE onboarding_progress
            SET status = 'completed', completed = 1, completed_at = ?, completed_by = ?
            WHERE id = ?
        """, (datetime.utcnow().isoformat(), current_user["id"], task_id))
        await db.commit()

        return {"status": "success", "message": "Task marked as complete"}
