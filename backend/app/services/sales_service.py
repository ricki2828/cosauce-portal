"""
Sales Service - Company research, contact management, and signal tracking
Provides the foundation for outreach campaigns with company/contact data
"""

import aiosqlite
from openai import OpenAI
import json
import uuid
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Literal

from ..config import OPENAI_API_KEY, DATA_DIR


# Database path
SALES_DB = DATA_DIR / "sales.db"


@dataclass
class Company:
    """Company record for sales pipeline."""
    id: str
    name: str
    website: Optional[str]
    industry: Optional[str]
    size: Optional[str]  # e.g., "50-200", "1000+"
    description: Optional[str]
    headquarters: Optional[str]
    linkedin_url: Optional[str]
    created_at: str
    updated_at: str
    tags: List[str]
    custom_fields: Dict


@dataclass
class Contact:
    """Contact record linked to a company."""
    id: str
    company_id: str
    name: str
    title: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    linkedin_url: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str
    # Denormalized for convenience
    company_name: Optional[str] = None


@dataclass
class Signal:
    """Sales signal/trigger for a company."""
    id: str
    company_id: str
    signal_type: str  # e.g., "hiring", "funding", "expansion", "tech_adoption"
    signal_strength: int  # 1-5
    source: str
    details: str
    detected_at: str
    # Denormalized
    company_name: Optional[str] = None


class SalesService:
    """Service for sales pipeline management."""

    def __init__(self):
        self.db_path = SALES_DB
        self.openai_client = None
        if OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=OPENAI_API_KEY)

    async def init_db(self):
        """Initialize the database schema."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA journal_mode=WAL")

            # Companies table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    website TEXT,
                    industry TEXT,
                    size TEXT,
                    description TEXT,
                    headquarters TEXT,
                    linkedin_url TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    tags TEXT DEFAULT '[]',
                    custom_fields TEXT DEFAULT '{}'
                )
            """)

            # Contacts table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                    id TEXT PRIMARY KEY,
                    company_id TEXT,
                    name TEXT NOT NULL,
                    title TEXT,
                    email TEXT,
                    phone TEXT,
                    linkedin_url TEXT,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (company_id) REFERENCES companies(id)
                )
            """)

            # Signals table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS signals (
                    id TEXT PRIMARY KEY,
                    company_id TEXT NOT NULL,
                    signal_type TEXT NOT NULL,
                    signal_strength INTEGER DEFAULT 3,
                    source TEXT,
                    details TEXT,
                    detected_at TEXT NOT NULL,
                    FOREIGN KEY (company_id) REFERENCES companies(id)
                )
            """)

            # Create indexes
            await db.execute("CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_signals_company ON signals(company_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry)")

            await db.commit()

    # ==================== COMPANY METHODS ====================

    async def create_company(
        self,
        name: str,
        website: Optional[str] = None,
        industry: Optional[str] = None,
        size: Optional[str] = None,
        description: Optional[str] = None,
        headquarters: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        tags: Optional[List[str]] = None,
        custom_fields: Optional[Dict] = None,
    ) -> Company:
        """Create a new company."""
        company_id = f"comp_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO companies
                (id, name, website, industry, size, description, headquarters, linkedin_url, created_at, updated_at, tags, custom_fields)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, name, website, industry, size, description,
                headquarters, linkedin_url, now, now,
                json.dumps(tags or []), json.dumps(custom_fields or {})
            ))
            await db.commit()

        return Company(
            id=company_id,
            name=name,
            website=website,
            industry=industry,
            size=size,
            description=description,
            headquarters=headquarters,
            linkedin_url=linkedin_url,
            created_at=now,
            updated_at=now,
            tags=tags or [],
            custom_fields=custom_fields or {},
        )

    async def get_companies(
        self,
        industry: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Company]:
        """Get companies with optional filtering."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            query = "SELECT * FROM companies WHERE 1=1"
            params = []

            if industry:
                query += " AND industry = ?"
                params.append(industry)
            if search:
                query += " AND (name LIKE ? OR description LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])

            query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()

        return [
            Company(
                id=row["id"],
                name=row["name"],
                website=row["website"],
                industry=row["industry"],
                size=row["size"],
                description=row["description"],
                headquarters=row["headquarters"],
                linkedin_url=row["linkedin_url"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                tags=json.loads(row["tags"]) if row["tags"] else [],
                custom_fields=json.loads(row["custom_fields"]) if row["custom_fields"] else {},
            )
            for row in rows
        ]

    async def get_company(self, company_id: str) -> Optional[Company]:
        """Get a single company by ID."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM companies WHERE id = ?",
                (company_id,)
            )
            row = await cursor.fetchone()

        if not row:
            return None

        return Company(
            id=row["id"],
            name=row["name"],
            website=row["website"],
            industry=row["industry"],
            size=row["size"],
            description=row["description"],
            headquarters=row["headquarters"],
            linkedin_url=row["linkedin_url"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            tags=json.loads(row["tags"]) if row["tags"] else [],
            custom_fields=json.loads(row["custom_fields"]) if row["custom_fields"] else {},
        )

    async def update_company(
        self,
        company_id: str,
        **kwargs
    ) -> Optional[Company]:
        """Update a company."""
        now = datetime.utcnow().isoformat()

        updates = ["updated_at = ?"]
        values = [now]

        allowed_fields = ["name", "website", "industry", "size", "description",
                         "headquarters", "linkedin_url", "tags", "custom_fields"]

        for field in allowed_fields:
            if field in kwargs and kwargs[field] is not None:
                if field in ["tags", "custom_fields"]:
                    updates.append(f"{field} = ?")
                    values.append(json.dumps(kwargs[field]))
                else:
                    updates.append(f"{field} = ?")
                    values.append(kwargs[field])

        values.append(company_id)

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                f"UPDATE companies SET {', '.join(updates)} WHERE id = ?",
                values
            )
            await db.commit()

        return await self.get_company(company_id)

    async def delete_company(self, company_id: str) -> bool:
        """Delete a company and its related data."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM signals WHERE company_id = ?", (company_id,))
            await db.execute("DELETE FROM contacts WHERE company_id = ?", (company_id,))
            cursor = await db.execute("DELETE FROM companies WHERE id = ?", (company_id,))
            await db.commit()
            return cursor.rowcount > 0

    # ==================== CONTACT METHODS ====================

    async def create_contact(
        self,
        name: str,
        company_id: Optional[str] = None,
        title: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Contact:
        """Create a new contact."""
        contact_id = f"cont_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO contacts
                (id, company_id, name, title, email, phone, linkedin_url, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (contact_id, company_id, name, title, email, phone, linkedin_url, notes, now, now))
            await db.commit()

        # Get company name if linked
        company_name = None
        if company_id:
            company = await self.get_company(company_id)
            if company:
                company_name = company.name

        return Contact(
            id=contact_id,
            company_id=company_id,
            name=name,
            title=title,
            email=email,
            phone=phone,
            linkedin_url=linkedin_url,
            notes=notes,
            created_at=now,
            updated_at=now,
            company_name=company_name,
        )

    async def get_contacts(
        self,
        company_id: Optional[str] = None,
        search: Optional[str] = None,
        has_linkedin: Optional[bool] = None,
        has_email: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Contact]:
        """Get contacts with optional filtering."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            query = """
                SELECT c.*, comp.name as company_name
                FROM contacts c
                LEFT JOIN companies comp ON c.company_id = comp.id
                WHERE 1=1
            """
            params = []

            if company_id:
                query += " AND c.company_id = ?"
                params.append(company_id)
            if search:
                query += " AND (c.name LIKE ? OR c.title LIKE ? OR comp.name LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            if has_linkedin:
                query += " AND c.linkedin_url IS NOT NULL AND c.linkedin_url != ''"
            if has_email:
                query += " AND c.email IS NOT NULL AND c.email != ''"

            query += " ORDER BY c.updated_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()

        return [
            Contact(
                id=row["id"],
                company_id=row["company_id"],
                name=row["name"],
                title=row["title"],
                email=row["email"],
                phone=row["phone"],
                linkedin_url=row["linkedin_url"],
                notes=row["notes"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                company_name=row["company_name"],
            )
            for row in rows
        ]

    async def get_contact(self, contact_id: str) -> Optional[Contact]:
        """Get a single contact by ID."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT c.*, comp.name as company_name
                FROM contacts c
                LEFT JOIN companies comp ON c.company_id = comp.id
                WHERE c.id = ?
            """, (contact_id,))
            row = await cursor.fetchone()

        if not row:
            return None

        return Contact(
            id=row["id"],
            company_id=row["company_id"],
            name=row["name"],
            title=row["title"],
            email=row["email"],
            phone=row["phone"],
            linkedin_url=row["linkedin_url"],
            notes=row["notes"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            company_name=row["company_name"],
        )

    async def update_contact(self, contact_id: str, **kwargs) -> Optional[Contact]:
        """Update a contact."""
        now = datetime.utcnow().isoformat()

        updates = ["updated_at = ?"]
        values = [now]

        allowed_fields = ["name", "company_id", "title", "email", "phone", "linkedin_url", "notes"]

        for field in allowed_fields:
            if field in kwargs:
                updates.append(f"{field} = ?")
                values.append(kwargs[field])

        values.append(contact_id)

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                f"UPDATE contacts SET {', '.join(updates)} WHERE id = ?",
                values
            )
            await db.commit()

        return await self.get_contact(contact_id)

    async def delete_contact(self, contact_id: str) -> bool:
        """Delete a contact."""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def bulk_create_contacts(self, contacts: List[Dict]) -> List[Contact]:
        """Create multiple contacts at once."""
        created = []
        for contact_data in contacts:
            contact = await self.create_contact(**contact_data)
            created.append(contact)
        return created

    # ==================== SIGNAL METHODS ====================

    async def create_signal(
        self,
        company_id: str,
        signal_type: str,
        source: str,
        details: str,
        signal_strength: int = 3,
    ) -> Signal:
        """Create a new signal for a company."""
        signal_id = f"sig_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO signals
                (id, company_id, signal_type, signal_strength, source, details, detected_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (signal_id, company_id, signal_type, signal_strength, source, details, now))
            await db.commit()

        company = await self.get_company(company_id)

        return Signal(
            id=signal_id,
            company_id=company_id,
            signal_type=signal_type,
            signal_strength=signal_strength,
            source=source,
            details=details,
            detected_at=now,
            company_name=company.name if company else None,
        )

    async def get_signals(
        self,
        company_id: Optional[str] = None,
        signal_type: Optional[str] = None,
        min_strength: Optional[int] = None,
        limit: int = 100,
    ) -> List[Signal]:
        """Get signals with optional filtering."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            query = """
                SELECT s.*, c.name as company_name
                FROM signals s
                JOIN companies c ON s.company_id = c.id
                WHERE 1=1
            """
            params = []

            if company_id:
                query += " AND s.company_id = ?"
                params.append(company_id)
            if signal_type:
                query += " AND s.signal_type = ?"
                params.append(signal_type)
            if min_strength:
                query += " AND s.signal_strength >= ?"
                params.append(min_strength)

            query += " ORDER BY s.detected_at DESC LIMIT ?"
            params.append(limit)

            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()

        return [
            Signal(
                id=row["id"],
                company_id=row["company_id"],
                signal_type=row["signal_type"],
                signal_strength=row["signal_strength"],
                source=row["source"],
                details=row["details"],
                detected_at=row["detected_at"],
                company_name=row["company_name"],
            )
            for row in rows
        ]

    # ==================== ANALYTICS ====================

    async def get_pipeline_stats(self) -> Dict:
        """Get overall pipeline statistics."""
        async with aiosqlite.connect(self.db_path) as db:
            # Company count
            cursor = await db.execute("SELECT COUNT(*) FROM companies")
            company_count = (await cursor.fetchone())[0]

            # Contact count
            cursor = await db.execute("SELECT COUNT(*) FROM contacts")
            contact_count = (await cursor.fetchone())[0]

            # Contacts with LinkedIn
            cursor = await db.execute(
                "SELECT COUNT(*) FROM contacts WHERE linkedin_url IS NOT NULL AND linkedin_url != ''"
            )
            linkedin_count = (await cursor.fetchone())[0]

            # Contacts with email
            cursor = await db.execute(
                "SELECT COUNT(*) FROM contacts WHERE email IS NOT NULL AND email != ''"
            )
            email_count = (await cursor.fetchone())[0]

            # Signal count
            cursor = await db.execute("SELECT COUNT(*) FROM signals")
            signal_count = (await cursor.fetchone())[0]

            # Industries breakdown
            cursor = await db.execute("""
                SELECT industry, COUNT(*) as count
                FROM companies
                WHERE industry IS NOT NULL
                GROUP BY industry
                ORDER BY count DESC
                LIMIT 10
            """)
            industries = await cursor.fetchall()

        return {
            "companies": company_count,
            "contacts": contact_count,
            "contacts_with_linkedin": linkedin_count,
            "contacts_with_email": email_count,
            "signals": signal_count,
            "industries": [{"industry": r[0], "count": r[1]} for r in industries],
        }

    # ==================== AI RESEARCH ====================

    async def research_company_with_ai(self, company_name: str, website: Optional[str] = None) -> Dict:
        """Use AI to research a company (placeholder for web scraping integration)."""
        if not self.openai_client:
            return {"error": "AI not available"}

        prompt = f"""Based on your knowledge, provide information about the company "{company_name}".
{f'Website: {website}' if website else ''}

Return a JSON object with these fields:
- industry: The industry/sector
- size: Estimated employee count range (e.g., "50-200")
- description: A brief 1-2 sentence description
- headquarters: Location of headquarters
- key_people: Array of {{"name": "", "title": ""}} for key executives if known

Return ONLY valid JSON, no explanation."""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            response_text = response.choices[0].message.content

            # Try to parse JSON
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {"raw_response": response_text}
        except Exception as e:
            return {"error": str(e)}


# Singleton instance
_sales_service: Optional[SalesService] = None


async def get_sales_service() -> SalesService:
    """Get or create the sales service singleton."""
    global _sales_service
    if _sales_service is None:
        _sales_service = SalesService()
        await _sales_service.init_db()
    return _sales_service
