import { useState } from 'react';
import { Building2, Search, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { salesApi } from '../../lib/api';
import type { JobScanResponse } from '../../lib/api';

interface CompanyFinderProps {
  onScanComplete: () => void;
}

export function CompanyFinder({ onScanComplete }: CompanyFinderProps) {
  const [query, setQuery] = useState('bilingual customer service representative');
  const [location, setLocation] = useState('Canada');
  const [numResults, setNumResults] = useState(20);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<JobScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleScan = async () => {
    setIsScanning(true);
    setLastResult(null);
    setError(null);
    try {
      console.log('Starting job scan with:', { query, location, num_results: numResults });
      const response = await salesApi.scanForJobs({
        query,
        location,
        num_results: numResults,
        enrich_with_apollo: false,
      });
      console.log('Scan response:', response.data);
      setLastResult(response.data);
      onScanComplete();
    } catch (error: any) {
      console.error('Scan failed:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to scan for companies. Please try again.';
      setError(errorMsg);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border-2 border-foreground shadow-pop p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center border-2 border-accent/20 group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5 text-accent" strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-heading font-bold text-foreground text-lg block">Company Finder</span>
            <span className="text-sm font-body text-foreground/60">Search job postings to discover companies</span>
          </div>
        </div>
        <span className="text-sm font-body font-bold text-accent">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body font-bold text-foreground mb-2">
                Job Search Query
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                placeholder="e.g., bilingual customer service, contact centre manager"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-bold text-foreground mb-2">
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
              >
                <option value="Canada">Canada</option>
                <option value="United States">United States</option>
                <option value="Toronto, Canada">Toronto, Canada</option>
                <option value="Montreal, Canada">Montreal, Canada</option>
                <option value="Vancouver, Canada">Vancouver, Canada</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-body font-bold text-foreground mb-2">
                Max Results
              </label>
              <select
                value={numResults}
                onChange={(e) => setNumResults(Number(e.target.value))}
                className="px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex-1" />

            <button
              onClick={handleScan}
              disabled={isScanning || !query}
              className="flex items-center gap-2 px-6 py-3 bg-accent text-accentForeground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                  Finding Companies...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" strokeWidth={2.5} />
                  Find Companies
                </>
              )}
            </button>
          </div>

          {lastResult && (
            <div className="bg-quaternary/10 border-2 border-quaternary/30 rounded-xl shadow-pop p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-quaternary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <div className="text-sm font-body text-foreground">
                  <span className="font-bold">Search complete!</span>
                  {' '}Found <span className="font-bold text-quaternary">{lastResult.companies_found}</span> companies
                  {' '}from {lastResult.total_jobs} job postings.
                  {lastResult.companies_created > 0 && (
                    <> Added <span className="font-bold text-quaternary">{lastResult.companies_created}</span> new companies to your pipeline.</>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-secondary/10 border-2 border-secondary/30 rounded-xl shadow-pop p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <div className="text-sm font-body text-foreground">
                  <span className="font-bold">Error:</span> {error}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
