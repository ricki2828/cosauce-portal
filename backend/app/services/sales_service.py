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
    # Extended fields for enrichment
    domain: Optional[str] = None
    apollo_id: Optional[str] = None
    employee_count: Optional[int] = None
    employee_growth: Optional[float] = None  # Percentage growth from Apollo
    status: str = "new"  # new, target, contacted, qualified, meeting, won, lost
    bpo_analysis: Optional[Dict] = None  # AI-generated BPO fit analysis


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


def classify_job_type(title: str, description: str = "") -> Tuple[str, int]:
    """
    Classify job posting into a signal type with strength.
    Returns (signal_type, signal_strength) where strength is 1-5.
    """
    title_lower = title.lower()
    combined = f"{title_lower} {(description or '').lower()}"

    # CX Leadership - High priority (strength 4)
    if any(kw in title_lower for kw in ["vp customer", "director contact center", "head of cx", "chief customer"]):
        return ("cx_leadership", 4)

    # Bilingual CX - Good signal (strength 3)
    if any(kw in combined for kw in ["bilingual", "french english", "bilingue", "spanish english"]):
        return ("bilingual_cx", 3)

    # BPO indicators (strength 3)
    if any(kw in combined for kw in ["bpo", "outsource", "offshore"]):
        return ("bpo", 3)

    # Contact Center roles (strength 2)
    if any(kw in title_lower for kw in ["contact center", "call center", "contact centre", "call centre"]):
        return ("contact_center", 2)

    # Customer Service roles (strength 2)
    if any(kw in title_lower for kw in ["customer service", "customer support", "customer success"]):
        return ("customer_service", 2)

    return ("general", 1)


@dataclass
class RFP:
    """RFP/Tender opportunity for CoSauce to bid on."""
    id: str
    title: str
    issuer: str  # Organization issuing the RFP
    description: Optional[str]
    url: Optional[str]
    deadline: Optional[str]
    discovered_at: str
    source: str
    status: str = "new"  # new, reviewing, preparing, submitted, won, lost
    region: Optional[str] = None
    value_estimate: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class RFPAlert:
    """Alert configuration for RFP searches."""
    id: str
    name: str
    search_query: str
    region: str
    is_active: bool
    created_at: str
    last_checked: Optional[str] = None
    results_count: int = 0


@dataclass
class RFPSearchResult:
    """A search result from RFP discovery."""
    title: str
    issuer: str
    url: str
    snippet: str
    source: str
    deadline: Optional[str] = None
    region: Optional[str] = None


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

            # RFPs table (opportunities for CoSauce to bid on)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS rfps (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    issuer TEXT NOT NULL,
                    description TEXT,
                    url TEXT,
                    deadline TEXT,
                    discovered_at TEXT NOT NULL,
                    source TEXT,
                    status TEXT DEFAULT 'new',
                    region TEXT,
                    value_estimate TEXT,
                    notes TEXT
                )
            """)

            # RFP Alerts table (saved searches for daily monitoring)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS rfp_alerts (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    search_query TEXT NOT NULL,
                    region TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT NOT NULL,
                    last_checked TEXT,
                    results_count INTEGER DEFAULT 0
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
            try:
                await db.execute("ALTER TABLE companies ADD COLUMN employee_growth REAL")
            except:
                pass

            # Settings table for configurable options
            await db.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            # Add bpo_analysis column to companies if it doesn't exist
            try:
                await db.execute("ALTER TABLE companies ADD COLUMN bpo_analysis TEXT")
            except:
                pass

            # Create indexes
            await db.execute("CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_signals_company ON signals(company_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_job_signals_company ON job_signals(company_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_companies_score ON companies(score)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_rfps_status ON rfps(status)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_rfps_deadline ON rfps(deadline)")

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
                domain=row["domain"] if "domain" in row.keys() else None,
                apollo_id=row["apollo_id"] if "apollo_id" in row.keys() else None,
                employee_count=row["employee_count"] if "employee_count" in row.keys() else None,
                employee_growth=row["employee_growth"] if "employee_growth" in row.keys() else None,
                status=row["status"] if "status" in row.keys() else "new",
                bpo_analysis=json.loads(row["bpo_analysis"]) if "bpo_analysis" in row.keys() and row["bpo_analysis"] else None,
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
            domain=row["domain"] if "domain" in row.keys() else None,
            apollo_id=row["apollo_id"] if "apollo_id" in row.keys() else None,
            employee_count=row["employee_count"] if "employee_count" in row.keys() else None,
            employee_growth=row["employee_growth"] if "employee_growth" in row.keys() else None,
            status=row["status"] if "status" in row.keys() else "new",
            bpo_analysis=json.loads(row["bpo_analysis"]) if "bpo_analysis" in row.keys() and row["bpo_analysis"] else None,
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
    ) -> Optional[JobSignal]:
        """Create a new job signal for a company. Returns None if duplicate."""
        signal_id = f"jsig_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            # Check for duplicate (same company + similar job title)
            cursor = await db.execute("""
                SELECT id FROM job_signals
                WHERE company_id = ? AND LOWER(job_title) = LOWER(?)
                LIMIT 1
            """, (company_id, job_title))
            existing = await cursor.fetchone()
            if existing:
                return None  # Skip duplicate

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
                signal_type, signal_strength = classify_job_type(
                    job.get("title", ""),
                    job.get("description", "")
                )

                signal = await self.create_job_signal(
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
                if signal:  # Only count if not a duplicate
                    signals_created += 1

            # Enrich company with OpenAI (industry, description, size, website)
            enrichment = await self.enrich_company_with_openai(
                company_name=company.name,
                headquarters=company.headquarters,
                job_postings=company_jobs
            )

            if enrichment.get("success"):
                # Update company record with enriched data
                update_data = {
                    "industry": enrichment.get("industry"),
                    "description": enrichment.get("description"),
                    "website": enrichment.get("website"),
                }

                # Parse estimated size
                size_str = enrichment.get("estimated_size", "")
                if size_str:
                    update_data["size"] = size_str
                    # Try to extract numeric employee count for employee_count field
                    try:
                        import re
                        # Extract first number from string like "200-500" or "1200"
                        numbers = re.findall(r'\d+', size_str)
                        if numbers:
                            # Use first number as estimate, or average of range
                            if len(numbers) > 1:
                                employee_count = (int(numbers[0]) + int(numbers[1])) // 2
                            else:
                                employee_count = int(numbers[0])
                            update_data["employee_count"] = employee_count
                    except:
                        pass

                await self.update_company(company.id, **update_data)

                # Mark competitors with a special status
                if enrichment.get("is_competitor"):
                    await self.update_company(
                        company.id,
                        status="competitor",
                        # Store reasoning in a note or custom field if needed
                    )

        # Note: Apollo enrichment has been removed from automatic job scanning.
        # Company data is now enriched via OpenAI using job posting context.
        # Manual Apollo enrichment via "Find Contacts" remains available for contact discovery.

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

        # Try to guess domain from company name if still no domain
        if not domain and company.name:
            # Simple domain guess: lowercase, remove common suffixes, add .com
            import re
            name = company.name.lower()
            # Remove common business suffixes
            name = re.sub(r'\s*(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|group|businesses|services|solutions)$', '', name, flags=re.IGNORECASE)
            # Remove special characters and spaces
            name = re.sub(r'[^a-z0-9]', '', name)
            if name:
                domain = f"{name}.com"

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
                            employee_growth = ?,
                            updated_at = ?
                        WHERE id = ?
                    """, (domain, org.apollo_id, org.employee_count, org.employee_growth, datetime.utcnow().isoformat(), company_id))
                    await db.commit()

                return {
                    "success": True,
                    "company_id": company_id,
                    "domain": domain,
                    "apollo_id": org.apollo_id,
                    "employee_count": org.employee_count,
                    "employee_growth": org.employee_growth,
                    "industry": org.industry,
                }

            return {"success": False, "error": "No organization data found"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def enrich_company_with_openai(
        self,
        company_name: str,
        headquarters: Optional[str],
        job_postings: List[Dict],
    ) -> Dict:
        """
        Enrich company data using OpenAI to research the company based on name and job postings.

        Args:
            company_name: Company name
            headquarters: Company location
            job_postings: List of job posting dicts with title, description, location

        Returns:
            Dict with enriched company data: industry, description, estimated_size, website
        """
        if not self.openai_client:
            return {
                "success": False,
                "error": "OpenAI client not configured",
            }

        # Build context from job postings
        job_context = []
        for idx, job in enumerate(job_postings[:5], 1):  # Limit to first 5 jobs to save tokens
            job_context.append(f"{idx}. {job.get('title', 'Unknown Title')}")
            desc = job.get('description', '')
            if desc:
                # Truncate long descriptions
                job_context.append(f"   Description: {desc[:300]}...")

        job_context_str = "\n".join(job_context)

        prompt = f"""Research this company and provide structured information about them.

Company Name: {company_name}
{f"Headquarters: {headquarters}" if headquarters else ""}

Job Postings:
{job_context_str}

Based on the company name and their job postings, provide the following information:

1. **Industry**: What industry/sector is this company in? (e.g., Technology, Healthcare, Retail, Financial Services, Manufacturing, etc.)

2. **Company Description**: A 2-3 sentence description of what this company does. Be specific about their business model, products/services, and target market.

3. **Estimated Company Size**: Estimate the number of employees based on:
   - Number and variety of job openings ({len(job_postings)} total postings)
   - Job seniority levels and department diversity
   - Geographic spread
   - Language in job descriptions (startup vs enterprise language)

   Provide your estimate as a number (e.g., 150 or 1200) or range (e.g., 200-500).

4. **Website**: Infer the most likely website URL for this company. Use the company name and industry context. Format as full URL (e.g., https://example.com).

5. **Competitive Analysis**: Is this company a recruitment agency, staffing firm, BPO provider, HR outsourcing company, or consulting firm? These are our COMPETITORS. Answer YES or NO and explain briefly.

Return your response as a JSON object with these exact keys:
{{
  "industry": "string",
  "description": "string",
  "estimated_size": "string (number or range)",
  "website": "string (URL)",
  "is_competitor": "YES or NO",
  "competitor_reasoning": "string (brief explanation)"
}}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a business research analyst. Analyze companies based on their name and job postings to extract accurate, detailed information. Always return valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            data = json.loads(content)

            return {
                "success": True,
                "industry": data.get("industry"),
                "description": data.get("description"),
                "estimated_size": data.get("estimated_size"),
                "website": data.get("website"),
                "is_competitor": data.get("is_competitor") == "YES",
                "competitor_reasoning": data.get("competitor_reasoning"),
            }

        except Exception as e:
            print(f"Error enriching company with OpenAI: {e}")
            return {
                "success": False,
                "error": str(e),
            }

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

    # ==================== BULK OPERATIONS ====================

    async def bulk_enrich_companies(self, company_ids: List[str]) -> Dict:
        """Enrich multiple companies with Apollo data."""
        results = {"success": [], "failed": [], "total": len(company_ids)}

        for company_id in company_ids:
            try:
                result = await self.enrich_company_with_apollo(company_id)
                if result.get("success"):
                    results["success"].append(company_id)
                else:
                    results["failed"].append({"id": company_id, "error": result.get("error")})
            except Exception as e:
                results["failed"].append({"id": company_id, "error": str(e)})

        return results

    async def bulk_find_contacts(self, company_ids: List[str], limit_per_company: int = 5) -> Dict:
        """Find contacts for multiple companies."""
        results = {"success": [], "failed": [], "total": len(company_ids), "contacts_found": 0}

        for company_id in company_ids:
            try:
                result = await self.find_contacts_for_company(company_id, limit_per_company)
                if result.get("success"):
                    results["success"].append(company_id)
                    results["contacts_found"] += result.get("contacts_found", 0)
                else:
                    results["failed"].append({"id": company_id, "error": result.get("error")})
            except Exception as e:
                results["failed"].append({"id": company_id, "error": str(e)})

        return results

    async def bulk_update_status(self, company_ids: List[str], status: str) -> Dict:
        """Update status for multiple companies."""
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            for company_id in company_ids:
                await db.execute(
                    "UPDATE companies SET status = ?, updated_at = ? WHERE id = ?",
                    (status, now, company_id)
                )
            await db.commit()

        return {"success": True, "updated": len(company_ids), "status": status}

    async def bulk_analyze_bpo(self, company_ids: List[str]) -> Dict:
        """Analyze BPO fit for multiple companies using OpenAI."""
        results = {"success": [], "failed": [], "total": len(company_ids)}

        for company_id in company_ids:
            try:
                result = await self.analyze_bpo_fit(company_id)
                if result.get("success"):
                    results["success"].append({
                        "id": company_id,
                        "fit_level": result.get("fit_level"),
                        "signals": result.get("signals", [])
                    })
                else:
                    results["failed"].append({"id": company_id, "error": result.get("error")})
            except Exception as e:
                results["failed"].append({"id": company_id, "error": str(e)})

        return results

    async def export_companies_with_contacts(
        self,
        company_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """Export companies with their contacts for CSV/JSON export."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            if company_ids:
                placeholders = ",".join(["?" for _ in company_ids])
                cursor = await db.execute(
                    f"SELECT * FROM companies WHERE id IN ({placeholders}) ORDER BY name",
                    company_ids
                )
            else:
                cursor = await db.execute("SELECT * FROM companies ORDER BY name")

            companies = await cursor.fetchall()

            result = []
            for c in companies:
                company_data = {
                    "id": c["id"],
                    "name": c["name"],
                    "website": c["website"],
                    "industry": c["industry"],
                    "headquarters": c["headquarters"],
                    "employee_count": c["employee_count"] if "employee_count" in c.keys() else None,
                    "status": c["status"] if "status" in c.keys() else "new",
                    "linkedin_url": c["linkedin_url"],
                    "contacts": []
                }

                # Get contacts for this company
                contact_cursor = await db.execute(
                    "SELECT * FROM contacts WHERE company_id = ?",
                    (c["id"],)
                )
                contacts = await contact_cursor.fetchall()
                for contact in contacts:
                    company_data["contacts"].append({
                        "name": contact["name"],
                        "title": contact["title"],
                        "email": contact["email"],
                        "phone": contact["phone"],
                        "linkedin_url": contact["linkedin_url"],
                    })

                result.append(company_data)

        return result

    # ==================== RFP METHODS ====================

    async def create_rfp(
        self,
        title: str,
        issuer: str,
        description: Optional[str] = None,
        url: Optional[str] = None,
        deadline: Optional[str] = None,
        source: str = "manual",
        region: Optional[str] = None,
        value_estimate: Optional[str] = None,
    ) -> RFP:
        """Create a new RFP opportunity."""
        rfp_id = f"rfp_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO rfps
                (id, title, issuer, description, url, deadline, discovered_at, source, status, region, value_estimate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
            """, (rfp_id, title, issuer, description, url, deadline, now, source, region, value_estimate))
            await db.commit()

        return RFP(
            id=rfp_id,
            title=title,
            issuer=issuer,
            description=description,
            url=url,
            deadline=deadline,
            discovered_at=now,
            source=source,
            status="new",
            region=region,
            value_estimate=value_estimate,
        )

    async def get_rfps(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[RFP]:
        """Get RFPs with optional status filter."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            if status:
                cursor = await db.execute(
                    "SELECT * FROM rfps WHERE status = ? ORDER BY deadline ASC LIMIT ? OFFSET ?",
                    (status, limit, offset)
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM rfps ORDER BY deadline ASC LIMIT ? OFFSET ?",
                    (limit, offset)
                )

            rows = await cursor.fetchall()

        return [
            RFP(
                id=r["id"],
                title=r["title"],
                issuer=r["issuer"],
                description=r["description"],
                url=r["url"],
                deadline=r["deadline"],
                discovered_at=r["discovered_at"],
                source=r["source"],
                status=r["status"],
                region=r["region"],
                value_estimate=r["value_estimate"],
                notes=r["notes"],
            )
            for r in rows
        ]

    async def update_rfp(
        self,
        rfp_id: str,
        status: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[RFP]:
        """Update an RFP's status or notes."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            updates = []
            values = []
            if status:
                updates.append("status = ?")
                values.append(status)
            if notes is not None:
                updates.append("notes = ?")
                values.append(notes)

            if not updates:
                return None

            values.append(rfp_id)
            await db.execute(
                f"UPDATE rfps SET {', '.join(updates)} WHERE id = ?",
                values
            )
            await db.commit()

            cursor = await db.execute("SELECT * FROM rfps WHERE id = ?", (rfp_id,))
            row = await cursor.fetchone()

            if not row:
                return None

            return RFP(
                id=row["id"],
                title=row["title"],
                issuer=row["issuer"],
                description=row["description"],
                url=row["url"],
                deadline=row["deadline"],
                discovered_at=row["discovered_at"],
                source=row["source"],
                status=row["status"],
                region=row["region"],
                value_estimate=row["value_estimate"],
                notes=row["notes"],
            )

    async def delete_rfp(self, rfp_id: str) -> bool:
        """Delete an RFP."""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM rfps WHERE id = ?", (rfp_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def search_for_rfps(self, query: str = "contact center outsourcing RFP", region: str = "Canada") -> Dict:
        """
        Return tender portal links for RFP searching.
        The frontend displays these links for users to manually search.
        In production, could integrate with MERX API, BuyAndSell.gc.ca API, or SerpAPI.
        """
        from urllib.parse import quote_plus

        encoded_query = quote_plus(query)

        # Build search query suggestions for manual searching
        search_terms = [
            f'site:buyandsell.gc.ca "{query}" RFP {region}',
            f'site:merx.com "{query}" tender {region}',
            f'site:biddingo.com "{query}" {region}',
            f'"{query}" RFP tender {region} 2025 2026',
        ]

        return {
            "success": True,
            "query": query,
            "region": region,
            "searches_performed": search_terms,
            "results": [],  # Manual search - results come from user clicking links
            "rfps_found": 0,
            "suggested_sources": [
                {
                    "name": "BuyAndSell.gc.ca",
                    "url": f"https://buyandsell.gc.ca/procurement-data/search/site?search_api_fulltext={encoded_query}",
                    "description": "Canadian Government Tenders"
                },
                {
                    "name": "MERX",
                    "url": f"https://www.merx.com/search?keywords={encoded_query}",
                    "description": "Canadian Public & Private Tenders"
                },
                {
                    "name": "Biddingo",
                    "url": "https://www.biddingo.com/",
                    "description": "North American Public Tenders"
                },
                {
                    "name": "BidNet",
                    "url": "https://www.bidnet.com/",
                    "description": "US & Canada Government Bids"
                },
                {
                    "name": "Google Search",
                    "url": f"https://www.google.com/search?q={encoded_query}+RFP+tender+{quote_plus(region)}",
                    "description": "General web search for RFPs"
                },
            ]
        }

    # ==================== RFP ALERT METHODS ====================

    async def create_rfp_alert(
        self,
        name: str,
        search_query: str,
        region: str = "Canada",
    ) -> RFPAlert:
        """Create a new RFP alert for daily monitoring."""
        alert_id = f"alert_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO rfp_alerts (id, name, search_query, region, is_active, created_at)
                VALUES (?, ?, ?, ?, 1, ?)
            """, (alert_id, name, search_query, region, now))
            await db.commit()

        return RFPAlert(
            id=alert_id,
            name=name,
            search_query=search_query,
            region=region,
            is_active=True,
            created_at=now,
        )

    async def get_rfp_alerts(self, active_only: bool = True) -> List[RFPAlert]:
        """Get all RFP alerts."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            if active_only:
                cursor = await db.execute(
                    "SELECT * FROM rfp_alerts WHERE is_active = 1 ORDER BY created_at DESC"
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM rfp_alerts ORDER BY created_at DESC"
                )

            rows = await cursor.fetchall()

        return [
            RFPAlert(
                id=r["id"],
                name=r["name"],
                search_query=r["search_query"],
                region=r["region"],
                is_active=bool(r["is_active"]),
                created_at=r["created_at"],
                last_checked=r["last_checked"],
                results_count=r["results_count"] or 0,
            )
            for r in rows
        ]

    async def update_rfp_alert(
        self,
        alert_id: str,
        is_active: Optional[bool] = None,
        last_checked: Optional[str] = None,
        results_count: Optional[int] = None,
    ) -> Optional[RFPAlert]:
        """Update an RFP alert."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            updates = []
            values = []
            if is_active is not None:
                updates.append("is_active = ?")
                values.append(1 if is_active else 0)
            if last_checked is not None:
                updates.append("last_checked = ?")
                values.append(last_checked)
            if results_count is not None:
                updates.append("results_count = ?")
                values.append(results_count)

            if not updates:
                return None

            values.append(alert_id)
            await db.execute(
                f"UPDATE rfp_alerts SET {', '.join(updates)} WHERE id = ?",
                values
            )
            await db.commit()

            cursor = await db.execute("SELECT * FROM rfp_alerts WHERE id = ?", (alert_id,))
            row = await cursor.fetchone()

            if not row:
                return None

            return RFPAlert(
                id=row["id"],
                name=row["name"],
                search_query=row["search_query"],
                region=row["region"],
                is_active=bool(row["is_active"]),
                created_at=row["created_at"],
                last_checked=row["last_checked"],
                results_count=row["results_count"] or 0,
            )

    async def delete_rfp_alert(self, alert_id: str) -> bool:
        """Delete an RFP alert."""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM rfp_alerts WHERE id = ?", (alert_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def run_rfp_alert(self, alert_id: str) -> Dict:
        """Run a specific RFP alert and return results."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM rfp_alerts WHERE id = ?", (alert_id,))
            row = await cursor.fetchone()

            if not row:
                return {"success": False, "error": "Alert not found"}

        # Run the search
        results = await self.search_for_rfps(
            query=row["search_query"],
            region=row["region"]
        )

        # Update last checked
        now = datetime.utcnow().isoformat()
        await self.update_rfp_alert(
            alert_id=alert_id,
            last_checked=now,
            results_count=results.get("rfps_found", 0)
        )

        return {
            "success": True,
            "alert_name": row["name"],
            "results": results,
            "checked_at": now,
        }

    async def run_all_rfp_alerts(self) -> Dict:
        """Run all active RFP alerts (for daily cron job)."""
        alerts = await self.get_rfp_alerts(active_only=True)
        results = []

        for alert in alerts:
            result = await self.run_rfp_alert(alert.id)
            results.append({
                "alert_id": alert.id,
                "alert_name": alert.name,
                "success": result.get("success", False),
                "rfps_found": result.get("results", {}).get("rfps_found", 0),
            })

        return {
            "success": True,
            "alerts_checked": len(results),
            "results": results,
            "checked_at": datetime.utcnow().isoformat(),
        }

    # ==================== SETTINGS METHODS ====================

    async def get_setting(self, key: str, default: str = "") -> str:
        """Get a setting value by key."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT value FROM settings WHERE key = ?",
                (key,)
            )
            row = await cursor.fetchone()

        if row:
            return row["value"]
        return default

    async def set_setting(self, key: str, value: str) -> None:
        """Set a setting value (upsert)."""
        now = datetime.utcnow().isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
            """, (key, value, now))
            await db.commit()

    # ==================== BPO ANALYSIS METHODS ====================

    DEFAULT_BPO_PROMPT = """Analyze this company for BPO/outsourcing fit. YOUR PRIMARY ANALYSIS MUST FOCUS ON INDUSTRY AND COMPANY DESCRIPTION FIRST.

⛔ IMMEDIATE DISQUALIFICATION - ZERO FIT (rate as DISQUALIFIED, ignore all other signals):
These companies will NEVER outsource to us - they are our competitors or sell adjacent services:
- Recruitment/staffing agencies (ANY company that recruits for other companies)
- Headhunting/executive search/talent acquisition firms
- HR outsourcing/PEO/employer services companies
- BPO/outsourcing providers of ANY kind (call center, customer service, back office)
- Consulting/advisory firms (management consulting, business consulting)
- Workforce management/labor supply companies

Keywords that DISQUALIFY: "recruitment", "staffing", "headhunting", "talent acquisition", "HR outsourcing", "PEO", "BPO", "call center provider", "outsourcing provider", "consulting", "workforce solutions"

If the industry or description contains ANY of these keywords, IMMEDIATELY return DISQUALIFIED fit with reasoning: "Company is a [recruitment/BPO/consulting] provider - direct competitor/adjacent service, zero chance of outsourcing."

---

PRIMARY ANALYSIS (only if not disqualified above):

1. COMPANY TYPE & INDUSTRY (Most Important - 60% weight):
   Use the company description and industry field to determine if they are a customer-facing business that needs support:

   HIGH FIT Industries:
   - SaaS/Software companies (especially B2C or high-touch B2B)
   - E-commerce/Retail (online shopping, marketplaces)
   - FinTech/Banking (digital banking, payment platforms, crypto)
   - EdTech/E-learning platforms
   - HealthTech/Telemedicine/Digital health
   - Telecom/ISP/Mobile operators
   - Travel/Hospitality (OTAs, hotels, airlines)
   - Gaming/Entertainment platforms
   - Subscription services

   MEDIUM FIT Industries:
   - Traditional tech companies with customer products
   - Insurance companies (if digital/consumer-facing)
   - Manufacturing (only if they have direct consumer channels)
   - Financial services (if retail-facing)

   LOW FIT Industries:
   - Pure B2B services with no end-customer support
   - Non-customer-facing businesses
   - Traditional manufacturing with no digital presence
   - Government/Public sector

2. COMPANY SIZE (30% weight):
   IDEAL: 200-5,000 employees (established, scalable CX needs)
   MEDIUM: 50-200 OR 5,000-20,000 employees
   LOW: <50 (too small) OR >20,000 (enterprise procurement too complex)

   **ESTIMATING SIZE (when employee count not provided)**:
   You MUST estimate company size from available context:
   - Number and variety of job postings (5+ diverse roles = likely 200+, 10+ = likely 1,000+)
   - Industry maturity signals ("enterprise", "leading", "established" = larger company)
   - Geographic footprint (multiple offices = likely 500+)
   - Product complexity (enterprise features = likely 200+, consumer app = could be 20-100)
   - Company description language (analyze scale indicators)

   Include your size estimate (e.g., "Estimated 500-1,000 employees based on 8 open roles and enterprise language") in the reasoning field.
   Do NOT mark as HIGH FIT if you cannot reasonably estimate size from context.

3. CUSTOMER SUPPORT SIGNALS (10% weight - SUPPORTING evidence only):
   Job postings are SUPPLEMENTARY signals, not primary:
   - Multiple CX/Support/Success roles
   - Bilingual/multilingual support roles
   - 24/7 coverage mentions
   - Support team expansion

   DO NOT over-weight job count. 1-2 support roles at a high-fit industry company is still HIGH FIT.
   Many support roles at a recruitment company is still LOW FIT (disqualified).

4. LOCATION & SCALE (5% weight):
   - HQ in major markets (US, Canada, UK, AU, SG)
   - Global/multi-region operations
   - Remote-first culture

---

RATING DECISION TREE:
1. Check industry/description for disqualifying keywords → DISQUALIFIED (stop)
2. Check if HIGH FIT industry + right size (200-5K) → HIGH
3. Check if MEDIUM FIT industry OR borderline size → MEDIUM
4. Everything else → LOW

Return JSON with:
{
    "fit_level": "HIGH" | "MEDIUM" | "LOW" | "DISQUALIFIED",
    "signals": ["Industry: SaaS", "Size: 1,200 employees", "Hiring 3 bilingual support agents"],
    "reasoning": "2-3 sentence explanation focusing on industry fit and company type first, then size, then supplementary signals"
}"""

    async def analyze_bpo_fit(self, company_id: str) -> Dict:
        """
        Use GPT to analyze a company's BPO/outsourcing potential using broad AI research.

        Returns:
            {
                "fit_level": "HIGH" | "MEDIUM" | "LOW",
                "signals": ["Hiring 5+ bilingual agents", "24/7 coverage mentioned"],
                "reasoning": "Company is rapidly scaling CX with bilingual needs...",
                "analyzed_at": "2026-01-05T..."
            }
        """
        if not self.openai_client:
            return {"success": False, "error": "OpenAI not configured"}

        # 1. Get company data
        company = await self.get_company(company_id)
        if not company:
            return {"success": False, "error": "Company not found"}

        # 1.5. PRE-CHECK: Immediate disqualification based on company name
        # Check for obvious recruitment/BPO/consulting keywords in the name
        disqualifying_keywords = [
            "recruitment", "staffing", "headhunting", "talent acquisition",
            "hr outsourcing", "hr solutions", "peo", "bpo", "call center",
            "outsourcing", "consulting", "workforce solutions", "talent solutions",
            "executive search", "career", "job", "employment", "labor"
        ]

        # Also check industry field for disqualifying patterns
        disqualifying_industries = [
            "business process outsourcing", "bpo", "outsourcing",
            "recruitment", "staffing", "human resources",
            "consulting", "hr services", "talent acquisition",
            "headhunting", "executive search"
        ]

        # Check company name
        company_name_lower = company.name.lower()
        for keyword in disqualifying_keywords:
            if keyword in company_name_lower:
                # Immediate disqualification - return DISQUALIFIED fit without calling OpenAI
                now = datetime.utcnow().isoformat()
                analysis = {
                    "fit_level": "DISQUALIFIED",
                    "signals": [f"Company name contains '{keyword}' - recruitment/BPO/consulting competitor"],
                    "reasoning": f"DISQUALIFIED: Company name '{company.name}' contains '{keyword}', indicating this is a recruitment agency, staffing firm, BPO provider, or consulting company. These are our competitors and will NEVER outsource to us. No further analysis needed.",
                    "analyzed_at": now
                }

                # Save to database
                async with aiosqlite.connect(self.db_path) as db:
                    await db.execute(
                        "UPDATE companies SET bpo_analysis = ?, updated_at = ? WHERE id = ?",
                        (json.dumps(analysis), now, company_id)
                    )
                    await db.commit()

                return {"success": True, "analysis": analysis}

        # Check company industry
        company_industry = (company.industry or "").lower()
        if company_industry:
            for keyword in disqualifying_industries:
                if keyword in company_industry:
                    # Immediate disqualification based on industry
                    now = datetime.utcnow().isoformat()
                    analysis = {
                        "fit_level": "DISQUALIFIED",
                        "signals": [f"Industry '{company.industry}' indicates competitor/adjacent service"],
                        "reasoning": f"DISQUALIFIED: Company operates in '{company.industry}' industry - direct competitor or adjacent service provider. These companies will NEVER outsource to us as they provide similar services themselves.",
                        "analyzed_at": now
                    }

                    # Save to database
                    async with aiosqlite.connect(self.db_path) as db:
                        await db.execute(
                            "UPDATE companies SET bpo_analysis = ?, updated_at = ? WHERE id = ?",
                            (json.dumps(analysis), now, company_id)
                        )
                        await db.commit()

                    return {"success": True, "analysis": analysis}

        # 2. Get job signals for this company
        job_signals = await self.get_job_signals(company_id=company_id, limit=50)

        # 3. Get user's custom prompt from settings
        prompt = await self.get_setting("bpo_analysis_prompt", self.DEFAULT_BPO_PROMPT)

        # 4. Build comprehensive context for GPT (broader than just job postings)
        # Company profile
        context_parts = [
            f"Company: {company.name}",
            f"Industry: {company.industry or 'Unknown'}",
        ]

        # Employee data
        if company.employee_count:
            growth_info = f" (Growth: {company.employee_growth:+.1f}%)" if company.employee_growth else ""
            context_parts.append(f"Size: {company.employee_count:,} employees{growth_info}")
        elif company.size:
            context_parts.append(f"Size: {company.size} employees")
        else:
            context_parts.append(f"Size: Unknown (please estimate from context)")

        # Location
        if company.headquarters:
            context_parts.append(f"Location: {company.headquarters}")

        # Website & online presence
        if company.website:
            context_parts.append(f"Website: {company.website}")
        if company.linkedin_url:
            context_parts.append(f"LinkedIn: {company.linkedin_url}")

        # Company description (from Apollo enrichment or web research)
        if company.description:
            context_parts.append(f"\nCompany Description:\n{company.description}")
        else:
            context_parts.append(f"\nCompany Description: NOT AVAILABLE")
            context_parts.append(f"⚠️ IMPORTANT: Analyze the company NAME '{company.name}' carefully for industry clues.")
            context_parts.append(f"⚠️ Check if the name suggests: recruitment/staffing, consulting, BPO, or other competitor types.")
            if company.website:
                context_parts.append(f"⚠️ Consider researching {company.website} to understand what this company does.")

        # Job postings analysis
        if job_signals:
            job_listings = []
            for js in job_signals:
                job_info = f"- {js.job_title}"
                if js.location:
                    job_info += f" ({js.location})"
                if js.signal_type:
                    job_info += f" [{js.signal_type}]"
                job_listings.append(job_info)

            context_parts.append(f"\nRecent Job Postings ({len(job_signals)} total):")
            context_parts.append("\n".join(job_listings))
        else:
            context_parts.append("\nRecent Job Postings: None found")

        context = "\n".join(context_parts)

        # 5. Call OpenAI with broader research context
        try:
            # Add JSON instruction to context (required for response_format json_object)
            context_with_json = context + "\n\nReturn your analysis as a JSON object with keys: fit_level, signals, reasoning."

            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": context_with_json}
                ],
                response_format={"type": "json_object"},
                max_tokens=800,  # Increased for more comprehensive analysis
            )

            result_text = response.choices[0].message.content
            result = json.loads(result_text)

            # Add timestamp
            result["analyzed_at"] = datetime.utcnow().isoformat()

            # 6. Store result in database
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    UPDATE companies SET
                        bpo_analysis = ?,
                        updated_at = ?
                    WHERE id = ?
                """, (json.dumps(result), result["analyzed_at"], company_id))
                await db.commit()

            return {"success": True, **result}

        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
_sales_service: Optional[SalesService] = None


async def get_sales_service() -> SalesService:
    """Get or create the sales service singleton."""
    global _sales_service
    if _sales_service is None:
        _sales_service = SalesService()
        await _sales_service.init_db()
    return _sales_service
