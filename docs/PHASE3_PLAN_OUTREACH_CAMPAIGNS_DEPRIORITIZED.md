# Phase 3: Outreach Campaigns - Implementation Plan

**Status**: Ready to start (next session)
**Frontend**: ✅ UI components complete
**Backend**: ❌ API not implemented

## Overview

Build the backend API to support the existing outreach campaigns frontend, enabling automated LinkedIn and email campaigns with sequence/cadence management.

## Current Frontend Status

The frontend already has:
- ✅ Campaign creation forms
- ✅ Sequence builder UI
- ✅ Campaign list/management views
- ✅ Contact selection interface

These components are waiting for backend API implementation.

## Backend Implementation Tasks

### 1. Database Schema

Create tables for campaigns and sequences:

```sql
-- Campaigns table
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'linkedin' or 'email'
    status TEXT NOT NULL,  -- 'draft', 'active', 'paused', 'completed'
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Campaign sequences (steps in a campaign)
CREATE TABLE campaign_sequences (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    channel TEXT NOT NULL,  -- 'linkedin_message', 'linkedin_connection', 'email'
    subject TEXT,  -- for emails
    message_template TEXT NOT NULL,
    delay_days INTEGER NOT NULL,  -- days to wait after previous step
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    UNIQUE (campaign_id, step_number)
);

-- Campaign recipients (who is in which campaign)
CREATE TABLE campaign_recipients (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'pending', 'in_progress', 'completed', 'failed', 'responded'
    current_step INTEGER DEFAULT 0,
    last_action_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    UNIQUE (campaign_id, contact_id)
);

-- Campaign actions (log of each step execution)
CREATE TABLE campaign_actions (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    sequence_id TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'scheduled', 'sent', 'failed', 'responded'
    scheduled_for TIMESTAMP NOT NULL,
    executed_at TIMESTAMP,
    response_received_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    FOREIGN KEY (sequence_id) REFERENCES campaign_sequences(id) ON DELETE CASCADE
);
```

### 2. API Endpoints

#### Campaigns CRUD
- `GET /api/campaigns` - List all campaigns with stats
- `GET /api/campaigns/{id}` - Get campaign details with sequences
- `POST /api/campaigns` - Create new campaign
- `PUT /api/campaigns/{id}` - Update campaign
- `DELETE /api/campaigns/{id}` - Delete campaign
- `POST /api/campaigns/{id}/activate` - Activate campaign
- `POST /api/campaigns/{id}/pause` - Pause campaign

#### Campaign Sequences
- `GET /api/campaigns/{id}/sequences` - Get campaign sequence steps
- `POST /api/campaigns/{id}/sequences` - Add sequence step
- `PUT /api/campaigns/{campaign_id}/sequences/{step}` - Update step
- `DELETE /api/campaigns/{campaign_id}/sequences/{step}` - Remove step
- `POST /api/campaigns/{id}/sequences/reorder` - Reorder steps

#### Campaign Recipients
- `GET /api/campaigns/{id}/recipients` - List campaign recipients with status
- `POST /api/campaigns/{id}/recipients` - Add contacts to campaign
- `DELETE /api/campaigns/{campaign_id}/recipients/{recipient_id}` - Remove recipient
- `GET /api/campaigns/{campaign_id}/recipients/{recipient_id}/actions` - Get action history

#### Campaign Execution
- `POST /api/campaigns/{id}/execute-next` - Manually trigger next batch (for testing)
- `GET /api/campaigns/{id}/stats` - Get campaign statistics
- `POST /api/campaigns/{campaign_id}/recipients/{recipient_id}/mark-responded` - Mark as responded

#### Background Job (Optional for Phase 3)
- Campaign executor service that runs every hour
- Checks for scheduled actions due to execute
- Sends LinkedIn messages or emails
- Updates action and recipient status

### 3. Pydantic Models

```python
# app/models/campaigns.py

class CampaignBase(BaseModel):
    name: str
    type: Literal['linkedin', 'email']

class CampaignCreate(CampaignBase):
    pass

class Campaign(CampaignBase):
    id: str
    status: Literal['draft', 'active', 'paused', 'completed']
    created_by: str
    created_at: datetime
    updated_at: datetime

class SequenceStepBase(BaseModel):
    channel: Literal['linkedin_message', 'linkedin_connection', 'email']
    subject: str | None = None
    message_template: str
    delay_days: int

class SequenceStepCreate(SequenceStepBase):
    pass

class SequenceStep(SequenceStepBase):
    id: str
    campaign_id: str
    step_number: int
    created_at: datetime

class RecipientBase(BaseModel):
    contact_id: str

class RecipientCreate(RecipientBase):
    pass

class Recipient(RecipientBase):
    id: str
    campaign_id: str
    status: Literal['pending', 'in_progress', 'completed', 'failed', 'responded']
    current_step: int
    last_action_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

class ActionLog(BaseModel):
    id: str
    recipient_id: str
    sequence_id: str
    status: Literal['scheduled', 'sent', 'failed', 'responded']
    scheduled_for: datetime
    executed_at: datetime | None
    response_received_at: datetime | None
    error_message: str | None
    created_at: datetime

class CampaignStats(BaseModel):
    total_recipients: int
    pending: int
    in_progress: int
    completed: int
    responded: int
    failed: int
```

### 4. LinkedIn Integration (Stub for Phase 3)

For Phase 3, create stub functions that log actions without actually sending:

```python
# app/services/linkedin.py

async def send_connection_request(contact_email: str, message: str) -> bool:
    """Stub: Log LinkedIn connection request"""
    logger.info(f"LinkedIn Connection Request to {contact_email}: {message}")
    return True

async def send_message(contact_email: str, message: str) -> bool:
    """Stub: Log LinkedIn message"""
    logger.info(f"LinkedIn Message to {contact_email}: {message}")
    return True
```

Real LinkedIn automation can be added in Phase 4 using tools like:
- LinkedIn API (limited, requires partnership)
- PhantomBuster (SaaS automation)
- Custom browser automation (Playwright)

### 5. Email Integration (Stub for Phase 3)

Similar stub for email sending:

```python
# app/services/email.py

async def send_email(to_email: str, subject: str, body: str) -> bool:
    """Stub: Log email send"""
    logger.info(f"Email to {to_email}: {subject}")
    logger.debug(f"Body: {body}")
    return True
```

Real email sending can use:
- SendGrid API
- AWS SES
- SMTP directly

### 6. Campaign Executor (Optional for Phase 3)

Simple background job that runs periodically:

```python
# app/services/campaign_executor.py

async def execute_pending_actions():
    """Execute campaign actions that are due"""

    # Find actions scheduled for now or earlier
    due_actions = get_due_actions()

    for action in due_actions:
        try:
            # Get sequence step details
            sequence = get_sequence_step(action.sequence_id)
            recipient = get_recipient(action.recipient_id)
            contact = get_contact(recipient.contact_id)

            # Execute based on channel
            if sequence.channel == 'linkedin_message':
                success = await send_linkedin_message(contact, sequence.message_template)
            elif sequence.channel == 'email':
                success = await send_email(contact, sequence.subject, sequence.message_template)

            # Update action status
            if success:
                mark_action_sent(action.id)
                update_recipient_progress(recipient.id)
                schedule_next_step(recipient.id)
            else:
                mark_action_failed(action.id, "Send failed")

        except Exception as e:
            logger.error(f"Action execution failed: {e}")
            mark_action_failed(action.id, str(e))
```

Can be triggered via:
- Cron job (simple)
- FastAPI BackgroundTasks (on-demand)
- Celery (if scaling needed)

## Integration with Existing Modules

### Sales Module
- Use existing `contacts` table
- Use existing `companies` table
- Campaign recipient selection can filter by:
  - Company BPO fit score
  - Contact role/seniority
  - Company industry

### Auth Module
- Campaign `created_by` links to `users.id`
- Only directors/admins can create campaigns
- All users can view campaign stats

## Frontend-Backend Connection

Frontend already has API client stubs expecting:
- `campaignsApi.getCampaigns()`
- `campaignsApi.createCampaign(data)`
- `campaignsApi.updateCampaign(id, data)`
- `campaignsApi.deleteCampaign(id)`
- `campaignsApi.addRecipients(campaignId, contactIds)`

Once backend implements these endpoints, frontend will work immediately.

## Testing Strategy

### Backend Testing
1. ✅ TypeScript compilation
2. ✅ API endpoint tests with curl
3. ✅ Database schema creation
4. ✅ Model validation

### Frontend Testing
1. ✅ Run `./validate-browser.sh http://169.150.243.5:5173/campaigns`
2. ✅ Manual browser testing of workflows:
   - Create campaign
   - Add sequence steps
   - Select recipients
   - View campaign stats
   - Pause/activate campaign

## Estimated Effort

**Backend Implementation**: 4-6 hours
- Database schema: 1 hour
- Models: 1 hour
- API endpoints: 2-3 hours
- Integration testing: 1 hour

**Real LinkedIn/Email integration**: 2-4 hours (Phase 4)
- Choose integration approach
- Implement real sending
- Error handling and retries

**Total for Phase 3** (stubs only): 4-6 hours (1 session)

## Success Criteria

Phase 3 is complete when:
- ✅ All API endpoints implemented and tested
- ✅ Campaign CRUD works in frontend
- ✅ Sequence builder saves to database
- ✅ Recipients can be added to campaigns
- ✅ Campaign stats display correctly
- ✅ Actions are logged (even if not actually sent)
- ✅ Frontend validation script passes
- ✅ Manual testing in browser confirms all workflows work

## References

- Frontend code: `frontend/src/pages/Campaigns.tsx` (or similar)
- Frontend API client: `frontend/src/lib/api.ts`
- Project status: `docs/PROJECT_STATUS.md`
- Testing guide: `frontend/README-VALIDATION.md`

## Next Session Checklist

When starting Phase 3:
1. [ ] Review this plan
2. [ ] Create database migration for campaign tables
3. [ ] Implement Pydantic models
4. [ ] Implement API endpoints one by one
5. [ ] Test each endpoint with curl
6. [ ] Run frontend validation script
7. [ ] Manual browser testing
8. [ ] Update documentation
