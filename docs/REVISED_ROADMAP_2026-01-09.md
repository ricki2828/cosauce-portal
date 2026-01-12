# CoSauce Portal - Revised Roadmap

**Date**: 2026-01-09
**Decision**: Reprioritize operational modules ahead of outbound/LinkedIn automation

## What Changed

### Original Plan (Before Revision)
- ✅ Phase 1: Authentication & Foundation (COMPLETE)
- ✅ Phase 2: Key Priorities (COMPLETE)
- 🚧 Phase 3: Outreach Campaigns (LinkedIn/email automation)
- 📋 Phase 4: Dashboard & Analytics

### New Prioritized Plan
- ✅ Phase 1: Authentication & Foundation (COMPLETE)
- ✅ Phase 2: Key Priorities (COMPLETE)
- **🚧 Phase 3: People Module** (requisitions + onboarding) - **NEW PRIORITY**
- **📋 Phase 4: Operations Module** (payables + invoice kanban) - **NEW PRIORITY**
- **📋 Phase 5: Daily Updates Integration** (client metrics) - **NEW PRIORITY**
- 📋 Phase 6+: Outreach Campaigns - **DEPRIORITIZED**
- 📋 Phase 7+: Dashboard & Analytics - **DEPRIORITIZED**

## Why the Change

**Keep**: Sales pipeline (already built, critical for business)

**Prioritize**: Operational efficiency and internal tools
1. **People Module** - Track hiring and onboarding
2. **Operations Module** - Manage bills and client invoicing
3. **Daily Updates Integration** - Visibility into team activity by client

**Deprioritize**: Outbound automation (LinkedIn/email campaigns)
- Frontend UI already built (can revisit later)
- Backend integration complex and time-consuming
- Less urgent than operational needs

## New Phase 3: People Module

**Effort**: 4-6 hours (1 session)
**Plan**: `docs/PHASE3_PLAN_PEOPLE.md`

### Features
- **Open Requisitions**: Track job openings from custom ATS
- **Onboarding Checklists**: Template-based onboarding workflows

### Database Tables (5 new tables)
- `requisitions` - Job openings with status
- `onboarding_templates` - Template definitions by role
- `onboarding_template_tasks` - Task library
- `new_hires` - New hire records
- `onboarding_tasks` - Instance tasks per hire

### Key Workflows
1. Create job requisition → Track status → Mark as filled
2. Create onboarding template (e.g., "Developer Onboarding")
3. Add new hire → Auto-apply template → Track task completion

### Technical Details
- Template-based system (directors create templates by role)
- Auto-calculation of due dates (start_date + day_offset)
- Role-based permissions (directors/admins manage, managers view)
- Manual ATS entry for Phase 3 (can integrate API later)

## New Phase 4: Operations Module

**Effort**: 4-6 hours (1 session)
**Plan**: `docs/PHASE4_PLAN_OPERATIONS.md`

### Features
- **Payables Management**: Employee bill submission with approval workflow
- **Invoice Kanban**: Visual tracking for client invoices (6-7 clients)

### Database Tables (3 new tables)
- `payables` - Bills awaiting payment
- `invoices` - Client invoices
- `invoice_line_items` - Detailed line items

### Key Workflows
1. **Payables**: Submit → Pending → Approve/Reject → Paid
2. **Invoices**: Draft → Approved → Sent → Paid (drag-and-drop kanban)

### Technical Details
- File upload/download for invoice attachments (local storage Phase 4, cloud storage later)
- Approval workflow (directors/admins only)
- Invoice kanban with status transition validation
- Statistics endpoints (outstanding amounts, totals)

### Invoice Stages (User-Selected)
1. **Draft** - Invoice created but not finalized
2. **Approved** - Director approved for sending
3. **Sent** - Invoice sent to client (date recorded)
4. **Paid** - Payment received (date recorded)

## New Phase 5: Daily Updates Integration

**Effort**: 3-4 hours (1 session)
**Plan**: `docs/PHASE5_PLAN_DAILY_UPDATES.md`

### Features
Pull data from Daily Business Update bot and group by client/company

### Database Tables (2 new tables)
- `daily_updates` - Synced updates from bot
- `client_campaigns` - Campaign definitions for grouping

### Key Workflows
1. Sync updates from bot API (manual trigger or scheduled)
2. Extract client names from update text
3. Group updates by client/company ("campaign")
4. Display views (by client, by agent, by campaign)
5. Export client-specific reports

### Technical Details
- Daily Updates Bot API: https://daily-update-api.azurewebsites.net
- Client name extraction using pattern matching (can enhance with AI later)
- Categorization by keywords (Sales, Delivery, Support)
- Integration with Sales module (link to companies table)
- Export functionality (CSV/PDF per client)

### "Campaign" Definition
In this context, "campaign" = **client/company**. Group all daily updates by which client they mention, allowing directors to see team activity per client.

## Deprioritized: Outreach Campaigns

**Original Plan**: `docs/PHASE3_PLAN_OUTREACH_CAMPAIGNS_DEPRIORITIZED.md`

### What's Already Done
- ✅ Frontend UI complete (campaign creation, sequence builder)
- ✅ Forms and components built

### What's Pending (moved to Phase 6+)
- ❌ Backend API (campaigns, sequences, recipients)
- ❌ LinkedIn automation integration
- ❌ Email sending integration
- ❌ Campaign execution service

### Why Deprioritized
- Less critical than internal operations
- Complex integration with third-party services
- Can revisit once core operations are stable

## Implementation Timeline

### Immediate (Next Session)
**Phase 3: People Module** (4-6 hours)
- Database schema
- API endpoints
- Frontend components
- Testing and validation

### Following Sessions
**Phase 4: Operations Module** (4-6 hours)
- Payables and invoices backend
- File upload system
- Invoice kanban with drag-and-drop
- Testing and validation

**Phase 5: Daily Updates Integration** (3-4 hours)
- Daily Updates bot API research
- Sync service implementation
- Campaign mapping
- Display views and export

### Future (Phase 6+)
- Outreach campaigns backend (if still needed)
- Dashboard & analytics
- Advanced AI features (sentiment analysis, summaries)

## Success Metrics

### Phase 3 Complete When:
- ✅ Can create/track job requisitions
- ✅ Can create onboarding templates
- ✅ New hires auto-get onboarding checklists
- ✅ Tasks can be completed and tracked

### Phase 4 Complete When:
- ✅ Can submit payables with attachments
- ✅ Approval workflow functional
- ✅ Invoice kanban board works with drag-and-drop
- ✅ Can generate and track 6-7 client invoices

### Phase 5 Complete When:
- ✅ Can sync data from Daily Updates bot
- ✅ Updates grouped by client/company
- ✅ Can view activity per client
- ✅ Can export client reports

## Technical Stack (Unchanged)

**Frontend**: React 18 + TypeScript + Vite + Tailwind
**Backend**: FastAPI + SQLite + OpenAI (for AI features)
**Deployment**: Vercel (frontend) + Seedbox (backend) + Cloudflare Tunnel

**New Libraries for Phase 4**:
- Drag-and-drop: `@hello-pangea/dnd` or `react-beautiful-dnd` (for invoice kanban)

**New Libraries for Phase 5**:
- HTTP client: `httpx` (for Daily Updates bot API sync)

## Migration Notes

### Database Changes
All new tables will be created via SQL migrations:
- Phase 3: 5 new tables (requisitions, templates, new hires, tasks)
- Phase 4: 3 new tables (payables, invoices, line items)
- Phase 5: 2 new tables (daily updates, campaigns)

Total: **10 new tables** across 3 phases

### No Breaking Changes
All new modules are additive:
- Existing Auth, Contract Generator, Sales, Priorities modules unaffected
- Database schema purely additive (no migrations of existing tables)
- Frontend routes additive (`/people`, `/operations`, `/daily-updates`)

## References

- **Phase 3 Plan**: `docs/PHASE3_PLAN_PEOPLE.md`
- **Phase 4 Plan**: `docs/PHASE4_PLAN_OPERATIONS.md`
- **Phase 5 Plan**: `docs/PHASE5_PLAN_DAILY_UPDATES.md`
- **Project Status**: `docs/PROJECT_STATUS.md` (updated with new roadmap)
- **Old Outreach Plan**: `docs/PHASE3_PLAN_OUTREACH_CAMPAIGNS_DEPRIORITIZED.md` (for reference)

## Questions Answered

**Q: Which ATS for requisitions?**
A: Custom/Internal ATS - manual entry for Phase 3, can integrate API later

**Q: What does "campaign" mean for Daily Updates?**
A: Campaign = client/company. Group updates by which client they mention.

**Q: Invoice kanban stages?**
A: 4 stages: Draft → Approved → Sent → Paid (standard workflow selected)

**Q: Onboarding checklists approach?**
A: Template-based. Pre-defined templates applied when new hire added, can edit per hire.

---

**Document Status**: Final
**Approved By**: User (2026-01-09)
**Next Action**: Begin Phase 3 (People Module) implementation
