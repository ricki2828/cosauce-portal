"""
Outreach Service - LinkedIn & Email campaign management
Handles campaigns, templates, message queue, and automation
"""

import aiosqlite
import anthropic
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Literal
from enum import Enum

from ..config import ANTHROPIC_API_KEY, DATA_DIR


# Database path
OUTREACH_DB = DATA_DIR / "outreach.db"

# Channel types
ChannelType = Literal["linkedin", "email"]
CampaignStatus = Literal["draft", "active", "paused", "completed"]
MessageStatus = Literal["pending", "ready", "queued", "sent", "failed", "replied"]


@dataclass
class OutreachTemplate:
    """Message template for outreach campaigns."""
    id: str
    name: str
    channel: ChannelType
    subject: Optional[str]  # For email/InMail
    body: str
    placeholders: List[str]
    created_by: str
    created_at: str
    is_default: bool = False


@dataclass
class OutreachCampaign:
    """Outreach campaign definition."""
    id: str
    name: str
    channel: ChannelType
    status: CampaignStatus
    template_id: Optional[str]
    created_by: str
    created_at: str
    updated_at: str
    settings: Dict  # rate limits, personalization options

    # Stats (computed)
    total_contacts: int = 0
    sent_count: int = 0
    replied_count: int = 0


@dataclass
class CampaignContact:
    """Contact enrolled in a campaign."""
    id: str
    campaign_id: str
    contact_id: str
    contact_name: str
    contact_title: Optional[str]
    company_name: Optional[str]
    linkedin_url: Optional[str]
    email: Optional[str]
    personalized_message: Optional[str]
    status: MessageStatus
    sent_at: Optional[str]
    error_message: Optional[str]


class OutreachService:
    """Service for outreach campaign management."""

    DEFAULT_SETTINGS = {
        "max_per_day": 20,
        "min_delay_seconds": 30,
        "max_delay_seconds": 120,
        "active_hours_start": 8,
        "active_hours_end": 20,
        "personalize_each": False,
        "automation_enabled": True,
    }

    def __init__(self):
        self.db_path = OUTREACH_DB
        self.anthropic_client = None
        if ANTHROPIC_API_KEY:
            self.anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    async def init_db(self):
        """Initialize the database schema."""
        async with aiosqlite.connect(self.db_path) as db:
            # Enable WAL mode for better concurrency
            await db.execute("PRAGMA journal_mode=WAL")

            # Templates table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS outreach_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    channel TEXT NOT NULL DEFAULT 'linkedin',
                    subject TEXT,
                    body TEXT NOT NULL,
                    placeholders TEXT DEFAULT '[]',
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    is_default INTEGER DEFAULT 0
                )
            """)

            # Campaigns table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS outreach_campaigns (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    channel TEXT NOT NULL DEFAULT 'linkedin',
                    status TEXT DEFAULT 'draft',
                    template_id TEXT,
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    settings TEXT DEFAULT '{}',
                    FOREIGN KEY (template_id) REFERENCES outreach_templates(id)
                )
            """)

            # Campaign contacts table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS campaign_contacts (
                    id TEXT PRIMARY KEY,
                    campaign_id TEXT NOT NULL,
                    contact_id TEXT NOT NULL,
                    contact_name TEXT NOT NULL,
                    contact_title TEXT,
                    company_name TEXT,
                    linkedin_url TEXT,
                    email TEXT,
                    personalized_message TEXT,
                    status TEXT DEFAULT 'pending',
                    sent_at TEXT,
                    error_message TEXT,
                    FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id),
                    UNIQUE(campaign_id, contact_id)
                )
            """)

            # Message queue table (for worker)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS message_queue (
                    id TEXT PRIMARY KEY,
                    campaign_contact_id TEXT NOT NULL,
                    scheduled_at TEXT,
                    sent_at TEXT,
                    status TEXT DEFAULT 'queued',
                    attempts INTEGER DEFAULT 0,
                    last_error TEXT,
                    FOREIGN KEY (campaign_contact_id) REFERENCES campaign_contacts(id)
                )
            """)

            # Activity log table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS outreach_activity_log (
                    id TEXT PRIMARY KEY,
                    campaign_id TEXT,
                    contact_id TEXT,
                    action TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                )
            """)

            # Create indexes
            await db.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_status ON outreach_campaigns(status)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON campaign_contacts(campaign_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_contacts_status ON campaign_contacts(status)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_queue_status ON message_queue(status)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_activity_campaign ON outreach_activity_log(campaign_id)")

            await db.commit()

    # ==================== TEMPLATE METHODS ====================

    async def create_template(
        self,
        name: str,
        body: str,
        channel: ChannelType = "linkedin",
        subject: Optional[str] = None,
        created_by: str = "system"
    ) -> OutreachTemplate:
        """Create a new message template."""
        template_id = f"tpl_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        # Extract placeholders from body
        import re
        placeholders = list(set(re.findall(r'\{\{(\w+)\}\}', body)))

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO outreach_templates
                (id, name, channel, subject, body, placeholders, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (template_id, name, channel, subject, body, json.dumps(placeholders), created_by, now))
            await db.commit()

        return OutreachTemplate(
            id=template_id,
            name=name,
            channel=channel,
            subject=subject,
            body=body,
            placeholders=placeholders,
            created_by=created_by,
            created_at=now,
        )

    async def get_templates(self, channel: Optional[ChannelType] = None) -> List[OutreachTemplate]:
        """Get all templates, optionally filtered by channel."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if channel:
                cursor = await db.execute(
                    "SELECT * FROM outreach_templates WHERE channel = ? ORDER BY created_at DESC",
                    (channel,)
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM outreach_templates ORDER BY created_at DESC"
                )
            rows = await cursor.fetchall()

        return [
            OutreachTemplate(
                id=row["id"],
                name=row["name"],
                channel=row["channel"],
                subject=row["subject"],
                body=row["body"],
                placeholders=json.loads(row["placeholders"]),
                created_by=row["created_by"],
                created_at=row["created_at"],
                is_default=bool(row["is_default"]),
            )
            for row in rows
        ]

    async def get_template(self, template_id: str) -> Optional[OutreachTemplate]:
        """Get a single template by ID."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM outreach_templates WHERE id = ?",
                (template_id,)
            )
            row = await cursor.fetchone()

        if not row:
            return None

        return OutreachTemplate(
            id=row["id"],
            name=row["name"],
            channel=row["channel"],
            subject=row["subject"],
            body=row["body"],
            placeholders=json.loads(row["placeholders"]),
            created_by=row["created_by"],
            created_at=row["created_at"],
            is_default=bool(row["is_default"]),
        )

    async def update_template(
        self,
        template_id: str,
        name: Optional[str] = None,
        body: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> Optional[OutreachTemplate]:
        """Update an existing template."""
        template = await self.get_template(template_id)
        if not template:
            return None

        updates = []
        values = []

        if name is not None:
            updates.append("name = ?")
            values.append(name)
        if body is not None:
            updates.append("body = ?")
            values.append(body)
            # Re-extract placeholders
            import re
            placeholders = list(set(re.findall(r'\{\{(\w+)\}\}', body)))
            updates.append("placeholders = ?")
            values.append(json.dumps(placeholders))
        if subject is not None:
            updates.append("subject = ?")
            values.append(subject)

        if not updates:
            return template

        values.append(template_id)

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                f"UPDATE outreach_templates SET {', '.join(updates)} WHERE id = ?",
                values
            )
            await db.commit()

        return await self.get_template(template_id)

    async def delete_template(self, template_id: str) -> bool:
        """Delete a template."""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM outreach_templates WHERE id = ?",
                (template_id,)
            )
            await db.commit()
            return cursor.rowcount > 0

    # ==================== CAMPAIGN METHODS ====================

    async def create_campaign(
        self,
        name: str,
        channel: ChannelType = "linkedin",
        template_id: Optional[str] = None,
        created_by: str = "system",
        settings: Optional[Dict] = None,
    ) -> OutreachCampaign:
        """Create a new outreach campaign."""
        campaign_id = f"camp_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        campaign_settings = {**self.DEFAULT_SETTINGS, **(settings or {})}

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO outreach_campaigns
                (id, name, channel, status, template_id, created_by, created_at, updated_at, settings)
                VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)
            """, (campaign_id, name, channel, template_id, created_by, now, now, json.dumps(campaign_settings)))
            await db.commit()

        await self._log_activity(campaign_id, None, "campaign_created", {"name": name})

        return OutreachCampaign(
            id=campaign_id,
            name=name,
            channel=channel,
            status="draft",
            template_id=template_id,
            created_by=created_by,
            created_at=now,
            updated_at=now,
            settings=campaign_settings,
        )

    async def get_campaigns(
        self,
        status: Optional[CampaignStatus] = None,
        channel: Optional[ChannelType] = None,
        limit: int = 50,
    ) -> List[OutreachCampaign]:
        """Get campaigns with optional filtering."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            query = "SELECT * FROM outreach_campaigns WHERE 1=1"
            params = []

            if status:
                query += " AND status = ?"
                params.append(status)
            if channel:
                query += " AND channel = ?"
                params.append(channel)

            query += " ORDER BY updated_at DESC LIMIT ?"
            params.append(limit)

            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()

        campaigns = []
        for row in rows:
            # Get stats for each campaign
            stats = await self._get_campaign_stats(row["id"])
            campaigns.append(OutreachCampaign(
                id=row["id"],
                name=row["name"],
                channel=row["channel"],
                status=row["status"],
                template_id=row["template_id"],
                created_by=row["created_by"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                settings=json.loads(row["settings"]),
                total_contacts=stats["total"],
                sent_count=stats["sent"],
                replied_count=stats["replied"],
            ))

        return campaigns

    async def get_campaign(self, campaign_id: str) -> Optional[OutreachCampaign]:
        """Get a single campaign by ID."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM outreach_campaigns WHERE id = ?",
                (campaign_id,)
            )
            row = await cursor.fetchone()

        if not row:
            return None

        stats = await self._get_campaign_stats(campaign_id)

        return OutreachCampaign(
            id=row["id"],
            name=row["name"],
            channel=row["channel"],
            status=row["status"],
            template_id=row["template_id"],
            created_by=row["created_by"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            settings=json.loads(row["settings"]),
            total_contacts=stats["total"],
            sent_count=stats["sent"],
            replied_count=stats["replied"],
        )

    async def update_campaign(
        self,
        campaign_id: str,
        name: Optional[str] = None,
        template_id: Optional[str] = None,
        settings: Optional[Dict] = None,
    ) -> Optional[OutreachCampaign]:
        """Update a campaign."""
        now = datetime.utcnow().isoformat()

        updates = ["updated_at = ?"]
        values = [now]

        if name is not None:
            updates.append("name = ?")
            values.append(name)
        if template_id is not None:
            updates.append("template_id = ?")
            values.append(template_id)
        if settings is not None:
            # Merge with existing settings
            campaign = await self.get_campaign(campaign_id)
            if campaign:
                merged = {**campaign.settings, **settings}
                updates.append("settings = ?")
                values.append(json.dumps(merged))

        values.append(campaign_id)

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                f"UPDATE outreach_campaigns SET {', '.join(updates)} WHERE id = ?",
                values
            )
            await db.commit()

        return await self.get_campaign(campaign_id)

    async def update_campaign_status(
        self,
        campaign_id: str,
        status: CampaignStatus,
    ) -> Optional[OutreachCampaign]:
        """Update campaign status (start/pause/complete)."""
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE outreach_campaigns SET status = ?, updated_at = ? WHERE id = ?",
                (status, now, campaign_id)
            )
            await db.commit()

        await self._log_activity(campaign_id, None, f"campaign_{status}", {})

        # If starting campaign, queue messages
        if status == "active":
            await self._queue_campaign_messages(campaign_id)

        return await self.get_campaign(campaign_id)

    async def delete_campaign(self, campaign_id: str) -> bool:
        """Delete a campaign and its contacts."""
        async with aiosqlite.connect(self.db_path) as db:
            # Delete queue entries first
            await db.execute("""
                DELETE FROM message_queue
                WHERE campaign_contact_id IN (
                    SELECT id FROM campaign_contacts WHERE campaign_id = ?
                )
            """, (campaign_id,))
            # Delete contacts
            await db.execute(
                "DELETE FROM campaign_contacts WHERE campaign_id = ?",
                (campaign_id,)
            )
            # Delete campaign
            cursor = await db.execute(
                "DELETE FROM outreach_campaigns WHERE id = ?",
                (campaign_id,)
            )
            await db.commit()
            return cursor.rowcount > 0

    # ==================== CONTACT METHODS ====================

    async def add_contacts_to_campaign(
        self,
        campaign_id: str,
        contacts: List[Dict],  # List of contact dicts with name, title, company, linkedin_url, email
    ) -> List[CampaignContact]:
        """Add contacts to a campaign."""
        added = []

        async with aiosqlite.connect(self.db_path) as db:
            for contact in contacts:
                contact_id = contact.get("id") or f"contact_{uuid.uuid4().hex[:12]}"
                cc_id = f"cc_{uuid.uuid4().hex[:12]}"

                try:
                    await db.execute("""
                        INSERT INTO campaign_contacts
                        (id, campaign_id, contact_id, contact_name, contact_title, company_name, linkedin_url, email, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                    """, (
                        cc_id,
                        campaign_id,
                        contact_id,
                        contact.get("name", "Unknown"),
                        contact.get("title"),
                        contact.get("company"),
                        contact.get("linkedin_url"),
                        contact.get("email"),
                    ))

                    added.append(CampaignContact(
                        id=cc_id,
                        campaign_id=campaign_id,
                        contact_id=contact_id,
                        contact_name=contact.get("name", "Unknown"),
                        contact_title=contact.get("title"),
                        company_name=contact.get("company"),
                        linkedin_url=contact.get("linkedin_url"),
                        email=contact.get("email"),
                        personalized_message=None,
                        status="pending",
                        sent_at=None,
                        error_message=None,
                    ))
                except aiosqlite.IntegrityError:
                    # Contact already in campaign, skip
                    pass

            await db.commit()

        await self._log_activity(campaign_id, None, "contacts_added", {"count": len(added)})

        return added

    async def get_campaign_contacts(
        self,
        campaign_id: str,
        status: Optional[MessageStatus] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[CampaignContact]:
        """Get contacts in a campaign."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            query = "SELECT * FROM campaign_contacts WHERE campaign_id = ?"
            params = [campaign_id]

            if status:
                query += " AND status = ?"
                params.append(status)

            query += " ORDER BY id LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()

        return [
            CampaignContact(
                id=row["id"],
                campaign_id=row["campaign_id"],
                contact_id=row["contact_id"],
                contact_name=row["contact_name"],
                contact_title=row["contact_title"],
                company_name=row["company_name"],
                linkedin_url=row["linkedin_url"],
                email=row["email"],
                personalized_message=row["personalized_message"],
                status=row["status"],
                sent_at=row["sent_at"],
                error_message=row["error_message"],
            )
            for row in rows
        ]

    async def remove_contact_from_campaign(
        self,
        campaign_id: str,
        campaign_contact_id: str,
    ) -> bool:
        """Remove a contact from a campaign."""
        async with aiosqlite.connect(self.db_path) as db:
            # Remove from queue first
            await db.execute(
                "DELETE FROM message_queue WHERE campaign_contact_id = ?",
                (campaign_contact_id,)
            )
            # Remove contact
            cursor = await db.execute(
                "DELETE FROM campaign_contacts WHERE id = ? AND campaign_id = ?",
                (campaign_contact_id, campaign_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    # ==================== MESSAGE GENERATION ====================

    async def generate_template_with_ai(
        self,
        channel: ChannelType,
        context: str,
        tone: str = "professional",
    ) -> str:
        """Use AI to help write a message template."""
        if not self.anthropic_client:
            return "[AI unavailable - please write template manually]"

        char_limit = 300 if channel == "linkedin" else 2000

        prompt = f"""You are writing a {channel} outreach message template for B2B sales.

CONTEXT:
{context}

REQUIREMENTS:
- Tone: {tone}
- Maximum {char_limit} characters
- Use placeholders like {{{{first_name}}}}, {{{{company}}}}, {{{{title}}}} where personalization should go
- Include a soft call-to-action
- Sound natural, not robotic or overly salesy
- For LinkedIn: Keep it short and conversational (this is a connection request message)

Return ONLY the template text, no explanation."""

        try:
            message = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
        except Exception as e:
            return f"[AI Error: {str(e)}]"

    async def personalize_message(
        self,
        template_body: str,
        contact: CampaignContact,
        extra_context: Optional[Dict] = None,
    ) -> str:
        """Personalize a template for a specific contact."""
        # Basic placeholder replacement
        message = template_body
        message = message.replace("{{first_name}}", contact.contact_name.split()[0] if contact.contact_name else "")
        message = message.replace("{{name}}", contact.contact_name or "")
        message = message.replace("{{title}}", contact.contact_title or "")
        message = message.replace("{{company}}", contact.company_name or "")

        return message

    async def personalize_message_with_ai(
        self,
        template_body: str,
        contact: CampaignContact,
        extra_context: Optional[Dict] = None,
    ) -> str:
        """Use AI to deeply personalize a message for a contact."""
        if not self.anthropic_client:
            return await self.personalize_message(template_body, contact, extra_context)

        prompt = f"""You are personalizing a LinkedIn outreach message for a specific person.

TEMPLATE:
{template_body}

CONTACT INFO:
- Name: {contact.contact_name}
- Title: {contact.contact_title or 'Unknown'}
- Company: {contact.company_name or 'Unknown'}
{f'- Extra context: {json.dumps(extra_context)}' if extra_context else ''}

REQUIREMENTS:
- Keep the core message and value proposition
- Replace placeholders with actual values
- Add a personalized touch based on their role/company
- Keep under 300 characters (LinkedIn limit)
- Sound natural and human

Return ONLY the personalized message, no explanation."""

        try:
            message = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
        except Exception as e:
            # Fall back to basic personalization
            return await self.personalize_message(template_body, contact, extra_context)

    async def generate_messages_for_campaign(
        self,
        campaign_id: str,
        use_ai: bool = False,
    ) -> int:
        """Generate personalized messages for all pending contacts in a campaign."""
        campaign = await self.get_campaign(campaign_id)
        if not campaign or not campaign.template_id:
            return 0

        template = await self.get_template(campaign.template_id)
        if not template:
            return 0

        contacts = await self.get_campaign_contacts(campaign_id, status="pending")
        count = 0

        async with aiosqlite.connect(self.db_path) as db:
            for contact in contacts:
                if use_ai and campaign.settings.get("personalize_each"):
                    message = await self.personalize_message_with_ai(template.body, contact)
                else:
                    message = await self.personalize_message(template.body, contact)

                await db.execute(
                    "UPDATE campaign_contacts SET personalized_message = ?, status = 'ready' WHERE id = ?",
                    (message, contact.id)
                )
                count += 1

            await db.commit()

        await self._log_activity(campaign_id, None, "messages_generated", {"count": count, "ai_used": use_ai})

        return count

    # ==================== QUEUE METHODS ====================

    async def _queue_campaign_messages(self, campaign_id: str):
        """Queue ready messages for sending."""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return

        contacts = await self.get_campaign_contacts(campaign_id, status="ready")

        async with aiosqlite.connect(self.db_path) as db:
            for contact in contacts:
                queue_id = f"q_{uuid.uuid4().hex[:12]}"
                await db.execute("""
                    INSERT OR IGNORE INTO message_queue (id, campaign_contact_id, status)
                    VALUES (?, ?, 'queued')
                """, (queue_id, contact.id))

                # Update contact status
                await db.execute(
                    "UPDATE campaign_contacts SET status = 'queued' WHERE id = ?",
                    (contact.id,)
                )

            await db.commit()

    async def get_next_queued_message(self, channel: Optional[ChannelType] = None) -> Optional[Dict]:
        """Get the next message to send (for worker or manual sending)."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            query = """
                SELECT
                    mq.id as queue_id,
                    cc.*,
                    oc.name as campaign_name,
                    oc.channel
                FROM message_queue mq
                JOIN campaign_contacts cc ON mq.campaign_contact_id = cc.id
                JOIN outreach_campaigns oc ON cc.campaign_id = oc.id
                WHERE mq.status = 'queued'
                AND oc.status = 'active'
            """
            params = []

            if channel:
                query += " AND oc.channel = ?"
                params.append(channel)

            query += " ORDER BY mq.id LIMIT 1"

            cursor = await db.execute(query, params)
            row = await cursor.fetchone()

        if not row:
            return None

        return {
            "queue_id": row["queue_id"],
            "campaign_contact_id": row["id"],
            "campaign_id": row["campaign_id"],
            "campaign_name": row["campaign_name"],
            "channel": row["channel"],
            "contact_name": row["contact_name"],
            "contact_title": row["contact_title"],
            "company_name": row["company_name"],
            "linkedin_url": row["linkedin_url"],
            "email": row["email"],
            "message": row["personalized_message"],
        }

    async def mark_message_sent(self, queue_id: str) -> bool:
        """Mark a message as sent (manual or automated)."""
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            # Get the campaign_contact_id
            cursor = await db.execute(
                "SELECT campaign_contact_id FROM message_queue WHERE id = ?",
                (queue_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return False

            cc_id = row["campaign_contact_id"]

            # Update queue
            await db.execute(
                "UPDATE message_queue SET status = 'sent', sent_at = ? WHERE id = ?",
                (now, queue_id)
            )

            # Update contact
            await db.execute(
                "UPDATE campaign_contacts SET status = 'sent', sent_at = ? WHERE id = ?",
                (now, cc_id)
            )

            await db.commit()

        # Get campaign ID for logging
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT campaign_id FROM campaign_contacts WHERE id = ?",
                (cc_id,)
            )
            row = await cursor.fetchone()
            if row:
                await self._log_activity(row["campaign_id"], cc_id, "message_sent", {})

        return True

    async def mark_message_failed(self, queue_id: str, error: str) -> bool:
        """Mark a message as failed."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            # Get the campaign_contact_id
            cursor = await db.execute(
                "SELECT campaign_contact_id, attempts FROM message_queue WHERE id = ?",
                (queue_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return False

            cc_id = row["campaign_contact_id"]
            attempts = row["attempts"] + 1

            # Update queue
            await db.execute(
                "UPDATE message_queue SET status = 'failed', attempts = ?, last_error = ? WHERE id = ?",
                (attempts, error, queue_id)
            )

            # Update contact
            await db.execute(
                "UPDATE campaign_contacts SET status = 'failed', error_message = ? WHERE id = ?",
                (error, cc_id)
            )

            await db.commit()

        return True

    async def skip_message(self, queue_id: str) -> bool:
        """Skip a queued message."""
        async with aiosqlite.connect(self.db_path) as db:
            # Get the campaign_contact_id
            cursor = await db.execute(
                "SELECT campaign_contact_id FROM message_queue WHERE id = ?",
                (queue_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return False

            cc_id = row[0]

            # Remove from queue
            await db.execute("DELETE FROM message_queue WHERE id = ?", (queue_id,))

            # Reset contact to ready
            await db.execute(
                "UPDATE campaign_contacts SET status = 'ready' WHERE id = ?",
                (cc_id,)
            )

            await db.commit()

        return True

    async def get_queue_stats(self, campaign_id: Optional[str] = None) -> Dict:
        """Get queue statistics."""
        async with aiosqlite.connect(self.db_path) as db:
            if campaign_id:
                cursor = await db.execute("""
                    SELECT mq.status, COUNT(*) as count
                    FROM message_queue mq
                    JOIN campaign_contacts cc ON mq.campaign_contact_id = cc.id
                    WHERE cc.campaign_id = ?
                    GROUP BY mq.status
                """, (campaign_id,))
            else:
                cursor = await db.execute("""
                    SELECT status, COUNT(*) as count
                    FROM message_queue
                    GROUP BY status
                """)

            rows = await cursor.fetchall()

        stats = {"queued": 0, "sent": 0, "failed": 0, "processing": 0}
        for row in rows:
            stats[row[0]] = row[1]

        return stats

    # ==================== HELPER METHODS ====================

    async def _get_campaign_stats(self, campaign_id: str) -> Dict:
        """Get statistics for a campaign."""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
                FROM campaign_contacts
                WHERE campaign_id = ?
            """, (campaign_id,))
            row = await cursor.fetchone()

        return {
            "total": row[0] or 0,
            "sent": row[1] or 0,
            "replied": row[2] or 0,
        }

    async def _log_activity(
        self,
        campaign_id: Optional[str],
        contact_id: Optional[str],
        action: str,
        details: Dict,
    ):
        """Log an activity event."""
        log_id = f"log_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO outreach_activity_log (id, campaign_id, contact_id, action, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (log_id, campaign_id, contact_id, action, json.dumps(details), now))
            await db.commit()

    async def get_activity_log(
        self,
        campaign_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict]:
        """Get activity log entries."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            if campaign_id:
                cursor = await db.execute(
                    "SELECT * FROM outreach_activity_log WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ?",
                    (campaign_id, limit)
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM outreach_activity_log ORDER BY created_at DESC LIMIT ?",
                    (limit,)
                )

            rows = await cursor.fetchall()

        return [
            {
                "id": row["id"],
                "campaign_id": row["campaign_id"],
                "contact_id": row["contact_id"],
                "action": row["action"],
                "details": json.loads(row["details"]) if row["details"] else {},
                "created_at": row["created_at"],
            }
            for row in rows
        ]


# Singleton instance
_outreach_service: Optional[OutreachService] = None


async def get_outreach_service() -> OutreachService:
    """Get or create the outreach service singleton."""
    global _outreach_service
    if _outreach_service is None:
        _outreach_service = OutreachService()
        await _outreach_service.init_db()
    return _outreach_service
