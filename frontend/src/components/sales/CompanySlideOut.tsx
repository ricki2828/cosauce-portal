import { useEffect, useState } from 'react';
import { X, ExternalLink, Zap, Users, MapPin, Linkedin, Globe, Brain, RefreshCw } from 'lucide-react';
import { salesApi } from '../../lib/api';
import type { Company, Contact, JobSignal, BPOAnalysis } from '../../lib/api';
import { StatusDropdown, getSignalTypeConfig } from './StatusDropdown';

interface CompanySlideOutProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onFindContacts: (companyId: string) => Promise<void>;
  onStatusChange: (companyId: string, status: string) => Promise<void>;
}

export function CompanySlideOut({
  company,
  isOpen,
  onClose,
  onFindContacts,
  onStatusChange,
}: CompanySlideOutProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobSignals, setJobSignals] = useState<JobSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'contacts' | 'signals'>('details');
  const [bpoAnalyzing, setBpoAnalyzing] = useState(false);
  const [bpoAnalysis, setBpoAnalysis] = useState<BPOAnalysis | null>(null);

  useEffect(() => {
    if (company && isOpen) {
      fetchCompanyData(company.id);
      // Load existing BPO analysis
      setBpoAnalysis(company.bpo_analysis || null);
    }
  }, [company, isOpen]);

  const fetchCompanyData = async (companyId: string) => {
    try {
      const [contactsRes, signalsRes] = await Promise.all([
        salesApi.getContacts({ company_id: companyId, limit: 50 }),
        salesApi.getJobSignals({ company_id: companyId, limit: 20 }),
      ]);
      setContacts(contactsRes.data);
      setJobSignals(signalsRes.data);
    } catch (error) {
      console.error('Failed to fetch company data:', error);
    }
  };

  const handleAnalyzeBpo = async () => {
    if (!company) return;
    setBpoAnalyzing(true);
    try {
      const response = await salesApi.analyzeBpo(company.id);
      if (response.data.success) {
        setBpoAnalysis({
          fit_level: response.data.fit_level,
          signals: response.data.signals,
          reasoning: response.data.reasoning,
          analyzed_at: response.data.analyzed_at,
        });
      }
    } catch (error) {
      console.error('BPO analysis failed:', error);
      alert('Failed to analyze BPO fit. Please try again.');
    } finally {
      setBpoAnalyzing(false);
    }
  };

  const handleFindContacts = async () => {
    if (!company) return;
    setLoading(true);
    try {
      await onFindContacts(company.id);
      await fetchCompanyData(company.id);
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50
          bg-background border-l-2 border-foreground shadow-pop
          transform transition-transform duration-300 ease-bounce
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          w-full md:w-[480px]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border bg-tertiary/30">
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">{company.name}</h2>
            {company.industry && (
              <p className="text-sm font-body text-foreground/60 font-medium mt-1">{company.industry}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg border-2 border-transparent hover:border-foreground transition-all"
          >
            <X className="w-5 h-5 text-foreground" strokeWidth={2.5} />
          </button>
        </div>

        {/* Status & Actions */}
        <div className="px-6 py-4 bg-card border-b-2 border-border flex items-center justify-between">
          <StatusDropdown
            value={company.status}
            onChange={(status) => onStatusChange(company.id, status)}
          />
          <button
            onClick={handleFindContacts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-quaternary text-foreground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            <Users className="w-4 h-4" strokeWidth={2.5} />
            Find Contacts
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-border bg-muted/50">
          {(['details', 'contacts', 'signals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex-1 py-4 text-sm font-heading font-bold transition-all
                ${activeTab === tab
                  ? 'text-accent bg-background border-b-2 border-accent shadow-[0_2px_0_0_#8B5CF6]'
                  : 'text-foreground/50 hover:text-foreground hover:bg-background/50'
                }
              `}
            >
              {tab === 'details' && 'Details'}
              {tab === 'contacts' && `Contacts (${contacts.length})`}
              {tab === 'signals' && `Signals (${jobSignals.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 220px)' }}>
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Company info */}
              <div className="grid grid-cols-2 gap-4">
                {company.employee_count && (
                  <div className="bg-card p-4 rounded-xl border-2 border-foreground shadow-pop">
                    <div className="text-xs font-body text-mutedForeground uppercase tracking-wider mb-2">Employees</div>
                    <div className="text-2xl font-heading font-extrabold text-foreground">
                      {company.employee_count.toLocaleString()}
                    </div>
                    {company.employee_growth && (
                      <div className={`text-sm font-body font-bold mt-1 ${company.employee_growth > 0 ? 'text-quaternary' : 'text-secondary'}`}>
                        {company.employee_growth > 0 ? '+' : ''}{company.employee_growth.toFixed(1)}% growth
                      </div>
                    )}
                  </div>
                )}
                {company.headquarters && (
                  <div className="bg-card p-4 rounded-xl border-2 border-foreground shadow-pop">
                    <div className="text-xs font-body text-mutedForeground uppercase tracking-wider mb-2">Location</div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-accent" strokeWidth={2.5} />
                      <span className="text-sm font-body font-semibold text-foreground">{company.headquarters}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="space-y-3">
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce"
                  >
                    <Globe className="w-5 h-5 text-accent" strokeWidth={2.5} />
                    <span className="text-sm font-body font-semibold text-foreground flex-1 truncate">{company.website}</span>
                    <ExternalLink className="w-4 h-4 text-foreground/40" strokeWidth={2.5} />
                  </a>
                )}
                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce"
                  >
                    <Linkedin className="w-5 h-5 text-accent" strokeWidth={2.5} />
                    <span className="text-sm font-body font-semibold text-foreground flex-1">LinkedIn</span>
                    <ExternalLink className="w-4 h-4 text-foreground/40" strokeWidth={2.5} />
                  </a>
                )}
              </div>

              {/* BPO Fit Analysis */}
              <div className="bg-card p-5 rounded-xl border-2 border-foreground shadow-pop">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-accent" strokeWidth={2.5} />
                    <span className="text-base font-heading font-bold text-foreground">BPO Fit</span>
                  </div>
                  <button
                    onClick={handleAnalyzeBpo}
                    disabled={bpoAnalyzing}
                    className="px-3 py-1.5 bg-accent/10 text-accent rounded-full font-body font-bold text-xs border-2 border-accent/40 hover:bg-accent/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {bpoAnalyzing ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" strokeWidth={2.5} />
                        Analyzing...
                      </>
                    ) : bpoAnalysis ? (
                      'Re-analyze'
                    ) : (
                      'Analyze'
                    )}
                  </button>
                </div>

                {bpoAnalysis ? (
                  <div className="space-y-4">
                    {/* Fit Level Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-heading font-bold border-2 ${
                        bpoAnalysis.fit_level === 'HIGH'
                          ? 'bg-quaternary/20 text-quaternary border-quaternary/50'
                          : bpoAnalysis.fit_level === 'MEDIUM'
                          ? 'bg-tertiary/20 text-tertiary border-tertiary/50'
                          : bpoAnalysis.fit_level === 'DISQUALIFIED'
                          ? 'bg-secondary/20 text-secondary border-secondary/50'
                          : 'bg-muted text-mutedForeground border-border'
                      }`}
                    >
                      <Brain className="w-4 h-4" strokeWidth={2.5} />
                      {bpoAnalysis.fit_level} Fit
                    </div>

                    {/* Signals */}
                    {bpoAnalysis.signals && bpoAnalysis.signals.length > 0 && (
                      <ul className="space-y-2">
                        {bpoAnalysis.signals.map((signal, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-accent mt-0.5 font-bold">•</span>
                            <span className="text-sm font-body text-foreground/70">{signal}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Reasoning */}
                    {bpoAnalysis.reasoning && (
                      <p className="text-sm font-body text-foreground/60 italic bg-muted/50 p-3 rounded-lg border-2 border-border">
                        {bpoAnalysis.reasoning}
                      </p>
                    )}

                    {/* Analyzed timestamp */}
                    {bpoAnalysis.analyzed_at && (
                      <p className="text-xs font-body text-mutedForeground">
                        Analyzed {new Date(bpoAnalysis.analyzed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-body text-foreground/50">
                    Click "Analyze" to assess this company's outsourcing potential
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-4">
              {contacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-mutedForeground/40" strokeWidth={2} />
                  <p className="text-lg font-heading font-bold text-foreground/70 mb-2">No contacts found</p>
                  <button
                    onClick={handleFindContacts}
                    disabled={loading}
                    className="mt-3 px-4 py-2 bg-accent text-accentForeground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce"
                  >
                    Find contacts with Apollo
                  </button>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.id} className="p-4 bg-card rounded-xl border-2 border-foreground shadow-pop">
                    <div className="font-heading font-bold text-foreground text-base">{contact.name}</div>
                    {contact.title && (
                      <div className="text-sm font-body text-foreground/60 mt-1">{contact.title}</div>
                    )}
                    <div className="flex gap-3 mt-3">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-xs font-body font-bold text-accent hover:text-accent/80 underline"
                        >
                          {contact.email}
                        </a>
                      )}
                      {contact.linkedin_url && (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-body font-bold text-accent hover:text-accent/80 underline"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'signals' && (
            <div className="space-y-4">
              {jobSignals.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="w-16 h-16 mx-auto mb-4 text-mutedForeground/40" strokeWidth={2} />
                  <p className="text-lg font-heading font-bold text-foreground/70">No job signals found</p>
                </div>
              ) : (
                // Sort by signal strength (RFPs first)
                [...jobSignals]
                  .sort((a, b) => b.signal_strength - a.signal_strength)
                  .map((signal) => {
                    const typeConfig = getSignalTypeConfig(signal.signal_type);
                    const isHighPriority = signal.signal_strength >= 4;
                    return (
                      <div
                        key={signal.id}
                        className={`p-4 rounded-xl border-2 ${
                          isHighPriority
                            ? 'bg-secondary/10 border-secondary shadow-pop-pink'
                            : 'bg-card border-foreground shadow-pop'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-heading font-bold border-2 ${typeConfig.color}`}>
                                {typeConfig.label}
                              </span>
                              {isHighPriority && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-heading font-bold bg-secondary/20 text-secondary border-2 border-secondary/40">
                                  High Priority
                                </span>
                              )}
                            </div>
                            <div className="font-heading font-bold text-foreground text-base mb-2">{signal.job_title}</div>
                            <div className="text-xs font-body text-foreground/60 mb-1">
                              {signal.location} • {signal.source}
                            </div>
                            {signal.posted_date && (
                              <div className="text-xs font-body text-mutedForeground">
                                Posted: {new Date(signal.posted_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          {signal.job_url && (
                            <a
                              href={signal.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-accent/10 rounded-lg border-2 border-transparent hover:border-accent transition-all flex-shrink-0"
                            >
                              <ExternalLink className="w-5 h-5 text-accent" strokeWidth={2.5} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
