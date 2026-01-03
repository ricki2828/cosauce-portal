"""
Outreach API - LinkedIn & Email campaign management
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime

from ..services.outreach_service import (
    get_outreach_service,
    OutreachService,
    ChannelType,
    CampaignStatus,
    MessageStatus,
)

router = APIRouter()


# ==================== PYDANTIC MODELS ====================

class TemplateCreate(BaseModel):
    name: str
    body: str
    channel: ChannelType = "linkedin"
    subject: Optional[str] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    body: Optional[str] = None
    subject: Optional[str] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    channel: str
    subject: Optional[str]
    body: str
    placeholders: List[str]
    created_by: str
    created_at: str
    is_default: bool


class AITemplateRequest(BaseModel):
    channel: ChannelType = "linkedin"
    context: str  # Description of what user wants to achieve
    tone: str = "professional"


class CampaignCreate(BaseModel):
    name: str
    channel: ChannelType = "linkedin"
    template_id: Optional[str] = None
    settings: Optional[dict] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    template_id: Optional[str] = None
    settings: Optional[dict] = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    channel: str
    status: str
    template_id: Optional[str]
    created_by: str
    created_at: str
    updated_at: str
    settings: dict
    total_contacts: int
    sent_count: int
    replied_count: int


class ContactAdd(BaseModel):
    id: Optional[str] = None
    name: str
    title: Optional[str] = None
    company: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None


class ContactsAddRequest(BaseModel):
    contacts: List[ContactAdd]


class ContactResponse(BaseModel):
    id: str
    campaign_id: str
    contact_id: str
    contact_name: str
    contact_title: Optional[str]
    company_name: Optional[str]
    linkedin_url: Optional[str]
    email: Optional[str]
    personalized_message: Optional[str]
    status: str
    sent_at: Optional[str]
    error_message: Optional[str]


class QueuedMessageResponse(BaseModel):
    queue_id: str
    campaign_contact_id: str
    campaign_id: str
    campaign_name: str
    channel: str
    contact_name: str
    contact_title: Optional[str]
    company_name: Optional[str]
    linkedin_url: Optional[str]
    email: Optional[str]
    message: str


class GenerateMessagesRequest(BaseModel):
    use_ai: bool = False


class ActivityLogEntry(BaseModel):
    id: str
    campaign_id: Optional[str]
    contact_id: Optional[str]
    action: str
    details: dict
    created_at: str


# ==================== DEPENDENCY ====================

async def get_service() -> OutreachService:
    return await get_outreach_service()


# ==================== TEMPLATE ENDPOINTS ====================

@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    request: TemplateCreate,
    service: OutreachService = Depends(get_service)
):
    """Create a new message template."""
    template = await service.create_template(
        name=request.name,
        body=request.body,
        channel=request.channel,
        subject=request.subject,
        created_by="system",  # TODO: Get from auth
    )
    return TemplateResponse(
        id=template.id,
        name=template.name,
        channel=template.channel,
        subject=template.subject,
        body=template.body,
        placeholders=template.placeholders,
        created_by=template.created_by,
        created_at=template.created_at,
        is_default=template.is_default,
    )


@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    channel: Optional[ChannelType] = None,
    service: OutreachService = Depends(get_service)
):
    """List all templates."""
    templates = await service.get_templates(channel=channel)
    return [
        TemplateResponse(
            id=t.id,
            name=t.name,
            channel=t.channel,
            subject=t.subject,
            body=t.body,
            placeholders=t.placeholders,
            created_by=t.created_by,
            created_at=t.created_at,
            is_default=t.is_default,
        )
        for t in templates
    ]


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    service: OutreachService = Depends(get_service)
):
    """Get a single template."""
    template = await service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse(
        id=template.id,
        name=template.name,
        channel=template.channel,
        subject=template.subject,
        body=template.body,
        placeholders=template.placeholders,
        created_by=template.created_by,
        created_at=template.created_at,
        is_default=template.is_default,
    )


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    request: TemplateUpdate,
    service: OutreachService = Depends(get_service)
):
    """Update a template."""
    template = await service.update_template(
        template_id=template_id,
        name=request.name,
        body=request.body,
        subject=request.subject,
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse(
        id=template.id,
        name=template.name,
        channel=template.channel,
        subject=template.subject,
        body=template.body,
        placeholders=template.placeholders,
        created_by=template.created_by,
        created_at=template.created_at,
        is_default=template.is_default,
    )


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    service: OutreachService = Depends(get_service)
):
    """Delete a template."""
    success = await service.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "deleted", "id": template_id}


@router.post("/templates/generate")
async def generate_template_with_ai(
    request: AITemplateRequest,
    service: OutreachService = Depends(get_service)
):
    """Use AI to generate a message template."""
    body = await service.generate_template_with_ai(
        channel=request.channel,
        context=request.context,
        tone=request.tone,
    )
    return {"body": body, "channel": request.channel}


# ==================== CAMPAIGN ENDPOINTS ====================

@router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(
    request: CampaignCreate,
    service: OutreachService = Depends(get_service)
):
    """Create a new outreach campaign."""
    campaign = await service.create_campaign(
        name=request.name,
        channel=request.channel,
        template_id=request.template_id,
        created_by="system",  # TODO: Get from auth
        settings=request.settings,
    )
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        channel=campaign.channel,
        status=campaign.status,
        template_id=campaign.template_id,
        created_by=campaign.created_by,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        settings=campaign.settings,
        total_contacts=campaign.total_contacts,
        sent_count=campaign.sent_count,
        replied_count=campaign.replied_count,
    )


@router.get("/campaigns", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[CampaignStatus] = None,
    channel: Optional[ChannelType] = None,
    limit: int = 50,
    service: OutreachService = Depends(get_service)
):
    """List all campaigns."""
    campaigns = await service.get_campaigns(status=status, channel=channel, limit=limit)
    return [
        CampaignResponse(
            id=c.id,
            name=c.name,
            channel=c.channel,
            status=c.status,
            template_id=c.template_id,
            created_by=c.created_by,
            created_at=c.created_at,
            updated_at=c.updated_at,
            settings=c.settings,
            total_contacts=c.total_contacts,
            sent_count=c.sent_count,
            replied_count=c.replied_count,
        )
        for c in campaigns
    ]


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: str,
    service: OutreachService = Depends(get_service)
):
    """Get a single campaign."""
    campaign = await service.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        channel=campaign.channel,
        status=campaign.status,
        template_id=campaign.template_id,
        created_by=campaign.created_by,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        settings=campaign.settings,
        total_contacts=campaign.total_contacts,
        sent_count=campaign.sent_count,
        replied_count=campaign.replied_count,
    )


@router.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    request: CampaignUpdate,
    service: OutreachService = Depends(get_service)
):
    """Update a campaign."""
    campaign = await service.update_campaign(
        campaign_id=campaign_id,
        name=request.name,
        template_id=request.template_id,
        settings=request.settings,
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        channel=campaign.channel,
        status=campaign.status,
        template_id=campaign.template_id,
        created_by=campaign.created_by,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        settings=campaign.settings,
        total_contacts=campaign.total_contacts,
        sent_count=campaign.sent_count,
        replied_count=campaign.replied_count,
    )


@router.post("/campaigns/{campaign_id}/start", response_model=CampaignResponse)
async def start_campaign(
    campaign_id: str,
    service: OutreachService = Depends(get_service)
):
    """Start a campaign (begins queuing messages)."""
    campaign = await service.update_campaign_status(campaign_id, "active")
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        channel=campaign.channel,
        status=campaign.status,
        template_id=campaign.template_id,
        created_by=campaign.created_by,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        settings=campaign.settings,
        total_contacts=campaign.total_contacts,
        sent_count=campaign.sent_count,
        replied_count=campaign.replied_count,
    )


@router.post("/campaigns/{campaign_id}/pause", response_model=CampaignResponse)
async def pause_campaign(
    campaign_id: str,
    service: OutreachService = Depends(get_service)
):
    """Pause a campaign."""
    campaign = await service.update_campaign_status(campaign_id, "paused")
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        channel=campaign.channel,
        status=campaign.status,
        template_id=campaign.template_id,
        created_by=campaign.created_by,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        settings=campaign.settings,
        total_contacts=campaign.total_contacts,
        sent_count=campaign.sent_count,
        replied_count=campaign.replied_count,
    )


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    service: OutreachService = Depends(get_service)
):
    """Delete a campaign and its contacts."""
    success = await service.delete_campaign(campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "deleted", "id": campaign_id}


# ==================== CAMPAIGN CONTACTS ENDPOINTS ====================

@router.post("/campaigns/{campaign_id}/contacts", response_model=List[ContactResponse])
async def add_contacts_to_campaign(
    campaign_id: str,
    request: ContactsAddRequest,
    service: OutreachService = Depends(get_service)
):
    """Add contacts to a campaign."""
    # Verify campaign exists
    campaign = await service.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    contacts = await service.add_contacts_to_campaign(
        campaign_id=campaign_id,
        contacts=[c.model_dump() for c in request.contacts],
    )
    return [
        ContactResponse(
            id=c.id,
            campaign_id=c.campaign_id,
            contact_id=c.contact_id,
            contact_name=c.contact_name,
            contact_title=c.contact_title,
            company_name=c.company_name,
            linkedin_url=c.linkedin_url,
            email=c.email,
            personalized_message=c.personalized_message,
            status=c.status,
            sent_at=c.sent_at,
            error_message=c.error_message,
        )
        for c in contacts
    ]


@router.get("/campaigns/{campaign_id}/contacts", response_model=List[ContactResponse])
async def get_campaign_contacts(
    campaign_id: str,
    status: Optional[MessageStatus] = None,
    limit: int = 100,
    offset: int = 0,
    service: OutreachService = Depends(get_service)
):
    """Get contacts in a campaign."""
    contacts = await service.get_campaign_contacts(
        campaign_id=campaign_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return [
        ContactResponse(
            id=c.id,
            campaign_id=c.campaign_id,
            contact_id=c.contact_id,
            contact_name=c.contact_name,
            contact_title=c.contact_title,
            company_name=c.company_name,
            linkedin_url=c.linkedin_url,
            email=c.email,
            personalized_message=c.personalized_message,
            status=c.status,
            sent_at=c.sent_at,
            error_message=c.error_message,
        )
        for c in contacts
    ]


@router.delete("/campaigns/{campaign_id}/contacts/{contact_id}")
async def remove_contact_from_campaign(
    campaign_id: str,
    contact_id: str,
    service: OutreachService = Depends(get_service)
):
    """Remove a contact from a campaign."""
    success = await service.remove_contact_from_campaign(campaign_id, contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found in campaign")
    return {"status": "removed", "id": contact_id}


# ==================== MESSAGE GENERATION ENDPOINTS ====================

@router.post("/campaigns/{campaign_id}/generate")
async def generate_campaign_messages(
    campaign_id: str,
    request: GenerateMessagesRequest,
    service: OutreachService = Depends(get_service)
):
    """Generate personalized messages for all pending contacts."""
    count = await service.generate_messages_for_campaign(
        campaign_id=campaign_id,
        use_ai=request.use_ai,
    )
    return {"status": "generated", "count": count}


@router.get("/campaigns/{campaign_id}/preview/{contact_id}")
async def preview_message(
    campaign_id: str,
    contact_id: str,
    service: OutreachService = Depends(get_service)
):
    """Preview the message for a specific contact."""
    contacts = await service.get_campaign_contacts(campaign_id)
    contact = next((c for c in contacts if c.id == contact_id), None)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    return {
        "contact_name": contact.contact_name,
        "message": contact.personalized_message,
        "status": contact.status,
    }


# ==================== QUEUE ENDPOINTS ====================

@router.get("/queue/next", response_model=Optional[QueuedMessageResponse])
async def get_next_message(
    channel: Optional[ChannelType] = None,
    service: OutreachService = Depends(get_service)
):
    """Get the next message to send (for manual sending or worker)."""
    message = await service.get_next_queued_message(channel=channel)
    if not message:
        return None
    return QueuedMessageResponse(**message)


@router.post("/queue/{queue_id}/sent")
async def mark_message_sent(
    queue_id: str,
    service: OutreachService = Depends(get_service)
):
    """Mark a message as sent."""
    success = await service.mark_message_sent(queue_id)
    if not success:
        raise HTTPException(status_code=404, detail="Queue item not found")
    return {"status": "sent", "queue_id": queue_id}


@router.post("/queue/{queue_id}/skip")
async def skip_message(
    queue_id: str,
    service: OutreachService = Depends(get_service)
):
    """Skip a message (returns to ready status)."""
    success = await service.skip_message(queue_id)
    if not success:
        raise HTTPException(status_code=404, detail="Queue item not found")
    return {"status": "skipped", "queue_id": queue_id}


@router.get("/queue/stats")
async def get_queue_stats(
    campaign_id: Optional[str] = None,
    service: OutreachService = Depends(get_service)
):
    """Get queue statistics."""
    stats = await service.get_queue_stats(campaign_id=campaign_id)
    return stats


# ==================== ACTIVITY LOG ENDPOINTS ====================

@router.get("/activity", response_model=List[ActivityLogEntry])
async def get_activity_log(
    campaign_id: Optional[str] = None,
    limit: int = 50,
    service: OutreachService = Depends(get_service)
):
    """Get activity log."""
    entries = await service.get_activity_log(campaign_id=campaign_id, limit=limit)
    return [ActivityLogEntry(**e) for e in entries]


# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/analytics/overview")
async def get_analytics_overview(
    service: OutreachService = Depends(get_service)
):
    """Get overall outreach analytics."""
    campaigns = await service.get_campaigns(limit=100)

    total_campaigns = len(campaigns)
    active_campaigns = len([c for c in campaigns if c.status == "active"])
    total_contacts = sum(c.total_contacts for c in campaigns)
    total_sent = sum(c.sent_count for c in campaigns)
    total_replied = sum(c.replied_count for c in campaigns)

    queue_stats = await service.get_queue_stats()

    return {
        "campaigns": {
            "total": total_campaigns,
            "active": active_campaigns,
        },
        "contacts": {
            "total": total_contacts,
            "sent": total_sent,
            "replied": total_replied,
            "response_rate": round(total_replied / total_sent * 100, 1) if total_sent > 0 else 0,
        },
        "queue": queue_stats,
    }


@router.get("/analytics/daily")
async def get_daily_analytics(
    days: int = 7,
    service: OutreachService = Depends(get_service)
):
    """Get daily send counts for the past N days."""
    from datetime import datetime, timedelta
    import aiosqlite
    from ..config import DATA_DIR

    daily_stats = []
    db_path = DATA_DIR / "outreach.db"

    async with aiosqlite.connect(db_path) as db:
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            cursor = await db.execute("""
                SELECT COUNT(*) FROM campaign_contacts
                WHERE sent_at LIKE ? AND status = 'sent'
            """, (f"{date}%",))
            count = (await cursor.fetchone())[0]
            daily_stats.append({"date": date, "sent": count})

    return {"daily": list(reversed(daily_stats))}


@router.get("/worker/status")
async def get_worker_status():
    """Get automation worker status."""
    import os
    from pathlib import Path

    worker_dir = Path(__file__).parent.parent.parent / "worker"
    worker_log = worker_dir / "outreach_worker.log"
    pid_file = worker_dir / "worker.pid"
    cookies_file = worker_dir / "linkedin_cookies.json"

    status = {
        "running": False,
        "pid": None,
        "last_activity": None,
        "log_tail": [],
        "linkedin_session": False,
    }

    # Check if LinkedIn session cookies exist
    if cookies_file.exists():
        try:
            import json
            cookies = json.loads(cookies_file.read_text())
            # Check if there are LinkedIn cookies
            linkedin_cookies = [c for c in cookies if 'linkedin.com' in c.get('domain', '')]
            status["linkedin_session"] = len(linkedin_cookies) > 0
        except Exception:
            pass

    # Check if PID file exists and process is running
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text().strip())
            # Check if process exists
            os.kill(pid, 0)
            status["running"] = True
            status["pid"] = pid
        except (ProcessLookupError, ValueError):
            pass

    # Get last few log lines
    if worker_log.exists():
        try:
            lines = worker_log.read_text().strip().split("\n")
            status["log_tail"] = lines[-10:]
            if lines:
                # Extract timestamp from last line
                last_line = lines[-1]
                if " - " in last_line:
                    status["last_activity"] = last_line.split(" - ")[0]
        except Exception:
            pass

    return status
