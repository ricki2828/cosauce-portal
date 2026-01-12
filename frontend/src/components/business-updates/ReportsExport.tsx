import { useState, useEffect } from 'react';
import { FileDown, Calendar, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { businessUpdatesApi } from '../../lib/api';
import type { Account } from '../../lib/business-updates-types';

export function ReportsExport() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  // Daily Report State
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyAccount, setDailyAccount] = useState('');

  // Weekly Report State
  const [weeklyStartDate, setWeeklyStartDate] = useState('');
  const [weeklyEndDate, setWeeklyEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Historical Report State
  const [historicalStartDate, setHistoricalStartDate] = useState('');
  const [historicalEndDate, setHistoricalEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [historicalAccount, setHistoricalAccount] = useState('');

  // Agent Report State
  const [agentEmail, setAgentEmail] = useState('');
  const [agentStartDate, setAgentStartDate] = useState('');
  const [agentEndDate, setAgentEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAccounts();

    // Set weekly start date to 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    setWeeklyStartDate(oneWeekAgo.toISOString().split('T')[0]);

    // Set historical start date to 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setHistoricalStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setAgentStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await businessUpdatesApi.getAccounts({ page: 1, page_size: 100, active_only: true });
      setAccounts(response.data.items);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleExport = async (reportType: 'daily' | 'weekly' | 'historical' | 'agent', format: 'excel' | 'csv') => {
    setLoading(true);
    try {
      let response;
      const params: any = {};

      switch (reportType) {
        case 'daily':
          params.target_date = dailyDate;
          if (dailyAccount) params.account_id = dailyAccount;
          response = format === 'excel'
            ? await businessUpdatesApi.exportDailyExcel(params)
            : await businessUpdatesApi.exportDailyCsv(params);
          break;

        case 'weekly':
          params.start_date = weeklyStartDate;
          params.end_date = weeklyEndDate;
          response = format === 'excel'
            ? await businessUpdatesApi.exportWeeklyExcel(params)
            : await businessUpdatesApi.exportWeeklyCsv(params);
          break;

        case 'historical':
          params.start_date = historicalStartDate;
          params.end_date = historicalEndDate;
          if (historicalAccount) params.account_id = historicalAccount;
          response = format === 'excel'
            ? await businessUpdatesApi.exportHistoryExcel(params)
            : await businessUpdatesApi.exportHistoryCsv(params);
          break;

        case 'agent':
          if (!agentEmail) {
            alert('Please enter an agent email');
            setLoading(false);
            return;
          }
          params.email = agentEmail;
          params.start_date = agentStartDate;
          params.end_date = agentEndDate;
          response = await businessUpdatesApi.exportAgentReport({
            email: agentEmail,
            start_date: agentStartDate,
            end_date: agentEndDate,
            format,
          });
          break;
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : 'csv';
      const accountSuffix = (reportType === 'daily' && dailyAccount) || (reportType === 'historical' && historicalAccount)
        ? `_${accounts.find(a => a.id === (dailyAccount || historicalAccount))?.code}`
        : '';
      link.setAttribute('download', `${reportType}_report${accountSuffix}_${timestamp}.${extension}`);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Reports & Export</h2>
        <p className="mt-1 text-sm text-gray-600">
          Export daily, weekly, and historical reports to Excel or CSV
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Report */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Daily Report</h3>
              <p className="text-sm text-gray-600">Single day submission status</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account (optional)
              </label>
              <select
                value={dailyAccount}
                onChange={(e) => setDailyAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleExport('daily', 'excel')}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport('daily', 'csv')}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Report */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Weekly Report</h3>
              <p className="text-sm text-gray-600">Date range summary</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={weeklyStartDate}
                onChange={(e) => setWeeklyStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={weeklyEndDate}
                onChange={(e) => setWeeklyEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleExport('weekly', 'excel')}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport('weekly', 'csv')}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Historical Report */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileDown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Historical Report</h3>
              <p className="text-sm text-gray-600">Trends and patterns</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={historicalStartDate}
                  onChange={(e) => setHistoricalStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={historicalEndDate}
                  onChange={(e) => setHistoricalEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account (optional)
              </label>
              <select
                value={historicalAccount}
                onChange={(e) => setHistoricalAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleExport('historical', 'excel')}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport('historical', 'csv')}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Agent Report */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Agent Report</h3>
              <p className="text-sm text-gray-600">Individual agent history</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Email *
              </label>
              <input
                type="email"
                value={agentEmail}
                onChange={(e) => setAgentEmail(e.target.value)}
                placeholder="agent@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={agentStartDate}
                  onChange={(e) => setAgentStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={agentEndDate}
                  onChange={(e) => setAgentEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleExport('agent', 'excel')}
                disabled={loading || !agentEmail}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport('agent', 'csv')}
                disabled={loading || !agentEmail}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
