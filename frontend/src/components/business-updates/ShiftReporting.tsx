import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText, Download } from 'lucide-react';
import { businessUpdatesApi } from '../../lib/api';
import type { ShiftUpdate, ComplianceStats, EodReport } from '../../lib/business-updates-types';

export function ShiftReporting() {
  const [activeSection, setActiveSection] = useState<'compliance' | 'updates' | 'reports'>('compliance');

  // Compliance state
  const [complianceDate, setComplianceDate] = useState(new Date().toISOString().split('T')[0]);
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  // Shift updates state
  const [shiftUpdates, setShiftUpdates] = useState<ShiftUpdate[]>([]);
  const [updatesDate, setUpdatesDate] = useState(new Date().toISOString().split('T')[0]);
  const [updatesShiftType, setUpdatesShiftType] = useState<string>('');
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  // EOD reports state
  const [eodReports, setEodReports] = useState<EodReport[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState<string>('');
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EodReport | null>(null);

  // Load compliance stats
  useEffect(() => {
    if (activeSection === 'compliance') {
      loadComplianceStats();
    }
  }, [complianceDate, activeSection]);

  // Load shift updates
  useEffect(() => {
    if (activeSection === 'updates') {
      loadShiftUpdates();
    }
  }, [updatesDate, updatesShiftType, activeSection]);

  // Load EOD reports
  useEffect(() => {
    if (activeSection === 'reports') {
      loadEodReports();
    }
  }, [dateFrom, dateTo, reportType, activeSection]);

  const loadComplianceStats = async () => {
    try {
      setLoadingCompliance(true);
      const response = await businessUpdatesApi.getShiftCompliance(complianceDate);
      setComplianceStats(response.data);
    } catch (error) {
      console.error('Failed to load compliance stats:', error);
    } finally {
      setLoadingCompliance(false);
    }
  };

  const loadShiftUpdates = async () => {
    try {
      setLoadingUpdates(true);
      const params: any = {};
      if (updatesDate) params.shift_date = updatesDate;
      if (updatesShiftType) params.shift_type = updatesShiftType;
      const response = await businessUpdatesApi.getShiftUpdates(params);
      setShiftUpdates(response.data);
    } catch (error) {
      console.error('Failed to load shift updates:', error);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const loadEodReports = async () => {
    try {
      setLoadingReports(true);
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (reportType) params.report_type = reportType;
      const response = await businessUpdatesApi.getEodReports(params);
      setEodReports(response.data);
    } catch (error) {
      console.error('Failed to load EOD reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleGenerateEodReport = async (type: 'interim' | 'final') => {
    if (!confirm(`Generate ${type} EOD report for ${complianceDate}?`)) {
      return;
    }

    try {
      await businessUpdatesApi.generateEodReport({
        report_date: complianceDate,
        report_type: type,
        include_summary: true,
      });
      alert('EOD report generated successfully!');
      loadEodReports();
    } catch (error) {
      console.error('Failed to generate EOD report:', error);
      alert('Failed to generate EOD report.');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Shift Reporting</h2>
        <p className="mt-1 text-sm text-gray-600">
          Monitor shift compliance, view updates, and generate EOD reports
        </p>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSection('compliance')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
              ${activeSection === 'compliance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <CheckCircle className="w-4 h-4" />
            Compliance Dashboard
          </button>
          <button
            onClick={() => setActiveSection('updates')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
              ${activeSection === 'updates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Clock className="w-4 h-4" />
            Shift Updates
          </button>
          <button
            onClick={() => setActiveSection('reports')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
              ${activeSection === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <FileText className="w-4 h-4" />
            EOD Reports
          </button>
        </nav>
      </div>

      {/* Compliance Dashboard */}
      {activeSection === 'compliance' && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Select Date:</label>
              <input
                type="date"
                value={complianceDate}
                onChange={(e) => setComplianceDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setComplianceDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {loadingCompliance ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : complianceStats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Team Leaders */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Team Leaders</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {complianceStats.total_team_leaders}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* SOS Compliance */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-sm text-gray-600 mb-3">Start of Shift (SOS)</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        On Time
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {complianceStats.sos_on_time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Late
                      </span>
                      <span className="text-lg font-bold text-yellow-600">
                        {complianceStats.sos_late}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Missing
                      </span>
                      <span className="text-lg font-bold text-red-600">
                        {complianceStats.sos_missing}
                      </span>
                    </div>
                  </div>
                </div>

                {/* EOS Compliance */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-sm text-gray-600 mb-3">End of Shift (EOS)</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        On Time
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {complianceStats.eos_on_time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Late
                      </span>
                      <span className="text-lg font-bold text-yellow-600">
                        {complianceStats.eos_late}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Missing
                      </span>
                      <span className="text-lg font-bold text-red-600">
                        {complianceStats.eos_missing}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate EOD Report */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate EOD Report</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleGenerateEodReport('interim')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Generate Interim Report
                  </button>
                  <button
                    onClick={() => handleGenerateEodReport('final')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Generate Final Report
                  </button>
                  <p className="text-sm text-gray-600">
                    For {formatDate(complianceDate)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No compliance data available for this date
            </div>
          )}
        </div>
      )}

      {/* Shift Updates */}
      {activeSection === 'updates' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input
                type="date"
                value={updatesDate}
                onChange={(e) => setUpdatesDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <label className="text-sm font-medium text-gray-700">Shift Type:</label>
              <select
                value={updatesShiftType}
                onChange={(e) => setUpdatesShiftType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="SOS">SOS (Start of Shift)</option>
                <option value="EOS">EOS (End of Shift)</option>
              </select>

              <button
                onClick={() => {
                  setUpdatesDate('');
                  setUpdatesShiftType('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Updates Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingUpdates ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : shiftUpdates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team Leader
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Staffing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commentary
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {shiftUpdates.map((update) => (
                      <tr key={update.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {update.team_leader.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {update.team_leader.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${update.shift_type === 'SOS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                            }
                          `}>
                            {update.shift_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(update.shift_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatTime(update.submitted_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {update.staffing_present && update.staffing_total
                            ? `${update.staffing_present}/${update.staffing_total}`
                            : '—'
                          }
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${update.is_on_time
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }
                          `}>
                            {update.is_on_time ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                On Time
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Late
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {update.commentary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No shift updates found
              </div>
            )}
          </div>
        </div>
      )}

      {/* EOD Reports */}
      {activeSection === 'reports' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="interim">Interim</option>
                <option value="final">Final</option>
              </select>

              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setReportType('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Reports List */}
          <div className="bg-white rounded-xl border border-gray-200">
            {loadingReports ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : eodReports.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {eodReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatDate(report.report_date)}
                          </h3>
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${report.report_type === 'final'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }
                          `}>
                            {report.report_type.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">SOS On Time</p>
                            <p className="text-lg font-semibold text-green-600">
                              {report.compliance_stats.sos_on_time}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">SOS Late/Missing</p>
                            <p className="text-lg font-semibold text-red-600">
                              {report.compliance_stats.sos_late + report.compliance_stats.sos_missing}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">EOS On Time</p>
                            <p className="text-lg font-semibold text-green-600">
                              {report.compliance_stats.eos_on_time}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">EOS Late/Missing</p>
                            <p className="text-lg font-semibold text-red-600">
                              {report.compliance_stats.eos_late + report.compliance_stats.eos_missing}
                            </p>
                          </div>
                        </div>

                        {report.executive_summary && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Executive Summary</p>
                            <p className="text-sm text-gray-700">{report.executive_summary}</p>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span>Generated: {formatTime(report.generated_at)}</span>
                          {report.posted_to_whatsapp && (
                            <span className="text-green-600">✓ Posted to WhatsApp</span>
                          )}
                          {report.emailed_to_execs && (
                            <span className="text-green-600">✓ Emailed to Execs</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No EOD reports found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
