# CoSauce Portal

Unified business tools portal for CoSauce directors.

## Features

- **Contract Generator** ✅ - Generate MSA, SOW, and Short Form contracts with AI-assisted scope drafting
- **Sales Outbound** ✅ - Research companies, manage sales pipeline with BPO fit analysis
  - Job signal scanning (LinkedIn, Indeed)
  - Apollo.io enrichment for company data
  - AI-powered BPO fit scoring (HIGH/MEDIUM/LOW/DISQUALIFIED)
  - Contact discovery and management
  - See `docs/BPO_FIT_ANALYSIS.md` for details
- **Outreach Campaigns** 🚧 - Automated LinkedIn and email campaigns (UI ready, backend pending)
- **Key Priorities** ✅ - Track and manage executive priorities with status updates
  - Create/update/defer priorities
  - Add progress updates with authorship tracking
  - Filter by status (active/completed/deferred)
  - Role-based access (director/admin can modify)

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

### Default Login Credentials

**Email**: `admin@cosauce.co`
**Password**: `ChangeMe123!`

Alternative accounts:
- `ricki@cosauce.co` (same password)
- `test@cosauce.co` (same password)

**Note**: Log out and log back in after backend restarts to refresh authentication tokens.

## Environment Variables

### Backend (.env)
- `ANTHROPIC_API_KEY` - Required for AI features
- `CORS_ORIGINS` - Comma-separated list of allowed origins
- `PORT` - Server port (default: 8004)

### Frontend
- `VITE_API_URL` - Backend API URL

## Deployment

- **Frontend**: https://cosauce-portal.vercel.app
- **Backend**: https://cosauce.taiaroa.xyz (permanent Cloudflare Tunnel to port 8004)

## API Endpoints

### Contracts
- `GET /api/contracts/templates` - List available templates
- `POST /api/contracts/draft` - AI-assisted scope drafting
- `POST /api/contracts/generate/msa` - Generate MSA
- `POST /api/contracts/generate/sow` - Generate SOW
- `POST /api/contracts/generate/shortform` - Generate Short Form

### Sales
- `GET /api/sales/companies` - List companies in pipeline
- `POST /api/sales/scan` - Scan job boards for companies hiring CX roles
- `POST /api/sales/companies/{id}/enrich` - Enrich company data via Apollo.io
- `POST /api/sales/companies/{id}/analyze-bpo` - Analyze BPO outsourcing fit
- `POST /api/sales/bulk/analyze-bpo-stream` - Bulk analyze with progress streaming
- `GET /api/sales/contacts` - List contacts
- `POST /api/sales/companies/{id}/find-contacts` - Discover contacts via Apollo.io
- `GET /api/sales/stats` - Pipeline statistics

### Priorities
- `GET /api/priorities` - List all priorities (optional status filter)
- `GET /api/priorities/{id}` - Get single priority with updates
- `POST /api/priorities` - Create new priority
- `PUT /api/priorities/{id}` - Update priority (title, description, status, due_date)
- `DELETE /api/priorities/{id}` - Delete priority
- `POST /api/priorities/{id}/updates` - Add progress update to priority

### Health
- `GET /health` - Backend health check

## Documentation

- **BPO Fit Analysis**: `docs/BPO_FIT_ANALYSIS.md` - Technical docs for AI-powered fit scoring
- **Changelog**: `docs/CHANGELOG.md` - Version history and feature updates
- **Troubleshooting**: `docs/TROUBLESHOOTING-2026-01-09.md` - Common issues and solutions

## Common Issues

### 401 Unauthorized Errors
**Cause**: Backend restart invalidates JWT tokens
**Solution**: Log out and log back in

### JavaScript Errors (toFixed, length)
**Cause**: Response structure mismatch between backend and frontend
**Solution**: See `docs/TROUBLESHOOTING-2026-01-09.md` for the axios double-wrapping fix

### Backend Not Responding
**Check logs**: `tail -f /tmp/cosauce-backend.log`
**Restart backend**:
```bash
pkill -f "python run.py"
cd backend && source venv/bin/activate
nohup python run.py > /tmp/cosauce-backend.log 2>&1 &
```
