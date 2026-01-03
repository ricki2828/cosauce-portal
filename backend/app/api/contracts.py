"""
Contracts API - Generate MSA, SOW, and Short Form agreements
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from pathlib import Path

from ..services.contract_service import (
    ContractService,
    ContractData,
    get_contract_service
)

router = APIRouter()


# ============ Pydantic Models ============

class ContractDraftRequest(BaseModel):
    """Request to generate AI-assisted scope draft."""
    contract_type: str = Field(..., description="Contract type: MSA, SOW, or ShortForm")
    project_name: str = Field(..., description="Name of the project")
    scope_bullets: str = Field(..., description="Bullet points describing scope")


class ContractDraftResponse(BaseModel):
    """Response with AI-generated scope draft."""
    draft_scope: str
    suggestions: List[str]


class MSAGenerateRequest(BaseModel):
    """Request to generate MSA contract."""
    client_name: str
    client_legal_name: Optional[str] = None
    client_address: Optional[str] = None
    client_contact_name: Optional[str] = None
    client_contact_email: Optional[str] = None
    client_contact_phone: Optional[str] = None
    effective_date: Optional[str] = None
    term_duration: str = "12 months"
    notice_period: str = "60 days"
    jurisdiction: str = "Singapore"
    payment_terms: str = "Net 30"
    currency: str = "SGD"
    custom_clauses: Optional[str] = None


class SOWGenerateRequest(BaseModel):
    """Request to generate SOW contract."""
    client_name: str
    client_legal_name: Optional[str] = None
    client_contact_name: Optional[str] = None
    effective_date: Optional[str] = None
    project_name: str
    project_start: Optional[str] = None
    project_end: Optional[str] = None
    scope_formal: str = Field(..., description="Approved scope text")
    staff_agents: int = 0
    staff_team_leads: int = 0
    staff_managers: int = 0
    operating_hours: Optional[str] = None
    location: Optional[str] = None
    pricing_model: str = "Per agent per month"
    currency: str = "SGD"
    rate_agent: float = 0.0
    rate_team_lead: float = 0.0
    rate_manager: float = 0.0


class ShortFormGenerateRequest(BaseModel):
    """Request to generate Short Form contract."""
    client_name: str
    client_contact_name: Optional[str] = None
    client_contact_email: Optional[str] = None
    client_contact_phone: Optional[str] = None
    effective_date: Optional[str] = None
    currency: str = "SGD"
    rate_agent: float = 0.0


class ContractResponse(BaseModel):
    """Response after contract generation."""
    id: str
    contract_type: str
    client_name: str
    filename: str
    download_url: str
    generated_at: str


class ContractHistoryItem(BaseModel):
    """Item in contract history."""
    id: str
    contract_type: str
    client_name: str
    filename: str
    generated_by: str
    timestamp: str
    ai_assisted: bool


class ContractHistoryResponse(BaseModel):
    """Contract history response."""
    contracts: List[ContractHistoryItem]
    total: int


class TemplatesResponse(BaseModel):
    """Available templates response."""
    templates: List[str]


# ============ API Endpoints ============

@router.get("/templates", response_model=TemplatesResponse)
async def list_templates(
    service: ContractService = Depends(get_contract_service)
):
    """List available contract templates."""
    templates = service.list_templates()
    return TemplatesResponse(templates=templates)


@router.post("/draft", response_model=ContractDraftResponse)
async def draft_contract(
    request: ContractDraftRequest,
    service: ContractService = Depends(get_contract_service)
):
    """Generate AI-assisted scope draft from bullet points."""
    draft_scope = service.generate_ai_scope(
        bullets=request.scope_bullets,
        project_name=request.project_name
    )

    suggestions = service.generate_ai_suggestions(
        contract_type=request.contract_type,
        partial_data={"project_name": request.project_name, "scope_bullets": request.scope_bullets}
    )

    return ContractDraftResponse(
        draft_scope=draft_scope,
        suggestions=suggestions
    )


@router.post("/generate/msa", response_model=ContractResponse)
async def generate_msa(
    request: MSAGenerateRequest,
    service: ContractService = Depends(get_contract_service)
):
    """Generate MSA (Master Services Agreement) contract."""
    if not request.client_name:
        raise HTTPException(status_code=400, detail="Client name is required")

    contract_data = ContractData(
        contract_type="MSA",
        client_name=request.client_name,
        client_legal_name=request.client_legal_name or request.client_name,
        client_address=request.client_address or "",
        client_contact_name=request.client_contact_name or "",
        client_contact_email=request.client_contact_email or "",
        client_contact_phone=request.client_contact_phone or "",
        effective_date=request.effective_date or date.today().strftime("%d %B %Y"),
        term_duration=request.term_duration,
        notice_period=request.notice_period,
        jurisdiction=request.jurisdiction,
        payment_terms=request.payment_terms,
        currency=request.currency,
        custom_clauses=request.custom_clauses or "",
    )

    try:
        output_path = service.generate_contract(contract_data)
        log_entry = service.log_contract(contract_data, output_path, user="api_user")

        return ContractResponse(
            id=log_entry["id"],
            contract_type="MSA",
            client_name=request.client_name,
            filename=output_path.name,
            download_url=f"/api/contracts/download/{log_entry['id']}",
            generated_at=log_entry["timestamp"]
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Template not found: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating contract: {str(e)}")


@router.post("/generate/sow", response_model=ContractResponse)
async def generate_sow(
    request: SOWGenerateRequest,
    service: ContractService = Depends(get_contract_service)
):
    """Generate SOW (Statement of Work) contract."""
    if not request.client_name:
        raise HTTPException(status_code=400, detail="Client name is required")
    if not request.project_name:
        raise HTTPException(status_code=400, detail="Project name is required")
    if not request.scope_formal:
        raise HTTPException(status_code=400, detail="Approved scope text is required")

    contract_data = ContractData(
        contract_type="SOW",
        client_name=request.client_name,
        client_legal_name=request.client_legal_name or request.client_name,
        client_contact_name=request.client_contact_name or "",
        effective_date=request.effective_date or date.today().strftime("%d %B %Y"),
        project_name=request.project_name,
        project_start=request.project_start or "",
        project_end=request.project_end or "",
        scope_formal=request.scope_formal,
        staff_count=request.staff_agents + request.staff_team_leads + request.staff_managers,
        staff_agents=request.staff_agents,
        staff_team_leads=request.staff_team_leads,
        staff_managers=request.staff_managers,
        operating_hours=request.operating_hours or "",
        location=request.location or "",
        pricing_model=request.pricing_model,
        currency=request.currency,
        rate_agent=request.rate_agent,
        rate_team_lead=request.rate_team_lead,
        rate_manager=request.rate_manager,
    )

    try:
        output_path = service.generate_contract(contract_data)
        log_entry = service.log_contract(contract_data, output_path, user="api_user")

        return ContractResponse(
            id=log_entry["id"],
            contract_type="SOW",
            client_name=request.client_name,
            filename=output_path.name,
            download_url=f"/api/contracts/download/{log_entry['id']}",
            generated_at=log_entry["timestamp"]
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Template not found: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating contract: {str(e)}")


@router.post("/generate/shortform", response_model=ContractResponse)
async def generate_shortform(
    request: ShortFormGenerateRequest,
    service: ContractService = Depends(get_contract_service)
):
    """Generate Short Form contract."""
    if not request.client_name:
        raise HTTPException(status_code=400, detail="Client name is required")

    contract_data = ContractData(
        contract_type="ShortForm",
        client_name=request.client_name,
        client_contact_name=request.client_contact_name or "",
        client_contact_email=request.client_contact_email or "",
        client_contact_phone=request.client_contact_phone or "",
        effective_date=request.effective_date or date.today().strftime("%d %B %Y"),
        currency=request.currency,
        rate_agent=request.rate_agent,
    )

    try:
        output_path = service.generate_contract(contract_data)
        log_entry = service.log_contract(contract_data, output_path, user="api_user")

        return ContractResponse(
            id=log_entry["id"],
            contract_type="ShortForm",
            client_name=request.client_name,
            filename=output_path.name,
            download_url=f"/api/contracts/download/{log_entry['id']}",
            generated_at=log_entry["timestamp"]
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Template not found: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating contract: {str(e)}")


@router.get("/history", response_model=ContractHistoryResponse)
async def get_contract_history(
    limit: int = 50,
    service: ContractService = Depends(get_contract_service)
):
    """Get list of generated contracts."""
    contracts = service.get_contract_history(limit=limit)

    history_items = [
        ContractHistoryItem(
            id=c.get("id", ""),
            contract_type=c.get("contract_type", ""),
            client_name=c.get("client_name", ""),
            filename=c.get("filename", ""),
            generated_by=c.get("generated_by", ""),
            timestamp=c.get("timestamp", ""),
            ai_assisted=bool(c.get("ai_assisted_fields", []))
        )
        for c in contracts
    ]

    return ContractHistoryResponse(
        contracts=history_items,
        total=len(history_items)
    )


@router.get("/download/{contract_id}")
async def download_contract(
    contract_id: str,
    service: ContractService = Depends(get_contract_service)
):
    """Download a generated contract file."""
    contract = service.get_contract_by_id(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    filepath = Path(contract.get("filepath", ""))
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Contract file not found")

    return FileResponse(
        path=filepath,
        filename=contract.get("filename", "contract.docx"),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    service: ContractService = Depends(get_contract_service)
):
    """Get details of a specific contract."""
    contract = service.get_contract_by_id(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    return contract
