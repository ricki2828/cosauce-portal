# Phase 4: Operations Module - Implementation Plan

**Status**: Planned (after Phase 3)
**Priority**: HIGH (Phase 4 of revised roadmap)
**Estimated Effort**: 1 session (4-6 hours)

## Overview

Build the Operations module for managing payables (bill submission/approval) and tracking client invoices through a kanban board.

## Module Components

### 1. Payables Management
System for employees to submit bills/expenses for processing, with approval workflow.

### 2. Invoice Kanban
Visual kanban board for tracking client invoices through stages: Draft → Approved → Sent → Paid.

## Database Schema

### Payables Table
```sql
CREATE TABLE payables (
    id TEXT PRIMARY KEY,
    submitted_by TEXT NOT NULL,        -- User ID of submitter
    vendor_name TEXT NOT NULL,         -- Who to pay (e.g., "AWS", "Office Supplies Ltd")
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'SGD',
    category TEXT,                     -- e.g., "Software", "Office", "Travel", "Utilities"
    description TEXT NOT NULL,
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    status TEXT NOT NULL,              -- 'pending', 'approved', 'rejected', 'paid'
    approved_by TEXT,                  -- User ID of approver
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    attachment_url TEXT,               -- Link to invoice/receipt file
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

### Invoices Table
```sql
CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_id TEXT,                    -- Link to companies table if exists
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'SGD',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL,              -- 'draft', 'approved', 'sent', 'paid'
    description TEXT,                  -- Work description or line items
    payment_terms TEXT,                -- e.g., "Net 30", "Due on Receipt"
    sent_date DATE,
    paid_date DATE,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    approved_at TIMESTAMP,
    notes TEXT,
    attachment_url TEXT,               -- Link to PDF invoice
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

### Invoice Line Items Table (Optional - for detailed invoices)
```sql
CREATE TABLE invoice_line_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,     -- quantity * unit_price
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
```

## API Endpoints

### Payables
- `GET /api/operations/payables` - List all payables (optional status filter)
- `GET /api/operations/payables/{id}` - Get single payable
- `POST /api/operations/payables` - Submit new payable
- `PUT /api/operations/payables/{id}` - Update payable (submitter or admin only)
- `DELETE /api/operations/payables/{id}` - Delete payable (submitter only, if pending)
- `POST /api/operations/payables/{id}/approve` - Approve payable (director/admin only)
- `POST /api/operations/payables/{id}/reject` - Reject payable with reason
- `POST /api/operations/payables/{id}/mark-paid` - Mark as paid
- `GET /api/operations/payables/stats` - Get payables statistics
- `POST /api/operations/payables/{id}/upload` - Upload invoice/receipt attachment

### Invoices
- `GET /api/operations/invoices` - List all invoices (optional status filter)
- `GET /api/operations/invoices/{id}` - Get single invoice
- `POST /api/operations/invoices` - Create new invoice
- `PUT /api/operations/invoices/{id}` - Update invoice
- `DELETE /api/operations/invoices/{id}` - Delete invoice (draft only)
- `POST /api/operations/invoices/{id}/approve` - Approve invoice (director/admin)
- `POST /api/operations/invoices/{id}/send` - Mark as sent (updates sent_date)
- `POST /api/operations/invoices/{id}/mark-paid` - Mark as paid
- `GET /api/operations/invoices/{id}/line-items` - Get invoice line items
- `POST /api/operations/invoices/{id}/line-items` - Add line item
- `PUT /api/operations/invoices/{invoice_id}/line-items/{item_id}` - Update line item
- `DELETE /api/operations/invoices/{invoice_id}/line-items/{item_id}` - Remove line item
- `GET /api/operations/invoices/stats` - Get invoice statistics
- `POST /api/operations/invoices/{id}/generate-pdf` - Generate PDF invoice (future)

## Pydantic Models

```python
# app/models/operations.py

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel

# Payables
class PayableBase(BaseModel):
    vendor_name: str
    amount: Decimal
    currency: str = 'SGD'
    category: Optional[str] = None
    description: str
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

class PayableCreate(PayableBase):
    pass

class PayableUpdate(BaseModel):
    vendor_name: Optional[str] = None
    amount: Optional[Decimal] = None
    category: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

class PayableApprove(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

class Payable(PayableBase):
    id: str
    submitted_by: str
    status: Literal['pending', 'approved', 'rejected', 'paid']
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    attachment_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Invoices
class InvoiceLineItemBase(BaseModel):
    description: str
    quantity: Decimal = 1
    unit_price: Decimal

class InvoiceLineItemCreate(InvoiceLineItemBase):
    pass

class InvoiceLineItem(InvoiceLineItemBase):
    id: str
    invoice_id: str
    total: Decimal
    order_index: int

class InvoiceBase(BaseModel):
    invoice_number: str
    client_name: str
    client_id: Optional[str] = None
    amount: Decimal
    currency: str = 'SGD'
    issue_date: date
    due_date: date
    description: Optional[str] = None
    payment_terms: Optional[str] = 'Net 30'
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    line_items: Optional[list[InvoiceLineItemCreate]] = None

class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = None
    amount: Optional[Decimal] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    description: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None

class Invoice(InvoiceBase):
    id: str
    status: Literal['draft', 'approved', 'sent', 'paid']
    sent_date: Optional[date] = None
    paid_date: Optional[date] = None
    created_by: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    attachment_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    line_items: list[InvoiceLineItem] = []

class InvoiceStats(BaseModel):
    total_count: int
    draft: int
    approved: int
    sent: int
    paid: int
    total_outstanding: Decimal  # Sum of sent but not paid
    total_revenue: Decimal      # Sum of all paid

class PayableStats(BaseModel):
    total_count: int
    pending: int
    approved: int
    rejected: int
    paid: int
    total_outstanding: Decimal  # Sum of approved but not paid
    total_paid: Decimal         # Sum of all paid
```

## Frontend Components

### Pages

1. **Operations Overview** (`/operations`)
   - Two main tabs: Payables and Invoices
   - Quick stats cards (pending payables, overdue invoices, total outstanding)

2. **Payables Tab**
   - Table view of all payables
   - Filters: status, category, submitter
   - Actions: Submit New, Approve/Reject (if director), Mark Paid
   - Color coding: pending (yellow), approved (green), rejected (red), paid (gray)

3. **Payables Detail Modal**
   - View payable details
   - Approval/rejection workflow
   - Attachment viewer
   - Status history

4. **Invoice Kanban Board**
   - 4 columns: Draft → Approved → Sent → Paid
   - Drag-and-drop cards between columns
   - Each card shows:
     - Invoice number
     - Client name
     - Amount
     - Due date (with overdue indicator)
   - Quick actions: Edit, Send, Mark Paid

5. **Invoice Detail/Edit** (`/operations/invoices/{id}`)
   - Invoice form with line items
   - Status transition buttons
   - Generate PDF (future feature)
   - Send to client (future email integration)

## Business Logic

### Payables Workflow
1. **Submit**: Employee submits payable with invoice attachment
2. **Pending**: Awaits director/admin approval
3. **Approved**: Director approves for payment
4. **Rejected**: Director rejects with reason (employee can resubmit)
5. **Paid**: Admin marks as paid after processing

### Invoice Workflow (Kanban)
1. **Draft**: Invoice created but not finalized
2. **Approved**: Director/admin approves invoice for sending
3. **Sent**: Invoice sent to client (sent_date recorded)
4. **Paid**: Payment received (paid_date recorded)

### Permissions
- **All Users**: Can submit payables, view own submissions
- **Directors/Admins**: Can approve/reject payables, manage all invoices
- **Finance Role** (future): Specialized for payables/invoices management

### Notifications (Future Enhancement)
- Email submitter when payable approved/rejected
- Alert directors when payables awaiting approval
- Reminder for overdue invoices

## File Upload Strategy

For invoice/receipt attachments:

### Option 1: Local File Storage (Simple - Phase 4)
- Store files in `backend/uploads/` directory
- Serve via FastAPI static files
- Return URL: `/uploads/{filename}`

### Option 2: Cloud Storage (Future - Phase 6+)
- AWS S3 / Azure Blob Storage
- Presigned URLs for secure access
- Better for scalability

**Recommended for Phase 4**: Local file storage, migrate to cloud storage later.

### Implementation
```python
# app/api/operations.py

from fastapi import UploadFile, File
import shutil
import os
from uuid import uuid4

UPLOAD_DIR = "uploads/payables"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/payables/{id}/upload")
async def upload_payable_attachment(
    id: str,
    file: UploadFile = File(...)
):
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update payable record with URL
    attachment_url = f"/uploads/payables/{unique_filename}"
    # Update database...

    return {"url": attachment_url}
```

## Invoice Kanban Drag-and-Drop

Frontend uses drag-and-drop library (e.g., `@hello-pangea/dnd` or `react-beautiful-dnd`):

```typescript
// Frontend example
const onDragEnd = async (result: DropResult) => {
  const { destination, draggableId } = result;

  if (!destination) return;

  const newStatus = destination.droppableId; // 'draft', 'approved', 'sent', 'paid'

  // Update backend
  await invoicesApi.updateInvoice(draggableId, { status: newStatus });

  // Update local state
  // ...
};
```

Backend endpoint validates status transitions:
- Draft → Approved ✅
- Draft → Sent ❌ (must be approved first)
- Approved → Sent ✅
- Sent → Paid ✅
- Paid → * ❌ (final state)

## Integration with Existing Modules

### Companies/Contacts
- Link invoices to companies via `client_id`
- Populate client dropdown from `companies` table

### Authentication
- Payables `submitted_by` links to current user
- Invoices `created_by` links to current user
- Approval requires director/admin role

## Testing Strategy

### Backend Testing
1. ✅ Create database tables
2. ✅ Test payables CRUD and approval workflow
3. ✅ Test invoice CRUD and status transitions
4. ✅ Test file upload/download
5. ✅ Test stats endpoints

### Frontend Testing
1. ✅ Run `./validate-browser.sh http://169.150.243.5:5173/operations`
2. ✅ Manual browser testing:
   - Submit payable with attachment
   - Approve/reject payable
   - Create invoice with line items
   - Drag invoice card between kanban columns
   - Mark invoice as sent/paid
   - View statistics

## Success Criteria

Phase 4 is complete when:
- ✅ All database tables created
- ✅ Payables CRUD endpoints working
- ✅ Invoice CRUD endpoints working
- ✅ File upload/download working for attachments
- ✅ Payables approval workflow functional
- ✅ Invoice kanban board with drag-and-drop working
- ✅ Status transition validation working
- ✅ Statistics endpoints returning accurate data
- ✅ Frontend validation passes
- ✅ Manual browser testing confirms all workflows work

## Implementation Order

1. **Database** (30 min)
   - Create payables, invoices, invoice_line_items tables
   - Add indexes

2. **Models** (30 min)
   - Pydantic models for payables and invoices

3. **Payables API** (1.5 hours)
   - CRUD endpoints
   - Approval/rejection workflow
   - File upload
   - Stats endpoint

4. **Invoices API** (2 hours)
   - CRUD endpoints
   - Line items management
   - Status transition logic
   - Stats endpoint

5. **Frontend** (1.5 hours)
   - Payables table and submission form
   - Invoice kanban board with drag-and-drop
   - File upload component
   - Validation testing

## Next Steps After Phase 4

Once Operations module is complete, move to **Phase 5: Daily Updates Integration** (pull data from daily updates bot by client).
