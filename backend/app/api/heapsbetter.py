"""
Heapsbetter ATS API endpoints
"""
import sqlite3
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..config import DATA_DIR
from ..middleware.auth import get_current_user, get_current_director
from ..services.heapsbetter_service import get_heapsbetter_service

router = APIRouter()

DB_PATH = DATA_DIR / "portal.db"


# ------------------------------------------------------------------
# Request models
# ------------------------------------------------------------------

class PostToATSRequest(BaseModel):
    work_arrangement: Optional[str] = None  # remote, hybrid, onsite
    positions_count: Optional[int] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = "NZD"
    description: Optional[str] = None  # override
    responsibilities: Optional[str] = None


# ------------------------------------------------------------------
# Status
# ------------------------------------------------------------------

@router.get("/status")
async def ats_status(current_user=Depends(get_current_user)):
    """Check whether the ATS integration is configured"""
    service = await get_heapsbetter_service()
    return {"configured": service.is_configured(), "api_base": "heapsbetter.ai"}


# ------------------------------------------------------------------
# Jobs
# ------------------------------------------------------------------

@router.get("/jobs")
async def list_jobs(
    force_refresh: bool = Query(False),
    current_user=Depends(get_current_user),
):
    """List all jobs from Heapsbetter ATS"""
    service = await get_heapsbetter_service()
    try:
        return await service.list_jobs(force_refresh=force_refresh)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ATS error: {str(e)}")


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, current_user=Depends(get_current_user)):
    """Get a single job from Heapsbetter ATS"""
    service = await get_heapsbetter_service()
    try:
        return await service.get_job(job_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ATS error: {str(e)}")


@router.get("/jobs/{job_id}/candidates")
async def get_job_candidates(job_id: str, current_user=Depends(get_current_user)):
    """Get candidates and pipeline stages for a job"""
    service = await get_heapsbetter_service()
    try:
        candidates = await service.get_candidates(job_id)
        stages = await service.get_pipeline_stages(job_id)
        return {"candidates": candidates, "stages": stages}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ATS error: {str(e)}")


# ------------------------------------------------------------------
# Requisition → ATS linking
# ------------------------------------------------------------------

@router.post("/requisitions/{req_id}/post-to-ats")
async def post_requisition_to_ats(
    req_id: str,
    body: PostToATSRequest,
    current_user=Depends(get_current_director),
):
    """Post a requisition to Heapsbetter ATS as a job"""
    # Read requisition from DB
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM requisitions WHERE id = ?", (req_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Requisition not found")

    req = dict(row)

    # Map employment_type: full_time → full-time
    emp_type = req.get("employment_type", "full_time").replace("_", "-")

    # Build ATS payload from requisition fields, merge with request body
    payload = {
        "title": req["title"],
        "department": req["department"],
        "location": req.get("location"),
        "employment_type": emp_type,
        "description": body.description or req.get("description"),
        "requirements": req.get("requirements"),
        "positions_count": body.positions_count or req.get("headcount", 1),
    }

    if body.work_arrangement:
        payload["work_arrangement"] = body.work_arrangement
    if body.salary_min is not None:
        payload["salary_min"] = body.salary_min
    if body.salary_max is not None:
        payload["salary_max"] = body.salary_max
    if body.salary_currency:
        payload["salary_currency"] = body.salary_currency
    if body.responsibilities:
        payload["responsibilities"] = body.responsibilities

    service = await get_heapsbetter_service()
    try:
        result = await service.create_job(payload)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ATS error: {str(e)}")

    # Store the returned job ID back on the requisition
    job_id = result.get("id") if isinstance(result, dict) else None
    now = datetime.utcnow().isoformat()

    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE requisitions SET heapsbetter_job_id = ?, ats_synced_at = ? WHERE id = ?",
        (job_id, now, req_id),
    )
    conn.commit()
    conn.close()

    return result


@router.delete("/requisitions/{req_id}/unlink-ats")
async def unlink_ats(req_id: str, current_user=Depends(get_current_director)):
    """Remove ATS link from a requisition"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE requisitions SET heapsbetter_job_id = NULL, ats_synced_at = NULL WHERE id = ?",
        (req_id,),
    )
    conn.commit()
    conn.close()
    return {"status": "unlinked"}


@router.get("/requisitions/{req_id}/ats-metrics")
async def get_ats_metrics(req_id: str, current_user=Depends(get_current_user)):
    """Get ATS metrics for a requisition"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT heapsbetter_job_id, ats_synced_at FROM requisitions WHERE id = ?",
        (req_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Requisition not found")

    job_id = row["heapsbetter_job_id"]
    if not job_id:
        return {"linked": False}

    service = await get_heapsbetter_service()
    try:
        candidates = await service.get_candidates(job_id)
        stages = await service.get_pipeline_stages(job_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ATS error: {str(e)}")

    # candidates may be a list or wrapped in a dict — normalise
    candidate_list = candidates if isinstance(candidates, list) else candidates.get("candidates", [])

    return {
        "linked": True,
        "job_id": job_id,
        "applicant_count": len(candidate_list),
        "stages": stages,
        "synced_at": row["ats_synced_at"],
    }


# ------------------------------------------------------------------
# Cache management
# ------------------------------------------------------------------

@router.post("/cache/refresh")
async def refresh_cache(current_user=Depends(get_current_director)):
    """Invalidate all ATS cache entries"""
    service = await get_heapsbetter_service()
    service._invalidate_cache("")
    return {"status": "refreshed"}
