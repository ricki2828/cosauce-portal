"""
Sales API - Company research, contact management, and signal tracking
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List

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
