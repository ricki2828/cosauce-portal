import { Building2, MapPin, Users, Trash2, Brain } from 'lucide-react';
import type { Company } from '../../lib/api';
import { StatusDropdown } from './StatusDropdown';

interface CompanyTableProps {
  companies: Company[];
  selectedIds: Set<string>;
  onSelectChange: (ids: Set<string>) => void;
  onRowClick: (company: Company) => void;
  onStatusChange: (companyId: string, status: string) => void;
  onDelete: (companyId: string) => void;
  signalCounts: Record<string, number>;
}

export function CompanyTable({
  companies,
  selectedIds,
  onSelectChange,
  onRowClick,
  onStatusChange,
  onDelete,
  signalCounts,
}: CompanyTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectChange(new Set(companies.map(c => c.id)));
    } else {
      onSelectChange(new Set());
    }
  };

  const handleSelectOne = (companyId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(companyId);
    } else {
      newSelected.delete(companyId);
    }
    onSelectChange(newSelected);
  };

  const allSelected = companies.length > 0 && selectedIds.size === companies.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < companies.length;

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted border-b-2 border-border">
          <tr>
            <th className="w-10 px-4 py-4">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-2 border-border bg-input text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0"
              />
            </th>
            <th className="px-4 py-4 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
              Company
            </th>
            <th className="px-4 py-4 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
              Industry
            </th>
            <th className="px-4 py-4 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
              Size
            </th>
            <th className="px-4 py-4 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider hidden md:table-cell">
              Location
            </th>
            <th className="px-4 py-4 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
              BPO Fit
            </th>
            <th className="px-4 py-4 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
              Signals
            </th>
            <th className="px-4 py-4 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="w-10 px-4 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {companies.map((company) => (
            <tr
              key={company.id}
              className="hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={(e) => {
                // Don't trigger row click if clicking checkbox or dropdown
                if ((e.target as HTMLElement).closest('input, select')) return;
                onRowClick(company);
              }}
            >
              <td className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(company.id)}
                  onChange={(e) => handleSelectOne(company.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-2 border-border bg-input text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0"
                />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center border-2 border-accent/20">
                    <Building2 className="w-5 h-5 text-accent" strokeWidth={2.5} />
                  </div>
                  <div className="font-heading font-bold text-foreground">{company.name}</div>
                </div>
              </td>
              <td className="px-4 py-4">
                {company.industry ? (
                  <span className="text-sm font-body text-foreground/70">{company.industry}</span>
                ) : (
                  <span className="text-mutedForeground text-sm font-body">-</span>
                )}
              </td>
              <td className="px-4 py-4">
                {company.employee_count ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-foreground/40" strokeWidth={2.5} />
                    <span className="font-body font-semibold text-foreground">{company.employee_count.toLocaleString()}</span>
                    {company.employee_growth && (
                      <span className={`text-xs font-heading font-bold px-2 py-1 rounded-full border-2 ${company.employee_growth > 0 ? 'bg-quaternary/20 text-quaternary border-quaternary/40' : 'bg-secondary/20 text-secondary border-secondary/40'}`}>
                        {company.employee_growth > 0 ? '+' : ''}{company.employee_growth.toFixed(0)}%
                      </span>
                    )}
                  </div>
                ) : company.size ? (
                  <span className="text-sm font-body text-foreground/60">{company.size}</span>
                ) : (
                  <span className="text-mutedForeground text-sm font-body">-</span>
                )}
              </td>
              <td className="px-4 py-4 hidden md:table-cell">
                {company.headquarters ? (
                  <div className="flex items-center gap-1 text-sm font-body text-foreground/60">
                    <MapPin className="w-4 h-4 text-foreground/40" strokeWidth={2.5} />
                    {company.headquarters}
                  </div>
                ) : (
                  <span className="text-mutedForeground text-sm font-body">-</span>
                )}
              </td>
              <td className="px-4 py-4">
                {company.bpo_analysis ? (
                  <div className="space-y-2 max-w-xs">
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-heading font-bold border-2 ${
                        company.bpo_analysis.fit_level === 'HIGH'
                          ? 'bg-quaternary/20 text-quaternary border-quaternary/50'
                          : company.bpo_analysis.fit_level === 'MEDIUM'
                          ? 'bg-tertiary/20 text-tertiary border-tertiary/50'
                          : company.bpo_analysis.fit_level === 'DISQUALIFIED'
                          ? 'bg-secondary/20 text-secondary border-secondary/50'
                          : 'bg-muted text-mutedForeground border-border'
                      }`}
                    >
                      <Brain className="w-3 h-3" strokeWidth={2.5} />
                      {company.bpo_analysis.fit_level}
                    </div>
                    {company.bpo_analysis.signals && company.bpo_analysis.signals.length > 0 && (
                      <div className="space-y-1">
                        {company.bpo_analysis.signals.slice(0, 3).map((signal, idx) => (
                          <div key={idx} className="flex items-start gap-1 text-xs font-body text-foreground/60">
                            <span className="text-accent mt-0.5">•</span>
                            <span className="line-clamp-2">{signal}</span>
                          </div>
                        ))}
                        {company.bpo_analysis.signals.length > 3 && (
                          <div className="text-xs font-body text-mutedForeground italic">
                            +{company.bpo_analysis.signals.length - 3} more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-mutedForeground text-sm font-body">Not analyzed</span>
                )}
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-heading font-bold bg-accent/20 text-accent border-2 border-accent/40">
                  {signalCounts[company.id] || 0}
                </span>
              </td>
              <td className="px-4 py-4">
                <div onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown
                    value={company.status}
                    onChange={(status) => onStatusChange(company.id, status)}
                  />
                </div>
              </td>
              <td className="px-4 py-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${company.name}?`)) {
                      onDelete(company.id);
                    }
                  }}
                  className="p-2 text-foreground/40 hover:text-secondary rounded-lg hover:bg-secondary/20 border-2 border-transparent hover:border-secondary/40 transition-all"
                  title="Delete company"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {companies.length === 0 && (
        <div className="text-center py-16 text-mutedForeground">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-mutedForeground/40" strokeWidth={2} />
          <p className="text-xl font-heading font-bold text-foreground/70">No companies found</p>
          <p className="text-sm font-body mt-2">Run a job scan to discover companies</p>
        </div>
      )}
    </div>
  );
}
