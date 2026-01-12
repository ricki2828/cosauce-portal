# CoSauce Portal Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **DISQUALIFIED BPO Fit Level** (2026-01-08)
  - Added fourth fit level to identify competitor/adjacent service companies
  - Industry-based disqualification: BPO, recruitment, staffing, HR services, consulting
  - Red badge UI for visual distinction from LOW fit companies
  - Automatic sorting: DISQUALIFIED companies rank at bottom of pipeline
  - See `docs/BPO_FIT_ANALYSIS.md` for technical details

## [1.0.0] - 2026-01-03

### Added
- Initial release of CoSauce Portal
- Contract Generator module with MSA, SOW, and Short Form templates
- AI-assisted contract scope drafting using OpenAI
- Sales Outbound module (UI ready, backend in progress)
- Deployed frontend to Vercel
- Backend API on port 8004 with Cloudflare Tunnel

### Architecture
- Frontend: Vite + React + TypeScript on Vercel
- Backend: FastAPI + Python on seedbox port 8004
- Database: SQLite with aiosqlite for async operations
- AI: OpenAI GPT-4o-mini for contract drafting and BPO analysis
