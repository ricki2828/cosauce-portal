import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cashflowApi } from '../../lib/api';
import type { CashflowAccount, CashflowMonthly, CashflowSummary } from '../../lib/finance-types';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter,
} from '../ui/table';
import { EditableCell } from './EditableCell';

interface CashflowMonthlyViewProps {
  year: number;
  summary: CashflowSummary | null;
  onDataChange: () => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function CashflowMonthlyView({ year, summary, onDataChange }: CashflowMonthlyViewProps) {
  const [accounts, setAccounts] = useState<CashflowAccount[]>([]);
  const [monthlyData, setMonthlyData] = useState<CashflowMonthly[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Add account form
  const [addingTo, setAddingTo] = useState<{ accountType: string; category: string; subcategory: string | null } | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, monthlyRes] = await Promise.all([
        cashflowApi.getAccounts(),
        cashflowApi.getMonthly({ year }),
      ]);
      setAccounts(accountsRes.data);
      setMonthlyData(monthlyRes.data);
    } catch (error) {
      console.error('Failed to load cashflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build lookup: account_id -> { month -> amount }
  const dataByAccount = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    for (const item of monthlyData) {
      if (!item.account_id) continue;
      if (!map[item.account_id]) map[item.account_id] = {};
      map[item.account_id][item.month] = item.amount;
    }
    return map;
  }, [monthlyData]);

  // Filter accounts by type
  const revenueAccounts = useMemo(
    () => accounts.filter(a => a.account_type === 'revenue' && !a.is_computed),
    [accounts]
  );
  const expenseAccounts = useMemo(
    () => accounts.filter(a => a.account_type === 'expense' && !a.is_computed),
    [accounts]
  );
  const summaryAccounts = useMemo(
    () => accounts.filter(a => a.account_type === 'summary'),
    [accounts]
  );

  // Compute totals per month
  const computeTotals = useCallback((accts: CashflowAccount[]) => {
    const totals: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      let sum = 0;
      let hasData = false;
      for (const acct of accts) {
        const val = dataByAccount[acct.id]?.[m];
        if (val != null) {
          sum += val;
          hasData = true;
        }
      }
      if (hasData) totals[m] = sum;
    }
    return totals;
  }, [dataByAccount]);

  const revenueTotals = useMemo(() => computeTotals(revenueAccounts), [computeTotals, revenueAccounts]);
  const expenseTotals = useMemo(() => computeTotals(expenseAccounts), [computeTotals, expenseAccounts]);

  // Save cell
  const handleCellSave = useCallback(async (accountId: string, month: number, amount: number) => {
    await cashflowApi.upsertCell({
      account_id: accountId,
      month,
      year,
      amount,
    });
    // Update local state
    setMonthlyData(prev => {
      const existing = prev.find(
        item => item.account_id === accountId && item.month === month && item.year === year
      );
      if (existing) {
        return prev.map(item =>
          item.account_id === accountId && item.month === month && item.year === year
            ? { ...item, amount }
            : item
        );
      }
      return [...prev, {
        id: 'temp-' + Date.now(),
        month,
        year,
        category: '',
        subcategory: null,
        line_item: null,
        amount,
        currency: 'ZAR',
        is_actual: true,
        notes: null,
        source: 'manual_entry',
        imported_at: new Date().toISOString(),
        account_id: accountId,
      }];
    });
    onDataChange();
  }, [year, onDataChange]);

  // Add account
  const handleAddAccount = async () => {
    if (!addingTo || !newItemName.trim()) return;
    try {
      const newAccount = await cashflowApi.createAccount({
        account_type: addingTo.accountType,
        category: addingTo.category,
        subcategory: addingTo.subcategory,
        line_item: newItemName.trim(),
        display_order: 500,
      });
      setAccounts(prev => [...prev, newAccount.data]);
      setNewItemName('');
      setAddingTo(null);
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  // Rename account
  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await cashflowApi.updateAccount(id, { line_item: renameValue.trim() });
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, line_item: renameValue.trim() } : a));
      setRenamingId(null);
    } catch (error) {
      console.error('Failed to rename:', error);
    }
  };

  // Delete account
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? This will hide it from the table.`)) return;
    try {
      await cashflowApi.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500">No cashflow accounts configured</p>
      </div>
    );
  }

  // Chart data
  const bankBalanceData = (summary?.months || []).map((m) => ({
    month: MONTH_NAMES[m.month - 1],
    balance: m.bank_balance,
  }));

  const revenueChartData = Array.from({ length: 12 }, (_, i) => {
    const entry: Record<string, number | string> = { month: MONTH_NAMES[i] };
    revenueAccounts.forEach((acct) => {
      entry[acct.line_item] = dataByAccount[acct.id]?.[i + 1] || 0;
    });
    return entry;
  });

  const expenseChartData = Array.from({ length: 12 }, (_, i) => {
    const entry: Record<string, number | string> = { month: MONTH_NAMES[i] };
    expenseAccounts.forEach((acct) => {
      entry[acct.line_item] = Math.abs(dataByAccount[acct.id]?.[i + 1] || 0);
    });
    return entry;
  });

  const renderAccountRow = (account: CashflowAccount) => {
    const isHovered = hoveredRow === account.id;
    const amounts = dataByAccount[account.id] || {};

    return (
      <TableRow
        key={account.id}
        onMouseEnter={() => setHoveredRow(account.id)}
        onMouseLeave={() => setHoveredRow(null)}
      >
        <TableCell className="font-medium text-sm relative group min-w-[180px]">
          <div className="flex items-center gap-1">
            {renamingId === account.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename(account.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(account.id);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="text-sm border border-blue-400 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <>
                <span className="truncate">{account.line_item}</span>
                {isHovered && (
                  <span className="flex gap-0.5 ml-auto shrink-0">
                    <button
                      onClick={() => { setRenamingId(account.id); setRenameValue(account.line_item); }}
                      className="p-0.5 text-gray-400 hover:text-blue-600"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id, account.line_item)}
                      className="p-0.5 text-gray-400 hover:text-red-600"
                      title="Deactivate"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </>
            )}
          </div>
        </TableCell>
        {Array.from({ length: 12 }, (_, i) => (
          <TableCell key={i} className="p-0.5">
            <EditableCell
              value={amounts[i + 1] ?? null}
              onSave={(amount) => handleCellSave(account.id, i + 1, amount)}
            />
          </TableCell>
        ))}
      </TableRow>
    );
  };

  const renderComputedRow = (
    label: string,
    totals: Record<number, number>,
    bgClass: string,
    textClass = ''
  ) => (
    <TableRow className={bgClass}>
      <TableCell className={`font-bold text-sm ${textClass}`}>{label}</TableCell>
      {Array.from({ length: 12 }, (_, i) => (
        <TableCell key={i} className={`text-right text-sm font-mono font-bold ${textClass}`}>
          <div className="px-1 py-0.5" title="Auto-calculated from line items">
            {totals[i + 1] != null ? formatCurrency(totals[i + 1]) : '-'}
          </div>
        </TableCell>
      ))}
    </TableRow>
  );

  const renderAddRow = (accountType: string, category: string, subcategory: string | null) => {
    const isAdding = addingTo?.accountType === accountType && addingTo?.category === category;
    if (isAdding) {
      return (
        <TableRow key={`add-${accountType}`}>
          <TableCell colSpan={13} className="py-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAccount();
                  if (e.key === 'Escape') setAddingTo(null);
                }}
                placeholder="Account name..."
                className="text-sm border border-gray-300 rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddAccount}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setAddingTo(null)}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow key={`add-btn-${accountType}`}>
        <TableCell colSpan={13} className="py-0.5">
          <button
            onClick={() => setAddingTo({ accountType, category, subcategory })}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add account
          </button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* Monthly Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Account</TableHead>
              {MONTH_NAMES.map((m) => (
                <TableHead key={m} className="text-right min-w-[90px]">{m}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Revenue section */}
            <TableRow>
              <TableCell colSpan={13} className="bg-green-50 font-semibold text-green-800 text-sm py-1.5">
                Revenue
              </TableCell>
            </TableRow>
            {revenueAccounts.map(renderAccountRow)}
            {renderAddRow('revenue', 'Revenue', 'Client Revenue')}
            {renderComputedRow('Total Revenue', revenueTotals, 'bg-green-50/50')}

            {/* Expenses section */}
            <TableRow>
              <TableCell colSpan={13} className="bg-red-50 font-semibold text-red-800 text-sm py-1.5">
                Expenses
              </TableCell>
            </TableRow>
            {expenseAccounts.map(renderAccountRow)}
            {renderAddRow('expense', 'Expenses', 'Operating Expenses')}
            {renderComputedRow('Total Expenses', expenseTotals, 'bg-red-50/50')}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Net</TableCell>
              {Array.from({ length: 12 }, (_, i) => {
                const rev = revenueTotals[i + 1];
                const exp = expenseTotals[i + 1];
                const hasData = rev != null || exp != null;
                const net = (rev || 0) - Math.abs(exp || 0);
                return (
                  <TableCell
                    key={i}
                    className={`text-right font-mono font-bold ${hasData ? (net >= 0 ? 'text-green-700' : 'text-red-700') : ''}`}
                  >
                    <div className="px-1 py-0.5">
                      {hasData ? formatCurrency(net) : '-'}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Summary section */}
      {summaryAccounts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Summary</TableHead>
                {MONTH_NAMES.map((m) => (
                  <TableHead key={m} className="text-right min-w-[90px]">{m}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryAccounts.map(renderAccountRow)}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Balance Line Chart */}
        {bankBalanceData.some(d => d.balance !== 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Bank Balance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bankBalanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue Bar Chart */}
        {revenueAccounts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Client</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {revenueAccounts.map((acct, i) => (
                  <Bar
                    key={acct.id}
                    dataKey={acct.line_item}
                    stackId="revenue"
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expenses Bar Chart */}
        {expenseAccounts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Expenses by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {expenseAccounts.map((acct, i) => (
                  <Bar
                    key={acct.id}
                    dataKey={acct.line_item}
                    stackId="expenses"
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
