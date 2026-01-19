"""
Universal Search API
Search across all data in the ecosystem
"""
from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any
import aiosqlite
from pathlib import Path

from ..config import DATA_DIR
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])
DB_PATH = DATA_DIR / "portal.db"


@router.get("")
async def universal_search(
    q: str = Query(..., description="Search query"),
    current_user: dict = Depends(get_current_user)
):
    """
    Universal search across all data in the system.
    Searches: priorities, requisitions, new hires, pipeline opportunities,
    business update accounts, agents, and metrics.
    """
    query = f"%{q}%"
    results = []

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Search Priorities
        cursor = await db.execute(
            """
            SELECT id, title, description, status
            FROM priorities
            WHERE (title LIKE ? OR description LIKE ?)
            AND status IN ('active', 'in_progress')
            ORDER BY created_at DESC
            LIMIT 5
            """,
            (query, query)
        )
        priorities = await cursor.fetchall()
        for p in priorities:
            results.append({
                "type": "priority",
                "id": p["id"],
                "title": p["title"],
                "subtitle": p["status"].replace('_', ' ').title(),
                "description": p["description"][:150] if p["description"] else None,
                "url": f"/priorities?id={p['id']}"
            })

        # Search Requisitions
        cursor = await db.execute(
            """
            SELECT id, title, status, department
            FROM requisitions
            WHERE title LIKE ? OR department LIKE ?
            ORDER BY created_at DESC
            LIMIT 5
            """,
            (query, query)
        )
        requisitions = await cursor.fetchall()
        for r in requisitions:
            results.append({
                "type": "requisition",
                "id": r["id"],
                "title": r["title"],
                "subtitle": r["department"] if r["department"] else r["status"].replace('_', ' ').title(),
                "description": f"Status: {r['status'].replace('_', ' ').title()}",
                "url": f"/people?tab=requisitions&id={r['id']}"
            })

        # Search New Hires
        cursor = await db.execute(
            """
            SELECT id, name, role, department, status
            FROM new_hires
            WHERE name LIKE ? OR role LIKE ? OR department LIKE ?
            ORDER BY start_date DESC
            LIMIT 5
            """,
            (query, query, query)
        )
        hires = await cursor.fetchall()
        for h in hires:
            results.append({
                "type": "hire",
                "id": h["id"],
                "title": h["name"],
                "subtitle": h["role"],
                "description": f"{h['department'] or 'No department'} • {h['status'].replace('_', ' ').title()}",
                "url": f"/people?tab=new-hires&id={h['id']}"
            })

        # Search Pipeline Opportunities
        cursor = await db.execute(
            """
            SELECT id, company_name, contact_name, stage, estimated_value
            FROM pipeline_opportunities
            WHERE company_name LIKE ? OR contact_name LIKE ?
            ORDER BY created_at DESC
            LIMIT 5
            """,
            (query, query)
        )
        opportunities = await cursor.fetchall()
        for o in opportunities:
            results.append({
                "type": "opportunity",
                "id": o["id"],
                "title": o["company_name"],
                "subtitle": o["contact_name"] if o["contact_name"] else None,
                "description": f"{o['stage'].replace('_', ' ').title()} • ${o['estimated_value']:,}" if o["estimated_value"] else o['stage'].replace('_', ' ').title(),
                "url": "/dashboard#pipeline"
            })

        # Search Business Update Accounts
        cursor = await db.execute(
            """
            SELECT id, name, code
            FROM bu_accounts
            WHERE (name LIKE ? OR code LIKE ?) AND is_active = 1
            LIMIT 5
            """,
            (query, query)
        )
        accounts = await cursor.fetchall()
        for a in accounts:
            results.append({
                "type": "account",
                "id": a["id"],
                "title": a["name"],
                "subtitle": a["code"],
                "description": "Business Update Account",
                "url": f"/business-updates?tab=accounts&id={a['id']}"
            })

        # Search Agents
        cursor = await db.execute(
            """
            SELECT a.id, a.name, tl.name as team_leader
            FROM bu_agents a
            LEFT JOIN team_leaders tl ON a.team_leader_id = tl.id
            WHERE a.name LIKE ? AND a.is_active = 1
            LIMIT 5
            """,
            (query,)
        )
        agents = await cursor.fetchall()
        for ag in agents:
            results.append({
                "type": "agent",
                "id": ag["id"],
                "title": ag["name"],
                "subtitle": f"Team Leader: {ag['team_leader']}" if ag["team_leader"] else None,
                "description": "Agent",
                "url": f"/business-updates?tab=agents&id={ag['id']}"
            })

        # Search Metrics
        cursor = await db.execute(
            """
            SELECT md.id, md.metric_name, md.metric_type, a.name as account_name
            FROM bu_metric_definitions md
            LEFT JOIN bu_accounts a ON md.account_id = a.id
            WHERE md.metric_name LIKE ? AND md.is_active = 1
            LIMIT 5
            """,
            (query,)
        )
        metrics = await cursor.fetchall()
        for m in metrics:
            results.append({
                "type": "metric",
                "id": m["id"],
                "title": m["metric_name"],
                "subtitle": m["account_name"] if m["account_name"] else None,
                "description": f"Type: {m['metric_type']}",
                "url": f"/business-updates?tab=metrics&account={m['account_name']}"
            })

    return {
        "query": q,
        "total": len(results),
        "results": results[:20]  # Limit to top 20 results
    }
