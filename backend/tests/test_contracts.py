"""
CoSauce Portal - Contract API Tests

Critical test coverage for contract generation endpoints:
1. Template listing
2. MSA contract generation (success and validation)
3. SOW contract generation
4. AI-assisted scope drafting
5. Contract history and retrieval
"""
import pytest
from fastapi.testclient import TestClient


# ============ Template Listing ============

@pytest.mark.unit
def test_list_templates_returns_available_templates(client: TestClient, mock_contract_service):
    """Test GET /api/contracts/templates returns list of templates."""
    response = client.get("/api/contracts/templates")

    assert response.status_code == 200
    data = response.json()

    # Should return templates array
    assert "templates" in data
    assert isinstance(data["templates"], list)
    assert len(data["templates"]) > 0

    # Should include all 3 contract types
    templates = data["templates"]
    assert "MSA_Template" in templates or "MSA" in templates
    assert "SOW_Template" in templates or "SOW" in templates
    assert "ShortForm_Template" in templates or "ShortForm" in templates


# ============ MSA Generation ============

@pytest.mark.unit
def test_generate_msa_with_valid_data_succeeds(
    client: TestClient, mock_contract_service, sample_msa_request
):
    """Test POST /api/contracts/generate/msa with valid data returns contract."""
    response = client.post("/api/contracts/generate/msa", json=sample_msa_request)

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "id" in data
    assert "contract_type" in data
    assert "client_name" in data
    assert "filename" in data
    assert "download_url" in data
    assert "generated_at" in data

    # Verify data values
    assert data["contract_type"] == "MSA"
    assert data["client_name"] == sample_msa_request["client_name"]
    assert data["filename"].endswith(".docx")
    assert "/api/contracts/download/" in data["download_url"]

    # Verify service was called correctly
    mock_contract_service.generate_contract.assert_called_once()
    mock_contract_service.log_contract.assert_called_once()


@pytest.mark.unit
def test_generate_msa_without_client_name_fails(client: TestClient, mock_contract_service):
    """Test POST /api/contracts/generate/msa without client_name returns 400."""
    # Missing client_name (required field)
    invalid_request = {
        "jurisdiction": "Singapore",
        "term_duration": "12 months"
    }

    response = client.post("/api/contracts/generate/msa", json=invalid_request)

    # FastAPI should return 422 for missing required field
    assert response.status_code == 422
    data = response.json()

    # Verify error message mentions client_name
    assert "detail" in data
    error_detail = str(data["detail"]).lower()
    assert "client_name" in error_detail or "field required" in error_detail


@pytest.mark.unit
def test_generate_msa_with_empty_client_name_fails(client: TestClient, mock_contract_service):
    """Test POST /api/contracts/generate/msa with empty client_name returns 400."""
    invalid_request = {
        "client_name": "",  # Empty string
        "jurisdiction": "Singapore"
    }

    response = client.post("/api/contracts/generate/msa", json=invalid_request)

    # Should fail validation (400) since client_name is required
    assert response.status_code == 400
    data = response.json()

    assert "detail" in data
    assert "client name is required" in data["detail"].lower()


# ============ SOW Generation ============

@pytest.mark.unit
def test_generate_sow_with_valid_data_succeeds(
    client: TestClient, mock_contract_service, sample_sow_request
):
    """Test POST /api/contracts/generate/sow with valid data returns contract."""
    response = client.post("/api/contracts/generate/sow", json=sample_sow_request)

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert data["contract_type"] == "SOW"
    assert data["client_name"] == sample_sow_request["client_name"]
    assert data["filename"].endswith(".docx")

    # Verify service was called
    mock_contract_service.generate_contract.assert_called_once()
    mock_contract_service.log_contract.assert_called_once()


@pytest.mark.unit
def test_generate_sow_without_project_name_fails(client: TestClient, mock_contract_service):
    """Test POST /api/contracts/generate/sow without project_name returns 422."""
    invalid_request = {
        "client_name": "Test Client",
        "scope_formal": "Do some work"
        # Missing project_name
    }

    response = client.post("/api/contracts/generate/sow", json=invalid_request)

    assert response.status_code == 422
    data = response.json()

    error_detail = str(data["detail"]).lower()
    assert "project_name" in error_detail or "field required" in error_detail


@pytest.mark.unit
def test_generate_sow_without_scope_fails(client: TestClient, mock_contract_service):
    """Test POST /api/contracts/generate/sow without scope_formal returns 400."""
    invalid_request = {
        "client_name": "Test Client",
        "project_name": "Test Project"
        # Missing scope_formal
    }

    response = client.post("/api/contracts/generate/sow", json=invalid_request)

    # Should fail validation (422 for missing field or 400 for empty scope check)
    assert response.status_code in [400, 422]


# ============ AI-Assisted Drafting ============

@pytest.mark.integration
def test_draft_scope_with_valid_bullets_returns_ai_draft(
    client: TestClient, mock_contract_service, sample_draft_request
):
    """Test POST /api/contracts/draft with valid bullets returns AI-generated scope."""
    response = client.post("/api/contracts/draft", json=sample_draft_request)

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "draft_scope" in data
    assert "suggestions" in data

    # Verify draft content is not empty
    assert len(data["draft_scope"]) > 0
    assert isinstance(data["suggestions"], list)
    assert len(data["suggestions"]) > 0

    # Verify service was called correctly
    mock_contract_service.generate_ai_scope.assert_called_once()
    mock_contract_service.generate_ai_suggestions.assert_called_once()

    # Verify AI scope was called with correct parameters
    call_args = mock_contract_service.generate_ai_scope.call_args
    assert call_args.kwargs["project_name"] == sample_draft_request["project_name"]
    assert call_args.kwargs["bullets"] == sample_draft_request["scope_bullets"]


@pytest.mark.unit
def test_draft_scope_without_project_name_fails(client: TestClient, mock_contract_service):
    """Test POST /api/contracts/draft without project_name returns 422."""
    invalid_request = {
        "contract_type": "SOW",
        "scope_bullets": "- Do something\n- Do something else"
        # Missing project_name
    }

    response = client.post("/api/contracts/draft", json=invalid_request)

    assert response.status_code == 422
    data = response.json()

    error_detail = str(data["detail"]).lower()
    assert "project_name" in error_detail or "field required" in error_detail


@pytest.mark.unit
def test_draft_scope_without_bullets_fails(client: TestClient, mock_contract_service):
    """Test POST /api/contracts/draft without scope_bullets returns 422."""
    invalid_request = {
        "contract_type": "SOW",
        "project_name": "Test Project"
        # Missing scope_bullets
    }

    response = client.post("/api/contracts/draft", json=invalid_request)

    assert response.status_code == 422
    data = response.json()

    error_detail = str(data["detail"]).lower()
    assert "scope_bullets" in error_detail or "field required" in error_detail


# ============ Contract History & Retrieval ============

@pytest.mark.unit
def test_get_contract_history_returns_list(client: TestClient, mock_contract_service):
    """Test GET /api/contracts/history returns list of generated contracts."""
    response = client.get("/api/contracts/history")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "contracts" in data
    assert "total" in data

    # Verify contracts array
    assert isinstance(data["contracts"], list)
    assert data["total"] >= 0

    if data["total"] > 0:
        # Verify contract item structure
        contract = data["contracts"][0]
        assert "id" in contract
        assert "contract_type" in contract
        assert "client_name" in contract
        assert "filename" in contract
        assert "generated_by" in contract
        assert "timestamp" in contract
        assert "ai_assisted" in contract


@pytest.mark.unit
def test_get_contract_history_with_limit(client: TestClient, mock_contract_service):
    """Test GET /api/contracts/history?limit=10 respects limit parameter."""
    response = client.get("/api/contracts/history?limit=10")

    assert response.status_code == 200
    data = response.json()

    # Service should be called with limit
    mock_contract_service.get_contract_history.assert_called_with(limit=10)


@pytest.mark.unit
def test_get_contract_by_id_returns_contract_details(client: TestClient, mock_contract_service):
    """Test GET /api/contracts/{id} returns contract details."""
    contract_id = "test-contract-123"
    response = client.get(f"/api/contracts/{contract_id}")

    assert response.status_code == 200
    data = response.json()

    # Verify contract details
    assert data["id"] == contract_id
    assert "contract_type" in data
    assert "client_name" in data
    assert "timestamp" in data

    # Verify service was called with correct ID
    mock_contract_service.get_contract_by_id.assert_called_with(contract_id)


@pytest.mark.unit
def test_get_nonexistent_contract_returns_404(client: TestClient, mock_contract_service):
    """Test GET /api/contracts/{id} with invalid ID returns 404."""
    # Mock service to return None (contract not found)
    mock_contract_service.get_contract_by_id.return_value = None

    response = client.get("/api/contracts/nonexistent-id")

    assert response.status_code == 404
    data = response.json()

    assert "detail" in data
    assert "not found" in data["detail"].lower()


# ============ Short Form Generation ============

@pytest.mark.unit
def test_generate_shortform_with_valid_data_succeeds(
    client: TestClient, mock_contract_service, sample_shortform_request
):
    """Test POST /api/contracts/generate/shortform with valid data returns contract."""
    response = client.post("/api/contracts/generate/shortform", json=sample_shortform_request)

    assert response.status_code == 200
    data = response.json()

    # Verify response
    assert data["contract_type"] == "ShortForm"
    assert data["client_name"] == sample_shortform_request["client_name"]

    # Verify service was called
    mock_contract_service.generate_contract.assert_called_once()
