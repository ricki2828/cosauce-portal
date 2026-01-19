# CoSauce Portal - Master Documentation

**Last Updated**: 2026-01-15
**Version**: 2.0 (Rebuilt on Hetzner)

---

## ⚠️ IMPORTANT: Claude Workflow Guidelines

**Claude should execute commands directly - NOT ask user to run them**

### DO ✅
- Run scripts and commands automatically
- Deploy changes without asking
- Restart services after changes
- Run tests and validations
- Execute migrations and cleanups

### DON'T ❌
- Give user commands to run manually
- Ask "Would you like me to run this?"
- Provide instructions instead of executing
- Say "Please run this script"

### Examples

**✅ CORRECT**:
```
"Let me deploy the frontend for you now..."
[Runs: vercel --prod]
"✓ Deployed successfully to production"
```

**❌ INCORRECT**:
```
"To deploy, run this command:
  vercel --prod"
```

**Exception**: Only ask if the action is potentially destructive (deleting production data, irreversible changes). For routine tasks (deploy, restart, test), just do it.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Development Setup](#development-setup)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Testing & Validation](#testing--validation)
7. [Deployment](#deployment)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  React + TypeScript + Vite (deployed on Vercel)            │
│  URL: https://cosauce-portal.vercel.app                    │
└─────────────┬───────────────────────────────────────────────┘
              │ HTTPS API calls
              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Nginx                               │
│  Reverse proxy on Hetzner (cosauce.taiaroa.xyz)           │
│  Handles SSL, CORS proxying                                │
└─────────────┬───────────────────────────────────────────────┘
              │ HTTP (localhost:8004)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
│  FastAPI + Python 3.12 (systemd user service)             │
│  Port: 8004                                                 │
│  User: ricki28                                             │
└─────────────┬───────────────────────────────────────────────┘
              │ aiosqlite
              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Database                            │
│  SQLite: /home/ricki28/cosauce-portal/backend/data/portal.db│
└─────────────────────────────────────────────────────────────┘
```

### Key Features

**Dashboard Modules**:
- 📊 Priorities & Key Initiatives
- 👥 People & Hiring (Requisitions, Onboarding, Team Members)
- 📈 Daily Business Updates (Metrics, Submissions, Dashboard)
- 💰 Pipeline & Deals
- 📄 Contracts Management
- 🎯 Sales & Pitch Tools
- 📮 Outreach Campaigns
- 👨‍💼 Team Leaders Management
- 🧹 Admin Cleanup Tools

---

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Deployment**: Vercel
- **URL**: https://cosauce-portal.vercel.app

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Database**: SQLite (aiosqlite async driver)
- **Auth**: JWT (access + refresh tokens, bcrypt password hashing)
- **Validation**: Pydantic v2
- **Server**: Uvicorn
- **Service**: systemd user service (no sudo required)

### Infrastructure
- **Server**: Hetzner VPS (ricki-hetzner-server)
- **Web Server**: Nginx (reverse proxy, SSL termination)
- **Domain**: cosauce.taiaroa.xyz
- **SSL**: Let's Encrypt (managed by Nginx)

---

## Development Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- SSH access to Hetzner server

### Backend Setup

```bash
# Clone/navigate to project
cd ~/cosauce-portal/backend

# Activate virtual environment
source venv/bin/activate

# Install dependencies (if needed)
pip install -r requirements.txt

# Run database migrations (if new tables needed)
python app/database/migrate_<feature>.py

# Test import
python -c "from app.main import app; print('✓ OK')"

# Restart service
systemctl --user restart cosauce-portal

# Check logs
journalctl --user -u cosauce-portal -f
```

### Frontend Setup (Local Development)

```bash
cd ~/cosauce-portal/frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Service Management (NO SUDO REQUIRED)

```bash
# Status
systemctl --user status cosauce-portal

# Restart
systemctl --user restart cosauce-portal

# Stop
systemctl --user stop cosauce-portal

# Start
systemctl --user start cosauce-portal

# View logs
journalctl --user -u cosauce-portal -n 50
journalctl --user -u cosauce-portal -f  # follow
```

---

## API Endpoints

### Base URLs
- **Production**: https://cosauce.taiaroa.xyz
- **Local**: http://localhost:8004
- **Docs**: https://cosauce.taiaroa.xyz/docs (Interactive Swagger UI)

### Authentication

**Login**
```
POST /api/auth/login
Body: { "email": "user@example.com", "password": "password" }
Response: { "access_token": "...", "refresh_token": "...", "user": {...} }
```

**Refresh Token**
```
POST /api/auth/refresh
Body: { "refresh_token": "..." }
Response: { "access_token": "...", "refresh_token": "..." }
```

**Change Password**
```
PUT /api/auth/change-password
Headers: Authorization: Bearer <token>
Body: { "current_password": "...", "new_password": "..." }
```

### Priorities

```
GET    /api/priorities           - List all priorities
POST   /api/priorities           - Create priority (director+)
GET    /api/priorities/{id}      - Get single priority
PUT    /api/priorities/{id}      - Update priority (director+)
DELETE /api/priorities/{id}      - Delete priority (director+)
POST   /api/priorities/{id}/updates - Add update to priority
```

### People & Hiring

**Requisitions**
```
GET    /api/people/requisitions        - List requisitions (sorted by posted_date DESC)
POST   /api/people/requisitions        - Create requisition (director+)
GET    /api/people/requisitions/{id}   - Get requisition with roles
PUT    /api/people/requisitions/{id}   - Update requisition (director+)
DELETE /api/people/requisitions/{id}   - Delete requisition (director+)
POST   /api/people/requisitions/{id}/fill - Mark as filled
GET    /api/people/requisitions/stats  - Get statistics
```

**Requisition Roles**
```
POST   /api/people/requisitions/{req_id}/roles         - Add role
PUT    /api/people/requisitions/{req_id}/roles/{id}    - Update role
DELETE /api/people/requisitions/{req_id}/roles/{id}    - Delete role
POST   /api/people/requisitions/{req_id}/roles/{id}/fill - Increment filled count
```

**Team Members & Onboarding**
```
GET    /api/people/team-members        - List team members
POST   /api/people/team-members        - Create team member
GET    /api/people/new-hires           - Get new hires (last 30 days)
GET    /api/people/team-members/{id}   - Get member details
PUT    /api/people/team-members/{id}   - Update member
DELETE /api/people/team-members/{id}   - Delete member
```

### Business Updates (Local Implementation)

**Accounts**
```
GET    /api/business-updates/accounts               - List accounts (paginated)
POST   /api/business-updates/accounts               - Create account (admin)
GET    /api/business-updates/accounts/{id}          - Get account details
PUT    /api/business-updates/accounts/{id}          - Update account (admin)
DELETE /api/business-updates/accounts/{id}          - Delete account (admin)
POST   /api/business-updates/accounts/{id}/team-leaders - Link team leader
GET    /api/business-updates/accounts/{id}/team-leaders - List team leaders
DELETE /api/business-updates/accounts/{id}/team-leaders/{tl_id} - Unlink
```

**Agents**
```
GET    /api/business-updates/agents        - List agents (paginated, filterable)
POST   /api/business-updates/agents        - Create agent (admin)
GET    /api/business-updates/agents/{id}   - Get agent details
PUT    /api/business-updates/agents/{id}   - Update agent (admin)
DELETE /api/business-updates/agents/{id}   - Delete agent (admin)
```

**Metrics**
```
GET    /api/business-updates/metrics       - List metric definitions (paginated)
POST   /api/business-updates/metrics       - Create metric (admin)
GET    /api/business-updates/metrics/{id}  - Get metric definition
PUT    /api/business-updates/metrics/{id}  - Update metric (admin)
DELETE /api/business-updates/metrics/{id}  - Delete metric (admin)
```

**Submissions**
```
GET    /api/business-updates/submissions/me/team-leader-profile - Get TL profile
POST   /api/business-updates/submissions/submit-update          - Submit metrics
GET    /api/business-updates/submissions                        - List submissions
GET    /api/business-updates/submissions/{id}                   - Get submission
PUT    /api/business-updates/submissions/{id}                   - Update submission
DELETE /api/business-updates/submissions/{id}                   - Delete (admin)
```

**Dashboard & Analytics**
```
GET    /api/business-updates/dashboard                 - Main dashboard (target_date param)
GET    /api/business-updates/dashboard/agent-report/{id} - Agent metrics report
GET    /api/business-updates/dashboard/trends/{id}      - Metric trends
GET    /api/business-updates/dashboard/stats            - Submission statistics
```

### Shift Tracking

```
POST   /api/shift/submit              - Submit SOS/EOS update
GET    /api/shift/updates             - List shift updates (filterable)
GET    /api/shift/compliance          - Compliance statistics
GET    /api/shift/settings            - List shift settings
POST   /api/shift/settings            - Create setting (admin)
PUT    /api/shift/settings/{name}     - Update setting (admin)
DELETE /api/shift/settings/{name}     - Delete setting (admin)
```

### Team Leaders

```
GET    /api/team-leaders           - List team leaders
POST   /api/team-leaders           - Create team leader (admin)
GET    /api/team-leaders/{id}      - Get team leader
PUT    /api/team-leaders/{id}      - Update team leader (admin)
DELETE /api/team-leaders/{id}      - Delete team leader (admin)
```

### Admin Cleanup

```
GET    /api/admin/cleanup/stats                        - Get cleanup statistics
GET    /api/admin/cleanup/team-leaders/duplicates      - Find duplicate emails
GET    /api/admin/cleanup/team-leaders/inactive        - List inactive TLs
GET    /api/admin/cleanup/team-leaders/all             - List all TLs
DELETE /api/admin/cleanup/team-leaders/{id}            - Delete TL (admin, confirm required)
POST   /api/admin/cleanup/team-leaders/bulk-delete     - Bulk delete (admin)
GET    /api/admin/cleanup/team-leaders/by-email/{email} - Find by email
```

### Pagination Format

All list endpoints return:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "pages": 5
}
```

---

## Database Schema

**Location**: `/home/ricki28/cosauce-portal/backend/data/portal.db`

### Core Tables

#### users
- Authentication and user management
- Roles: admin, director, viewer
- Password hashing with bcrypt

#### sessions
- JWT session management
- Token hash storage (SHA256)
- Expiration tracking

#### priorities
- Key initiatives and priorities
- Updates timeline
- Owner assignment

#### team_leaders
- Team leader profiles
- Shift information
- Teams/WhatsApp integration data

### People Module

#### requisitions
- Job requisitions
- Status tracking (open, interviewing, filled, etc.)
- Priority levels
- Posted date for sorting

#### requisition_roles
- Role lines per requisition
- Requested vs filled counts
- Remaining count calculation

#### team_members
- Employee records
- Status: pending, onboarding, active, offboarded
- Manager relationships

#### onboarding_templates & onboarding_checklist_items
- Onboarding workflows
- Progress tracking

### Business Updates (bu_* tables)

#### bu_accounts
- Client organizations
- Timezone settings

#### bu_account_team_leaders
- M:N relationship
- Links accounts to team leaders

#### bu_agents
- Individual workers
- Team leader assignment

#### bu_metric_definitions
- Configurable KPIs per account
- Types: number, percentage, boolean, text
- Sort order for display

#### bu_daily_submissions
- Daily metrics submissions
- Team-level or agent-level
- Date-based uniqueness constraint

#### bu_submission_metrics
- Metric values per submission
- Links to metric definitions

#### bu_shift_updates
- SOS/EOS tracking
- Date-based uniqueness per TL

#### bu_eod_reports
- End-of-day summaries
- Aggregated statistics

#### bu_shift_settings
- Global shift configuration

### Pipeline

#### pipeline_stages
- Configurable deal stages
- Color coding

#### pipeline_deals
- Sales opportunities
- Probability tracking
- Resource requirements (JSON)

---

## Testing & Validation

### Development Workflow

**See**: `/home/ricki28/cosauce-portal/DEVELOPMENT-WORKFLOW.md`

**4-Phase Process**:
1. **PLAN** - Understand requirements, check frontend expectations
2. **IMPLEMENT** - Write code with error handling
3. **TEST** - Validate locally before declaring "done"
4. **VALIDATE** - Production testing and documentation

### Testing Scripts

**Backend Health Check**:
```bash
cd ~/cosauce-portal/backend
./backend-health-check.sh
```

**Endpoint Testing**:
```bash
cd ~/cosauce-portal/backend
./test-endpoint.sh /api/shift/updates <optional-token>
```

**Frontend Validation**:
```bash
cd ~/cosauce-portal/frontend
./validate-browser.sh https://cosauce-portal.vercel.app
```

### Common Test Cases

**Authentication**:
```bash
# Should return 401
curl http://localhost:8004/api/priorities

# Should return data
curl -H "Authorization: Bearer <token>" \
     http://localhost:8004/api/priorities
```

**Pagination**:
```bash
# Should return { items: [...], total, page, page_size, pages }
curl -H "Authorization: Bearer <token>" \
     http://localhost:8004/api/business-updates/accounts
```

**Error Handling**:
```bash
# Should return 404 (not crash)
curl -H "Authorization: Bearer <token>" \
     http://localhost:8004/api/team-leaders/invalid-id
```

---

## Deployment

### Deployment Philosophy

**Claude handles all deployments automatically** unless the action is potentially destructive.

When code changes are made:
1. Claude tests the changes
2. Claude builds if needed
3. Claude deploys automatically
4. Claude verifies deployment
5. Claude reports results to user

User should not need to run commands manually.

### Backend Deployment

**Claude runs these automatically after backend changes**:

```bash
# 1. Test imports
cd ~/cosauce-portal/backend
source venv/bin/activate
python -c "from app.main import app; print('✓ OK')"

# 2. Restart service (NO SUDO)
systemctl --user restart cosauce-portal

# 3. Verify
systemctl --user status cosauce-portal --no-pager | head -10
```

### Frontend Deployment

**Claude runs these automatically after frontend changes**:

```bash
# 1. Build
cd ~/cosauce-portal/frontend
npm run build

# 2. Deploy to Vercel
vercel --prod

# 3. Report URL to user
# Production: https://cosauce-portal.vercel.app
```

### Database Migrations

```bash
# 1. Create migration script
# app/database/migrate_<feature>.py

# 2. Run migration
cd ~/cosauce-portal/backend
source venv/bin/activate
python app/database/migrate_<feature>.py

# 3. Seed data (if needed)
python app/database/seed_<feature>.py

# 4. Restart backend
systemctl --user restart cosauce-portal
```

---

## Common Tasks

**Note**: Claude should execute these tasks automatically when needed, not provide instructions.

### Add a New API Endpoint

**Claude automatically**:
1. Checks frontend requirements
2. Creates endpoint in `app/api/<module>.py`
3. Registers in `app/main.py` if new router
4. Tests with `test-endpoint.sh`
5. Restarts backend service
6. Verifies endpoint works
7. Updates this documentation

### Add a New Database Table

1. Create schema in `app/database/schema_<feature>.sql`
2. Create migration in `app/database/migrate_<feature>.py`
3. Create Pydantic models in `app/models/<feature>.py`
4. Run migration
5. Restart backend

### Debug 404 Errors

```bash
# 1. Check what frontend expects
cd ~/cosauce-portal/frontend/src
grep -r "api.*<feature>" .

# 2. Check backend routes
grep -r "@router" ~/cosauce-portal/backend/app/api/

# 3. Check main.py router registration
grep "include_router" ~/cosauce-portal/backend/app/main.py

# 4. Test endpoint directly
curl http://localhost:8004/api/<endpoint>
```

### Debug Backend Crashes

```bash
# Check recent logs
journalctl --user -u cosauce-portal -n 50

# Check import errors
cd ~/cosauce-portal/backend
source venv/bin/activate
python -c "from app.main import app"

# Check service status
systemctl --user status cosauce-portal
```

---

## Troubleshooting

### Backend Won't Start

```bash
# 1. Check import errors
cd ~/cosauce-portal/backend
source venv/bin/activate
python -c "from app.main import app"

# 2. Check logs
journalctl --user -u cosauce-portal -n 50

# 3. Check if port is in use
ss -tlnp | grep 8004

# 4. Restart manually
systemctl --user restart cosauce-portal
```

### 502 Bad Gateway

- Backend is not running or crashed
- Check: `systemctl --user status cosauce-portal`
- Check logs: `journalctl --user -u cosauce-portal -f`

### 404 Not Found

- Endpoint path mismatch
- Router not registered in `main.py`
- Check: `grep "include_router" app/main.py`

### 401 Unauthorized

- Missing or invalid JWT token
- Token expired (refresh it)
- Check: User role has permission

### Frontend Crashes

- Check browser console for errors
- Common: Undefined property access (add `?.` optional chaining)
- Common: API response format mismatch (check pagination)

### Database Locked

- Another process has the database open
- Check: `lsof ~/cosauce-portal/backend/data/portal.db`
- Solution: Close other connections or restart backend

---

## File Structure

```
cosauce-portal/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── priorities.py
│   │   │   ├── people.py
│   │   │   ├── business_updates.py
│   │   │   ├── bu_accounts.py
│   │   │   ├── bu_agents.py
│   │   │   ├── bu_metrics.py
│   │   │   ├── bu_submissions.py
│   │   │   ├── bu_dashboard.py
│   │   │   ├── shifts.py
│   │   │   ├── team_leaders.py
│   │   │   ├── admin_cleanup.py
│   │   │   └── ...
│   │   ├── models/           # Pydantic models
│   │   │   └── business_updates.py
│   │   ├── database/         # Schema & migrations
│   │   │   ├── schema.sql
│   │   │   ├── schema_business_updates.sql
│   │   │   ├── migrate_*.py
│   │   │   └── seed_*.py
│   │   ├── middleware/       # Auth middleware
│   │   ├── services/         # Business logic
│   │   ├── config.py
│   │   └── main.py          # FastAPI app
│   ├── data/
│   │   └── portal.db        # SQLite database
│   ├── venv/                # Python virtual environment
│   ├── test-endpoint.sh     # Testing script
│   ├── backend-health-check.sh
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   │   ├── api.ts       # API client
│   │   │   └── business-updates-types.ts
│   │   └── App.tsx
│   ├── validate-browser.sh  # Validation script
│   ├── package.json
│   └── vite.config.ts
├── ClaudeMD.md             # This file
├── DEVELOPMENT-WORKFLOW.md # Development process
└── README.md
```

---

## Key Contacts & Resources

- **Server**: ricki28@ricki-hetzner-server
- **Domain**: cosauce.taiaroa.xyz
- **Frontend URL**: https://cosauce-portal.vercel.app
- **API Docs**: https://cosauce.taiaroa.xyz/docs
- **Database**: SQLite at `/home/ricki28/cosauce-portal/backend/data/portal.db`

---

## Recent Changes

### 2026-01-15
- Rebuilt Business Updates system locally (was Azure proxy)
- Added shift tracking endpoints
- Fixed pagination format for list endpoints
- Migrated to user-level systemd service (no sudo needed)
- Created comprehensive testing workflow
- Fixed requisitions sorting by posted_date

### Previous Work
- Migrated from old server (palawan.usbx.me) to Hetzner
- Set up nginx reverse proxy
- Implemented JWT authentication
- Created all core modules (priorities, people, pipeline, etc.)

---

## Todo / Future Improvements

- [ ] Add automated backup script for portal.db
- [ ] Set up log rotation for systemd service
- [ ] Add API rate limiting
- [ ] Add database indexes for performance
- [ ] Create automated testing suite
- [ ] Add monitoring/alerting for backend downtime
- [ ] Document nginx configuration
- [ ] Add SSL certificate auto-renewal documentation

---

**End of ClaudeMD.md**
