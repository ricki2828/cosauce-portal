import { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  Radar,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Zap,
  MapPin,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { salesApi } from '../lib/api';
import type { Company, JobSignal, JobScanResponse } from '../lib/api';

// Signal type badge colors
const SIGNAL_COLORS: Record<string, string> = {
  cx_leadership_hiring: 'bg-purple-100 text-purple-800',
  bilingual_cx_hiring: 'bg-blue-100 text-blue-800',
  contact_center_hiring: 'bg-green-100 text-green-800',
  customer_service_hiring: 'bg-teal-100 text-teal-800',
  bpo_mention: 'bg-orange-100 text-orange-800',
  cx_expansion_hiring: 'bg-indigo-100 text-indigo-800',
  general_hiring: 'bg-gray-100 text-gray-800',
};

const SIGNAL_LABELS: Record<string, string> = {
  cx_leadership_hiring: 'CX Leadership',
  bilingual_cx_hiring: 'Bilingual CX',
  contact_center_hiring: 'Contact Center',
  customer_service_hiring: 'Customer Service',
  bpo_mention: 'BPO/Outsourcing',
  cx_expansion_hiring: 'CX Expansion',
  general_hiring: 'General Hiring',
};

function SignalBadge({ type, strength }: { type: string; strength: number }) {
  const colorClass = SIGNAL_COLORS[type] || SIGNAL_COLORS.general_hiring;
  const label = SIGNAL_LABELS[type] || type.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
      <span className="ml-1 opacity-60">({strength})</span>
    </span>
  );
}

function CompanyRow({
  company,
  signals,
  isExpanded,
  onToggle,
  onEnrich,
  onFindContacts,
}: {
  company: Company;
  signals: JobSignal[];
  isExpanded: boolean;
  onToggle: () => void;
  onEnrich: () => void;
  onFindContacts: () => void;
}) {
  const companySignals = signals.filter((s) => s.company_id === company.id);

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400 mr-2" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 mr-2" />
            )}
            <div>
              <div className="font-medium text-gray-900">{company.name}</div>
              {company.industry && (
                <div className="text-sm text-gray-500">{company.industry}</div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {company.headquarters && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-3 h-3 mr-1" />
              {company.headquarters}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
            <span className="font-semibold text-green-700">{company.score || 0}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-600">{companySignals.length}</span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              company.status === 'target'
                ? 'bg-blue-100 text-blue-800'
                : company.status === 'contacted'
                ? 'bg-yellow-100 text-yellow-800'
                : company.status === 'meeting'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {company.status || 'new'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEnrich}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Enrich with Apollo"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={onFindContacts}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              title="Find Contacts"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && companySignals.length > 0 && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-4 py-3">
            <div className="ml-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Job Signals</h4>
              <div className="space-y-2">
                {companySignals.slice(0, 5).map((signal) => (
                  <div
                    key={signal.id}
                    className="flex items-center justify-between bg-white p-2 rounded border"
                  >
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium">{signal.job_title}</div>
                        <div className="text-xs text-gray-500">
                          {signal.location} &bull; {signal.source}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <SignalBadge type={signal.signal_type} strength={signal.signal_strength} />
                      {signal.job_url && (
                        <a
                          href={signal.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function Sales() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [signals, setSignals] = useState<JobSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanResult, setScanResult] = useState<JobScanResponse | null>(null);

  // Scan form state
  const [scanForm, setScanForm] = useState({
    query: 'bilingual customer service representative',
    location: 'Canada',
    num_results: 50,
    enrich_with_apollo: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, signalsRes] = await Promise.all([
        salesApi.getCompanies({ limit: 100 }),
        salesApi.getJobSignals({ limit: 500 }),
      ]);
      setCompanies(companiesRes.data);
      setSignals(signalsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const response = await salesApi.scanForJobs(scanForm);
      setScanResult(response.data);
      await fetchData();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleEnrich = async (companyId: string) => {
    try {
      await salesApi.enrichCompany(companyId);
      await fetchData();
    } catch (error) {
      console.error('Enrichment failed:', error);
    }
  };

  const handleFindContacts = async (companyId: string) => {
    try {
      await salesApi.findContacts(companyId, 5);
      await fetchData();
    } catch (error) {
      console.error('Find contacts failed:', error);
    }
  };

  const filteredCompanies = companies
    .filter((c) =>
      searchQuery ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="mt-1 text-gray-600">
            Discover companies and track outreach signals
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Job Scan Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Radar className="w-5 h-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold">Job Signal Scanner</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Scan job boards to find companies hiring for customer service roles
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Query
            </label>
            <input
              type="text"
              value={scanForm.query}
              onChange={(e) => setScanForm({ ...scanForm, query: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="bilingual customer service representative"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={scanForm.location}
              onChange={(e) => setScanForm({ ...scanForm, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Canada">Canada</option>
              <option value="United States">United States</option>
              <option value="Toronto, ON">Toronto, ON</option>
              <option value="Montreal, QC">Montreal, QC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Results
            </label>
            <select
              value={scanForm.num_results}
              onChange={(e) =>
                setScanForm({ ...scanForm, num_results: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={20}>20 jobs</option>
              <option value={50}>50 jobs</option>
              <option value={100}>100 jobs</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={scanForm.enrich_with_apollo}
              onChange={(e) =>
                setScanForm({ ...scanForm, enrich_with_apollo: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">
              Enrich top companies with Apollo
            </span>
          </label>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {scanning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Radar className="w-4 h-4 mr-2" />
                Scan Job Boards
              </>
            )}
          </button>
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-800">
              <Zap className="w-5 h-5 mr-2" />
              <span className="font-medium">Scan Complete!</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-600">Jobs Found:</span>{' '}
                <span className="font-medium">{scanResult.total_jobs}</span>
              </div>
              <div>
                <span className="text-green-600">Companies:</span>{' '}
                <span className="font-medium">{scanResult.companies_found}</span>
              </div>
              <div>
                <span className="text-green-600">New:</span>{' '}
                <span className="font-medium">{scanResult.companies_created}</span>
              </div>
              <div>
                <span className="text-green-600">Signals:</span>{' '}
                <span className="font-medium">{scanResult.signals_created}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Search companies..."
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <Building2 className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm text-gray-600">Companies</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{companies.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <Briefcase className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-gray-600">Job Signals</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{signals.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm text-gray-600">Avg Score</span>
          </div>
          <div className="mt-1 text-2xl font-bold">
            {companies.length > 0
              ? Math.round(companies.reduce((sum, c) => sum + (c.score || 0), 0) / companies.length)
              : 0}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm text-gray-600">Top Signal</span>
          </div>
          <div className="mt-1 text-lg font-bold text-orange-600">
            {signals.length > 0 ? SIGNAL_LABELS[signals[0].signal_type] || 'N/A' : 'N/A'}
          </div>
        </div>
      </div>

      {/* Company Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No companies yet</h3>
            <p className="text-gray-600 mb-4">
              Run a job scan to discover companies hiring for CX roles
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Signals
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCompanies.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  signals={signals}
                  isExpanded={expandedCompanyId === company.id}
                  onToggle={() =>
                    setExpandedCompanyId(
                      expandedCompanyId === company.id ? null : company.id
                    )
                  }
                  onEnrich={() => handleEnrich(company.id)}
                  onFindContacts={() => handleFindContacts(company.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
