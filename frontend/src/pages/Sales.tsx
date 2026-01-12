import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Search, Filter } from 'lucide-react';
import { salesApi } from '../lib/api';
import type { Company, JobSignal, Contact } from '../lib/api';
import {
  CompanyFinder,
  SalesStats,
  BulkActionToolbar,
  CompanyTable,
  CompanySlideOut,
  RFPTracker,
  ProgressModal,
} from '../components/sales';

export function Sales() {
  // Data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allSignals, setAllSignals] = useState<JobSignal[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Slide-out state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSlideOutOpen, setSlideOutOpen] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Progress tracking state
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
    current_company: string;
    success_count: number;
    failed_count: number;
    percentage: number;
    done?: boolean;
  } | null>(null);

  // Compute signal counts per company
  const signalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const signal of allSignals) {
      counts[signal.company_id] = (counts[signal.company_id] || 0) + 1;
    }
    return counts;
  }, [allSignals]);

  // Filter and sort companies (by BPO fit, highest to lowest)
  const filteredCompanies = useMemo(() => {
    const filtered = companies.filter((c) => {
      const matchesSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.industry?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort by BPO fit level (HIGH > MEDIUM > LOW > competitor/null), then by updated_at
    return filtered.sort((a, b) => {
      // Competitors rank below LOW fit companies
      const isACompetitor = a.status === 'competitor';
      const isBCompetitor = b.status === 'competitor';

      if (isACompetitor && !isBCompetitor) return 1;  // A goes lower
      if (!isACompetitor && isBCompetitor) return -1; // B goes lower

      // Both competitors or both non-competitors, sort by fit level
      const fitOrder = { HIGH: 3, MEDIUM: 2, LOW: 1, DISQUALIFIED: 0 };
      const aFit = a.bpo_analysis?.fit_level ? fitOrder[a.bpo_analysis.fit_level] || 0 : 0;
      const bFit = b.bpo_analysis?.fit_level ? fitOrder[b.bpo_analysis.fit_level] || 0 : 0;

      if (aFit !== bFit) {
        return bFit - aFit; // Higher fit first
      }

      // If same fit level, sort by most recently updated
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [companies, searchQuery, statusFilter]);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, signalsRes, contactsRes] = await Promise.all([
        salesApi.getCompanies({ limit: 500 }),
        salesApi.getJobSignals({ limit: 500 }),
        salesApi.getContacts({ limit: 500 }),
      ]);
      setCompanies(companiesRes.data);
      setAllSignals(signalsRes.data);
      setAllContacts(contactsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler: Update company status
  const handleStatusChange = async (companyId: string, status: string) => {
    try {
      await salesApi.updateCompany(companyId, { status });
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, status } : c))
      );
      // Update selected company if it's open
      if (selectedCompany?.id === companyId) {
        setSelectedCompany((prev) => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Handler: Find contacts for single company
  const handleFindContacts = async (companyId: string) => {
    try {
      await salesApi.findContacts(companyId, 5);
      await fetchData();
    } catch (error) {
      console.error('Find contacts failed:', error);
    }
  };

  // Handler: Delete company
  const handleDelete = async (companyId: string) => {
    try {
      await salesApi.deleteCompany(companyId);
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
      // Close slide-out if deleting the currently selected company
      if (selectedCompany?.id === companyId) {
        setSlideOutOpen(false);
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Bulk handlers
  const handleBulkAnalyzeBpo = async () => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    setShowProgress(true);
    setProgress({
      processed: 0,
      total: ids.length,
      current_company: 'Starting...',
      success_count: 0,
      failed_count: 0,
      percentage: 0,
    });

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://cosauce.taiaroa.xyz';

      // Use fetch with streaming to support POST requests
      const response = await fetch(`${API_BASE_URL}/api/sales/bulk/analyze-bpo-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_ids: ids }),
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonData = line.slice(6); // Remove 'data: ' prefix
            try {
              const progressData = JSON.parse(jsonData);
              setProgress(progressData);

              if (progressData.done) {
                // Wait a moment to show the completion state
                await new Promise(resolve => setTimeout(resolve, 500));
                await fetchData(); // Refresh data
                setSelectedIds(new Set()); // Clear selection
                break;
              }
            } catch (e) {
              console.warn('Failed to parse progress data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Bulk BPO analysis failed:', error);
      alert('BPO analysis failed. Check console for details.');
      setShowProgress(false);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkFindContacts = async () => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      const response = await salesApi.bulkFindContacts(ids, 5);
      const result = response.data;
      await fetchData();
      setSelectedIds(new Set());
      alert(`Found ${result.contacts_found || 0} contacts for ${result.success?.length || 0} companies.`);
    } catch (error) {
      console.error('Bulk find contacts failed:', error);
      alert('Find contacts failed. Check console for details.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      await salesApi.bulkUpdateStatus(ids, status);
      setCompanies((prev) =>
        prev.map((c) => (ids.includes(c.id) ? { ...c, status } : c))
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk status change failed:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExport = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    setBulkLoading(true);
    try {
      const response = await salesApi.exportCompanies(ids);
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `companies-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      // Delete each company (could add bulk delete endpoint later)
      await Promise.all(ids.map((id) => salesApi.deleteCompany(id)));
      setCompanies((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedIds(new Set());
      // Close slide-out if showing a deleted company
      if (selectedCompany && ids.includes(selectedCompany.id)) {
        setSlideOutOpen(false);
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  // Handler: Row click opens slide-out
  const handleRowClick = (company: Company) => {
    setSelectedCompany(company);
    setSlideOutOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Playful Hero Section */}
      <div className="relative bg-tertiary pb-20 pt-16 px-8 mb-16 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary rounded-full opacity-30"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-quaternary rounded-full opacity-40"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-heading text-6xl font-extrabold text-foreground tracking-tight mb-4">
                Sales Pipeline
              </h1>
              <p className="font-body text-xl text-foreground/70 font-medium max-w-xl">
                Discover companies hiring for CX roles
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-8 py-4 bg-accent text-accentForeground rounded-full font-bold border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce flex items-center gap-3"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-8 space-y-8 pb-16">
        {/* RFP Tracker - Sticker Card */}
        <div className="bg-card border-2 border-foreground rounded-xl shadow-pop-soft p-6 hover:animate-wiggle transition-all">
          <RFPTracker onRefresh={fetchData} />
        </div>

        {/* Company Finder - Sticker Card */}
        <div className="bg-card border-2 border-foreground rounded-xl shadow-pop-pink p-6 hover:animate-wiggle transition-all">
          <CompanyFinder onScanComplete={fetchData} />
        </div>

        {/* Stats */}
        <SalesStats
          companies={companies}
          totalSignals={allSignals.length}
          totalContacts={allContacts.length}
        />

        {/* Search & Filter Bar */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" strokeWidth={2.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-input border-2 border-border rounded-full text-foreground placeholder-mutedForeground font-body focus:outline-none focus:border-accent focus:shadow-pop transition-all"
              placeholder="Search companies..."
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" strokeWidth={2.5} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-12 pr-8 py-4 bg-input border-2 border-border rounded-full text-foreground font-body appearance-none focus:outline-none focus:border-accent focus:shadow-pop transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="target">Target</option>
              <option value="contacted">Contacted</option>
              <option value="meeting">Meeting</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Toolbar (when items selected) */}
        {selectedIds.size > 0 && (
          <BulkActionToolbar
            selectedCount={selectedIds.size}
            onAnalyzeBpo={handleBulkAnalyzeBpo}
            onFindContacts={handleBulkFindContacts}
            onStatusChange={handleBulkStatusChange}
            onExport={handleExport}
            onDelete={handleBulkDelete}
            onClearSelection={() => setSelectedIds(new Set())}
            isLoading={bulkLoading}
          />
        )}

        {/* Company Table */}
        {loading ? (
          <div className="bg-card border-2 border-foreground rounded-xl shadow-pop p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" strokeWidth={2.5} />
            <p className="text-mutedForeground text-lg font-body font-medium">Loading companies...</p>
          </div>
        ) : (
          <div className="bg-card border-2 border-foreground rounded-xl shadow-pop overflow-hidden">
            <CompanyTable
              companies={filteredCompanies}
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              onRowClick={handleRowClick}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              signalCounts={signalCounts}
            />
          </div>
        )}
      </div>

      {/* Slide-out Panel */}
      <CompanySlideOut
        company={selectedCompany}
        isOpen={isSlideOutOpen}
        onClose={() => setSlideOutOpen(false)}
        onFindContacts={handleFindContacts}
        onStatusChange={handleStatusChange}
      />

      {/* Progress Modal */}
      <ProgressModal
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
        progress={progress}
        title="Analyzing BPO Fit"
      />
    </div>
  );
}
