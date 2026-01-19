"""
Onboarding Checklist Management API
Handles checklist items and stages for new hires
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
import aiosqlite
from pathlib import Path
import uuid
import json
from datetime import datetime

from ..middleware.auth import get_current_user, get_current_director
from ..models.people import (
    ChecklistItem, ChecklistItemCreate, ChecklistItemUpdate, ChecklistItemReorder,
    ChecklistStage, ChecklistStageUpdate
)

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent.parent / "data"

# ============================================
# Checklist Management Endpoints
# ============================================

@router.get("/new-hires/{hire_id}/checklist", response_model=List[ChecklistItem])
async def get_checklist(
    hire_id: str,
    current_user = Depends(get_current_user)
):
    """Get full checklist for a new hire with all stages"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Get all checklist items for this hire
        async with db.execute("""
            SELECT id, team_member_id, item_name, order_index, created_at
            FROM onboarding_checklist_items
            WHERE team_member_id = ?
            ORDER BY order_index
        """, (hire_id,)) as cursor:
            items = await cursor.fetchall()

        if not items:
            raise HTTPException(status_code=404, detail="No checklist found for this hire")

        result = []
        for item_row in items:
            item_dict = dict(item_row)

            # Get all stages for this item
            async with db.execute("""
                SELECT id, checklist_item_id, stage_label, stage_category, stage_order,
                       is_completed, completed_at, completed_by, notes
                FROM onboarding_checklist_stages
                WHERE checklist_item_id = ?
                ORDER BY stage_order
            """, (item_dict['id'],)) as cursor:
                stages = await cursor.fetchall()

            item_dict['stages'] = [dict(stage) for stage in stages]
            result.append(item_dict)

        return result

@router.post("/new-hires/{hire_id}/checklist/items", response_model=ChecklistItem)
async def add_checklist_item(
    hire_id: str,
    data: ChecklistItemCreate,
    current_user = Depends(get_current_director)
):
    """Add a new checklist item to a hire's onboarding"""
    item_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Create the checklist item
        await db.execute("""
            INSERT INTO onboarding_checklist_items (id, team_member_id, item_name, order_index, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (item_id, hire_id, data.item_name, data.order_index, now))

        # Create stages for this item
        stages = []
        for idx, stage_data in enumerate(data.stages):
            stage_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO onboarding_checklist_stages
                (id, checklist_item_id, stage_label, stage_category, stage_order, is_completed)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (stage_id, item_id, stage_data.stage_label, stage_data.stage_category, idx))

            stages.append({
                'id': stage_id,
                'checklist_item_id': item_id,
                'stage_label': stage_data.stage_label,
                'stage_category': stage_data.stage_category,
                'stage_order': idx,
                'is_completed': False,
                'completed_at': None,
                'completed_by': None,
                'notes': None
            })

        await db.commit()

        return {
            'id': item_id,
            'team_member_id': hire_id,
            'item_name': data.item_name,
            'order_index': data.order_index,
            'created_at': now,
            'stages': stages
        }

@router.put("/new-hires/{hire_id}/checklist/items/{item_id}", response_model=ChecklistItem)
async def update_checklist_item(
    hire_id: str,
    item_id: str,
    data: ChecklistItemUpdate,
    current_user = Depends(get_current_director)
):
    """Update a checklist item's name or order"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        updates = []
        params = []

        if data.item_name is not None:
            updates.append("item_name = ?")
            params.append(data.item_name)
        if data.order_index is not None:
            updates.append("order_index = ?")
            params.append(data.order_index)

        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")

        params.extend([item_id, hire_id])
        await db.execute(f"""
            UPDATE onboarding_checklist_items
            SET {', '.join(updates)}
            WHERE id = ? AND team_member_id = ?
        """, params)
        await db.commit()

        # Return updated item
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, team_member_id, item_name, order_index, created_at
            FROM onboarding_checklist_items
            WHERE id = ?
        """, (item_id,)) as cursor:
            item = await cursor.fetchone()
            if not item:
                raise HTTPException(status_code=404, detail="Checklist item not found")

            item_dict = dict(item)

            # Get stages
            async with db.execute("""
                SELECT id, checklist_item_id, stage_label, stage_category, stage_order,
                       is_completed, completed_at, completed_by, notes
                FROM onboarding_checklist_stages
                WHERE checklist_item_id = ?
                ORDER BY stage_order
            """, (item_id,)) as cursor:
                stages = await cursor.fetchall()

            item_dict['stages'] = [dict(s) for s in stages]
            return item_dict

@router.delete("/new-hires/{hire_id}/checklist/items/{item_id}")
async def delete_checklist_item(
    hire_id: str,
    item_id: str,
    current_user = Depends(get_current_director)
):
    """Delete a checklist item (and all its stages via CASCADE)"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("""
            DELETE FROM onboarding_checklist_items
            WHERE id = ? AND team_member_id = ?
        """, (item_id, hire_id))
        await db.commit()

    return {"status": "success", "message": "Checklist item deleted"}

@router.post("/new-hires/{hire_id}/checklist/reorder")
async def reorder_checklist_items(
    hire_id: str,
    reorders: List[ChecklistItemReorder],
    current_user = Depends(get_current_director)
):
    """Reorder multiple checklist items"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        for reorder in reorders:
            await db.execute("""
                UPDATE onboarding_checklist_items
                SET order_index = ?
                WHERE id = ? AND team_member_id = ?
            """, (reorder.new_order, reorder.item_id, hire_id))
        await db.commit()

    return {"status": "success", "message": "Checklist reordered"}

# ============================================
# Stage Management Endpoints
# ============================================

@router.put("/new-hires/{hire_id}/checklist/stages/{stage_id}", response_model=ChecklistStage)
async def update_checklist_stage(
    hire_id: str,
    stage_id: str,
    data: ChecklistStageUpdate,
    current_user = Depends(get_current_user)
):
    """Toggle a stage completion status or update notes"""
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        updates = []
        params = []

        if data.is_completed is not None:
            updates.append("is_completed = ?")
            params.append(1 if data.is_completed else 0)

            if data.is_completed:
                updates.append("completed_at = ?")
                updates.append("completed_by = ?")
                params.extend([now, current_user['id']])
            else:
                updates.append("completed_at = NULL")
                updates.append("completed_by = NULL")

        if data.notes is not None:
            updates.append("notes = ?")
            params.append(data.notes)

        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")

        params.append(stage_id)
        await db.execute(f"""
            UPDATE onboarding_checklist_stages
            SET {', '.join(updates)}
            WHERE id = ?
        """, params)
        await db.commit()

        # Return updated stage
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, checklist_item_id, stage_label, stage_category, stage_order,
                   is_completed, completed_at, completed_by, notes
            FROM onboarding_checklist_stages
            WHERE id = ?
        """, (stage_id,)) as cursor:
            stage = await cursor.fetchone()
            if not stage:
                raise HTTPException(status_code=404, detail="Stage not found")
            return dict(stage)

# ============================================
# Helper Functions
# ============================================

async def create_default_checklist_for_hire(hire_id: str, db: aiosqlite.Connection):
    """Create default checklist for a new hire from template"""
    # Get default checklist
    async with db.execute("""
        SELECT id, item_name, order_index, stages_json
        FROM default_onboarding_checklist
        ORDER BY order_index
    """) as cursor:
        default_items = await cursor.fetchall()

    if not default_items:
        raise Exception("Default checklist template not found. Run migration first.")

    # Create checklist items for this hire
    for item_row in default_items:
        item_id = str(uuid.uuid4())
        stages_data = json.loads(item_row[3])  # stages_json

        await db.execute("""
            INSERT INTO onboarding_checklist_items (id, team_member_id, item_name, order_index, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        """, (item_id, hire_id, item_row[1], item_row[2]))  # item_name, order_index

        # Create stages for this item
        for idx, stage in enumerate(stages_data):
            stage_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO onboarding_checklist_stages
                (id, checklist_item_id, stage_label, stage_category, stage_order, is_completed)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (stage_id, item_id, stage['label'], stage.get('category'), idx))
