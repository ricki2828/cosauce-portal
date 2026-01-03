"""
Pitch API - Generate pitch decks from content library
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class PitchOutlineRequest(BaseModel):
    client_name: str
    industry: str
    brief: str

class SlideRecommendation(BaseModel):
    slide_id: str
    title: str
    source_deck: str
    relevance_score: float
    category: str

class PitchOutlineResponse(BaseModel):
    outline: List[dict]
    recommended_slides: List[SlideRecommendation]

class PitchGenerateRequest(BaseModel):
    client_name: str
    slide_ids: List[str]
    replacements: dict  # Text replacements for customization

class PitchResponse(BaseModel):
    id: str
    filename: str
    slides: int
    download_url: str

@router.post("/outline", response_model=PitchOutlineResponse)
async def generate_outline(request: PitchOutlineRequest):
    """Generate pitch outline with slide recommendations"""
    # TODO: Integrate with pitch automation AI
    return PitchOutlineResponse(
        outline=[
            {"section": "Introduction", "slides": 2},
            {"section": "Problem Statement", "slides": 1},
            {"section": "Solution", "slides": 3},
            {"section": "Case Studies", "slides": 2},
            {"section": "Team", "slides": 1},
            {"section": "Next Steps", "slides": 1},
        ],
        recommended_slides=[],
    )

@router.post("/generate", response_model=PitchResponse)
async def generate_pitch(request: PitchGenerateRequest):
    """Generate final pitch deck from selected slides"""
    # TODO: Integrate with generate_deck.py
    return PitchResponse(
        id="pitch_001",
        filename=f"CoSauce_{request.client_name.replace(' ', '_')}_Pitch.pptx",
        slides=10,
        download_url="/api/pitch/download/pitch_001",
    )

@router.get("/library")
async def get_content_library():
    """Get available slides from content library"""
    # TODO: Read from pitch-automation/content-library
    return {
        "categories": [
            {"name": "Introduction", "slides": 12},
            {"name": "Case Studies", "slides": 24},
            {"name": "Solutions", "slides": 36},
            {"name": "Team", "slides": 8},
        ],
        "total_slides": 156,
    }

@router.get("/templates")
async def get_templates():
    """Get available pitch templates"""
    return {
        "templates": [
            {"id": "buildops", "name": "BuildOps Style", "slides": 18},
            {"id": "woolies", "name": "Woolies Style", "slides": 22},
            {"id": "certn", "name": "Certn Style", "slides": 15},
        ]
    }

@router.get("/history")
async def get_pitch_history():
    """Get list of generated pitches"""
    return {
        "pitches": [
            {"id": "1", "client": "BuildOps", "slides": 18, "date": "2024-01-14", "status": "ready"},
            {"id": "2", "client": "Woolies", "slides": 22, "date": "2024-01-11", "status": "draft"},
        ]
    }

@router.get("/download/{pitch_id}")
async def download_pitch(pitch_id: str):
    """Download a generated pitch deck"""
    raise HTTPException(status_code=404, detail="Pitch not found")
