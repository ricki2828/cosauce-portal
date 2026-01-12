import { useState, useEffect } from 'react';
import { Plus, FileText, ExternalLink, Calendar, Trash2, X, Search, Bell, BellRing, Play, Loader2 } from 'lucide-react';
import { salesApi } from '../../lib/api';
import type { RFP, RFPCreate, RFPAlert, RFPSearchResult } from '../../lib/api';

const RFP_STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-muted text-mutedForeground border-border' },
  { value: 'reviewing', label: 'Reviewing', color: 'bg-tertiary/20 text-tertiary border-tertiary/40' },
  { value: 'preparing', label: 'Preparing Bid', color: 'bg-accent/20 text-accent border-accent/40' },
  { value: 'submitted', label: 'Submitted', color: 'bg-quaternary/20 text-quaternary border-quaternary/40' },
  { value: 'won', label: 'Won', color: 'bg-quaternary/20 text-quaternary border-quaternary/40' },
  { value: 'lost', label: 'Lost', color: 'bg-secondary/20 text-secondary border-secondary/40' },
];

function getStatusColor(status: string): string {
  return RFP_STATUS_OPTIONS.find(s => s.value === status)?.color || RFP_STATUS_OPTIONS[0].color;
}

interface RFPTrackerProps {
  onRefresh?: () => void;
}

type TabType = 'tracker' | 'search' | 'alerts';

export function RFPTracker({ onRefresh }: RFPTrackerProps) {
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [alerts, setAlerts] = useState<RFPAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('tracker');

  // Add RFP form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRfp, setNewRfp] = useState<RFPCreate>({
    title: '',
    issuer: '',
    description: '',
    url: '',
    deadline: '',
    region: 'Canada',
    value_estimate: '',
    source: 'manual',
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('contact center outsourcing');
  const [searchRegion, setSearchRegion] = useState('Canada');
  const [searchResults, setSearchResults] = useState<RFPSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Alert form state
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [newAlert, setNewAlert] = useState({ name: '', search_query: '', region: 'Canada' });

  const fetchRfps = async () => {
    setLoading(true);
    try {
      const response = await salesApi.getRfps();
      setRfps(response.data);
    } catch (error) {
      console.error('Failed to fetch RFPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await salesApi.getRfpAlerts(false);
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  useEffect(() => {
    if (isExpanded && rfps.length === 0) {
      fetchRfps();
      fetchAlerts();
    }
  }, [isExpanded]);

  const handleAddRfp = async () => {
    if (!newRfp.title || !newRfp.issuer) return;

    try {
      await salesApi.createRfp(newRfp);
      setShowAddForm(false);
      setNewRfp({
        title: '',
        issuer: '',
        description: '',
        url: '',
        deadline: '',
        region: 'Canada',
        value_estimate: '',
        source: 'manual',
      });
      await fetchRfps();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to create RFP:', error);
    }
  };

  const handleStatusChange = async (rfpId: string, status: string) => {
    try {
      await salesApi.updateRfp(rfpId, { status });
      setRfps(prev => prev.map(r => r.id === rfpId ? { ...r, status } : r));
    } catch (error) {
      console.error('Failed to update RFP status:', error);
    }
  };

  const handleDeleteRfp = async (rfpId: string) => {
    if (!confirm('Delete this RFP?')) return;

    try {
      await salesApi.deleteRfp(rfpId);
      setRfps(prev => prev.filter(r => r.id !== rfpId));
    } catch (error) {
      console.error('Failed to delete RFP:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const response = await salesApi.searchRfps(searchQuery, searchRegion);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.name || !newAlert.search_query) return;

    try {
      await salesApi.createRfpAlert(newAlert);
      setShowAlertForm(false);
      setNewAlert({ name: '', search_query: '', region: 'Canada' });
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  };

  const handleRunAlert = async (alertId: string) => {
    try {
      await salesApi.runRfpAlert(alertId);
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to run alert:', error);
    }
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      await salesApi.updateRfpAlert(alertId, isActive);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_active: isActive } : a));
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Delete this alert?')) return;

    try {
      await salesApi.deleteRfpAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const activeRfps = rfps.filter(r => !['won', 'lost'].includes(r.status));
  const closedRfps = rfps.filter(r => ['won', 'lost'].includes(r.status));
  const activeAlerts = alerts.filter(a => a.is_active);

  return (
    <div className="bg-card rounded-xl border-2 border-foreground shadow-pop p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-tertiary/10 rounded-lg flex items-center justify-center border-2 border-tertiary/20 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5 text-tertiary" strokeWidth={2.5} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-foreground text-lg">RFP Tracker</span>
            {activeRfps.length > 0 && (
              <span className="px-3 py-1 text-xs font-body font-bold bg-tertiary/20 text-tertiary border-2 border-tertiary/40 rounded-full">
                {activeRfps.length} active
              </span>
            )}
            {activeAlerts.length > 0 && (
              <span className="px-3 py-1 text-xs font-body font-bold bg-accent/20 text-accent border-2 border-accent/40 rounded-full">
                {activeAlerts.length} alerts
              </span>
            )}
          </div>
        </div>
        <span className="text-sm font-body font-bold text-accent">
          {isExpanded ? 'Hide' : 'Expand'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Tabs */}
          <div className="flex border-b-2 border-border">
            {(['tracker', 'search', 'alerts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-body font-bold border-b-2 -mb-0.5 transition-all ${
                  activeTab === tab
                    ? 'text-accent border-accent'
                    : 'text-foreground/60 border-transparent hover:text-foreground'
                }`}
              >
                {tab === 'tracker' && 'My RFPs'}
                {tab === 'search' && 'Search'}
                {tab === 'alerts' && `Alerts (${activeAlerts.length})`}
              </button>
            ))}
          </div>

          {/* Tracker Tab */}
          {activeTab === 'tracker' && (
            <div className="space-y-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-accentForeground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Add RFP
              </button>

              {showAddForm && (
                <div className="bg-card rounded-xl border-2 border-foreground shadow-pop p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-bold text-foreground">Add New RFP</h4>
                    <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-muted rounded-lg border-2 border-transparent hover:border-foreground transition-all">
                      <X className="w-5 h-5 text-foreground" strokeWidth={2.5} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-body font-bold text-foreground mb-2">Title *</label>
                      <input
                        type="text"
                        value={newRfp.title}
                        onChange={(e) => setNewRfp({ ...newRfp, title: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="Contact Centre Services RFP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-body font-bold text-foreground mb-2">Issuer *</label>
                      <input
                        type="text"
                        value={newRfp.issuer}
                        onChange={(e) => setNewRfp({ ...newRfp, issuer: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="Government of Canada"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-body font-bold text-foreground mb-2">Deadline</label>
                      <input
                        type="date"
                        value={newRfp.deadline}
                        onChange={(e) => setNewRfp({ ...newRfp, deadline: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-body font-bold text-foreground mb-2">Region</label>
                      <select
                        value={newRfp.region}
                        onChange={(e) => setNewRfp({ ...newRfp, region: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Canada">Canada</option>
                        <option value="Ontario">Ontario</option>
                        <option value="Quebec">Quebec</option>
                        <option value="British Columbia">British Columbia</option>
                        <option value="United States">United States</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-body font-bold text-foreground mb-2">Est. Value</label>
                      <input
                        type="text"
                        value={newRfp.value_estimate}
                        onChange={(e) => setNewRfp({ ...newRfp, value_estimate: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="$500K - $1M"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-body font-bold text-foreground mb-2">URL</label>
                      <input
                        type="url"
                        value={newRfp.url}
                        onChange={(e) => setNewRfp({ ...newRfp, url: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="https://buyandsell.gc.ca/..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-sm font-body font-bold text-foreground hover:bg-muted rounded-xl border-2 border-border transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddRfp}
                      disabled={!newRfp.title || !newRfp.issuer}
                      className="px-4 py-2 bg-accent text-accentForeground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                    >
                      Add RFP
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" strokeWidth={2.5} />
                </div>
              ) : activeRfps.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-foreground/30" strokeWidth={2.5} />
                  <p className="font-body font-bold text-foreground">No active RFPs</p>
                  <p className="text-sm font-body text-foreground/60 mt-1">Add RFPs from tender portals or use Search to find them</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeRfps.map((rfp) => (
                    <div
                      key={rfp.id}
                      className="flex items-start justify-between p-3 bg-card rounded-xl border-2 border-border shadow-pop hover:shadow-pop-hover transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-body font-bold text-foreground truncate">{rfp.title}</span>
                          {rfp.url && (
                            <a
                              href={rfp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground/40 hover:text-tertiary transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </a>
                          )}
                        </div>
                        <div className="text-sm font-body text-foreground/70">{rfp.issuer}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs font-body text-foreground/50">
                          {rfp.deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" strokeWidth={2.5} />
                              {new Date(rfp.deadline).toLocaleDateString()}
                            </span>
                          )}
                          {rfp.region && <span>{rfp.region}</span>}
                          {rfp.value_estimate && <span>{rfp.value_estimate}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <select
                          value={rfp.status}
                          onChange={(e) => handleStatusChange(rfp.id, e.target.value)}
                          className={`appearance-none cursor-pointer px-3 py-1.5 pr-7 rounded-full text-xs font-body font-bold border-2 focus:outline-none focus:shadow-pop transition-all ${getStatusColor(rfp.status)}`}
                        >
                          {RFP_STATUS_OPTIONS.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDeleteRfp(rfp.id)}
                          className="p-1.5 text-foreground/40 hover:text-secondary hover:bg-secondary/10 rounded-lg border-2 border-transparent hover:border-secondary/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {closedRfps.length > 0 && (
                <div className="pt-3 border-t-2 border-border">
                  <h4 className="text-sm font-body font-bold text-foreground/60 mb-2">Closed ({closedRfps.length})</h4>
                  <div className="space-y-1">
                    {closedRfps.slice(0, 5).map((rfp) => (
                      <div key={rfp.id} className="flex items-center justify-between p-2 text-sm font-body text-foreground/60">
                        <span className="truncate">{rfp.title}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-body font-bold border-2 ${getStatusColor(rfp.status)}`}>
                          {rfp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <p className="text-sm font-body text-foreground/70">
                Search for contact centre RFPs and tenders from government and private sector portals.
              </p>

              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="contact center outsourcing"
                  />
                </div>
                <select
                  value={searchRegion}
                  onChange={(e) => setSearchRegion(e.target.value)}
                  className="px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="Canada">Canada</option>
                  <option value="Ontario">Ontario</option>
                  <option value="Quebec">Quebec</option>
                  <option value="United States">United States</option>
                </select>
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery}
                  className="flex items-center gap-2 px-6 py-3 bg-accent text-accentForeground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Search className="w-4 h-4" strokeWidth={2.5} />
                  )}
                  Search
                </button>
              </div>

              {/* Save as Alert button */}
              <button
                onClick={() => {
                  setNewAlert({ name: `${searchQuery} - ${searchRegion}`, search_query: searchQuery, region: searchRegion });
                  setShowAlertForm(true);
                  setActiveTab('alerts');
                }}
                className="flex items-center gap-2 text-sm font-body font-bold text-quaternary hover:text-quaternary/80 transition-colors"
              >
                <Bell className="w-4 h-4" strokeWidth={2.5} />
                Save as daily alert
              </button>

              {searchResults && (
                <div className="space-y-3">
                  <div className="text-sm font-body font-bold text-foreground">
                    {searchResults.rfps_found} results from {searchResults.searches_performed.length} searches
                  </div>

                  {/* Suggested Sources */}
                  <div className="bg-tertiary/10 border-2 border-tertiary/30 rounded-xl shadow-pop p-4">
                    <h5 className="text-sm font-body font-bold text-tertiary mb-3">Recommended Tender Portals</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {searchResults.suggested_sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-card rounded-xl border-2 border-border hover:border-tertiary hover:shadow-pop transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-tertiary" strokeWidth={2.5} />
                          <div>
                            <div className="font-body font-bold text-foreground text-sm">{source.name}</div>
                            <div className="text-xs font-body text-foreground/60">{source.description}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <p className="text-sm font-body text-foreground/70">
                Set up alerts to automatically check for new RFPs daily.
              </p>

              <button
                onClick={() => setShowAlertForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-quaternary text-foreground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce"
              >
                <Bell className="w-4 h-4" strokeWidth={2.5} />
                Create Alert
              </button>

              {showAlertForm && (
                <div className="bg-card rounded-xl border-2 border-foreground shadow-pop p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-bold text-foreground">New Alert</h4>
                    <button onClick={() => setShowAlertForm(false)} className="p-2 hover:bg-muted rounded-lg border-2 border-transparent hover:border-foreground transition-all">
                      <X className="w-5 h-5 text-foreground" strokeWidth={2.5} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-body font-bold text-foreground mb-2">Alert Name *</label>
                      <input
                        type="text"
                        value={newAlert.name}
                        onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="Contact Center RFPs - Canada"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-body font-bold text-foreground mb-2">Search Query *</label>
                      <input
                        type="text"
                        value={newAlert.search_query}
                        onChange={(e) => setNewAlert({ ...newAlert, search_query: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="contact center outsourcing"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-body font-bold text-foreground mb-2">Region</label>
                      <select
                        value={newAlert.region}
                        onChange={(e) => setNewAlert({ ...newAlert, region: e.target.value })}
                        className="w-full px-4 py-3 bg-input border-2 border-border rounded-xl font-body text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Canada">Canada</option>
                        <option value="Ontario">Ontario</option>
                        <option value="Quebec">Quebec</option>
                        <option value="United States">United States</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAlertForm(false)}
                      className="px-4 py-2 text-sm font-body font-bold text-foreground hover:bg-muted rounded-xl border-2 border-border transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAlert}
                      disabled={!newAlert.name || !newAlert.search_query}
                      className="px-4 py-2 bg-quaternary text-foreground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                    >
                      Create Alert
                    </button>
                  </div>
                </div>
              )}

              {alerts.length === 0 ? (
                <div className="text-center py-6">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-foreground/30" strokeWidth={2.5} />
                  <p className="font-body font-bold text-foreground">No alerts configured</p>
                  <p className="text-sm font-body text-foreground/60 mt-1">Create an alert to monitor for new RFPs daily</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 shadow-pop transition-all ${
                        alert.is_active
                          ? 'bg-quaternary/10 border-quaternary/30'
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {alert.is_active ? (
                          <BellRing className="w-5 h-5 text-quaternary" strokeWidth={2.5} />
                        ) : (
                          <Bell className="w-5 h-5 text-foreground/40" strokeWidth={2.5} />
                        )}
                        <div>
                          <div className="font-body font-bold text-foreground">{alert.name}</div>
                          <div className="text-xs font-body text-foreground/60">
                            {alert.search_query} &middot; {alert.region}
                            {alert.last_checked && (
                              <span className="ml-2">
                                Last: {new Date(alert.last_checked).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRunAlert(alert.id)}
                          className="p-1.5 text-quaternary hover:bg-quaternary/10 rounded-lg border-2 border-transparent hover:border-quaternary/20 transition-all"
                          title="Run now"
                        >
                          <Play className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => handleToggleAlert(alert.id, !alert.is_active)}
                          className={`px-3 py-1 text-xs font-body font-bold rounded-full border-2 transition-all ${
                            alert.is_active
                              ? 'bg-quaternary/20 text-quaternary border-quaternary/40'
                              : 'bg-muted text-mutedForeground border-border'
                          }`}
                        >
                          {alert.is_active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-1.5 text-foreground/40 hover:text-secondary hover:bg-secondary/10 rounded-lg border-2 border-transparent hover:border-secondary/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
