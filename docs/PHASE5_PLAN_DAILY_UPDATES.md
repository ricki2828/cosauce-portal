# Phase 5: Daily Updates Integration - Implementation Plan

**Status**: Planned (after Phase 4)
**Priority**: HIGH (Phase 5 of revised roadmap)
**Estimated Effort**: 1 session (3-4 hours)

## Overview

Integrate with the Daily Business Update bot to pull daily metrics data and make it available by client/company in the CoSauce Portal. This creates a centralized view of team activities and client engagement across all campaigns.

## Daily Updates Bot Context

**Location**: `~/ai-workspace/projects/active/daily-business-update/`
**Live API**: https://daily-update-api.azurewebsites.net
**Purpose**: Teams bot that collects daily updates from team members and exports summaries to WhatsApp

## Integration Goal

Pull data from the Daily Updates bot API and display it grouped by client/company, allowing directors to:
- See which team members are working on which clients
- Track daily activities per client
- View trends and patterns in client engagement
- Export client-specific reports

## Database Schema

### Daily Updates Cache Table
```sql
CREATE TABLE daily_updates (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,            -- User/agent from Daily Updates bot
    agent_name TEXT NOT NULL,
    agent_email TEXT,
    client_company TEXT,               -- Client/company name (can be NULL for internal)
    campaign_name TEXT,                -- Optional campaign/project name
    update_text TEXT NOT NULL,         -- The actual update content
    update_date DATE NOT NULL,
    category TEXT,                     -- e.g., "Sales", "Delivery", "Support"
    sentiment TEXT,                    -- 'positive', 'neutral', 'negative' (future AI analysis)
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast querying
CREATE INDEX idx_daily_updates_client ON daily_updates(client_company, update_date);
CREATE INDEX idx_daily_updates_agent ON daily_updates(agent_id, update_date);
CREATE INDEX idx_daily_updates_date ON daily_updates(update_date);
```

### Client Campaigns Mapping Table
```sql
-- Maps client companies to campaigns for grouping updates
CREATE TABLE client_campaigns (
    id TEXT PRIMARY KEY,
    company_id TEXT,                   -- Links to companies table (optional)
    client_name TEXT NOT NULL,         -- Client/company name
    campaign_name TEXT NOT NULL,       -- Campaign/project name
    status TEXT DEFAULT 'active',      -- 'active', 'completed', 'paused'
    start_date DATE,
    end_date DATE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

## API Endpoints

### Daily Updates Bot Integration
- `POST /api/daily-updates/sync` - Pull latest updates from Daily Updates bot API
- `GET /api/daily-updates/last-sync` - Get last sync timestamp

### Daily Updates Display
- `GET /api/daily-updates` - List all updates (filters: date range, client, agent)
- `GET /api/daily-updates/by-client` - Group updates by client/company
- `GET /api/daily-updates/by-agent` - Group updates by team member
- `GET /api/daily-updates/stats` - Get statistics (updates per client, per agent, trends)

### Client Campaigns
- `GET /api/daily-updates/campaigns` - List all client campaigns
- `GET /api/daily-updates/campaigns/{id}` - Get campaign with updates
- `POST /api/daily-updates/campaigns` - Create new campaign
- `PUT /api/daily-updates/campaigns/{id}` - Update campaign
- `DELETE /api/daily-updates/campaigns/{id}` - Delete campaign

### Export
- `GET /api/daily-updates/export/client/{client_name}` - Export client updates as CSV/PDF
- `GET /api/daily-updates/export/date-range` - Export updates for date range

## Pydantic Models

```python
# app/models/daily_updates.py

from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr

class DailyUpdateBase(BaseModel):
    agent_id: str
    agent_name: str
    agent_email: Optional[EmailStr] = None
    client_company: Optional[str] = None
    campaign_name: Optional[str] = None
    update_text: str
    update_date: date
    category: Optional[str] = None

class DailyUpdate(DailyUpdateBase):
    id: str
    sentiment: Optional[Literal['positive', 'neutral', 'negative']] = None
    synced_at: datetime
    created_at: datetime

class DailyUpdatesByClient(BaseModel):
    client_name: str
    total_updates: int
    date_range: tuple[date, date]
    updates: list[DailyUpdate]

class DailyUpdatesByAgent(BaseModel):
    agent_id: str
    agent_name: str
    total_updates: int
    clients_worked_on: list[str]
    updates: list[DailyUpdate]

class DailyUpdatesStats(BaseModel):
    total_updates: int
    unique_clients: int
    unique_agents: int
    updates_by_category: dict[str, int]
    top_clients: list[tuple[str, int]]  # (client_name, update_count)
    top_agents: list[tuple[str, int]]   # (agent_name, update_count)

# Client Campaigns
class ClientCampaignBase(BaseModel):
    client_name: str
    campaign_name: str
    company_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ClientCampaignCreate(ClientCampaignBase):
    pass

class ClientCampaignUpdate(BaseModel):
    client_name: Optional[str] = None
    campaign_name: Optional[str] = None
    status: Optional[Literal['active', 'completed', 'paused']] = None
    end_date: Optional[date] = None

class ClientCampaign(ClientCampaignBase):
    id: str
    status: Literal['active', 'completed', 'paused']
    created_by: str
    created_at: datetime
    updated_at: datetime
    update_count: int = 0  # Number of updates for this campaign
```

## Daily Updates Bot API Integration

### Authentication
The Daily Updates bot API likely uses API key authentication or Microsoft authentication (since it's an Azure-hosted Teams bot).

**Configuration** (`.env`):
```env
DAILY_UPDATES_API_URL=https://daily-update-api.azurewebsites.net
DAILY_UPDATES_API_KEY=<secret-key>
```

### Sync Service

```python
# app/services/daily_updates_sync.py

import httpx
from datetime import datetime, timedelta
from app.config import settings

async def sync_daily_updates(days_back: int = 7) -> dict:
    """
    Sync daily updates from the Daily Updates bot API.

    Args:
        days_back: Number of days to sync (default: 7)

    Returns:
        dict with sync stats (total_fetched, total_new, total_updated)
    """
    # Calculate date range
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days_back)

    # Call Daily Updates bot API
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.DAILY_UPDATES_API_URL}/api/updates",
            params={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            headers={
                "Authorization": f"Bearer {settings.DAILY_UPDATES_API_KEY}"
            }
        )

        if response.status_code != 200:
            raise Exception(f"Failed to fetch updates: {response.status_code}")

        updates_data = response.json()

    # Process and store updates
    stats = {
        "total_fetched": len(updates_data),
        "total_new": 0,
        "total_updated": 0,
    }

    for update in updates_data:
        # Transform bot data to our schema
        daily_update = {
            "agent_id": update.get("user_id"),
            "agent_name": update.get("user_name"),
            "agent_email": update.get("user_email"),
            "client_company": extract_client_name(update.get("text")),  # Extract from text or metadata
            "campaign_name": update.get("campaign"),
            "update_text": update.get("text"),
            "update_date": update.get("date"),
            "category": categorize_update(update.get("text")),  # AI categorization
        }

        # Upsert to database
        existing = await get_update_by_bot_id(update.get("id"))
        if existing:
            await update_daily_update(existing.id, daily_update)
            stats["total_updated"] += 1
        else:
            await create_daily_update(daily_update)
            stats["total_new"] += 1

    return stats

def extract_client_name(text: str) -> str | None:
    """Extract client name from update text using patterns or AI."""
    # Simple pattern matching for now
    # Can be enhanced with AI/NLP in future
    # Look for "for [Client]", "working with [Client]", etc.
    # Return None if no client mentioned
    pass

def categorize_update(text: str) -> str | None:
    """Categorize update using keywords or AI."""
    # Simple keyword matching
    keywords = {
        "Sales": ["meeting", "demo", "proposal", "pitch"],
        "Delivery": ["developed", "deployed", "fixed", "implemented"],
        "Support": ["support", "ticket", "issue", "resolved"],
    }

    text_lower = text.lower()
    for category, words in keywords.items():
        if any(word in text_lower for word in words):
            return category

    return None
```

### Scheduled Sync

Use FastAPI BackgroundTasks or a cron job to sync periodically:

```python
# app/api/daily_updates.py

from fastapi import BackgroundTasks

@router.post("/daily-updates/sync")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    days_back: int = 7
):
    """Trigger a sync of daily updates from the bot."""
    background_tasks.add_task(sync_daily_updates, days_back)
    return {"status": "sync_started"}

# Or via cron job (recommended for production)
# crontab: 0 8 * * * curl -X POST http://localhost:8004/api/daily-updates/sync
```

## Frontend Components

### Pages

1. **Daily Updates Dashboard** (`/daily-updates`)
   - Overview stats (total updates, active campaigns, top clients)
   - Recent updates feed
   - Quick filters (date range, client, agent)

2. **By Client View** (`/daily-updates/clients`)
   - List of clients with update counts
   - Click to expand and see all updates for that client
   - Date range filter
   - Export button per client

3. **By Campaign View** (`/daily-updates/campaigns`)
   - List of campaigns with status
   - Update timeline per campaign
   - Create/edit campaigns
   - Link campaigns to clients

4. **By Agent View** (`/daily-updates/agents`)
   - List of team members with update counts
   - See which clients each agent is working on
   - Activity trends (updates per day/week)

5. **Client Campaign Detail** (`/daily-updates/campaigns/{id}`)
   - Campaign information
   - Timeline of all updates for this campaign
   - Team members involved
   - Export campaign report

## Business Logic

### Client Name Extraction
When syncing updates from the bot:
1. Check if update text mentions a client name
2. Use pattern matching or AI to extract client name
3. If found, link to `client_campaigns` table
4. If not found, leave `client_company` as NULL (internal update)

### Campaign Mapping
- Directors can create "campaigns" to group updates
- Example: "Acme Corp - Support Contract 2025"
- Updates mentioning "Acme" auto-link to this campaign
- Manual override available

### Permissions
- **All Users**: Can view updates dashboard (read-only)
- **Directors/Admins**: Can create campaigns, trigger sync, export reports
- **Finance/Management**: Can view client reports

## Integration with Existing Modules

### Sales Pipeline
- Link `client_campaigns.company_id` to `companies.id`
- Show daily updates in company detail view
- Track engagement for sales prospects

### Priorities Module
- Link priorities to campaigns
- Show relevant updates in priority detail view

## Testing Strategy

### Backend Testing
1. ✅ Test Daily Updates bot API connection
2. ✅ Test sync service (fetch and store updates)
3. ✅ Test client name extraction logic
4. ✅ Test grouping by client/agent
5. ✅ Test stats endpoints
6. ✅ Test export functionality

### Frontend Testing
1. ✅ Run `./validate-browser.sh http://169.150.243.5:5173/daily-updates`
2. ✅ Manual browser testing:
   - View updates dashboard
   - Filter by client/agent/date
   - Create campaign
   - Trigger sync
   - Export client report

## Success Criteria

Phase 5 is complete when:
- ✅ Database tables created
- ✅ Sync service can pull data from Daily Updates bot API
- ✅ Updates stored and displayed correctly
- ✅ Grouping by client works accurately
- ✅ Campaign management functional
- ✅ Stats and trends display correctly
- ✅ Export functionality works
- ✅ Frontend validation passes
- ✅ Manual browser testing confirms all workflows work

## Implementation Order

1. **Daily Updates Bot API Research** (30 min)
   - Review bot API documentation
   - Test authentication
   - Understand data structure

2. **Database** (30 min)
   - Create tables
   - Add indexes

3. **Models** (20 min)
   - Pydantic models

4. **Sync Service** (1.5 hours)
   - API integration
   - Client name extraction
   - Categorization logic

5. **API Endpoints** (1 hour)
   - CRUD for campaigns
   - Display endpoints
   - Stats endpoints

6. **Frontend** (1 hour)
   - Dashboard layout
   - Client/campaign views
   - Filters and export
   - Validation testing

## Future Enhancements (Phase 6+)

### AI-Powered Features
- **Sentiment Analysis**: Automatically detect positive/negative updates
- **Topic Extraction**: Auto-categorize updates beyond keywords
- **Trend Detection**: Alert on unusual patterns (e.g., spike in support tickets)
- **Smart Summaries**: Generate weekly client reports with AI

### Advanced Integrations
- **WhatsApp Export**: Auto-send client summaries to WhatsApp
- **Email Digests**: Weekly client activity emails
- **Slack/Teams Integration**: Post updates to channels by client

## Next Steps After Phase 5

Once Daily Updates integration is complete, the core operational modules are done. Can then revisit:
- **Phase 6**: Outbound campaigns (LinkedIn/email automation) - if still needed
- **Phase 7**: Dashboard & Analytics (executive overview)
- **Phase 8**: Advanced features (AI summaries, mobile app, etc.)

## References

- Daily Updates Bot: `~/ai-workspace/projects/active/daily-business-update/`
- Daily Updates API: https://daily-update-api.azurewebsites.net
- Bot documentation: `~/ai-workspace/projects/active/daily-business-update/docs/STATUS-2025-12-31.md`
