import { useState, useEffect, useCallback } from 'react';
import { Upload, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cashflowApi } from '../../lib/api';
import type { CashflowSummary } from '../../lib/finance-types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CashflowMonthlyView } from './CashflowMonthlyView';
import { CashflowImportModal } from './CashflowImportModal';

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CashflowTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState<CashflowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await cashflowApi.getSummary(year);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load cashflow summary:', error);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const latestMonth = summary?.months?.length
    ? summary.months[summary.months.length - 1]
    : null;

  const totalRevenue = summary?.total_revenue ?? 0;
  const totalExpenses = summary?.total_expenses ?? 0;
  const netCash = summary?.net ?? (totalRevenue - totalExpenses);
  const bankBalance = latestMonth?.bank_balance ?? 0;

  const yearOptions = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Upload className="w-4 h-4" />
          Import Excel
        </button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Bank Balance
                </CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bankBalance ? formatCurrency(bankBalance) : '-'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {latestMonth ? `As of month ${latestMonth.month}` : 'No data'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Net Cash Movement
                </CardTitle>
                {netCash >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netCash >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(netCash)}
                </div>
                <p className="text-xs text-gray-500 mt-1">YTD {year}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Expenses: {formatCurrency(totalExpenses)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly view with table + charts */}
          <CashflowMonthlyView year={year} summary={summary} onDataChange={loadSummary} />
        </>
      )}

      {/* Import modal */}
      {showImportModal && (
        <CashflowImportModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadSummary();
          }}
        />
      )}
    </div>
  );
}
