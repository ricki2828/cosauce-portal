"""API endpoints for cashflow tracking."""

import aiosqlite
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from typing import List, Optional
import uuid
import os

from ..config import DATA_DIR, CASHFLOW_UPLOADS_DIR
from ..middleware.auth import get_current_superadmin
from ..models.cashflow import (
    CashflowMonthly,
    CashflowDaily,
    FXRate,
    FXRateCreate,
    CashflowImport,
    CashflowSummary,
    CashflowMonthlySummary,
    CashflowAccount,
    CashflowAccountCreate,
    CashflowAccountUpdate,
    CashflowCellUpdate,
    CashflowBulkUpdate,
)
from ..services.file_upload_service import (
    save_upload,
    CASHFLOW_ALLOWED_EXTENSIONS,
)
from ..services.cashflow_service import parse_cashflow_excel, parse_daily_cashflow

router = APIRouter()


# ==================== ACCOUNT CRUD ====================

@router.get("/accounts", response_model=List[CashflowAccount])
async def list_accounts(
    current_user=Depends(get_current_superadmin),
):
    """List all active cashflow accounts ordered by category + display_order."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, account_type, category, subcategory, line_item,
                      display_order, is_computed, is_active
               FROM cashflow_accounts
               WHERE is_active = 1
               ORDER BY
                 CASE account_type
                   WHEN 'revenue' THEN 1
                   WHEN 'expense' THEN 2
                   WHEN 'summary' THEN 3
                   ELSE 4
                 END,
                 display_order"""
        ) as cursor:
            rows = await cursor.fetchall()
            return [
                {**dict(row), "is_computed": bool(row["is_computed"]), "is_active": bool(row["is_active"])}
                for row in rows
            ]


@router.post("/accounts", response_model=CashflowAccount, status_code=status.HTTP_201_CREATED)
async def create_account(
    account: CashflowAccountCreate,
    current_user=Depends(get_current_superadmin),
):
    """Create a new cashflow account."""
    account_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        try:
            await db.execute(
                """INSERT INTO cashflow_accounts
                   (id, account_type, category, subcategory, line_item, display_order, is_computed, is_active, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)""",
                (account_id, account.account_type, account.category, account.subcategory,
                 account.line_item, account.display_order, now, now),
            )
            await db.commit()
        except aiosqlite.IntegrityError:
            raise HTTPException(
                status_code=400,
                detail=f"Account '{account.line_item}' already exists in {account.category}/{account.subcategory}",
            )

        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM cashflow_accounts WHERE id = ?", (account_id,)) as cursor:
            row = await cursor.fetchone()
            d = dict(row)
            d["is_computed"] = bool(d["is_computed"])
            d["is_active"] = bool(d["is_active"])
            return d


@router.put("/accounts/{account_id}", response_model=CashflowAccount)
async def update_account(
    account_id: str,
    update: CashflowAccountUpdate,
    current_user=Depends(get_current_superadmin),
):
    """Update a cashflow account (rename, reorder, deactivate)."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Verify exists
        async with db.execute("SELECT * FROM cashflow_accounts WHERE id = ?", (account_id,)) as cursor:
            existing = await cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Account not found")

        # Build update
        fields = []
        params = []
        if update.line_item is not None:
            fields.append("line_item = ?")
            params.append(update.line_item)
        if update.subcategory is not None:
            fields.append("subcategory = ?")
            params.append(update.subcategory)
        if update.display_order is not None:
            fields.append("display_order = ?")
            params.append(update.display_order)
        if update.is_active is not None:
            fields.append("is_active = ?")
            params.append(update.is_active)

        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        fields.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        params.append(account_id)

        await db.execute(
            f"UPDATE cashflow_accounts SET {', '.join(fields)} WHERE id = ?",
            params,
        )
        await db.commit()

        async with db.execute("SELECT * FROM cashflow_accounts WHERE id = ?", (account_id,)) as cursor:
            row = await cursor.fetchone()
            d = dict(row)
            d["is_computed"] = bool(d["is_computed"])
            d["is_active"] = bool(d["is_active"])
            return d


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    current_user=Depends(get_current_superadmin),
):
    """Soft-delete a cashflow account (set is_active=0)."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        async with db.execute("SELECT id FROM cashflow_accounts WHERE id = ?", (account_id,)) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Account not found")

        await db.execute(
            "UPDATE cashflow_accounts SET is_active = 0, updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), account_id),
        )
        await db.commit()
        return {"detail": "Account deactivated"}


# ==================== CELL UPDATES ====================

@router.put("/monthly/cell")
async def upsert_cell(
    cell: CashflowCellUpdate,
    current_user=Depends(get_current_superadmin),
):
    """Upsert a single monthly cell (account_id + month + year -> amount)."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Verify account exists
        async with db.execute("SELECT * FROM cashflow_accounts WHERE id = ?", (cell.account_id,)) as cursor:
            account = await cursor.fetchone()
            if not account:
                raise HTTPException(status_code=404, detail="Account not found")

        # Check if entry already exists for this account+month+year
        async with db.execute(
            "SELECT id FROM cashflow_monthly WHERE account_id = ? AND month = ? AND year = ?",
            (cell.account_id, cell.month, cell.year),
        ) as cursor:
            existing = await cursor.fetchone()

        now = datetime.utcnow().isoformat()
        if existing:
            await db.execute(
                """UPDATE cashflow_monthly
                   SET amount = ?, is_actual = ?, notes = ?, imported_at = ?
                   WHERE id = ?""",
                (cell.amount, int(cell.is_actual), cell.notes, now, existing["id"]),
            )
        else:
            entry_id = str(uuid.uuid4())
            await db.execute(
                """INSERT INTO cashflow_monthly
                   (id, month, year, category, subcategory, line_item, amount, currency, is_actual, notes, source, imported_at, account_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'ZAR', ?, ?, 'manual_entry', ?, ?)""",
                (entry_id, cell.month, cell.year, account["category"],
                 account["subcategory"], account["line_item"], cell.amount,
                 int(cell.is_actual), cell.notes, now, cell.account_id),
            )

        await db.commit()
        return {"detail": "Cell saved"}


@router.put("/monthly/bulk")
async def upsert_bulk(
    bulk: CashflowBulkUpdate,
    current_user=Depends(get_current_superadmin),
):
    """Upsert multiple cells in one transaction."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Pre-fetch all referenced accounts
        account_ids = list({e.account_id for e in bulk.entries})
        placeholders = ",".join("?" * len(account_ids))
        async with db.execute(
            f"SELECT * FROM cashflow_accounts WHERE id IN ({placeholders})",
            account_ids,
        ) as cursor:
            accounts = {row["id"]: dict(row) for row in await cursor.fetchall()}

        missing = [aid for aid in account_ids if aid not in accounts]
        if missing:
            raise HTTPException(status_code=404, detail=f"Accounts not found: {missing}")

        now = datetime.utcnow().isoformat()
        for cell in bulk.entries:
            account = accounts[cell.account_id]

            async with db.execute(
                "SELECT id FROM cashflow_monthly WHERE account_id = ? AND month = ? AND year = ?",
                (cell.account_id, cell.month, cell.year),
            ) as cursor:
                existing = await cursor.fetchone()

            if existing:
                await db.execute(
                    """UPDATE cashflow_monthly
                       SET amount = ?, is_actual = ?, notes = ?, imported_at = ?
                       WHERE id = ?""",
                    (cell.amount, int(cell.is_actual), cell.notes, now, existing["id"]),
                )
            else:
                entry_id = str(uuid.uuid4())
                await db.execute(
                    """INSERT INTO cashflow_monthly
                       (id, month, year, category, subcategory, line_item, amount, currency, is_actual, notes, source, imported_at, account_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'ZAR', ?, ?, 'manual_entry', ?, ?)""",
                    (entry_id, cell.month, cell.year, account["category"],
                     account["subcategory"], account["line_item"], cell.amount,
                     int(cell.is_actual), cell.notes, now, cell.account_id),
                )

        await db.commit()
        return {"detail": f"Saved {len(bulk.entries)} cells"}


# ==================== MONTHLY DATA ====================

@router.get("/monthly", response_model=List[CashflowMonthly])
async def list_monthly(
    year: Optional[int] = None,
    category: Optional[str] = None,
    current_user=Depends(get_current_superadmin),
):
    """List monthly cashflow data with optional filters."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        query = "SELECT * FROM cashflow_monthly"
        params = []
        where_clauses = []

        if year:
            where_clauses.append("year = ?")
            params.append(year)
        if category:
            where_clauses.append("category = ?")
            params.append(category)

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " ORDER BY year, month, category, line_item"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                d = dict(row)
                d['is_actual'] = bool(d.get('is_actual', 1))
                results.append(d)
            return results


# ==================== DAILY DATA ====================

@router.get("/daily", response_model=List[CashflowDaily])
async def list_daily(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    current_user=Depends(get_current_superadmin),
):
    """List daily cashflow data with optional filters."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        query = "SELECT * FROM cashflow_daily"
        params = []
        where_clauses = []

        if start_date:
            where_clauses.append("date >= ?")
            params.append(start_date)
        if end_date:
            where_clauses.append("date <= ?")
            params.append(end_date)
        if category:
            where_clauses.append("category = ?")
            params.append(category)

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " ORDER BY date DESC, category"

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                d = dict(row)
                d['is_actual'] = bool(d.get('is_actual', 1))
                results.append(d)
            return results


# ==================== EXCEL IMPORT ====================

@router.post("/import-excel", response_model=CashflowImport, status_code=status.HTTP_201_CREATED)
async def import_excel(
    file: UploadFile = File(...),
    current_user=Depends(get_current_superadmin),
):
    """Upload and parse a cashflow Excel workbook."""
    # Save the file
    saved_path, original_filename = await save_upload(
        file, CASHFLOW_UPLOADS_DIR, CASHFLOW_ALLOWED_EXTENSIONS
    )

    try:
        # Parse monthly cashflow
        result = parse_cashflow_excel(saved_path)
        monthly_rows = result['monthly_rows']

        # Parse daily cashflow
        daily_rows = parse_daily_cashflow(saved_path)

        now = datetime.utcnow().isoformat()
        import_id = str(uuid.uuid4())
        rows_imported = 0

        async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
            db.row_factory = aiosqlite.Row

            # Pre-fetch all accounts for matching
            async with db.execute("SELECT * FROM cashflow_accounts WHERE is_active = 1") as cursor:
                all_accounts = [dict(r) for r in await cursor.fetchall()]

            # Build lookup: (category, subcategory, line_item) -> account_id
            account_lookup = {}
            for acct in all_accounts:
                key = (acct["category"], acct["subcategory"], acct["line_item"])
                account_lookup[key] = acct["id"]

            # Insert monthly rows using INSERT OR REPLACE to handle duplicates
            for row in monthly_rows:
                # Try to match to an account
                acct_id = account_lookup.get(
                    (row['category'], row.get('subcategory'), row.get('line_item'))
                )

                await db.execute(
                    """
                    INSERT OR REPLACE INTO cashflow_monthly
                    (id, month, year, category, subcategory, line_item, amount, currency, is_actual, source, imported_at, account_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        row['id'], row['month'], row['year'], row['category'],
                        row.get('subcategory'), row.get('line_item'),
                        row['amount'], row['currency'], int(row['is_actual']),
                        row['source'], now, acct_id,
                    ),
                )
                rows_imported += 1

            # Insert daily rows
            for row in daily_rows:
                await db.execute(
                    """
                    INSERT OR REPLACE INTO cashflow_daily
                    (id, date, category, line_item, amount, currency, description, is_actual, source, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        row['id'], row['date'], row['category'],
                        row.get('line_item'), row['amount'], row['currency'],
                        row.get('description'), int(row['is_actual']),
                        row['source'], now,
                    ),
                )
                rows_imported += 1

            # Insert FX rates
            for fx in result.get('fx_rates', []):
                fx_id = str(uuid.uuid4())
                effective_date = f"{fx['year']}-{fx['month']:02d}-01"
                await db.execute(
                    """
                    INSERT OR REPLACE INTO fx_rates
                    (id, from_currency, to_currency, rate, effective_date, source, created_at)
                    VALUES (?, ?, ?, ?, ?, 'excel_import', ?)
                    """,
                    (fx_id, fx['from_currency'], fx['to_currency'], fx['rate'], effective_date, now),
                )

            # Determine period range
            months_years = [(r['month'], r['year']) for r in monthly_rows]
            period_start = None
            period_end = None
            if months_years:
                min_my = min(months_years, key=lambda x: (x[1], x[0]))
                max_my = max(months_years, key=lambda x: (x[1], x[0]))
                period_start = f"{min_my[1]}-{min_my[0]:02d}"
                period_end = f"{max_my[1]}-{max_my[0]:02d}"

            # Record import
            await db.execute(
                """
                INSERT INTO cashflow_imports
                (id, filename, import_type, rows_imported, period_start, period_end, imported_by, imported_at)
                VALUES (?, ?, 'cashflow_workbook', ?, ?, ?, ?, ?)
                """,
                (import_id, original_filename, rows_imported, period_start, period_end, current_user['id'], now),
            )

            await db.commit()

            # Return the import record
            async with db.execute("SELECT * FROM cashflow_imports WHERE id = ?", (import_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row)

    except ValueError as e:
        # Clean up saved file on parse error
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


# ==================== IMPORTS HISTORY ====================

@router.get("/imports", response_model=List[CashflowImport])
async def list_imports(
    current_user=Depends(get_current_superadmin),
):
    """List cashflow import history."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT * FROM cashflow_imports ORDER BY imported_at DESC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


# ==================== SUMMARY ====================

@router.get("/summary", response_model=CashflowSummary)
async def get_summary(
    year: int = 2026,
    current_user=Depends(get_current_superadmin),
):
    """Get aggregated cashflow summary by month for a given year.

    Uses cashflow_accounts to compute totals:
    - Total Revenue = sum of non-computed revenue accounts
    - Total Expenses = sum of non-computed expense accounts
    - Bank Balance = from Summary account
    """
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        # Get non-computed revenue account IDs
        async with db.execute(
            "SELECT id FROM cashflow_accounts WHERE account_type = 'revenue' AND is_computed = 0 AND is_active = 1"
        ) as cursor:
            revenue_account_ids = [row["id"] for row in await cursor.fetchall()]

        # Get non-computed expense account IDs
        async with db.execute(
            "SELECT id FROM cashflow_accounts WHERE account_type = 'expense' AND is_computed = 0 AND is_active = 1"
        ) as cursor:
            expense_account_ids = [row["id"] for row in await cursor.fetchall()]

        # Get bank balance account ID
        async with db.execute(
            "SELECT id FROM cashflow_accounts WHERE account_type = 'summary' AND line_item = 'Bank Balance' AND is_active = 1"
        ) as cursor:
            bank_row = await cursor.fetchone()
            bank_account_id = bank_row["id"] if bank_row else None

        # Revenue totals by month (from accounts OR fallback to category-based)
        revenue_rows = {}
        if revenue_account_ids:
            placeholders = ",".join("?" * len(revenue_account_ids))
            async with db.execute(
                f"""SELECT month, SUM(amount) as total
                    FROM cashflow_monthly
                    WHERE year = ? AND account_id IN ({placeholders})
                    GROUP BY month ORDER BY month""",
                [year] + revenue_account_ids,
            ) as cursor:
                revenue_rows = {row["month"]: row["total"] for row in await cursor.fetchall()}

        # Fallback: if no account-linked data, use category-based
        if not revenue_rows:
            async with db.execute(
                """SELECT month, SUM(amount) as total
                   FROM cashflow_monthly
                   WHERE year = ? AND category = 'Revenue' AND line_item != 'Total Revenue'
                   GROUP BY month ORDER BY month""",
                (year,),
            ) as cursor:
                revenue_rows = {row["month"]: row["total"] for row in await cursor.fetchall()}

        # Expense totals by month
        expense_rows = {}
        if expense_account_ids:
            placeholders = ",".join("?" * len(expense_account_ids))
            async with db.execute(
                f"""SELECT month, SUM(amount) as total
                    FROM cashflow_monthly
                    WHERE year = ? AND account_id IN ({placeholders})
                    GROUP BY month ORDER BY month""",
                [year] + expense_account_ids,
            ) as cursor:
                expense_rows = {row["month"]: row["total"] for row in await cursor.fetchall()}

        if not expense_rows:
            async with db.execute(
                """SELECT month, SUM(amount) as total
                   FROM cashflow_monthly
                   WHERE year = ? AND category = 'Expenses' AND line_item != 'Total Expenses'
                   GROUP BY month ORDER BY month""",
                (year,),
            ) as cursor:
                expense_rows = {row["month"]: row["total"] for row in await cursor.fetchall()}

        # Bank balance by month
        bank_balance_rows = {}
        if bank_account_id:
            async with db.execute(
                """SELECT month, amount FROM cashflow_monthly
                   WHERE year = ? AND account_id = ?
                   ORDER BY month""",
                (year, bank_account_id),
            ) as cursor:
                bank_balance_rows = {row["month"]: row["amount"] for row in await cursor.fetchall()}

        if not bank_balance_rows:
            async with db.execute(
                """SELECT month, amount FROM cashflow_monthly
                   WHERE year = ? AND category = 'Summary' AND line_item = 'Bank Balance'
                   ORDER BY month""",
                (year,),
            ) as cursor:
                bank_balance_rows = {row["month"]: row["amount"] for row in await cursor.fetchall()}

        # Build monthly summaries
        all_months = sorted(set(
            list(revenue_rows.keys()) + list(expense_rows.keys()) + list(bank_balance_rows.keys())
        ))
        months = []
        total_revenue = 0
        total_expenses = 0

        for month in all_months:
            rev = revenue_rows.get(month, 0) or 0
            exp = expense_rows.get(month, 0) or 0
            bal = bank_balance_rows.get(month, 0) or 0
            months.append(CashflowMonthlySummary(
                month=month,
                year=year,
                total_revenue=rev,
                total_expenses=exp,
                net=rev - exp,
                bank_balance=bal,
            ))
            total_revenue += rev
            total_expenses += exp

        return CashflowSummary(
            year=year,
            months=months,
            total_revenue=total_revenue,
            total_expenses=total_expenses,
            net=total_revenue - total_expenses,
        )


# ==================== FX RATES ====================

@router.get("/fx-rates", response_model=List[FXRate])
async def list_fx_rates(
    current_user=Depends(get_current_superadmin),
):
    """List all FX rates."""
    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT * FROM fx_rates ORDER BY effective_date DESC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


@router.post("/fx-rates", response_model=FXRate, status_code=status.HTTP_201_CREATED)
async def add_fx_rate(
    rate: FXRateCreate,
    current_user=Depends(get_current_superadmin),
):
    """Add a new FX rate."""
    rate_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(DATA_DIR / "portal.db") as db:
        try:
            await db.execute(
                """
                INSERT INTO fx_rates (id, from_currency, to_currency, rate, effective_date, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (rate_id, rate.from_currency, rate.to_currency, rate.rate, rate.effective_date, rate.source, now),
            )
            await db.commit()
        except aiosqlite.IntegrityError:
            raise HTTPException(
                status_code=400,
                detail=f"FX rate already exists for {rate.from_currency}/{rate.to_currency} on {rate.effective_date}"
            )

        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM fx_rates WHERE id = ?", (rate_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row)
