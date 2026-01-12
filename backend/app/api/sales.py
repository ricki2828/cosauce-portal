"""
Sales API - Company research, contact management, and signal tracking
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import asyncio

from ..services.sales_service import get_sales_service, SalesService

router = APIRouter()


# ==================== PYDANTIC MODELS ====================

class CompanyCreate(BaseModel):
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    description: Optional[str] = None
    headquarters: Optional[str] = None
    linkedin_url: Optional[str] = None
    tags: Optional[List[str]] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    description: Optional[str] = None
    headquarters: Optional[str] = None
    linkedin_url: Optional[str] = None
    tags: Optional[List[str]] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    website: Optional[str]
    industry: Optional[str]
    size: Optional[str]
    description: Optional[str]
    headquarters: Optional[str]
    linkedin_url: Optional[str]
    created_at: str
    updated_at: str
    tags: List[str]
    # Extended fields
    domain: Optional[str] = None
    apollo_id: Optional[str] = None
    employee_count: Optional[int] = None
    employee_growth: Optional[float] = None
    status: str = "new"
    bpo_analysis: Optional[dict] = None  # AI-generated BPO fit analysis


class ContactCreate(BaseModel):
    name: str
    company_id: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    company_id: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None


class ContactResponse(BaseModel):
    id: str
    company_id: Optional[str]
    company_name: Optional[str]
    name: str
    title: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    linkedin_url: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str


class BulkContactCreate(BaseModel):
    contacts: List[ContactCreate]


class SignalCreate(BaseModel):
    company_id: str
    signal_type: str
    source: str
    details: str
    signal_strength: int = 3


class SignalResponse(BaseModel):
    id: str
    company_id: str
    company_name: Optional[str]
    signal_type: str
    signal_strength: int
    source: str
    details: str
    detected_at: str


class ResearchRequest(BaseModel):
    company_name: str
    website: Optional[str] = None


class RFPCreate(BaseModel):
    title: str
    issuer: str
    description: Optional[str] = None
    url: Optional[str] = None
    deadline: Optional[str] = None
    source: str = "manual"
    region: Optional[str] = None
    value_estimate: Optional[str] = None


class RFPUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class RFPResponse(BaseModel):
    id: str
    title: str
    issuer: str
    description: Optional[str]
    url: Optional[str]
    deadline: Optional[str]
    discovered_at: str
    source: str
    status: str
    region: Optional[str]
    value_estimate: Optional[str]
    notes: Optional[str]


# ==================== DEPENDENCY ====================

async def get_service() -> SalesService:
    return await get_sales_service()


# ==================== COMPANY ENDPOINTS ====================

@router.post("/companies", response_model=CompanyResponse)
async def create_company(
    request: CompanyCreate,
    service: SalesService = Depends(get_service)
):
    """Create a new company."""
    company = await service.create_company(
        name=request.name,
        website=request.website,
        industry=request.industry,
        size=request.size,
        description=request.description,
        headquarters=request.headquarters,
        linkedin_url=request.linkedin_url,
        tags=request.tags,
    )
    return CompanyResponse(
        id=company.id,
        name=company.name,
        website=company.website,
        industry=company.industry,
        size=company.size,
        description=company.description,
        headquarters=company.headquarters,
        linkedin_url=company.linkedin_url,
        created_at=company.created_at,
        updated_at=company.updated_at,
        tags=company.tags,
        domain=company.domain,
        apollo_id=company.apollo_id,
        employee_count=company.employee_count,
        employee_growth=company.employee_growth,
        status=company.status,
        bpo_analysis=company.bpo_analysis,
    )


@router.get("/companies", response_model=List[CompanyResponse])
async def list_companies(
    industry: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    service: SalesService = Depends(get_service)
):
    """List companies with optional filtering."""
    companies = await service.get_companies(
        industry=industry,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [
        CompanyResponse(
            id=c.id,
            name=c.name,
            website=c.website,
            industry=c.industry,
            size=c.size,
            description=c.description,
            headquarters=c.headquarters,
            linkedin_url=c.linkedin_url,
            created_at=c.created_at,
            updated_at=c.updated_at,
            tags=c.tags,
            domain=c.domain,
            apollo_id=c.apollo_id,
            employee_count=c.employee_count,
            employee_growth=c.employee_growth,
            status=c.status,
            bpo_analysis=c.bpo_analysis,
        )
        for c in companies
    ]


@router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: str,
    service: SalesService = Depends(get_service)
):
    """Get a single company."""
    company = await service.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyResponse(
        id=company.id,
        name=company.name,
        website=company.website,
        industry=company.industry,
        size=company.size,
        description=company.description,
        headquarters=company.headquarters,
        linkedin_url=company.linkedin_url,
        created_at=company.created_at,
        updated_at=company.updated_at,
        tags=company.tags,
        domain=company.domain,
        apollo_id=company.apollo_id,
        employee_count=company.employee_count,
        employee_growth=company.employee_growth,
        status=company.status,
        bpo_analysis=company.bpo_analysis,
    )


@router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    request: CompanyUpdate,
    service: SalesService = Depends(get_service)
):
    """Update a company."""
    company = await service.update_company(
        company_id=company_id,
        **request.model_dump(exclude_unset=True)
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyResponse(
        id=company.id,
        name=company.name,
        website=company.website,
        industry=company.industry,
        size=company.size,
        description=company.description,
        headquarters=company.headquarters,
        linkedin_url=company.linkedin_url,
        created_at=company.created_at,
        updated_at=company.updated_at,
        tags=company.tags,
        domain=company.domain,
        apollo_id=company.apollo_id,
        employee_count=company.employee_count,
        employee_growth=company.employee_growth,
        status=company.status,
        bpo_analysis=company.bpo_analysis,
    )


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: str,
    service: SalesService = Depends(get_service)
):
    """Delete a company."""
    success = await service.delete_company(company_id)
    if not success:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"status": "deleted", "id": company_id}


# ==================== CONTACT ENDPOINTS ====================

@router.post("/contacts", response_model=ContactResponse)
async def create_contact(
    request: ContactCreate,
    service: SalesService = Depends(get_service)
):
    """Create a new contact."""
    contact = await service.create_contact(
        name=request.name,
        company_id=request.company_id,
        title=request.title,
        email=request.email,
        phone=request.phone,
        linkedin_url=request.linkedin_url,
        notes=request.notes,
    )
    return ContactResponse(
        id=contact.id,
        company_id=contact.company_id,
        company_name=contact.company_name,
        name=contact.name,
        title=contact.title,
        email=contact.email,
        phone=contact.phone,
        linkedin_url=contact.linkedin_url,
        notes=contact.notes,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


@router.post("/contacts/bulk", response_model=List[ContactResponse])
async def bulk_create_contacts(
    request: BulkContactCreate,
    service: SalesService = Depends(get_service)
):
    """Create multiple contacts at once."""
    contacts = await service.bulk_create_contacts(
        [c.model_dump() for c in request.contacts]
    )
    return [
        ContactResponse(
            id=c.id,
            company_id=c.company_id,
            company_name=c.company_name,
            name=c.name,
            title=c.title,
            email=c.email,
            phone=c.phone,
            linkedin_url=c.linkedin_url,
            notes=c.notes,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in contacts
    ]


@router.get("/contacts", response_model=List[ContactResponse])
async def list_contacts(
    company_id: Optional[str] = None,
    search: Optional[str] = None,
    has_linkedin: Optional[bool] = None,
    has_email: Optional[bool] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    service: SalesService = Depends(get_service)
):
    """List contacts with optional filtering."""
    contacts = await service.get_contacts(
        company_id=company_id,
        search=search,
        has_linkedin=has_linkedin,
        has_email=has_email,
        limit=limit,
        offset=offset,
    )
    return [
        ContactResponse(
            id=c.id,
            company_id=c.company_id,
            company_name=c.company_name,
            name=c.name,
            title=c.title,
            email=c.email,
            phone=c.phone,
            linkedin_url=c.linkedin_url,
            notes=c.notes,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in contacts
    ]


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    service: SalesService = Depends(get_service)
):
    """Get a single contact."""
    contact = await service.get_contact(contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse(
        id=contact.id,
        company_id=contact.company_id,
        company_name=contact.company_name,
        name=contact.name,
        title=contact.title,
        email=contact.email,
        phone=contact.phone,
        linkedin_url=contact.linkedin_url,
        notes=contact.notes,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    request: ContactUpdate,
    service: SalesService = Depends(get_service)
):
    """Update a contact."""
    contact = await service.update_contact(
        contact_id=contact_id,
        **request.model_dump(exclude_unset=True)
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse(
        id=contact.id,
        company_id=contact.company_id,
        company_name=contact.company_name,
        name=contact.name,
        title=contact.title,
        email=contact.email,
        phone=contact.phone,
        linkedin_url=contact.linkedin_url,
        notes=contact.notes,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    service: SalesService = Depends(get_service)
):
    """Delete a contact."""
    success = await service.delete_contact(contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"status": "deleted", "id": contact_id}


# ==================== SIGNAL ENDPOINTS ====================

@router.post("/signals", response_model=SignalResponse)
async def create_signal(
    request: SignalCreate,
    service: SalesService = Depends(get_service)
):
    """Create a new signal for a company."""
    signal = await service.create_signal(
        company_id=request.company_id,
        signal_type=request.signal_type,
        source=request.source,
        details=request.details,
        signal_strength=request.signal_strength,
    )
    return SignalResponse(
        id=signal.id,
        company_id=signal.company_id,
        company_name=signal.company_name,
        signal_type=signal.signal_type,
        signal_strength=signal.signal_strength,
        source=signal.source,
        details=signal.details,
        detected_at=signal.detected_at,
    )


@router.get("/signals", response_model=List[SignalResponse])
async def list_signals(
    company_id: Optional[str] = None,
    signal_type: Optional[str] = None,
    min_strength: Optional[int] = None,
    limit: int = Query(100, le=500),
    service: SalesService = Depends(get_service)
):
    """List signals with optional filtering."""
    signals = await service.get_signals(
        company_id=company_id,
        signal_type=signal_type,
        min_strength=min_strength,
        limit=limit,
    )
    return [
        SignalResponse(
            id=s.id,
            company_id=s.company_id,
            company_name=s.company_name,
            signal_type=s.signal_type,
            signal_strength=s.signal_strength,
            source=s.source,
            details=s.details,
            detected_at=s.detected_at,
        )
        for s in signals
    ]


# ==================== ANALYTICS & RESEARCH ====================

@router.get("/stats")
async def get_pipeline_stats(
    service: SalesService = Depends(get_service)
):
    """Get overall pipeline statistics."""
    return await service.get_pipeline_stats()


@router.post("/research")
async def research_company(
    request: ResearchRequest,
    service: SalesService = Depends(get_service)
):
    """Research a company using AI."""
    result = await service.research_company_with_ai(
        company_name=request.company_name,
        website=request.website,
    )
    return result


# ==================== EXPORT ====================

@router.get("/export/contacts")
async def export_contacts(
    company_id: Optional[str] = None,
    has_linkedin: Optional[bool] = None,
    has_email: Optional[bool] = None,
    format: str = Query("json", pattern="^(json|csv)$"),
    service: SalesService = Depends(get_service)
):
    """Export contacts as JSON or CSV."""
    contacts = await service.get_contacts(
        company_id=company_id,
        has_linkedin=has_linkedin,
        has_email=has_email,
        limit=10000,  # Higher limit for export
    )

    if format == "csv":
        import io
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["name", "title", "company", "email", "phone", "linkedin_url"])
        for c in contacts:
            writer.writerow([c.name, c.title, c.company_name, c.email, c.phone, c.linkedin_url])

        from fastapi.responses import Response
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=contacts.csv"}
        )

    return {
        "count": len(contacts),
        "contacts": [
            {
                "name": c.name,
                "title": c.title,
                "company": c.company_name,
                "email": c.email,
                "phone": c.phone,
                "linkedin_url": c.linkedin_url,
            }
            for c in contacts
        ]
    }


# ==================== JOB SCAN ENDPOINTS ====================

class JobScanRequest(BaseModel):
    query: str = "bilingual customer service representative"
    location: str = "Canada"
    num_results: int = 50
    enrich_with_apollo: bool = False


class JobScanResponse(BaseModel):
    success: bool
    query: str
    location: str
    source: Optional[str]
    total_jobs: int
    companies_found: int
    companies_created: int
    companies_updated: int
    signals_created: int


@router.post("/scan", response_model=JobScanResponse)
async def scan_for_job_signals(
    request: JobScanRequest,
    service: SalesService = Depends(get_service)
):
    """Scan job boards for companies hiring and create signals."""
    result = await service.scan_for_companies(
        query=request.query,
        location=request.location,
        num_results=request.num_results,
        enrich_with_apollo=request.enrich_with_apollo,
    )
    return result


# ==================== ENRICHMENT ENDPOINTS ====================

@router.post("/companies/{company_id}/enrich")
async def enrich_company_with_apollo(
    company_id: str,
    domain: Optional[str] = None,
    service: SalesService = Depends(get_service)
):
    """Enrich a company with Apollo organization data."""
    result = await service.enrich_company_with_apollo(company_id, domain)
    return result


@router.post("/companies/{company_id}/find-contacts")
async def find_contacts_for_company(
    company_id: str,
    limit: int = Query(5, le=20),
    service: SalesService = Depends(get_service)
):
    """Find decision-maker contacts for a company using Apollo."""
    result = await service.find_contacts_for_company(company_id, limit)
    return result


# ==================== BULK OPERATIONS ====================

class BulkCompanyRequest(BaseModel):
    company_ids: List[str]


class BulkStatusRequest(BaseModel):
    company_ids: List[str]
    status: str  # new, target, contacted, meeting


@router.post("/bulk/enrich")
async def bulk_enrich_companies(
    request: BulkCompanyRequest,
    service: SalesService = Depends(get_service)
):
    """Enrich multiple companies with Apollo data."""
    result = await service.bulk_enrich_companies(request.company_ids)
    return result


@router.post("/bulk/find-contacts")
async def bulk_find_contacts(
    request: BulkCompanyRequest,
    limit_per_company: int = Query(5, le=10),
    service: SalesService = Depends(get_service)
):
    """Find contacts for multiple companies."""
    result = await service.bulk_find_contacts(request.company_ids, limit_per_company)
    return result


@router.post("/bulk/analyze-bpo")
async def bulk_analyze_bpo(
    request: BulkCompanyRequest,
    service: SalesService = Depends(get_service)
):
    """Analyze BPO fit for multiple companies using OpenAI."""
    result = await service.bulk_analyze_bpo(request.company_ids)
    return result


@router.post("/bulk/analyze-bpo-stream")
async def bulk_analyze_bpo_stream(
    request: BulkCompanyRequest,
    service: SalesService = Depends(get_service)
):
    """Stream BPO analysis progress in real-time using Server-Sent Events."""

    async def event_generator():
        """Generate SSE events for progress updates."""
        company_ids = request.company_ids
        total = len(company_ids)
        success_count = 0
        failed_count = 0

        for idx, company_id in enumerate(company_ids, 1):
            # Get company name for progress display
            try:
                company = await service.get_company(company_id)
                company_name = company.name if company else f"Company {idx}"
            except:
                company_name = f"Company {idx}"

            # Send progress update
            progress_data = {
                "processed": idx,
                "total": total,
                "current_company": company_name,
                "success_count": success_count,
                "failed_count": failed_count,
                "percentage": int((idx / total) * 100)
            }
            yield f"data: {json.dumps(progress_data)}\n\n"

            # Analyze company
            try:
                result = await service.analyze_bpo_fit(company_id)
                if result.get("success"):
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                failed_count += 1

            # Small delay to prevent overwhelming the client
            await asyncio.sleep(0.1)

        # Send final summary
        final_data = {
            "processed": total,
            "total": total,
            "current_company": "Complete",
            "success_count": success_count,
            "failed_count": failed_count,
            "percentage": 100,
            "done": True
        }
        yield f"data: {json.dumps(final_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/bulk/status")
async def bulk_update_status(
    request: BulkStatusRequest,
    service: SalesService = Depends(get_service)
):
    """Update status for multiple companies."""
    result = await service.bulk_update_status(request.company_ids, request.status)
    return result


@router.get("/export")
async def export_companies(
    company_ids: Optional[str] = Query(None, description="Comma-separated company IDs"),
    format: str = Query("json", pattern="^(csv|json)$"),
    service: SalesService = Depends(get_service)
):
    """Export companies with their contacts."""
    ids = company_ids.split(",") if company_ids else None
    data = await service.export_companies_with_contacts(ids)

    if format == "csv":
        import io
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        # Header row
        writer.writerow(["company_name", "industry", "headquarters", "employee_count", "status", "linkedin_url", "contact_name", "contact_title", "contact_email", "contact_phone"])
        # Data rows
        for company in data:
            if company.get("contacts"):
                for contact in company["contacts"]:
                    writer.writerow([
                        company["name"],
                        company.get("industry"),
                        company.get("headquarters"),
                        company.get("employee_count"),
                        company.get("status"),
                        company.get("linkedin_url"),
                        contact.get("name"),
                        contact.get("title"),
                        contact.get("email"),
                        contact.get("phone"),
                    ])
            else:
                writer.writerow([
                    company["name"],
                    company.get("industry"),
                    company.get("headquarters"),
                    company.get("employee_count"),
                    company.get("status"),
                    company.get("linkedin_url"),
                    "", "", "", ""
                ])

        from fastapi.responses import Response
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=companies_export.csv"}
        )

    return {"count": len(data), "companies": data}


# ==================== JOB SIGNAL ENDPOINTS ====================

class JobSignalResponse(BaseModel):
    id: str
    company_id: str
    company_name: Optional[str]
    job_title: str
    job_url: Optional[str]
    location: Optional[str]
    source: str
    signal_type: str
    signal_strength: int
    posted_date: Optional[str]
    discovered_at: str


@router.get("/signals/jobs", response_model=List[JobSignalResponse])
async def list_job_signals(
    company_id: Optional[str] = None,
    signal_type: Optional[str] = None,
    limit: int = Query(100, le=500),
    service: SalesService = Depends(get_service)
):
    """List job signals with optional filtering."""
    signals = await service.get_job_signals(
        company_id=company_id,
        signal_type=signal_type,
        limit=limit,
    )
    return [
        JobSignalResponse(
            id=s.id,
            company_id=s.company_id,
            company_name=s.company_name,
            job_title=s.job_title,
            job_url=s.job_url,
            location=s.location,
            source=s.source,
            signal_type=s.signal_type,
            signal_strength=s.signal_strength,
            posted_date=s.posted_date,
            discovered_at=s.discovered_at,
        )
        for s in signals
    ]


# ==================== PROJECT ENDPOINTS ====================

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_criteria: Optional[dict] = None
    signal_weights: Optional[dict] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    target_criteria: dict
    signal_weights: dict
    status: str
    created_at: str
    updated_at: str


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    request: ProjectCreate,
    service: SalesService = Depends(get_service)
):
    """Create a new sales project."""
    project = await service.create_project(
        name=request.name,
        description=request.description,
        target_criteria=request.target_criteria,
        signal_weights=request.signal_weights,
    )
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        target_criteria=project.target_criteria,
        signal_weights=project.signal_weights,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[str] = None,
    service: SalesService = Depends(get_service)
):
    """List all sales projects."""
    projects = await service.get_projects(status=status)
    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            target_criteria=p.target_criteria,
            signal_weights=p.signal_weights,
            status=p.status,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in projects
    ]


# ==================== RFP ENDPOINTS ====================

@router.post("/rfps", response_model=RFPResponse)
async def create_rfp(
    request: RFPCreate,
    service: SalesService = Depends(get_service)
):
    """Create a new RFP opportunity."""
    rfp = await service.create_rfp(
        title=request.title,
        issuer=request.issuer,
        description=request.description,
        url=request.url,
        deadline=request.deadline,
        source=request.source,
        region=request.region,
        value_estimate=request.value_estimate,
    )
    return RFPResponse(
        id=rfp.id,
        title=rfp.title,
        issuer=rfp.issuer,
        description=rfp.description,
        url=rfp.url,
        deadline=rfp.deadline,
        discovered_at=rfp.discovered_at,
        source=rfp.source,
        status=rfp.status,
        region=rfp.region,
        value_estimate=rfp.value_estimate,
        notes=rfp.notes,
    )


@router.get("/rfps", response_model=List[RFPResponse])
async def list_rfps(
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    service: SalesService = Depends(get_service)
):
    """List RFP opportunities."""
    rfps = await service.get_rfps(status=status, limit=limit, offset=offset)
    return [
        RFPResponse(
            id=r.id,
            title=r.title,
            issuer=r.issuer,
            description=r.description,
            url=r.url,
            deadline=r.deadline,
            discovered_at=r.discovered_at,
            source=r.source,
            status=r.status,
            region=r.region,
            value_estimate=r.value_estimate,
            notes=r.notes,
        )
        for r in rfps
    ]


# ==================== RFP SEARCH (must come before {rfp_id} routes) ====================

@router.get("/rfps/search")
async def search_rfps(
    query: str = Query("contact center outsourcing", description="Search query"),
    region: str = Query("Canada", description="Region to search"),
    service: SalesService = Depends(get_service)
):
    """Search for RFP opportunities from tender portals."""
    return await service.search_for_rfps(query=query, region=region)


# ==================== RFP ALERT ENDPOINTS (must come before {rfp_id} routes) ====================

class RFPAlertCreate(BaseModel):
    name: str
    search_query: str
    region: str = "Canada"


class RFPAlertResponse(BaseModel):
    id: str
    name: str
    search_query: str
    region: str
    is_active: bool
    created_at: str
    last_checked: Optional[str]
    results_count: int


@router.post("/rfps/alerts", response_model=RFPAlertResponse)
async def create_rfp_alert(
    request: RFPAlertCreate,
    service: SalesService = Depends(get_service)
):
    """Create a new RFP alert for daily monitoring."""
    alert = await service.create_rfp_alert(
        name=request.name,
        search_query=request.search_query,
        region=request.region,
    )
    return RFPAlertResponse(
        id=alert.id,
        name=alert.name,
        search_query=alert.search_query,
        region=alert.region,
        is_active=alert.is_active,
        created_at=alert.created_at,
        last_checked=alert.last_checked,
        results_count=alert.results_count,
    )


@router.get("/rfps/alerts", response_model=List[RFPAlertResponse])
async def list_rfp_alerts(
    active_only: bool = Query(True),
    service: SalesService = Depends(get_service)
):
    """List all RFP alerts."""
    alerts = await service.get_rfp_alerts(active_only=active_only)
    return [
        RFPAlertResponse(
            id=a.id,
            name=a.name,
            search_query=a.search_query,
            region=a.region,
            is_active=a.is_active,
            created_at=a.created_at,
            last_checked=a.last_checked,
            results_count=a.results_count,
        )
        for a in alerts
    ]


@router.post("/rfps/alerts/run-all")
async def run_all_rfp_alerts(
    service: SalesService = Depends(get_service)
):
    """Run all active RFP alerts (used by daily cron job)."""
    return await service.run_all_rfp_alerts()


@router.post("/rfps/alerts/{alert_id}/run")
async def run_rfp_alert(
    alert_id: str,
    service: SalesService = Depends(get_service)
):
    """Run a specific RFP alert and get results."""
    result = await service.run_rfp_alert(alert_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Alert not found"))
    return result


@router.patch("/rfps/alerts/{alert_id}")
async def update_rfp_alert(
    alert_id: str,
    is_active: Optional[bool] = None,
    service: SalesService = Depends(get_service)
):
    """Update an RFP alert (e.g., enable/disable)."""
    alert = await service.update_rfp_alert(alert_id=alert_id, is_active=is_active)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return RFPAlertResponse(
        id=alert.id,
        name=alert.name,
        search_query=alert.search_query,
        region=alert.region,
        is_active=alert.is_active,
        created_at=alert.created_at,
        last_checked=alert.last_checked,
        results_count=alert.results_count,
    )


@router.delete("/rfps/alerts/{alert_id}")
async def delete_rfp_alert(
    alert_id: str,
    service: SalesService = Depends(get_service)
):
    """Delete an RFP alert."""
    deleted = await service.delete_rfp_alert(alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


# ==================== RFP {rfp_id} ROUTES (must come AFTER specific routes) ====================

@router.patch("/rfps/{rfp_id}", response_model=RFPResponse)
async def update_rfp(
    rfp_id: str,
    request: RFPUpdate,
    service: SalesService = Depends(get_service)
):
    """Update an RFP's status or notes."""
    rfp = await service.update_rfp(
        rfp_id=rfp_id,
        status=request.status,
        notes=request.notes,
    )
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found")
    return RFPResponse(
        id=rfp.id,
        title=rfp.title,
        issuer=rfp.issuer,
        description=rfp.description,
        url=rfp.url,
        deadline=rfp.deadline,
        discovered_at=rfp.discovered_at,
        source=rfp.source,
        status=rfp.status,
        region=rfp.region,
        value_estimate=rfp.value_estimate,
        notes=rfp.notes,
    )


@router.delete("/rfps/{rfp_id}")
async def delete_rfp(
    rfp_id: str,
    service: SalesService = Depends(get_service)
):
    """Delete an RFP."""
    deleted = await service.delete_rfp(rfp_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="RFP not found")
    return {"success": True}


# ==================== SETTINGS ENDPOINTS ====================

class SettingUpdate(BaseModel):
    value: str


@router.get("/settings/{key}")
async def get_setting(
    key: str,
    service: SalesService = Depends(get_service)
):
    """Get a setting value by key."""
    value = await service.get_setting(key)
    return {"key": key, "value": value}


@router.put("/settings/{key}")
async def set_setting(
    key: str,
    request: SettingUpdate,
    service: SalesService = Depends(get_service)
):
    """Set a setting value."""
    await service.set_setting(key, request.value)
    return {"success": True, "key": key}


# ==================== BPO ANALYSIS ENDPOINTS ====================

@router.post("/companies/{company_id}/analyze-bpo")
async def analyze_bpo_fit(
    company_id: str,
    service: SalesService = Depends(get_service)
):
    """Analyze a company's BPO/outsourcing potential using AI."""
    result = await service.analyze_bpo_fit(company_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Analysis failed"))
    return result
