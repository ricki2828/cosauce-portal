"""
Business Updates API - Proxy to Azure Daily Business Update API
This module proxies requests to the Azure backend while adding CoSauce JWT authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, List
import httpx
import json
import math

from ..config import AZURE_DAILY_UPDATE_API_URL
from ..middleware.auth import get_current_user, get_current_director, get_current_admin, get_current_team_leader

router = APIRouter()

# Shared httpx client
async_client = httpx.AsyncClient(timeout=30.0)

# ============================================
# Proxy Helper Functions
# ============================================

async def proxy_request(
    method: str,
    path: str,
    query_params: dict = None,
    body: dict = None,
) -> Response:
    """
    Generic proxy function to forward requests to Azure API.
    """
    url = f"{AZURE_DAILY_UPDATE_API_URL}{path}"

    # Filter out None/empty string parameters to avoid validation errors
    if query_params:
        query_params = {k: v for k, v in query_params.items() if v is not None and v != ""}

    try:
        response = await async_client.request(
            method=method,
            url=url,
            params=query_params,
            json=body,
            headers={"Content-Type": "application/json"},
        )

        # Handle file downloads (Excel/CSV exports)
        content_type = response.headers.get("content-type", "")
        if "application/vnd" in content_type or "application/octet-stream" in content_type or "text/csv" in content_type:
            return StreamingResponse(
                iter([response.content]),
                media_type=content_type,
                headers={
                    "Content-Disposition": response.headers.get("Content-Disposition", "attachment")
                }
            )

        # Return JSON response
        return Response(
            content=response.content,
            status_code=response.status_code,
            media_type="application/json"
        )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Azure API request timed out")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Azure API error: {str(e)}")


async def proxy_list_request(
    method: str,
    path: str,
    query_params: dict = None,
) -> JSONResponse:
    """
    Proxy function for list endpoints that transforms Azure's array response
    into a paginated format expected by the frontend.
    """
    url = f"{AZURE_DAILY_UPDATE_API_URL}{path}"

    # Filter out None/empty string parameters and extract pagination params
    page = 1
    page_size = 20
    if query_params:
        page = query_params.pop("page", 1)
        page_size = query_params.pop("page_size", 20)
        query_params = {k: v for k, v in query_params.items() if v is not None and v != ""}

    try:
        response = await async_client.request(
            method=method,
            url=url,
            params=query_params,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code != 200:
            return Response(
                content=response.content,
                status_code=response.status_code,
                media_type="application/json"
            )

        data = response.json()

        # Check if Azure already returned paginated format
        if isinstance(data, dict) and "items" in data:
            # Already paginated, return as-is (axios will wrap it in response.data)
            return JSONResponse(content=data)

        # Azure returned plain array, apply client-side pagination
        items = data
        total = len(items)
        pages = math.ceil(total / page_size) if page_size > 0 else 1

        # Apply client-side pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = items[start:end]

        # Return the paginated structure directly (axios will wrap it in response.data)
        return JSONResponse(content={
            "items": paginated_items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages
        })

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Azure API request timed out")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Azure API error: {str(e)}")


# ============================================
# Accounts Endpoints
# ============================================

@router.get("/accounts")
async def list_accounts(
    page: int = 1,
    page_size: int = 20,
    active_only: bool = True,
    current_user = Depends(get_current_user)
):
    """List all accounts"""
    return await proxy_list_request(
        method="GET",
        path="/api/accounts",
        query_params={"page": page, "page_size": page_size, "active_only": active_only}
    )


@router.get("/accounts/{account_id}")
async def get_account(
    account_id: str,
    current_user = Depends(get_current_user)
):
    """Get account by ID with team leaders and metrics"""
    return await proxy_request(
        method="GET",
        path=f"/api/accounts/{account_id}"
    )


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
async def create_account(
    request: Request,
    current_user = Depends(get_current_director)
):
    """Create new account"""
    body = await request.json()
    return await proxy_request(
        method="POST",
        path="/api/accounts",
        body=body
    )


@router.put("/accounts/{account_id}")
async def update_account(
    account_id: str,
    request: Request,
    current_user = Depends(get_current_director)
):
    """Update account"""
    body = await request.json()
    return await proxy_request(
        method="PUT",
        path=f"/api/accounts/{account_id}",
        body=body
    )


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    current_user = Depends(get_current_director)
):
    """Soft delete account"""
    return await proxy_request(
        method="DELETE",
        path=f"/api/accounts/{account_id}"
    )


# ============================================
# Team Leaders Endpoints
# ============================================

@router.get("/team-leaders")
async def list_team_leaders(
    page: int = 1,
    page_size: int = 20,
    active_only: bool = True,
    current_user = Depends(get_current_user)
):
    """List all team leaders"""
    return await proxy_list_request(
        method="GET",
        path="/api/team-leaders",
        query_params={"page": page, "page_size": page_size, "active_only": active_only}
    )


@router.get("/team-leaders/{team_leader_id}")
async def get_team_leader(
    team_leader_id: str,
    current_user = Depends(get_current_user)
):
    """Get team leader by ID"""
    return await proxy_request(
        method="GET",
        path=f"/api/team-leaders/{team_leader_id}"
    )


@router.post("/team-leaders", status_code=status.HTTP_201_CREATED)
async def create_team_leader(
    request: Request,
    current_user = Depends(get_current_director)
):
    """Create new team leader"""
    body = await request.json()
    return await proxy_request(
        method="POST",
        path="/api/team-leaders",
        body=body
    )


@router.put("/team-leaders/{team_leader_id}")
async def update_team_leader(
    team_leader_id: str,
    request: Request,
    current_user = Depends(get_current_director)
):
    """Update team leader"""
    body = await request.json()
    return await proxy_request(
        method="PUT",
        path=f"/api/team-leaders/{team_leader_id}",
        body=body
    )


@router.delete("/team-leaders/{team_leader_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team_leader(
    team_leader_id: str,
    current_user = Depends(get_current_director)
):
    """Delete team leader"""
    return await proxy_request(
        method="DELETE",
        path=f"/api/team-leaders/{team_leader_id}"
    )


# ============================================
# Agents Endpoints
# ============================================

@router.get("/agents")
async def list_agents(
    account_id: Optional[str] = None,
    team_leader_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    active_only: bool = True,
    current_user = Depends(get_current_user)
):
    """List all agents with optional filters"""
    return await proxy_list_request(
        method="GET",
        path="/api/agents",
        query_params={
            "account_id": account_id,
            "team_leader_id": team_leader_id,
            "page": page,
            "page_size": page_size,
            "active_only": active_only
        }
    )


@router.get("/agents/{agent_id}")
async def get_agent(
    agent_id: str,
    current_user = Depends(get_current_user)
):
    """Get agent by ID"""
    return await proxy_request(
        method="GET",
        path=f"/api/agents/{agent_id}"
    )


@router.post("/agents", status_code=status.HTTP_201_CREATED)
async def create_agent(
    request: Request,
    current_user = Depends(get_current_director)
):
    """Create new agent"""
    body = await request.json()
    return await proxy_request(
        method="POST",
        path="/api/agents",
        body=body
    )


@router.put("/agents/{agent_id}")
async def update_agent(
    agent_id: str,
    request: Request,
    current_user = Depends(get_current_director)
):
    """Update agent"""
    body = await request.json()
    return await proxy_request(
        method="PUT",
        path=f"/api/agents/{agent_id}",
        body=body
    )


@router.delete("/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: str,
    current_user = Depends(get_current_director)
):
    """Delete agent"""
    return await proxy_request(
        method="DELETE",
        path=f"/api/agents/{agent_id}"
    )


# ============================================
# Metrics Endpoints
# ============================================

@router.get("/metrics")
async def list_metrics(
    account_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    current_user = Depends(get_current_user)
):
    """List metric definitions, optionally filtered by account"""
    return await proxy_list_request(
        method="GET",
        path="/api/metrics",
        query_params={"account_id": account_id, "page": page, "page_size": page_size}
    )


@router.post("/metrics", status_code=status.HTTP_201_CREATED)
async def create_metric(
    request: Request,
    current_user = Depends(get_current_director)
):
    """Create new metric definition"""
    body = await request.json()
    return await proxy_request(
        method="POST",
        path="/api/metrics",
        body=body
    )


@router.put("/metrics/{metric_id}")
async def update_metric(
    metric_id: str,
    request: Request,
    current_user = Depends(get_current_director)
):
    """Update metric definition"""
    body = await request.json()
    return await proxy_request(
        method="PUT",
        path=f"/api/metrics/{metric_id}",
        body=body
    )


@router.delete("/metrics/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric(
    metric_id: str,
    current_user = Depends(get_current_director)
):
    """Delete metric definition"""
    return await proxy_request(
        method="DELETE",
        path=f"/api/metrics/{metric_id}"
    )


# ============================================
# Dashboard & Analytics Endpoints
# ============================================

@router.get("/dashboard")
async def get_dashboard(
    target_date: Optional[str] = None,
    account_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get dashboard data for all accounts"""
    response = await proxy_request(
        method="GET",
        path="/api/analytics/dashboard",
        query_params={"target_date": target_date, "account_id": account_id}
    )

    # Transform Azure response to match frontend DashboardData type
    if response.status_code == 200:
        try:
            azure_data = json.loads(response.body)

            # DEBUG: Log the Azure response structure
            print(f"[DASHBOARD DEBUG] Azure response type: {type(azure_data)}")
            print(f"[DASHBOARD DEBUG] Azure response length: {len(azure_data) if isinstance(azure_data, list) else 'N/A'}")
            if isinstance(azure_data, list) and len(azure_data) > 0:
                print(f"[DASHBOARD DEBUG] First item keys: {azure_data[0].keys()}")
                print(f"[DASHBOARD DEBUG] First item: {json.dumps(azure_data[0], indent=2)}")

            # Ensure azure_data is a list
            if not isinstance(azure_data, list):
                print(f"[DASHBOARD ERROR] Expected list, got {type(azure_data)}: {azure_data}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Invalid response format from Azure API: expected list, got {type(azure_data).__name__}"
                )

            # Calculate overall stats
            total_accounts = len(azure_data)
            total_agents = sum(acc.get("stats", {}).get("total_expected", 0) for acc in azure_data)
            total_submitted = sum(acc.get("stats", {}).get("submitted", 0) for acc in azure_data)
            total_pending = sum(acc.get("stats", {}).get("pending", 0) for acc in azure_data)

            # Calculate overall submission rate
            overall_submission_rate = 0.0
            if total_agents > 0:
                overall_submission_rate = (total_submitted / total_agents) * 100

            # Transform accounts array
            accounts = []
            for acc in azure_data:
                stats = acc.get("stats", {})
                accounts.append({
                    "account_id": acc.get("account_id", ""),
                    "account_name": acc.get("account_name", ""),
                    "account_code": acc.get("account_code", ""),
                    "total_agents": stats.get("total_expected", 0),
                    "submitted_count": stats.get("submitted", 0),
                    "pending_count": stats.get("pending", 0),
                    "submission_rate": float(stats.get("submission_rate", 0.0))
                })

            # Build DashboardData response
            dashboard_data = {
                "target_date": target_date or (azure_data[0].get("stats", {}).get("date") if azure_data else None),
                "total_accounts": total_accounts,
                "total_agents": total_agents,
                "total_submitted": total_submitted,
                "total_pending": total_pending,
                "overall_submission_rate": float(overall_submission_rate),
                "accounts": accounts
            }

            # DEBUG: Log the transformed response
            print(f"[DASHBOARD DEBUG] Transformed response structure:")
            print(f"[DASHBOARD DEBUG] - overall_submission_rate: {dashboard_data['overall_submission_rate']} (type: {type(dashboard_data['overall_submission_rate'])})")
            print(f"[DASHBOARD DEBUG] - accounts count: {len(accounts)}")
            if accounts:
                print(f"[DASHBOARD DEBUG] - accounts[0].submission_rate: {accounts[0]['submission_rate']} (type: {type(accounts[0]['submission_rate'])})")
            print(f"[DASHBOARD DEBUG] Final response: {json.dumps(dashboard_data, indent=2)[:500]}")

            # Return dashboard_data directly (axios will wrap it in response.data)
            return JSONResponse(content=dashboard_data)

        except Exception as e:
            print(f"[DASHBOARD ERROR] Transformation failed: {str(e)}")
            print(f"[DASHBOARD ERROR] Azure response body: {response.body[:1000]}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to transform dashboard data: {str(e)}"
            )

    print(f"[DASHBOARD ERROR] Non-200 response from Azure: {response.status_code}")
    print(f"[DASHBOARD ERROR] Response body: {response.body[:500]}")
    return response


@router.get("/agent-report")
async def get_agent_report(
    account_id: str,
    start_date: str,
    end_date: str,
    current_user = Depends(get_current_user)
):
    """Get agent-level report with metrics"""
    return await proxy_request(
        method="GET",
        path="/api/analytics/agent-report",
        query_params={
            "account_id": account_id,
            "start_date": start_date,
            "end_date": end_date
        }
    )


@router.get("/trends")
async def get_trends(
    account_id: str,
    metric_key: str,
    start_date: str,
    end_date: str,
    current_user = Depends(get_current_user)
):
    """Get trend data for a specific metric"""
    return await proxy_request(
        method="GET",
        path="/api/analytics/trends",
        query_params={
            "account_id": account_id,
            "metric_key": metric_key,
            "start_date": start_date,
            "end_date": end_date
        }
    )


# ============================================
# Export Endpoints
# ============================================

@router.get("/export/daily/excel")
async def export_daily_excel(
    target_date: Optional[str] = None,
    account_id: Optional[str] = None,
    current_user = Depends(get_current_director)
):
    """Export daily metrics to Excel (single sheet)"""
    return await proxy_request(
        method="GET",
        path="/api/analytics/export/daily/excel",
        query_params={"target_date": target_date, "account_id": account_id}
    )


@router.get("/export/daily/excel-multi-tab")
async def export_daily_excel_multi_tab(
    target_date: Optional[str] = None,
    current_user = Depends(get_current_director)
):
    """Export daily metrics to Excel (one tab per account)"""
    return await proxy_request(
        method="GET",
        path="/api/analytics/export/daily/excel-multi-tab",
        query_params={"target_date": target_date}
    )


@router.get("/export/daily/csv")
async def export_daily_csv(
    target_date: Optional[str] = None,
    account_id: Optional[str] = None,
    current_user = Depends(get_current_director)
):
    """Export daily metrics to CSV"""
    return await proxy_request(
        method="GET",
        path="/api/analytics/export/daily/csv",
        query_params={"target_date": target_date, "account_id": account_id}
    )


@router.get("/export/weekly/excel")
async def export_weekly_excel(
    week_start: str,
    week_end: str,
    current_user = Depends(get_current_director)
):
    """Export weekly report to Excel"""
    return await proxy_request(
        method="GET",
        path="/api/analytics/export/weekly/excel",
        query_params={"week_start": week_start, "week_end": week_end}
    )


@router.get("/export/history/excel")
async def export_history_excel(
    start_date: str,
    end_date: str,
    account_id: Optional[str] = None,
    current_user = Depends(get_current_director)
):
    """Export historical data to Excel"""
    return await proxy_request(
        method="GET",
        path="/api/analytics/export/history/excel",
        query_params={
            "start_date": start_date,
            "end_date": end_date,
            "account_id": account_id
        }
    )


# ============================================
# Bot Control Endpoints
# ============================================

@router.post("/trigger/prompts")
async def trigger_prompts(
    current_user = Depends(get_current_admin)
):
    """Trigger daily prompts (Admin only)"""
    return await proxy_request(
        method="POST",
        path="/api/bot/trigger/prompts"
    )


@router.post("/trigger/reminders")
async def trigger_reminders(
    current_user = Depends(get_current_admin)
):
    """Trigger reminders (Admin only)"""
    return await proxy_request(
        method="POST",
        path="/api/bot/trigger/reminders"
    )


@router.post("/trigger/whatsapp")
async def trigger_whatsapp(
    current_user = Depends(get_current_admin)
):
    """Trigger WhatsApp summary (Admin only)"""
    return await proxy_request(
        method="POST",
        path="/api/bot/trigger/whatsapp"
    )


@router.post("/trigger/teams")
async def trigger_teams(
    current_user = Depends(get_current_admin)
):
    """Trigger Teams channel summary (Admin only)"""
    return await proxy_request(
        method="POST",
        path="/api/bot/trigger/teams"
    )


@router.get("/bot/health")
async def get_bot_health(
    current_user = Depends(get_current_admin)
):
    """Get bot service health status (Admin only)"""
    return await proxy_request(
        method="GET",
        path="/api/bot/health"
    )


# ============================================
# Team Leader Direct Submission Endpoints
# ============================================

@router.get("/me/team-leader-profile")
async def get_my_team_leader_profile(
    current_user = Depends(get_current_team_leader)
):
    """Get current user's linked team leader profile from Azure."""
    user_email = current_user.get("email")

    # Fetch from Azure API
    return await proxy_request(
        method="GET",
        path=f"/api/team-leaders/by-email/{user_email}"
    )


@router.post("/submit-update")
async def submit_update_direct(
    request: Request,
    current_user = Depends(get_current_team_leader)
):
    """Submit metrics directly (proxies to Azure)."""
    body = await request.json()

    return await proxy_request(
        method="POST",
        path="/api/updates/submit-for-date",
        body=body
    )
