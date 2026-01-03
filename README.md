# CoSauce Portal

Unified business tools portal for CoSauce directors.

## Features

- **Contract Generator** - Generate MSA, SOW, and Short Form contracts with AI-assisted scope drafting
- **Sales Outbound** - Research companies and manage sales pipeline (coming soon)
- **Outreach Campaigns** - Automated LinkedIn and email campaigns (coming soon)

## Architecture

```
├── frontend/          # Vite + React + TypeScript
│   └── Deployed to Vercel
└── backend/           # FastAPI Python API
    └── Runs on port 8004
```

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your API keys
python run.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
- `ANTHROPIC_API_KEY` - Required for AI features
- `CORS_ORIGINS` - Comma-separated list of allowed origins
- `PORT` - Server port (default: 8004)

### Frontend
- `VITE_API_URL` - Backend API URL

## Deployment

- **Frontend**: Vercel (auto-deploys from main branch)
- **Backend**: Runs on seedbox at `http://169.150.243.5:8004`

## API Endpoints

### Contracts
- `GET /api/contracts/templates` - List available templates
- `POST /api/contracts/draft` - AI-assisted scope drafting
- `POST /api/contracts/generate/msa` - Generate MSA
- `POST /api/contracts/generate/sow` - Generate SOW
- `POST /api/contracts/generate/shortform` - Generate Short Form

### Health
- `GET /health` - Backend health check
