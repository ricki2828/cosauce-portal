"""API endpoints for invoice tracking."""

import aiosqlite
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid

from ..config import DATA_DIR
from ..middleware.auth import get_current_user, get_current_director
from ..models.invoicing import (
    Invoice,
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceRole,
    InvoiceRoleCreate,
    InvoiceRoleUpdate,
    InvoiceComment,
    InvoiceCommentCreate,
    InvoicePeriod,
    RolloverRequest,
    RolloverResult,
)

router = APIRouter()


@router.get("/invoices", response_model=List[Invoice])
async def list_invoices(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user=Depends(get_current_user),
):
    """List all invoices, optionally filtered by period."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Build query with optional filters
        query = "SELECT * FROM invoices"
        params = []
        where_clauses = []

        if month is not None and year is not None:
            where_clauses.append("period_month = ? AND period_year = ?")
            params.extend([month, year])

        # Filter out deprecated statuses ('ready', 'confirmed')
        where_clauses.append("status NOT IN ('ready', 'confirmed')")

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        # Order by status first (sent, approved, checking, gathering_data, paid, blocked),
        # then by client_name
        query += """ ORDER BY
            CASE status
                WHEN 'sent' THEN 1
                WHEN 'approved' THEN 2
                WHEN 'checking' THEN 3
                WHEN 'gathering_data' THEN 4
                WHEN 'paid' THEN 5
                WHEN 'blocked' THEN 6
                ELSE 99
            END,
            client_name"""

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            invoices = [dict(row) for row in rows]

        if not invoices:
            return []

        # Batch fetch roles for all invoices
        invoice_ids = [inv['id'] for inv in invoices]
        placeholders = ','.join('?' * len(invoice_ids))

        async with db.execute(
            f"SELECT * FROM invoice_roles WHERE invoice_id IN ({placeholders}) ORDER BY sort_order",
            invoice_ids
        ) as cursor:
            role_rows = await cursor.fetchall()
            roles_by_invoice = {}
            for row in role_rows:
                role_dict = dict(row)
                role_dict['total'] = role_dict['rate'] * role_dict['quantity']
                invoice_id = role_dict['invoice_id']
                if invoice_id not in roles_by_invoice:
                    roles_by_invoice[invoice_id] = []
                roles_by_invoice[invoice_id].append(role_dict)

        # Batch fetch comments for all invoices
        async with db.execute(
            f"SELECT * FROM invoice_comments WHERE invoice_id IN ({placeholders}) ORDER BY created_at DESC",
            invoice_ids
        ) as cursor:
            comment_rows = await cursor.fetchall()
            comments_by_invoice = {}
            for row in comment_rows:
                comment_dict = dict(row)
                invoice_id = comment_dict['invoice_id']
                if invoice_id not in comments_by_invoice:
                    comments_by_invoice[invoice_id] = []
                comments_by_invoice[invoice_id].append(comment_dict)

        # Attach roles and comments to each invoice
        for invoice in invoices:
            invoice_id = invoice['id']
            invoice['roles'] = roles_by_invoice.get(invoice_id, [])
            invoice['comments'] = comments_by_invoice.get(invoice_id, [])
            # Compute total
            invoice['total'] = sum(role['total'] for role in invoice['roles'])

        return invoices


@router.get("/invoices/{id}", response_model=Invoice)
async def get_invoice(
    id: str,
    current_user=Depends(get_current_user),
):
    """Get a single invoice by ID."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Fetch invoice
        async with db.execute("SELECT * FROM invoices WHERE id = ?", (id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Invoice not found")
            invoice = dict(row)

        # Fetch roles
        async with db.execute(
            "SELECT * FROM invoice_roles WHERE invoice_id = ? ORDER BY sort_order",
            (id,)
        ) as cursor:
            role_rows = await cursor.fetchall()
            invoice['roles'] = []
            for row in role_rows:
                role_dict = dict(row)
                role_dict['total'] = role_dict['rate'] * role_dict['quantity']
                invoice['roles'].append(role_dict)

        # Fetch comments
        async with db.execute(
            "SELECT * FROM invoice_comments WHERE invoice_id = ? ORDER BY created_at DESC",
            (id,)
        ) as cursor:
            comment_rows = await cursor.fetchall()
            invoice['comments'] = [dict(row) for row in comment_rows]

        # Compute total
        invoice['total'] = sum(role['total'] for role in invoice['roles'])

        return invoice


@router.post("/invoices", response_model=Invoice, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice: InvoiceCreate,
    current_user=Depends(get_current_director),
):
    """Create a new invoice."""
    invoice_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        try:
            await db.execute(
                """
                INSERT INTO invoices (
                    id, client_name, period_month, period_year,
                    status, currency, notes, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'gathering_data', ?, ?, ?, ?, ?)
                """,
                (
                    invoice_id,
                    invoice.client_name,
                    invoice.period_month,
                    invoice.period_year,
                    invoice.currency,
                    invoice.notes,
                    current_user['id'],
                    now,
                    now,
                ),
            )
            await db.commit()
        except aiosqlite.IntegrityError as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invoice already exists for {invoice.client_name} in {invoice.period_month}/{invoice.period_year}"
                )
            raise

    # Fetch and return the created invoice
    return await get_invoice(invoice_id, current_user)


@router.put("/invoices/{id}", response_model=Invoice)
async def update_invoice(
    id: str,
    invoice: InvoiceUpdate,
    current_user=Depends(get_current_director),
):
    """Update an invoice (status, currency, notes)."""
    # Verify invoice exists
    await get_invoice(id, current_user)

    # Build dynamic update query
    update_fields = []
    params = []

    if invoice.status is not None:
        update_fields.append("status = ?")
        params.append(invoice.status)
    if invoice.currency is not None:
        update_fields.append("currency = ?")
        params.append(invoice.currency)
    if invoice.notes is not None:
        update_fields.append("notes = ?")
        params.append(invoice.notes)

    if not update_fields:
        # No fields to update, return current invoice
        return await get_invoice(id, current_user)

    update_fields.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(id)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            f"UPDATE invoices SET {', '.join(update_fields)} WHERE id = ?",
            params,
        )
        await db.commit()

    return await get_invoice(id, current_user)


@router.delete("/invoices/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    id: str,
    current_user=Depends(get_current_director),
):
    """Delete an invoice."""
    # Verify invoice exists
    await get_invoice(id, current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute("DELETE FROM invoices WHERE id = ?", (id,))
        await db.commit()

    return None


# Invoice Roles endpoints
@router.post("/invoices/{id}/roles", response_model=InvoiceRole, status_code=status.HTTP_201_CREATED)
async def add_role(
    id: str,
    role: InvoiceRoleCreate,
    current_user=Depends(get_current_director),
):
    """Add a role/line item to an invoice."""
    # Verify invoice exists
    await get_invoice(id, current_user)

    role_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            """
            INSERT INTO invoice_roles (
                id, invoice_id, role_name, rate, quantity, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                role_id,
                id,
                role.role_name,
                role.rate,
                role.quantity,
                role.sort_order,
                now,
                now,
            ),
        )
        # Update invoice updated_at
        await db.execute(
            "UPDATE invoices SET updated_at = ? WHERE id = ?",
            (now, id),
        )
        await db.commit()

        # Fetch and return the created role
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM invoice_roles WHERE id = ?", (role_id,)) as cursor:
            row = await cursor.fetchone()
            role_dict = dict(row)
            role_dict['total'] = role_dict['rate'] * role_dict['quantity']
            return role_dict


@router.put("/invoices/{id}/roles/{role_id}", response_model=InvoiceRole)
async def update_role(
    id: str,
    role_id: str,
    role: InvoiceRoleUpdate,
    current_user=Depends(get_current_director),
):
    """Update a role/line item."""
    # Verify invoice exists
    await get_invoice(id, current_user)

    # Fetch existing role
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM invoice_roles WHERE id = ? AND invoice_id = ?",
            (role_id, id),
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Role not found")
            existing = dict(row)

        # Build dynamic update query
        update_fields = []
        params = []

        if role.role_name is not None:
            update_fields.append("role_name = ?")
            params.append(role.role_name)
        if role.rate is not None:
            update_fields.append("rate = ?")
            params.append(role.rate)
        if role.quantity is not None:
            update_fields.append("quantity = ?")
            params.append(role.quantity)
        if role.sort_order is not None:
            update_fields.append("sort_order = ?")
            params.append(role.sort_order)

        if not update_fields:
            # No fields to update
            existing['total'] = existing['rate'] * existing['quantity']
            return existing

        update_fields.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        params.append(role_id)

        await db.execute(
            f"UPDATE invoice_roles SET {', '.join(update_fields)} WHERE id = ?",
            params,
        )
        # Update invoice updated_at
        await db.execute(
            "UPDATE invoices SET updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), id),
        )
        await db.commit()

        # Fetch and return updated role
        async with db.execute("SELECT * FROM invoice_roles WHERE id = ?", (role_id,)) as cursor:
            row = await cursor.fetchone()
            role_dict = dict(row)
            role_dict['total'] = role_dict['rate'] * role_dict['quantity']
            return role_dict


@router.delete("/invoices/{id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    id: str,
    role_id: str,
    current_user=Depends(get_current_director),
):
    """Delete a role/line item."""
    # Verify invoice exists
    await get_invoice(id, current_user)

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        result = await db.execute(
            "DELETE FROM invoice_roles WHERE id = ? AND invoice_id = ?",
            (role_id, id),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Role not found")

        # Update invoice updated_at
        await db.execute(
            "UPDATE invoices SET updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), id),
        )
        await db.commit()

    return None


# Invoice Comments endpoints
@router.post("/invoices/{id}/comments", response_model=InvoiceComment, status_code=status.HTTP_201_CREATED)
async def add_comment(
    id: str,
    comment: InvoiceCommentCreate,
    current_user=Depends(get_current_user),
):
    """Add a comment to an invoice."""
    # Verify invoice exists
    await get_invoice(id, current_user)

    comment_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        await db.execute(
            """
            INSERT INTO invoice_comments (
                id, invoice_id, author_id, author_name, content, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                comment_id,
                id,
                current_user['id'],
                current_user['name'],
                comment.content,
                now,
            ),
        )
        # Update invoice updated_at
        await db.execute(
            "UPDATE invoices SET updated_at = ? WHERE id = ?",
            (now, id),
        )
        await db.commit()

        # Fetch and return the created comment
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM invoice_comments WHERE id = ?",
            (comment_id,),
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row)


# Rollover endpoint
@router.post("/invoices/rollover", response_model=RolloverResult)
async def rollover_invoices(
    rollover: RolloverRequest,
    current_user=Depends(get_current_director),
):
    """Roll invoices to the next month, copying roles/rates."""
    # Compute target month/year
    to_month = rollover.from_month + 1
    to_year = rollover.from_year
    if to_month > 12:
        to_month = 1
        to_year += 1

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Fetch all invoices from source period
        async with db.execute(
            "SELECT * FROM invoices WHERE period_month = ? AND period_year = ?",
            (rollover.from_month, rollover.from_year),
        ) as cursor:
            source_invoices = [dict(row) for row in await cursor.fetchall()]

        if not source_invoices:
            return RolloverResult(
                invoices_created=0,
                to_month=to_month,
                to_year=to_year,
            )

        invoices_created = 0
        now = datetime.utcnow().isoformat()

        for source_invoice in source_invoices:
            # Check if invoice already exists for target period
            async with db.execute(
                "SELECT id FROM invoices WHERE client_name = ? AND period_month = ? AND period_year = ?",
                (source_invoice['client_name'], to_month, to_year),
            ) as cursor:
                existing = await cursor.fetchone()

            if existing:
                # Skip - invoice already exists for this client/period
                continue

            # Create new invoice
            new_invoice_id = str(uuid.uuid4())
            await db.execute(
                """
                INSERT INTO invoices (
                    id, client_name, period_month, period_year,
                    status, currency, notes, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'gathering_data', ?, NULL, ?, ?, ?)
                """,
                (
                    new_invoice_id,
                    source_invoice['client_name'],
                    to_month,
                    to_year,
                    source_invoice['currency'],
                    current_user['id'],
                    now,
                    now,
                ),
            )

            # Copy roles from source invoice
            async with db.execute(
                "SELECT * FROM invoice_roles WHERE invoice_id = ?",
                (source_invoice['id'],),
            ) as cursor:
                source_roles = [dict(row) for row in await cursor.fetchall()]

            for source_role in source_roles:
                new_role_id = str(uuid.uuid4())
                await db.execute(
                    """
                    INSERT INTO invoice_roles (
                        id, invoice_id, role_name, rate, quantity, sort_order, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        new_role_id,
                        new_invoice_id,
                        source_role['role_name'],
                        source_role['rate'],
                        source_role['quantity'],
                        source_role['sort_order'],
                        now,
                        now,
                    ),
                )

            invoices_created += 1

        await db.commit()

    return RolloverResult(
        invoices_created=invoices_created,
        to_month=to_month,
        to_year=to_year,
    )


# Periods endpoint
@router.get("/periods", response_model=List[InvoicePeriod])
async def list_periods(
    current_user=Depends(get_current_user),
):
    """Get list of periods that have invoices."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            """
            SELECT period_month as month, period_year as year, COUNT(*) as invoice_count
            FROM invoices
            GROUP BY period_month, period_year
            ORDER BY period_year DESC, period_month DESC
            """
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


# Clients endpoint
@router.get("/clients", response_model=List[str])
async def list_clients(
    current_user=Depends(get_current_user),
):
    """Get list of unique client names across all invoices."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            """
            SELECT DISTINCT client_name
            FROM invoices
            ORDER BY client_name
            """
        ) as cursor:
            rows = await cursor.fetchall()
            return [row['client_name'] for row in rows]
