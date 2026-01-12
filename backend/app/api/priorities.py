"""
Priorities API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import aiosqlite
import uuid

from ..config import DATA_DIR
from ..middleware.auth import get_current_user, get_current_director

router = APIRouter(prefix="/priorities", tags=["Priorities"])

# Pydantic models
class PriorityCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: str = Field(default="active", pattern="^(active|completed|deferred)$")
    due_date: Optional[str] = None  # ISO date string
    sort_order: int = Field(default=0)

class PriorityUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|completed|deferred)$")
    due_date: Optional[str] = None
    sort_order: Optional[int] = None

class PriorityUpdateCreate(BaseModel):
    content: str = Field(..., min_length=1)

class PriorityUpdateResponse(BaseModel):
    id: str
    priority_id: str
    author_id: str
    author_name: str
    content: str
    created_at: str

class PriorityResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    owner_id: str
    owner_name: str
    status: str
    due_date: Optional[str]
    sort_order: int
    created_at: str
    updated_at: str
    updates: List[PriorityUpdateResponse] = []


@router.get("", response_model=List[PriorityResponse])
async def list_priorities(
    status: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all priorities with optional filters"""
    async with aiosqlite.connect(DATA_DIR / 'portal.db') as db:
        query = """
            SELECT
                p.id, p.title, p.description, p.owner_id, u.name as owner_name,
                p.status, p.due_date, p.sort_order,
                p.created_at, p.updated_at
            FROM priorities p
            JOIN users u ON p.owner_id = u.id
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND p.status = ?"
            params.append(status)

        query += " ORDER BY p.sort_order ASC, p.created_at DESC"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()

        # Get updates for each priority
        priorities = []
        for row in rows:
            priority_id = row[0]

            # Get updates
            update_query = """
                SELECT pu.id, pu.priority_id, pu.author_id, u.name as author_name,
                       pu.content, pu.created_at
                FROM priority_updates pu
                JOIN users u ON pu.author_id = u.id
                WHERE pu.priority_id = ?
                ORDER BY pu.created_at DESC
            """
            async with db.execute(update_query, (priority_id,)) as cursor:
                update_rows = await cursor.fetchall()

            updates = [
                PriorityUpdateResponse(
                    id=u[0], priority_id=u[1], author_id=u[2],
                    author_name=u[3], content=u[4], created_at=u[5]
                ) for u in update_rows
            ]

            priorities.append(PriorityResponse(
                id=row[0], title=row[1], description=row[2],
                owner_id=row[3], owner_name=row[4], status=row[5],
                due_date=row[6], sort_order=row[7],
                created_at=row[8], updated_at=row[9], updates=updates
            ))

        return priorities


@router.post("", response_model=PriorityResponse, status_code=status.HTTP_201_CREATED)
async def create_priority(
    priority: PriorityCreate,
    current_user: dict = Depends(get_current_director)
):
    """Create a new priority (directors and admins only)"""
    priority_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / 'portal.db') as db:
        await db.execute("""
            INSERT INTO priorities
            (id, title, description, owner_id, status, due_date, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            priority_id, priority.title, priority.description, current_user['id'],
            priority.status, priority.due_date, priority.sort_order, now, now
        ))
        await db.commit()

    # Return the created priority
    async with aiosqlite.connect(DATA_DIR / 'portal.db') as db:
        async with db.execute("""
            SELECT p.id, p.title, p.description, p.owner_id, u.name as owner_name,
                   p.status, p.due_date, p.sort_order,
                   p.created_at, p.updated_at
            FROM priorities p
            JOIN users u ON p.owner_id = u.id
            WHERE p.id = ?
        """, (priority_id,)) as cursor:
            row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Priority not found")

    return PriorityResponse(
        id=row[0], title=row[1], description=row[2],
        owner_id=row[3], owner_name=row[4], status=row[5],
        due_date=row[6], sort_order=row[7],
        created_at=row[8], updated_at=row[9], updates=[]
    )


@router.get("/{priority_id}", response_model=PriorityResponse)
async def get_priority(
    priority_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific priority with all its updates"""
    async with aiosqlite.connect(DATA_DIR / 'portal.db') as db:
        async with db.execute("""
            SELECT p.id, p.title, p.description, p.owner_id, u.name as owner_name,
                   p.status, p.due_date, p.sort_order,
                   p.created_at, p.updated_at
            FROM priorities p
            JOIN users u ON p.owner_id = u.id
            WHERE p.id = ?
        """, (priority_id,)) as cursor:
            row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Priority not found")

        # Get updates
        async with db.execute("""
            SELECT pu.id, pu.priority_id, pu.author_id, u.name as author_name,
                   pu.content, pu.created_at
            FROM priority_updates pu
            JOIN users u ON pu.author_id = u.id
            WHERE pu.priority_id = ?
            ORDER BY pu.created_at DESC
        """, (priority_id,)) as cursor:
            update_rows = await cursor.fetchall()

        updates = [
            PriorityUpdateResponse(
                id=u[0], priority_id=u[1], author_id=u[2],
                author_name=u[3], content=u[4], created_at=u[5]
            ) for u in update_rows
        ]

        return PriorityResponse(
            id=row[0], title=row[1], description=row[2],
            owner_id=row[3], owner_name=row[4], status=row[5],
            due_date=row[6], sort_order=row[7],
            created_at=row[8], updated_at=row[9], updates=updates
        )


@router.put("/{priority_id}", response_model=PriorityResponse)
async def update_priority(
    priority_id: str,
    priority: PriorityUpdate,
    current_user: dict = Depends(get_current_director)
):
    """Update a priority (directors and admins only)"""
    # Check if priority exists
    async with aiosqlite.connect(DATA_DIR / 'portal.db') as db:
        async with db.execute("SELECT id FROM priorities WHERE id = ?", (priority_id,)) as cursor:
            existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Priority not found")

        # Build update query dynamically based on provided fields
        update_fields = []
        params = []

        if priority.title is not None:
            update_fields.append("title = ?")
            params.append(priority.title)
        if priority.description is not None:
            update_fields.append("description = ?")
            params.append(priority.description)
        if priority.status is not None:
            update_fields.append("status = ?")
            params.append(priority.status)
        if priority.due_date is not None:
            update_fields.append("due_date = ?")
            params.append(priority.due_date)
        if priority.sort_order is not None:
            update_fields.append("sort_order = ?")
            params.append(priority.sort_order)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        params.append(priority_id)

        query = f"UPDATE priorities SET {', '.join(update_fields)} WHERE id = ?"
        await db.execute(query, params)
        await db.commit()

    # Return updated priority
    return await get_priority(priority_id, current_user)


@router.delete("/{priority_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_priority(
    priority_id: str,
    current_user: dict = Depends(get_current_director)
):
    """Delete a priority (directors and admins only)"""
    async with aiosqlite.connect(DATA_DIR / 'portal.db') as db:
        async with db.execute("SELECT id FROM priorities WHERE id = ?", (priority_id,)) as cursor:
            existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Priority not found")

        # Delete updates first (foreign key constraint)
        await db.execute("DELETE FROM priority_updates WHERE priority_id = ?", (priority_id,))
        await db.execute("DELETE FROM priorities WHERE id = ?", (priority_id,))
        await db.commit()


@router.post("/{priority_id}/updates", response_model=PriorityUpdateResponse, status_code=status.HTTP_201_CREATED)
async def add_priority_update(
    priority_id: str,
    update: PriorityUpdateCreate,
    current_user: dict = Depends(get_current_director)
):
    """Add an update to a priority (directors and admins only)"""
    # Check if priority exists
    async with aiosqlite.connect(DATA_DIR / 'portal.db') as db:
        async with db.execute("SELECT id FROM priorities WHERE id = ?", (priority_id,)) as cursor:
            existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Priority not found")

        update_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        await db.execute("""
            INSERT INTO priority_updates (id, priority_id, author_id, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (update_id, priority_id, current_user['id'], update.content, now))

        # Update the priority's updated_at timestamp
        await db.execute("""
            UPDATE priorities SET updated_at = ? WHERE id = ?
        """, (now, priority_id))

        await db.commit()

        # Get author name
        async with db.execute("SELECT name FROM users WHERE id = ?", (current_user['id'],)) as cursor:
            user_row = await cursor.fetchone()

        return PriorityUpdateResponse(
            id=update_id,
            priority_id=priority_id,
            author_id=current_user['id'],
            author_name=user_row[0] if user_row else "Unknown",
            content=update.content,
            created_at=now
        )
