"""
CoSauce Portal Backend Test Configuration

Shared fixtures for FastAPI testing with pytest.
"""
import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from typing import Generator
from unittest.mock import Mock, patch

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import shared fixtures from testing framework
shared_fixtures_path = Path.home() / "testing-framework" / "python" / "fixtures"
if shared_fixtures_path.exists():
    sys.path.insert(0, str(shared_fixtures_path.parent))

from app.main import app
from app.services.contract_service import ContractService


# ============ Shared Fixtures ============

@pytest.fixture(scope="session")
def test_env():
    """Set up test environment variables."""
    os.environ["TESTING"] = "true"
    os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "sk-test-key-123")
    yield
    # Cleanup
    os.environ.pop("TESTING", None)


@pytest.fixture
def client(test_env) -> Generator[TestClient, None, None]:
    """FastAPI test client fixture."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_openai():
    """Mock OpenAI API calls to avoid rate limits and costs in tests."""
    with patch("openai.OpenAI") as mock:
        # Mock chat completion
        mock_instance = Mock()
        mock_instance.chat.completions.create.return_value = Mock(
            choices=[
                Mock(
                    message=Mock(
                        content="This is a professionally drafted scope of work for the project."
                    )
                )
            ]
        )
        mock.return_value = mock_instance
        yield mock


@pytest.fixture
def mock_contract_service():
    """Mock contract service for testing without file I/O."""
    from app.api.contracts import get_contract_service

    service = Mock(spec=ContractService)

    # Mock template listing (real service returns "MSA_Template", not "MSA")
    service.list_templates.return_value = ["MSA_Template", "SOW_Template", "ShortForm_Template"]

    # Mock AI scope generation
    service.generate_ai_scope.return_value = (
        "**Scope of Work**\n\n"
        "The service provider will deliver the following services:\n\n"
        "1. Implementation and deployment\n"
        "2. Training and documentation\n"
        "3. Ongoing support and maintenance"
    )

    # Mock AI suggestions
    service.generate_ai_suggestions.return_value = [
        "Consider adding specific deliverables and timelines",
        "Define acceptance criteria for each milestone",
        "Specify SLA targets and response times"
    ]

    # Mock contract generation
    service.generate_contract.return_value = Path("/tmp/test_contract.docx")

    # Mock contract logging
    service.log_contract.return_value = {
        "id": "test-contract-123",
        "contract_type": "MSA",
        "client_name": "Test Client",
        "filename": "MSA_Test_Client.docx",
        "timestamp": "2026-01-06T12:00:00",
        "generated_by": "api_user",
        "ai_assisted_fields": []
    }

    # Mock contract history
    service.get_contract_history.return_value = [
        {
            "id": "test-contract-123",
            "contract_type": "MSA",
            "client_name": "Test Client",
            "filename": "MSA_Test_Client.docx",
            "generated_by": "api_user",
            "timestamp": "2026-01-06T12:00:00",
            "ai_assisted_fields": []
        }
    ]

    # Mock get contract by ID
    service.get_contract_by_id.return_value = {
        "id": "test-contract-123",
        "contract_type": "MSA",
        "client_name": "Test Client",
        "filename": "MSA_Test_Client.docx",
        "filepath": "/tmp/test_contract.docx",
        "generated_by": "api_user",
        "timestamp": "2026-01-06T12:00:00"
    }

    # Override FastAPI dependency
    app.dependency_overrides[get_contract_service] = lambda: service

    yield service

    # Clean up override
    app.dependency_overrides.clear()


@pytest.fixture
def sample_msa_request():
    """Sample MSA contract request data."""
    return {
        "client_name": "Acme Corporation",
        "client_legal_name": "Acme Corp Pte Ltd",
        "jurisdiction": "Singapore",
        "term_duration": "12 months",
        "payment_terms": "Net 30"
    }


@pytest.fixture
def sample_sow_request():
    """Sample SOW contract request data."""
    return {
        "client_name": "Acme Corporation",
        "project_name": "Customer Support Outsourcing",
        "scope_formal": (
            "CoSauce will provide 24/7 customer support services including:\n"
            "- Email and chat support\n"
            "- Phone support during business hours\n"
            "- Ticket management and escalation"
        ),
        "staff_agents": 10,
        "staff_team_leads": 2,
        "staff_managers": 1,
        "rate_agent": 2500.0,
        "rate_team_lead": 3500.0,
        "rate_manager": 5000.0
    }


@pytest.fixture
def sample_shortform_request():
    """Sample Short Form contract request data."""
    return {
        "client_name": "Small Business Inc",
        "client_contact_name": "John Doe",
        "client_contact_email": "john@smallbiz.com",
        "rate_agent": 2000.0
    }


@pytest.fixture
def sample_draft_request():
    """Sample AI draft request data."""
    return {
        "contract_type": "SOW",
        "project_name": "E-commerce Platform Support",
        "scope_bullets": (
            "- Provide Tier 1 and Tier 2 customer support\n"
            "- Handle order inquiries and returns\n"
            "- Process refunds and exchanges\n"
            "- Escalate technical issues to client dev team"
        )
    }
