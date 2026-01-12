# Phase 3: People Module - Implementation Plan

**Status**: Ready to start
**Priority**: HIGH (Phase 3 of revised roadmap)
**Estimated Effort**: 1 session (4-6 hours)

## Overview

Build the People module for tracking open requisitions and managing new hire onboarding checklists.

## Module Components

### 1. Open Requisitions
Display and manage open job positions from the internal/custom ATS.

### 2. Onboarding Checklists
Template-based onboarding workflows for new hires with task tracking.

## Database Schema

### Requisitions Table
```sql
CREATE TABLE requisitions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,              -- e.g., "Senior Developer"
    department TEXT NOT NULL,          -- e.g., "Engineering", "Sales"
    location TEXT,                     -- e.g., "Remote", "Singapore"
    employment_type TEXT NOT NULL,     -- 'full_time', 'part_time', 'contract'
    status TEXT NOT NULL,              -- 'open', 'interviewing', 'offer_made', 'filled', 'cancelled'
    headcount INTEGER DEFAULT 1,       -- Number of positions
    priority TEXT,                     -- 'low', 'medium', 'high', 'urgent'
    description TEXT,                  -- Job description
    requirements TEXT,                 -- Key requirements (JSON array or text)
    posted_date DATE,
    target_start_date DATE,
    filled_date DATE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Onboarding Templates Table
```sql
CREATE TABLE onboarding_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                -- e.g., "Developer Onboarding", "Sales Rep Onboarding"
    description TEXT,
    role_type TEXT,                    -- e.g., "developer", "sales", "operations"
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Onboarding Template Tasks Table
```sql
CREATE TABLE onboarding_template_tasks (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    task_title TEXT NOT NULL,
    task_description TEXT,
    category TEXT,                     -- e.g., "IT Setup", "HR Documents", "Training"
    day_offset INTEGER DEFAULT 0,      -- Days after hire date (0 = day 1, -1 = before start)
    assigned_to_role TEXT,             -- 'manager', 'hr', 'it', 'buddy'
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES onboarding_templates(id) ON DELETE CASCADE
);
```

### New Hires Table
```sql
CREATE TABLE new_hires (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role_title TEXT NOT NULL,
    department TEXT NOT NULL,
    start_date DATE NOT NULL,
    manager_id TEXT,                   -- Links to users table
    status TEXT NOT NULL,              -- 'pending', 'active', 'completed', 'cancelled'
    onboarding_template_id TEXT,       -- Which template was used
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id),
    FOREIGN KEY (onboarding_template_id) REFERENCES onboarding_templates(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Onboarding Tasks Table
```sql
CREATE TABLE onboarding_tasks (
    id TEXT PRIMARY KEY,
    new_hire_id TEXT NOT NULL,
    task_title TEXT NOT NULL,
    task_description TEXT,
    category TEXT,
    due_date DATE,
    assigned_to TEXT,                  -- User ID or role
    status TEXT NOT NULL,              -- 'pending', 'in_progress', 'completed', 'blocked'
    completed_at TIMESTAMP,
    completed_by TEXT,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (new_hire_id) REFERENCES new_hires(id) ON DELETE CASCADE,
    FOREIGN KEY (completed_by) REFERENCES users(id)
);
```

## API Endpoints

### Requisitions
- `GET /api/people/requisitions` - List all requisitions (optional status filter)
- `GET /api/people/requisitions/{id}` - Get single requisition
- `POST /api/people/requisitions` - Create new requisition
- `PUT /api/people/requisitions/{id}` - Update requisition
- `DELETE /api/people/requisitions/{id}` - Delete requisition
- `POST /api/people/requisitions/{id}/fill` - Mark as filled (set filled_date)
- `GET /api/people/requisitions/stats` - Get hiring statistics

### Onboarding Templates
- `GET /api/people/onboarding-templates` - List all templates
- `GET /api/people/onboarding-templates/{id}` - Get template with tasks
- `POST /api/people/onboarding-templates` - Create new template
- `PUT /api/people/onboarding-templates/{id}` - Update template
- `DELETE /api/people/onboarding-templates/{id}` - Delete template
- `POST /api/people/onboarding-templates/{id}/tasks` - Add task to template
- `PUT /api/people/onboarding-templates/{template_id}/tasks/{task_id}` - Update task
- `DELETE /api/people/onboarding-templates/{template_id}/tasks/{task_id}` - Remove task

### New Hires
- `GET /api/people/new-hires` - List all new hires (optional status filter)
- `GET /api/people/new-hires/{id}` - Get new hire with onboarding tasks
- `POST /api/people/new-hires` - Create new hire (auto-applies template)
- `PUT /api/people/new-hires/{id}` - Update new hire info
- `DELETE /api/people/new-hires/{id}` - Delete new hire
- `GET /api/people/new-hires/{id}/tasks` - Get onboarding tasks for hire
- `PUT /api/people/new-hires/{hire_id}/tasks/{task_id}` - Update task status
- `POST /api/people/new-hires/{hire_id}/tasks/{task_id}/complete` - Mark task complete

## Pydantic Models

```python
# app/models/people.py

from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr

# Requisitions
class RequisitionBase(BaseModel):
    title: str
    department: str
    location: Optional[str] = None
    employment_type: Literal['full_time', 'part_time', 'contract']
    headcount: int = 1
    priority: Optional[Literal['low', 'medium', 'high', 'urgent']] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    posted_date: Optional[date] = None
    target_start_date: Optional[date] = None

class RequisitionCreate(RequisitionBase):
    pass

class RequisitionUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    status: Optional[Literal['open', 'interviewing', 'offer_made', 'filled', 'cancelled']] = None
    location: Optional[str] = None
    priority: Optional[Literal['low', 'medium', 'high', 'urgent']] = None
    description: Optional[str] = None
    target_start_date: Optional[date] = None

class Requisition(RequisitionBase):
    id: str
    status: Literal['open', 'interviewing', 'offer_made', 'filled', 'cancelled']
    filled_date: Optional[date] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

# Onboarding Templates
class TemplateTaskBase(BaseModel):
    task_title: str
    task_description: Optional[str] = None
    category: Optional[str] = None
    day_offset: int = 0
    assigned_to_role: Optional[Literal['manager', 'hr', 'it', 'buddy']] = None
    order_index: int = 0

class TemplateTaskCreate(TemplateTaskBase):
    pass

class TemplateTask(TemplateTaskBase):
    id: str
    template_id: str
    created_at: datetime

class OnboardingTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    role_type: Optional[str] = None

class OnboardingTemplateCreate(OnboardingTemplateBase):
    pass

class OnboardingTemplate(OnboardingTemplateBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    tasks: list[TemplateTask] = []

# New Hires
class NewHireBase(BaseModel):
    full_name: str
    email: EmailStr
    role_title: str
    department: str
    start_date: date
    manager_id: Optional[str] = None
    onboarding_template_id: Optional[str] = None

class NewHireCreate(NewHireBase):
    pass

class NewHireUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_title: Optional[str] = None
    department: Optional[str] = None
    start_date: Optional[date] = None
    manager_id: Optional[str] = None
    status: Optional[Literal['pending', 'active', 'completed', 'cancelled']] = None

class NewHire(NewHireBase):
    id: str
    status: Literal['pending', 'active', 'completed', 'cancelled']
    created_by: str
    created_at: datetime
    updated_at: datetime

# Onboarding Tasks
class OnboardingTaskBase(BaseModel):
    task_title: str
    task_description: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[date] = None
    assigned_to: Optional[str] = None

class OnboardingTaskUpdate(BaseModel):
    status: Optional[Literal['pending', 'in_progress', 'completed', 'blocked']] = None
    notes: Optional[str] = None

class OnboardingTask(OnboardingTaskBase):
    id: str
    new_hire_id: str
    status: Literal['pending', 'in_progress', 'completed', 'blocked']
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    notes: Optional[str] = None
    order_index: int
    created_at: datetime

class NewHireWithTasks(NewHire):
    tasks: list[OnboardingTask] = []
```

## Frontend Components

### Pages
1. **People Overview** (`/people`)
   - Two main sections: Requisitions and New Hires
   - Quick stats cards (open positions, pending hires, onboarding in progress)

2. **Requisitions Tab**
   - Table view of open requisitions
   - Filters: status, department, priority
   - Actions: Create, Edit, Mark as Filled, Delete

3. **New Hires Tab**
   - List of new hires with start dates
   - Filter by status (pending, active, completed)
   - Actions: Add New Hire, View Onboarding Progress

4. **Onboarding Detail** (`/people/onboarding/{id}`)
   - New hire information
   - Checklist of onboarding tasks
   - Progress bar
   - Task completion tracking

5. **Template Management** (`/people/templates`)
   - List of onboarding templates
   - Create/edit template
   - Manage template tasks

## Business Logic

### Creating a New Hire
1. User creates new hire record with basic info
2. System applies selected onboarding template (if specified)
3. Template tasks are copied to onboarding_tasks table
4. Due dates calculated based on start_date + day_offset
5. Tasks assigned to roles/people

### Task Due Dates
- `day_offset = -1`: Task due before start date (e.g., IT setup)
- `day_offset = 0`: Task due on day 1
- `day_offset = 7`: Task due 7 days after start

### Permissions
- **Directors/Admins**: Can create/edit requisitions, templates, new hires
- **Managers**: Can view their direct reports' onboarding, update task status
- **All Users**: Can view requisitions and new hires (read-only)

## ATS Integration (Custom/Internal)

Since you use a custom/internal ATS, we'll need to design an integration point:

### Option 1: Manual Entry
- Directors manually create requisitions in CoSauce Portal
- Update status as candidates progress

### Option 2: API Integration
- If your internal ATS has an API, we can sync requisitions
- Endpoint: `POST /api/people/requisitions/sync` - Pull latest from ATS

### Option 3: CSV Import
- Export requisitions from ATS as CSV
- Import endpoint: `POST /api/people/requisitions/import` - Upload CSV

**Recommended for Phase 3**: Start with manual entry, add integration in Phase 6+.

## Testing Strategy

### Backend Testing
1. ✅ Create database tables
2. ✅ Test CRUD endpoints with curl
3. ✅ Test template application logic (new hire → tasks)
4. ✅ Test due date calculation

### Frontend Testing
1. ✅ Run `./validate-browser.sh http://169.150.243.5:5173/people`
2. ✅ Manual browser testing:
   - Create requisition
   - Create onboarding template
   - Add new hire with template
   - Complete onboarding tasks
   - View progress

## Success Criteria

Phase 3 is complete when:
- ✅ All database tables created
- ✅ All API endpoints implemented and tested
- ✅ Requisitions can be created, viewed, updated, filled
- ✅ Onboarding templates can be created with tasks
- ✅ New hires can be added and assigned templates
- ✅ Onboarding tasks auto-populate from templates
- ✅ Tasks can be marked complete
- ✅ Frontend validation passes
- ✅ Manual browser testing confirms all workflows work

## Implementation Order

1. **Database** (30 min)
   - Create all 5 tables
   - Add indexes

2. **Models** (30 min)
   - Pydantic models for all entities

3. **Requisitions API** (1 hour)
   - CRUD endpoints
   - Stats endpoint

4. **Templates API** (1.5 hours)
   - Template CRUD
   - Template task management

5. **New Hires API** (2 hours)
   - New hire CRUD
   - Template application logic
   - Task management
   - Due date calculation

6. **Frontend** (1 hour)
   - Connect to API
   - Build UI components
   - Validation testing

## Next Steps After Phase 3

Once People module is complete, move to **Phase 4: Operations Module** (Payables + Invoice Kanban).
