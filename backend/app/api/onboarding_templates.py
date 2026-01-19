"""
Onboarding Template Management API
Manages default checklist templates that are applied to new hires
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
import aiosqlite
from pathlib import Path
import uuid
import json

from ..middleware.auth import get_current_user, get_current_director
from ..models.people import (
    DefaultChecklistItem, DefaultChecklistItemCreate, DefaultChecklistItemUpdate,
    ChecklistItemReorder
)

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent.parent / "data"

# ============================================
# Default Checklist Template Endpoints
# ============================================

@router.get("/templates/checklist", response_model=List[DefaultChecklistItem])
async def get_default_checklist(current_user = Depends(get_current_user)):
    """Get all default checklist items with their stages"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("""
            SELECT id, item_name, order_index, stages_json
            FROM default_onboarding_checklist
            ORDER BY order_index
        """) as cursor:
            rows = await cursor.fetchall()

            return [
                {
                    'id': row['id'],
                    'item_name': row['item_name'],
                    'order_index': row['order_index'],
                    'stages': json.loads(row['stages_json'])
                }
                for row in rows
            ]


@router.post("/templates/checklist", response_model=DefaultChecklistItem)
async def add_default_checklist_item(
    data: DefaultChecklistItemCreate,
    current_user = Depends(get_current_director)
):
    """Add a new default checklist item (Directors only)"""
    item_id = f"chk-{str(uuid.uuid4())[:8]}"

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Get next order_index
        async with db.execute(
            "SELECT MAX(order_index) FROM default_onboarding_checklist"
        ) as cursor:
            row = await cursor.fetchone()
            next_order = (row[0] or 0) + 1

        # Convert stages to JSON
        stages_json = json.dumps([
            {'stage_label': s.stage_label, 'stage_category': s.stage_category}
            for s in data.stages
        ])

        await db.execute("""
            INSERT INTO default_onboarding_checklist (id, item_name, order_index, stages_json)
            VALUES (?, ?, ?, ?)
        """, (item_id, data.item_name, next_order, stages_json))
        await db.commit()

        return {
            'id': item_id,
            'item_name': data.item_name,
            'order_index': next_order,
            'stages': [{'stage_label': s.stage_label, 'stage_category': s.stage_category} for s in data.stages]
        }


@router.put("/templates/checklist/{item_id}", response_model=DefaultChecklistItem)
async def update_default_checklist_item(
    item_id: str,
    data: DefaultChecklistItemUpdate,
    current_user = Depends(get_current_director)
):
    """Update a default checklist item (Directors only)"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Check if item exists
        async with db.execute(
            "SELECT id, item_name, order_index, stages_json FROM default_onboarding_checklist WHERE id = ?",
            (item_id,)
        ) as cursor:
            existing = await cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Template item not found")

        # Build update query
        updates = []
        params = []

        if data.item_name is not None:
            updates.append("item_name = ?")
            params.append(data.item_name)

        if data.stages is not None:
            stages_json = json.dumps([
                {'stage_label': s.stage_label, 'stage_category': s.stage_category}
                for s in data.stages
            ])
            updates.append("stages_json = ?")
            params.append(stages_json)

        if updates:
            params.append(item_id)
            await db.execute(
                f"UPDATE default_onboarding_checklist SET {', '.join(updates)} WHERE id = ?",
                params
            )
            await db.commit()

        # Fetch updated item
        async with db.execute(
            "SELECT id, item_name, order_index, stages_json FROM default_onboarding_checklist WHERE id = ?",
            (item_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return {
                'id': row['id'],
                'item_name': row['item_name'],
                'order_index': row['order_index'],
                'stages': json.loads(row['stages_json'])
            }


@router.delete("/templates/checklist/{item_id}")
async def delete_default_checklist_item(
    item_id: str,
    current_user = Depends(get_current_director)
):
    """Delete a default checklist item (Directors only)"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Check if item exists
        async with db.execute(
            "SELECT id FROM default_onboarding_checklist WHERE id = ?",
            (item_id,)
        ) as cursor:
            existing = await cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Template item not found")

        await db.execute(
            "DELETE FROM default_onboarding_checklist WHERE id = ?",
            (item_id,)
        )
        await db.commit()

    return {"status": "success", "message": "Template item deleted"}


@router.post("/templates/checklist/reorder")
async def reorder_default_checklist(
    reorders: List[ChecklistItemReorder],
    current_user = Depends(get_current_director)
):
    """Reorder default checklist items (Directors only)"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        for reorder in reorders:
            await db.execute("""
                UPDATE default_onboarding_checklist
                SET order_index = ?
                WHERE id = ?
            """, (reorder.new_order, reorder.item_id))
        await db.commit()

    return {"status": "success", "message": "Template items reordered"}
