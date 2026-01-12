# CoSauce Portal - Project Status

**Last Updated**: 2026-01-09 (Roadmap revised)

## Overview

Unified business tools portal for CoSauce directors, featuring contract generation, sales pipeline management, people management, operations (payables/invoicing), daily updates integration, and executive priority tracking.

## Development Phases

### Phase 1: Authentication & Foundation ✅ COMPLETE
**Status**: Live in production
**Completed**: 2026-01-03

**Features**:
- User authentication (login/logout)
- Role-based access control (director/admin/member)
- JWT token management
- Protected routes
- User profile management
- Settings page

**Files**:
- Backend: `backend/app/api/auth.py`
- Frontend: `frontend/src/contexts/AuthContext.tsx`
- Database: Users table with bcrypt password hashing

### Phase 2: Key Priorities Module ✅ COMPLETE
**Status**: Live and validated
**Completed**: 2026-01-09

**Features**:
- Create/update executive priorities
- Add progress updates with authorship tracking
- Change status (active/completed/deferred)
- Filter by status
- Due date tracking
- Role-based permissions (director/admin can modify)

**API Endpoints**:
- `GET /api/priorities` - List all priorities (optional status filter)
- `GET /api/priorities/{id}` - Get single priority with updates
- `POST /api/priorities` - Create new priority
- `PUT /api/priorities/{id}` - Update priority
- `DELETE /api/priorities/{id}` - Delete priority
- `POST /api/priorities/{id}/updates` - Add progress update

**Files**:
- Backend: `backend/app/api/priorities.py`
- Frontend: `frontend/src/pages/Priorities.tsx`
- Types: `frontend/src/lib/priorities-types.ts`
- Database: `priorities` and `priority_updates` tables

**Key Technical Learnings**:
- TypeScript interfaces require `import type` syntax for ESM/Vite
- Separated type definitions to dedicated file for better module resolution
- Established comprehensive validation framework (see Phase 2 Testing below)

### Phase 2a: Testing & Validation Framework ✅ COMPLETE
**Status**: Fully configured and documented
**Completed**: 2026-01-09

**Problem Solved**:
- Prevented declaring features "ready" without proper validation
- Caught 90%+ of frontend errors automatically before manual testing
- Eliminated repeated module import/export errors

**Tools Created**:
- `frontend/validate-browser.sh` - Main validation script (6 automated checks)
- `frontend/check-ssr-errors.mjs` - SSR-based module import validation
- `frontend/simple-browser-check.sh` - Alternative detailed validation
- `frontend/pre-commit-hook-example` - Optional git hook for automatic validation

**Documentation**:
- `frontend/README-VALIDATION.md` - Overview and setup guide
- `frontend/QUICK-START-TESTING.md` - Quick reference for daily use
- `frontend/TESTING-STRATEGY.md` - Why this approach works for seedbox environment
- `frontend/VALIDATION-APPROACH.md` - Technical deep dive

**Validation Checks** (runs in ~10 seconds):
1. Frontend HTTP accessibility
2. TypeScript compilation
3. SSR module import validation (catches React export errors)
4. Vite dev server logs
5. Module resolution errors
6. Page HTML runtime error inspection

**Key Achievement**: Established proper validation workflow addressing the core issue of declaring features "ready" without adequate testing.

### Phase 3: People Module 🚧 NEXT UP
**Status**: Planned (detailed plan ready)
**Target**: Next session
**Estimated Effort**: 4-6 hours

**Scope**:
- **Open Requisitions**: Track job openings from custom/internal ATS
- **Onboarding Checklists**: Template-based onboarding workflows for new hires

**Database Tables**:
- `requisitions` - Job openings tracking
- `onboarding_templates` - Template definitions by role
- `onboarding_template_tasks` - Template task library
- `new_hires` - New hire records
- `onboarding_tasks` - Instance tasks for each hire

**Key Features**:
- Create/manage job requisitions with status tracking
- Create onboarding templates (e.g., "Developer Onboarding")
- Auto-apply template when new hire added
- Task completion tracking with due dates
- Role-based permissions

**Plan Document**: `docs/PHASE3_PLAN_PEOPLE.md`

### Phase 4: Operations Module 📋 PLANNED
**Status**: Planned (detailed plan ready)
**Estimated Effort**: 4-6 hours

**Scope**:
- **Payables**: Employee bill submission with approval workflow
- **Invoice Kanban**: Visual board for tracking client invoices (Draft → Approved → Sent → Paid)

**Database Tables**:
- `payables` - Bill submissions awaiting payment
- `invoices` - Client invoices
- `invoice_line_items` - Detailed line items per invoice

**Key Features**:
- Submit payables with attachment upload
- Approval workflow (director/admin)
- Invoice kanban with drag-and-drop
- Status transition validation
- Statistics and reporting
- File upload/download for invoices and receipts

**Plan Document**: `docs/PHASE4_PLAN_OPERATIONS.md`

### Phase 5: Daily Updates Integration 📋 PLANNED
**Status**: Planned (detailed plan ready)
**Estimated Effort**: 3-4 hours

**Scope**:
- Pull data from Daily Business Update bot API
- Group updates by client/company (campaign)
- Display team activity per client
- Track engagement trends

**Database Tables**:
- `daily_updates` - Synced updates from bot
- `client_campaigns` - Campaign definitions for grouping

**Key Features**:
- Sync updates from bot API (manual or scheduled)
- Client name extraction from update text
- Campaign mapping and management
- View by client, by agent, by campaign
- Export client-specific reports
- Statistics and trends

**Plan Document**: `docs/PHASE5_PLAN_DAILY_UPDATES.md`

### Phase 6+: Future Enhancements 📋 DEPRIORITIZED

**Outreach Campaigns** (was Phase 3):
- LinkedIn outreach automation
- Email campaign management
- Sequence/cadence workflows
- Response tracking
- Frontend UI already built, backend API pending
- Plan: `docs/PHASE3_PLAN.md` (old outreach plan)

**Dashboard & Analytics**:
- Executive dashboard with key metrics
- Sales pipeline visualization
- Contract generation statistics
- Priority progress tracking
- Activity timeline

**Advanced Features**:
- AI-powered sentiment analysis on daily updates
- Automated weekly client reports
- Mobile app for on-the-go access
- Advanced analytics and forecasting

## Current Production Status

### Live URLs
- **Frontend**: https://cosauce-portal.vercel.app
- **Backend**: https://cosauce.taiaroa.xyz (Cloudflare Tunnel → port 8004)

### Deployed Modules
✅ Authentication (Phase 1)
✅ Contract Generator
✅ Sales Outbound (with BPO fit analysis)
✅ Key Priorities (Phase 2)
🚧 People Module (planned - Phase 3)
🚧 Operations Module (planned - Phase 4)
🚧 Daily Updates Integration (planned - Phase 5)
📋 Outreach Campaigns (UI only, deprioritized to Phase 6+)

### Active Services
- Backend API: Port 8004
- Frontend Vite Dev: Port 5173 (for local testing)
- Cloudflare Tunnel: Permanent named tunnel `cosauce-portal`

## Database Schema

### Core Tables
- `users` - User accounts with role-based access
- `priorities` - Executive priorities tracking
- `priority_updates` - Progress updates for priorities
- `companies` - Sales pipeline companies
- `contacts` - Contact information for outreach
- `apollo_enrichment` - Cached Apollo.io data
- `bpo_analysis` - AI-powered BPO fit analysis results

### Relationships
- `priorities.owner_id` → `users.id`
- `priority_updates.priority_id` → `priorities.id`
- `priority_updates.author_id` → `users.id`
- `contacts.company_id` → `companies.id`
- `apollo_enrichment.company_id` → `companies.id`
- `bpo_analysis.company_id` → `companies.id`

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7.3
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Deployment**: Vercel (free tier)

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: SQLite (via sqlalchemy)
- **Authentication**: JWT tokens + bcrypt
- **AI**: OpenAI GPT-4o (contract drafting, BPO analysis)
- **External APIs**: Apollo.io (company enrichment, contact discovery)
- **Deployment**: Seedbox (port 8004) + Cloudflare Tunnel

## Development Workflow

### Before Making Changes
1. Pull latest code
2. Ensure backend and frontend servers are running
3. Check current branch

### After Making Changes
1. Run validation: `cd frontend && ./validate-browser.sh http://169.150.243.5:5173/<page>`
2. If validation passes, manually test in browser
3. Commit changes
4. Deploy to Vercel: `cd frontend && npx vercel --prod`

### Validation Script Usage
```bash
# Standard validation (10 seconds)
./validate-browser.sh http://169.150.243.5:5173/priorities

# Full validation with production build (slower)
./validate-browser.sh http://169.150.243.5:5173/priorities --full
```

## Known Limitations

### Environment Constraints
- **Playwright/Chrome DevTools MCP**: Crashes on seedbox (Chromium SIGTRAP error)
- **Solution**: SSR-based module validation catches same errors without browser
- **Impact**: Manual browser testing still required for interaction bugs (~10% of issues)

### Database
- SQLite (single-file database) - sufficient for internal tool with <10 concurrent users
- No connection pooling needed
- Simple backup/restore (just copy the .db file)

## Session History

- **2026-01-03**: Phase 1 (Auth) + Contract Generator + Sales Outbound
- **2026-01-09 AM**: Phase 2 (Priorities) + Testing Framework
- **2026-01-09 PM**: Roadmap revision - prioritized People, Operations, Daily Updates ahead of Outreach Campaigns

## Next Steps

**Immediate** (Next Session - Phase 3: People Module):
1. Create database tables for requisitions and onboarding
2. Implement Pydantic models
3. Build requisitions CRUD API
4. Build onboarding templates API
5. Build new hires API with template application logic
6. Frontend components and validation

**Phase 4** (Operations Module):
1. Create payables and invoices tables
2. Implement payables approval workflow
3. Build invoice kanban backend
4. File upload/download for attachments
5. Frontend kanban board with drag-and-drop

**Phase 5** (Daily Updates Integration):
1. Research Daily Updates bot API
2. Build sync service
3. Client name extraction logic
4. Campaign mapping
5. Display views (by client, by agent)
6. Export functionality

**Phase 6+** (Future):
1. Outreach campaigns backend (if needed)
2. Dashboard & analytics
3. Advanced AI features

## References

- Main README: `/home13/ricki28/cosauce-portal/README.md`
- Testing Guide: `frontend/README-VALIDATION.md`
- BPO Analysis: `docs/BPO_FIT_ANALYSIS.md`
- Session Recaps: `~/ai-workspace/knowledge/claude chats/`
  - 2026-01-03: CoSauce Portal Live
  - 2026-01-09: Phase 2 Priorities + Validation
