"""
Admin Cleanup API - Tools for managing duplicate and inactive team leaders/accounts
Admin-only endpoints for identifying and removing duplicate/inactive data from Azure.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
import aiosqlite
from pydantic import BaseModel
from pathlib import Path

from ..config import DATA_DIR
from ..middleware.auth import get_current_admin

router = APIRouter(prefix="/admin/cleanup", tags=["Admin Cleanup"])

# Database path
DB_PATH = DATA_DIR / "portal.db"


class DuplicateEmailGroup(BaseModel):
    """Group of team leaders with the same email"""
    email: str
    count: int
    team_leaders: List[Dict[str, Any]]


class CleanupStats(BaseModel):
    """Statistics about inactive/duplicate data"""
    total_team_leaders: int
    active_team_leaders: int
    inactive_team_leaders: int
    duplicate_email_groups: int
    total_duplicates: int


class BulkDeleteRequest(BaseModel):
    """Request to delete multiple team leaders"""
    team_leader_ids: List[str]
    confirm: bool = False


class BulkDeleteResponse(BaseModel):
    """Response from bulk delete operation"""
    deleted_count: int
    failed_count: int
    errors: List[Dict[str, str]]


# ============================================
# Helper Functions
# ============================================

async def fetch_all_team_leaders(active_only: bool = False) -> List[Dict[str, Any]]:
    """Fetch all team leaders from local database"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        if active_only:
            query = "SELECT * FROM team_leaders WHERE is_active = 1 ORDER BY name"
        else:
            query = "SELECT * FROM team_leaders ORDER BY name"

        cursor = await db.execute(query)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


def find_duplicate_emails(team_leaders: List[Dict[str, Any]]) -> List[DuplicateEmailGroup]:
    """Find groups of team leaders with duplicate email addresses"""
    email_groups: Dict[str, List[Dict[str, Any]]] = {}

    for tl in team_leaders:
        email = tl.get("email", "").strip().lower()
        if not email:
            continue

        if email not in email_groups:
            email_groups[email] = []
        email_groups[email].append(tl)

    # Filter to only groups with duplicates
    duplicates = []
    for email, tls in email_groups.items():
        if len(tls) > 1:
            duplicates.append(DuplicateEmailGroup(
                email=email,
                count=len(tls),
                team_leaders=tls
            ))

    # Sort by count descending
    duplicates.sort(key=lambda x: x.count, reverse=True)
    return duplicates


# ============================================
# Endpoints
# ============================================

@router.get("/stats", response_model=CleanupStats)
async def get_cleanup_stats(current_user: dict = Depends(get_current_admin)):
    """
    Get statistics about inactive and duplicate data.
    Admin only.
    """
    all_team_leaders = await fetch_all_team_leaders(active_only=False)
    active_team_leaders = [tl for tl in all_team_leaders if tl.get("is_active", True)]
    inactive_team_leaders = [tl for tl in all_team_leaders if not tl.get("is_active", True)]

    duplicate_groups = find_duplicate_emails(all_team_leaders)
    total_duplicates = sum(group.count - 1 for group in duplicate_groups)  # Don't count first instance

    return CleanupStats(
        total_team_leaders=len(all_team_leaders),
        active_team_leaders=len(active_team_leaders),
        inactive_team_leaders=len(inactive_team_leaders),
        duplicate_email_groups=len(duplicate_groups),
        total_duplicates=total_duplicates
    )


@router.get("/team-leaders/duplicates", response_model=List[DuplicateEmailGroup])
async def find_duplicate_team_leaders(
    include_inactive: bool = True,
    current_user: dict = Depends(get_current_admin)
):
    """
    Find all team leaders with duplicate email addresses.
    Returns groups of team leaders sharing the same email.
    Admin only.
    """
    team_leaders = await fetch_all_team_leaders(active_only=not include_inactive)
    duplicates = find_duplicate_emails(team_leaders)

    return duplicates


@router.get("/team-leaders/inactive")
async def list_inactive_team_leaders(
    current_user: dict = Depends(get_current_admin)
):
    """
    List all inactive/offboarded team leaders.
    These are candidates for permanent deletion.
    Admin only.
    """
    all_team_leaders = await fetch_all_team_leaders(active_only=False)
    inactive = [tl for tl in all_team_leaders if not tl.get("is_active", True)]

    return {
        "count": len(inactive),
        "team_leaders": inactive
    }


@router.get("/team-leaders/all")
async def list_all_team_leaders(
    current_user: dict = Depends(get_current_admin)
):
    """
    List ALL team leaders (active and inactive) with full details.
    Admin only.
    """
    team_leaders = await fetch_all_team_leaders(active_only=False)

    return {
        "count": len(team_leaders),
        "team_leaders": team_leaders
    }


@router.delete("/team-leaders/{team_leader_id}")
async def permanently_delete_team_leader(
    team_leader_id: str,
    confirm: bool = False,
    current_user: dict = Depends(get_current_admin)
):
    """
    Permanently delete a team leader from local database.
    WARNING: This cannot be undone!

    Set confirm=true to actually delete.
    Admin only.
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must set confirm=true to permanently delete. This action cannot be undone."
        )

    # First, fetch the team leader to show what we're deleting
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM team_leaders WHERE id = ?",
            (team_leader_id,)
        )
        row = await cursor.fetchone()
        team_leader = dict(row) if row else None

        if not team_leader:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team leader not found"
            )

        # Delete the team leader
        await db.execute(
            "DELETE FROM team_leaders WHERE id = ?",
            (team_leader_id,)
        )
        await db.commit()

        return {
            "success": True,
            "message": f"Team leader {team_leader_id} permanently deleted",
            "deleted_team_leader": team_leader
        }


@router.post("/team-leaders/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_team_leaders(
    request: BulkDeleteRequest,
    current_user: dict = Depends(get_current_admin)
):
    """
    Permanently delete multiple team leaders at once.
    WARNING: This cannot be undone!

    Set confirm=true in request body to actually delete.
    Admin only.
    """
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must set confirm=true in request body. This action cannot be undone."
        )

    deleted_count = 0
    failed_count = 0
    errors = []

    async with aiosqlite.connect(DB_PATH) as db:
        for team_leader_id in request.team_leader_ids:
            try:
                cursor = await db.execute(
                    "DELETE FROM team_leaders WHERE id = ?",
                    (team_leader_id,)
                )

                if cursor.rowcount > 0:
                    deleted_count += 1
                else:
                    failed_count += 1
                    errors.append({
                        "team_leader_id": team_leader_id,
                        "error": "Team leader not found"
                    })
            except Exception as e:
                failed_count += 1
                errors.append({
                    "team_leader_id": team_leader_id,
                    "error": str(e)
                })

        await db.commit()

    return BulkDeleteResponse(
        deleted_count=deleted_count,
        failed_count=failed_count,
        errors=errors
    )


@router.get("/team-leaders/by-email/{email}")
async def find_team_leaders_by_email(
    email: str,
    current_user: dict = Depends(get_current_admin)
):
    """
    Find all team leaders with a specific email address.
    Useful for investigating duplicate email issues.
    Admin only.
    """
    all_team_leaders = await fetch_all_team_leaders(active_only=False)

    matching = [
        tl for tl in all_team_leaders
        if tl.get("email", "").strip().lower() == email.strip().lower()
    ]

    return {
        "email": email,
        "count": len(matching),
        "team_leaders": matching
    }
