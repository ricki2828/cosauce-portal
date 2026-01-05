"""
Sales Service - Company research, contact management, and signal tracking
Provides the foundation for outreach campaigns with company/contact data
Extended with job search, Apollo enrichment, and signal scoring.
"""

import aiosqlite
from openai import OpenAI
import json
import uuid
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Dict, List, Optional, Literal, Tuple

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
    # Extended fields for scoring and enrichment
    domain: Optional[str] = None
    score: int = 0
    score_breakdown: Dict = field(default_factory=dict)
    apollo_id: Optional[str] = None
    employee_count: Optional[int] = None
    status: str = "new"  # new, target, contacted, qualified, meeting, won, lost


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


@dataclass
class JobSignal:
    """Job posting signal for a company."""
    id: str
    company_id: str
    job_title: str
    job_url: Optional[str]
    job_description: Optional[str]
    location: Optional[str]
    source: str
    posted_date: Optional[str]
    discovered_at: str
    signal_type: str
    signal_strength: int
    is_active: bool = True
    # Denormalized
    company_name: Optional[str] = None


@dataclass
class SalesProject:
    """Targeting project for organizing outbound efforts."""
    id: str
    name: str
    description: Optional[str]
    target_criteria: Dict
    signal_weights: Dict
    status: str  # active, paused, completed
    created_at: str
    updated_at: str
    # Stats
    total_companies: int = 0
    total_contacts: int = 0


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

            # Job signals table (for job postings)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS job_signals (
                    id TEXT PRIMARY KEY,
                    company_id TEXT NOT NULL,
                    job_title TEXT NOT NULL,
                    job_url TEXT,
                    job_description TEXT,
                    location TEXT,
                    source TEXT,
                    posted_date TEXT,
                    discovered_at TEXT NOT NULL,
                    signal_type TEXT,
                    signal_strength INTEGER DEFAULT 1,
                    is_active INTEGER DEFAULT 1,
                    FOREIGN KEY (company_id) REFERENCES companies(id)
                )
            """)

            # Sales projects table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS sales_projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    target_criteria TEXT DEFAULT '{}',
                    signal_weights TEXT DEFAULT '{}',
                    status TEXT DEFAULT 'active',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            # Add new columns to companies if they don't exist
            # SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we check first
            try:
                await db.execute("ALTER TABLE companies ADD COLUMN domain TEXT")
            except:
                pass
            try:
                await db.execute("ALTER TABLE companies ADD COLUMN score INTEGER DEFAULT 0")
            except:
                pass
            try:
                await db.execute("ALTER TABLE companies ADD COLUMN score_breakdown TEXT DEFAULT '{}'")
            except:
                pass
            try:
                await db.execute("ALTER TABLE companies ADD COLUMN apollo_id TEXT")
            except:
                pass
            try:
                await db.execute("ALTER TABLE companies ADD COLUMN employee_count INTEGER")
            except:
                pass
            try:
                await db.execute("ALTER TABLE companies ADD COLUMN status TEXT DEFAULT 'new'")
            except:
                pass

            # Create indexes
            await db.execute("CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_signals_company ON signals(company_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_job_signals_company ON job_signals(company_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_companies_score ON companies(score)")

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

    # ==================== JOB SIGNAL METHODS ====================

    async def create_job_signal(
        self,
        company_id: str,
        job_title: str,
        job_url: Optional[str] = None,
        job_description: Optional[str] = None,
        location: Optional[str] = None,
        source: str = "jsearch",
        posted_date: Optional[str] = None,
        signal_type: str = "general_hiring",
        signal_strength: int = 1,
    ) -> JobSignal:
        """Create a new job signal for a company."""
        signal_id = f"jsig_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO job_signals
                (id, company_id, job_title, job_url, job_description, location, source, posted_date, discovered_at, signal_type, signal_strength)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                signal_id, company_id, job_title, job_url, job_description,
                location, source, posted_date, now, signal_type, signal_strength
            ))
            await db.commit()

        company = await self.get_company(company_id)

        return JobSignal(
            id=signal_id,
            company_id=company_id,
            job_title=job_title,
            job_url=job_url,
            job_description=job_description,
            location=location,
            source=source,
            posted_date=posted_date,
            discovered_at=now,
            signal_type=signal_type,
            signal_strength=signal_strength,
            company_name=company.name if company else None,
        )

    async def get_job_signals(
        self,
        company_id: Optional[str] = None,
        signal_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[JobSignal]:
        """Get job signals with optional filtering."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            query = """
                SELECT js.*, c.name as company_name
                FROM job_signals js
                JOIN companies c ON js.company_id = c.id
                WHERE js.is_active = 1
            """
            params = []

            if company_id:
                query += " AND js.company_id = ?"
                params.append(company_id)
            if signal_type:
                query += " AND js.signal_type = ?"
                params.append(signal_type)

            query += " ORDER BY js.discovered_at DESC LIMIT ?"
            params.append(limit)

            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()

        return [
            JobSignal(
                id=row["id"],
                company_id=row["company_id"],
                job_title=row["job_title"],
                job_url=row["job_url"],
                job_description=row["job_description"],
                location=row["location"],
                source=row["source"],
                posted_date=row["posted_date"],
                discovered_at=row["discovered_at"],
                signal_type=row["signal_type"],
                signal_strength=row["signal_strength"],
                is_active=bool(row["is_active"]),
                company_name=row["company_name"],
            )
            for row in rows
        ]

    # ==================== PROJECT METHODS ====================

    async def create_project(
        self,
        name: str,
        description: Optional[str] = None,
        target_criteria: Optional[Dict] = None,
        signal_weights: Optional[Dict] = None,
    ) -> SalesProject:
        """Create a new sales project."""
        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO sales_projects
                (id, name, description, target_criteria, signal_weights, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
            """, (
                project_id, name, description,
                json.dumps(target_criteria or {}),
                json.dumps(signal_weights or {}),
                now, now
            ))
            await db.commit()

        return SalesProject(
            id=project_id,
            name=name,
            description=description,
            target_criteria=target_criteria or {},
            signal_weights=signal_weights or {},
            status="active",
            created_at=now,
            updated_at=now,
        )

    async def get_projects(self, status: Optional[str] = None) -> List[SalesProject]:
        """Get all projects."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            if status:
                cursor = await db.execute(
                    "SELECT * FROM sales_projects WHERE status = ? ORDER BY updated_at DESC",
                    (status,)
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM sales_projects ORDER BY updated_at DESC"
                )
            rows = await cursor.fetchall()

        return [
            SalesProject(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                target_criteria=json.loads(row["target_criteria"]) if row["target_criteria"] else {},
                signal_weights=json.loads(row["signal_weights"]) if row["signal_weights"] else {},
                status=row["status"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]

    # ==================== SCAN & ENRICHMENT ORCHESTRATION ====================

    async def scan_for_companies(
        self,
        query: str,
        location: str = "Canada",
        num_results: int = 50,
        enrich_with_apollo: bool = False,
    ) -> Dict:
        """
        Scan job boards for companies and create/update company records with signals.

        Args:
            query: Job search query
            location: Geographic filter
            num_results: Max results to fetch
            enrich_with_apollo: Whether to enrich with Apollo data

        Returns:
            Dict with scan results and stats
        """
        from .job_search_service import get_job_search_service
        from .scoring_service import classify_job_signal

        job_service = get_job_search_service()
        results = await job_service.search_jobs(query, location, num_results)

        if not results.get("success"):
            return {"success": False, "error": results.get("error", "Job search failed")}

        jobs = results.get("jobs", [])
        grouped = job_service.group_jobs_by_company(jobs)

        companies_created = 0
        companies_updated = 0
        signals_created = 0

        for company_name, company_jobs in grouped.items():
            # Try to find existing company
            existing = await self.get_companies(search=company_name, limit=1)

            if existing:
                company = existing[0]
                companies_updated += 1
            else:
                # Create new company
                first_job = company_jobs[0]
                company = await self.create_company(
                    name=company_name,
                    headquarters=first_job.get("location"),
                )
                companies_created += 1

            # Create job signals
            for job in company_jobs:
                signal_type, signal_strength = classify_job_signal(
                    job.get("title", ""),
                    job.get("description", "")
                )

                await self.create_job_signal(
                    company_id=company.id,
                    job_title=job.get("title", ""),
                    job_url=job.get("job_url"),
                    job_description=job.get("description"),
                    location=job.get("location"),
                    source=job.get("source", "jsearch"),
                    posted_date=job.get("posted_date"),
                    signal_type=signal_type,
                    signal_strength=signal_strength,
                )
                signals_created += 1

            # Recalculate company score
            await self.recalculate_company_score(company.id)

        # Optional Apollo enrichment for top companies
        if enrich_with_apollo:
            # Get top 10 companies by score
            top_companies = await self.get_companies(limit=10)
            for company in top_companies:
                if company.website:
                    domain = company.website.replace("https://", "").replace("http://", "").split("/")[0]
                    await self.enrich_company_with_apollo(company.id, domain)

        return {
            "success": True,
            "query": query,
            "location": location,
            "source": results.get("source"),
            "total_jobs": len(jobs),
            "companies_found": len(grouped),
            "companies_created": companies_created,
            "companies_updated": companies_updated,
            "signals_created": signals_created,
        }

    async def enrich_company_with_apollo(
        self,
        company_id: str,
        domain: Optional[str] = None,
    ) -> Dict:
        """
        Enrich a company with Apollo organization data.

        Args:
            company_id: Company ID to enrich
            domain: Company domain (extracted from website if not provided)

        Returns:
            Dict with enrichment results
        """
        from .apollo_service import get_apollo_service

        company = await self.get_company(company_id)
        if not company:
            return {"success": False, "error": "Company not found"}

        # Extract domain from website if not provided
        if not domain and company.website:
            domain = company.website.replace("https://", "").replace("http://", "").split("/")[0]

        if not domain:
            return {"success": False, "error": "No domain available for enrichment"}

        apollo = await get_apollo_service()

        if not apollo.is_configured():
            return {"success": False, "error": "Apollo API key not configured"}

        try:
            org = await apollo.get_organization(domain)

            if org:
                # Update company with Apollo data
                await self.update_company(
                    company_id,
                    industry=org.industry or company.industry,
                    size=f"{org.employee_count}" if org.employee_count else company.size,
                    linkedin_url=org.linkedin_url or company.linkedin_url,
                )

                # Update extended fields
                async with aiosqlite.connect(self.db_path) as db:
                    await db.execute("""
                        UPDATE companies SET
                            domain = ?,
                            apollo_id = ?,
                            employee_count = ?,
                            updated_at = ?
                        WHERE id = ?
                    """, (domain, org.apollo_id, org.employee_count, datetime.utcnow().isoformat(), company_id))
                    await db.commit()

                return {
                    "success": True,
                    "company_id": company_id,
                    "domain": domain,
                    "apollo_id": org.apollo_id,
                    "employee_count": org.employee_count,
                    "industry": org.industry,
                }

            return {"success": False, "error": "No organization data found"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def find_contacts_for_company(
        self,
        company_id: str,
        limit: int = 5,
    ) -> Dict:
        """
        Find decision-maker contacts for a company using Apollo.

        Args:
            company_id: Company ID
            limit: Max contacts to find

        Returns:
            Dict with contacts found
        """
        from .apollo_service import get_apollo_service

        company = await self.get_company(company_id)
        if not company:
            return {"success": False, "error": "Company not found"}

        # Get domain
        domain = None
        if company.website:
            domain = company.website.replace("https://", "").replace("http://", "").split("/")[0]

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT domain FROM companies WHERE id = ?",
                (company_id,)
            )
            row = await cursor.fetchone()
            if row and row[0]:
                domain = row[0]

        if not domain:
            return {"success": False, "error": "No domain available for contact search"}

        apollo = await get_apollo_service()
        contacts = await apollo.search_contacts(domain, company.name, limit=limit)

        # Create contact records
        created_contacts = []
        for ac in contacts:
            contact = await self.create_contact(
                name=ac.full_name or f"{ac.first_name} {ac.last_name}",
                company_id=company_id,
                title=ac.title,
                email=ac.email,
                linkedin_url=ac.linkedin_url,
                notes=f"Apollo ID: {ac.apollo_id}" if ac.apollo_id else None,
            )
            created_contacts.append({
                "id": contact.id,
                "name": contact.name,
                "title": contact.title,
                "email": contact.email,
                "linkedin_url": contact.linkedin_url,
                "apollo_id": ac.apollo_id,
                "revealed": ac.revealed,
            })

        return {
            "success": True,
            "company_id": company_id,
            "contacts_found": len(created_contacts),
            "contacts": created_contacts,
        }

    async def recalculate_company_score(self, company_id: str) -> Dict:
        """
        Recalculate a company's score based on all its signals.

        Args:
            company_id: Company ID to recalculate

        Returns:
            Dict with new score breakdown
        """
        from .scoring_service import calculate_company_score

        company = await self.get_company(company_id)
        if not company:
            return {"success": False, "error": "Company not found"}

        # Get all job signals for the company
        job_signals = await self.get_job_signals(company_id=company_id)

        # Convert to signal dicts for scoring
        signals = [
            {"signal_type": js.signal_type, "signal_strength": js.signal_strength}
            for js in job_signals
        ]

        # Calculate score
        breakdown = calculate_company_score(signals, company.industry)

        # Update company with new score
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE companies SET
                    score = ?,
                    score_breakdown = ?,
                    updated_at = ?
                WHERE id = ?
            """, (
                breakdown.total_score,
                json.dumps({
                    "cx_signals": breakdown.cx_signals,
                    "growth_signals": breakdown.growth_signals,
                    "funding_signals": breakdown.funding_signals,
                    "industry_bonus": breakdown.industry_bonus,
                    "signal_count": breakdown.signal_count,
                }),
                datetime.utcnow().isoformat(),
                company_id
            ))
            await db.commit()

        return {
            "success": True,
            "company_id": company_id,
            "score": breakdown.total_score,
            "breakdown": {
                "cx_signals": breakdown.cx_signals,
                "growth_signals": breakdown.growth_signals,
                "signal_count": breakdown.signal_count,
            }
        }


# Singleton instance
_sales_service: Optional[SalesService] = None


async def get_sales_service() -> SalesService:
    """Get or create the sales service singleton."""
    global _sales_service
    if _sales_service is None:
        _sales_service = SalesService()
        await _sales_service.init_db()
    return _sales_service
