"""
CoSauce Platform - Configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)

# Azure AD Configuration
AZURE_TENANT_ID = os.getenv('AZURE_TENANT_ID', '839a9215-f43f-4bcc-8e4e-c4c271b51e31')
AZURE_CLIENT_ID = os.getenv('AZURE_CLIENT_ID', '')

# OpenAI API
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

# Allowed directors (email whitelist)
ALLOWED_DIRECTORS = [
    'ricki@cosauce.co',
    # Add other director emails
]

# Server config
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8004))

# CORS origins - add Vercel deployment URLs via CORS_ORIGINS env var (comma-separated)
_extra_origins = os.getenv('CORS_ORIGINS', '').split(',')
CORS_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173',  # Vite dev server
    'http://169.150.243.5:3002',
    *[o.strip() for o in _extra_origins if o.strip()],
]

# Contract templates path
CONTRACT_TEMPLATES_DIR = Path('/home13/ricki28/ai-workspace/projects/active/contract-generator/data/templates')

# Pitch content library path
PITCH_LIBRARY_DIR = Path('/home13/ricki28/pitch-automation/content-library')

# Outputs directory
OUTPUTS_DIR = Path('/home13/ricki28/ai-workspace/outputs')

# Outreach Configuration
OUTREACH_AUTOMATION_ENABLED = os.getenv('OUTREACH_AUTOMATION_ENABLED', 'true').lower() == 'true'
OUTREACH_MAX_DAILY_LINKEDIN = int(os.getenv('OUTREACH_MAX_DAILY_LINKEDIN', 20))
OUTREACH_MAX_DAILY_EMAIL = int(os.getenv('OUTREACH_MAX_DAILY_EMAIL', 50))
OUTREACH_MIN_DELAY_SECONDS = int(os.getenv('OUTREACH_MIN_DELAY_SECONDS', 30))
OUTREACH_MAX_DELAY_SECONDS = int(os.getenv('OUTREACH_MAX_DELAY_SECONDS', 120))
