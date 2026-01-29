"""
Pipeline Opportunities API endpoints
Manual opportunity tracking for sales pipeline dashboard
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from datetime import datetime
import aiosqlite
import uuid

from ..config import DATA_DIR
from ..middleware.auth import get_current_user, get_current_director
from ..models.pipeline import (
    PipelineOpportunityCreate,
    PipelineOpportunityUpdate,
    PipelineOpportunity,
    PipelineStats,
    OpportunityCommentCreate,
    OpportunityCommentUpdate,
    OpportunityComment
)

router = APIRouter()

# ============================================
# Pipeline Opportunities Endpoints
# ============================================

@router.get("/opportunities", response_model=List[PipelineOpportunity])
async def list_opportunities(
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """List all pipeline opportunities with author names and comments"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        query = """
            SELECT po.*, u.name as author_name
            FROM pipeline_opportunities po
            LEFT JOIN users u ON po.created_by = u.id
        """
        params = []

        if status:
            query += " WHERE po.status = ?"
            params.append(status)

        query += " ORDER BY po.created_at DESC"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            opportunities = [dict(row) for row in rows]

        # Fetch comments for all opportunities
        opp_ids = [opp['id'] for opp in opportunities]
        if opp_ids:
            placeholders = ','.join('?' * len(opp_ids))
            async with db.execute(f"""
                SELECT id, opportunity_id, author_id, author_name, content, created_at
                FROM opportunity_comments
                WHERE opportunity_id IN ({placeholders})
                ORDER BY created_at DESC
            """, opp_ids) as cursor:
                comment_rows = await cursor.fetchall()

            # Group comments by opportunity_id
            comments_by_opp = {}
            for row in comment_rows:
                comment = dict(row)
                opp_id = comment['opportunity_id']
                if opp_id not in comments_by_opp:
                    comments_by_opp[opp_id] = []
                comments_by_opp[opp_id].append(comment)

            # Attach comments to opportunities
            for opp in opportunities:
                opp['comments'] = comments_by_opp.get(opp['id'], [])

        return opportunities

@router.get("/opportunities/stats", response_model=PipelineStats)
async def get_pipeline_stats(
    current_user = Depends(get_current_user)
):
    """Get pipeline statistics"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
                SUM(CASE WHEN status = 'meeting' THEN 1 ELSE 0 END) as meeting,
                SUM(CASE WHEN status = 'assessing' THEN 1 ELSE 0 END) as assessing,
                SUM(CASE WHEN status = 'implementation' THEN 1 ELSE 0 END) as implementation
            FROM pipeline_opportunities
        """) as cursor:
            row = await cursor.fetchone()
            return dict(row)

@router.get("/opportunities/{id}", response_model=PipelineOpportunity)
async def get_opportunity(
    id: str,
    current_user = Depends(get_current_user)
):
    """Get single opportunity by ID"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT * FROM pipeline_opportunities WHERE id = ?",
            (id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Opportunity not found"
                )
            return dict(row)

@router.post("/opportunities", response_model=PipelineOpportunity, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    opportunity: PipelineOpportunityCreate,
    current_user = Depends(get_current_user)
):
    """Create a new pipeline opportunity"""
    opportunity_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("""
            INSERT INTO pipeline_opportunities (
                id, client_name, size, likelihood, status, target_date, notes,
                created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            opportunity_id,
            opportunity.client_name,
            opportunity.size,
            opportunity.likelihood,
            opportunity.status,
            opportunity.target_date.isoformat() if opportunity.target_date else None,
            opportunity.notes,
            current_user['id'],
            now,
            now
        ))
        await db.commit()

    # Fetch and return the created opportunity
    return await get_opportunity(opportunity_id, current_user)

@router.put("/opportunities/{id}", response_model=PipelineOpportunity)
async def update_opportunity(
    id: str,
    opportunity: PipelineOpportunityUpdate,
    current_user = Depends(get_current_user)
):
    """Update an existing opportunity"""
    # Check if exists
    await get_opportunity(id, current_user)

    # Build update query dynamically
    update_fields = []
    params = []

    if opportunity.client_name is not None:
        update_fields.append("client_name = ?")
        params.append(opportunity.client_name)

    if opportunity.size is not None:
        update_fields.append("size = ?")
        params.append(opportunity.size)

    if opportunity.likelihood is not None:
        update_fields.append("likelihood = ?")
        params.append(opportunity.likelihood)

    if opportunity.status is not None:
        update_fields.append("status = ?")
        params.append(opportunity.status)

    if opportunity.target_date is not None:
        update_fields.append("target_date = ?")
        params.append(opportunity.target_date.isoformat())

    if opportunity.notes is not None:
        update_fields.append("notes = ?")
        params.append(opportunity.notes)

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    update_fields.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            f"UPDATE pipeline_opportunities SET {', '.join(update_fields)} WHERE id = ?",
            params
        )
        await db.commit()

    return await get_opportunity(id, current_user)

@router.delete("/opportunities/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    id: str,
    current_user = Depends(get_current_director)  # Only directors can delete
):
    """Delete an opportunity"""
    # Check if exists
    await get_opportunity(id, current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            "DELETE FROM pipeline_opportunities WHERE id = ?",
            (id,)
        )
        await db.commit()

    return None

@router.post("/opportunities/{opportunity_id}/comments", response_model=OpportunityComment, status_code=status.HTTP_201_CREATED)
async def add_opportunity_comment(
    opportunity_id: str,
    comment: OpportunityCommentCreate,
    current_user = Depends(get_current_user)
):
    """Add a comment to an opportunity"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Check if opportunity exists
        async with db.execute("SELECT id FROM pipeline_opportunities WHERE id = ?", (opportunity_id,)) as cursor:
            existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        comment_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        # Get author name
        async with db.execute("SELECT name FROM users WHERE id = ?", (current_user['id'],)) as cursor:
            user_row = await cursor.fetchone()
            author_name = user_row[0] if user_row else "Unknown"

        # Insert comment
        await db.execute("""
            INSERT INTO opportunity_comments (id, opportunity_id, author_id, author_name, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (comment_id, opportunity_id, current_user['id'], author_name, comment.content, now))

        # Update opportunity's updated_at timestamp
        await db.execute("""
            UPDATE pipeline_opportunities SET updated_at = ? WHERE id = ?
        """, (now, opportunity_id))

        await db.commit()

        return OpportunityComment(
            id=comment_id,
            opportunity_id=opportunity_id,
            author_id=current_user['id'],
            author_name=author_name,
            content=comment.content,
            created_at=now
        )

@router.get("/opportunities/{opportunity_id}/comments", response_model=List[OpportunityComment])
async def get_opportunity_comments(
    opportunity_id: str,
    current_user = Depends(get_current_user)
):
    """Get all comments for an opportunity"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Check if opportunity exists
        async with db.execute("SELECT id FROM pipeline_opportunities WHERE id = ?", (opportunity_id,)) as cursor:
            existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        # Get comments ordered by most recent first
        async with db.execute("""
            SELECT id, opportunity_id, author_id, author_name, content, created_at
            FROM opportunity_comments
            WHERE opportunity_id = ?
            ORDER BY created_at DESC
        """, (opportunity_id,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

@router.put("/opportunities/{opportunity_id}/comments/{comment_id}", response_model=OpportunityComment)
async def update_opportunity_comment(
    opportunity_id: str,
    comment_id: str,
    comment: OpportunityCommentUpdate,
    current_user = Depends(get_current_user)
):
    """Update a comment on an opportunity"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Check if comment exists and belongs to the opportunity
        async with db.execute(
            "SELECT * FROM opportunity_comments WHERE id = ? AND opportunity_id = ?",
            (comment_id, opportunity_id)
        ) as cursor:
            existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Comment not found")

        # Update the comment
        await db.execute(
            "UPDATE opportunity_comments SET content = ? WHERE id = ?",
            (comment.content, comment_id)
        )
        await db.commit()

        # Return updated comment
        async with db.execute(
            "SELECT * FROM opportunity_comments WHERE id = ?",
            (comment_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row)

@router.delete("/opportunities/{opportunity_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity_comment(
    opportunity_id: str,
    comment_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a comment from an opportunity"""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        # Check if comment exists and belongs to the opportunity
        async with db.execute(
            "SELECT id FROM opportunity_comments WHERE id = ? AND opportunity_id = ?",
            (comment_id, opportunity_id)
        ) as cursor:
            existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Comment not found")

        # Delete the comment
        await db.execute("DELETE FROM opportunity_comments WHERE id = ?", (comment_id,))
        await db.commit()

    return None
