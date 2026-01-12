import type { Company } from '../../lib/api';
import { Building2, TrendingUp, Calendar, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SalesPipelineKanbanProps {
  companies: Company[];
}

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  bgColor: string;
}

const columns: KanbanColumn[] = [
  { id: 'new', label: 'New Leads', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  { id: 'target', label: 'Qualified', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  { id: 'contacted', label: 'Contacted', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  { id: 'meeting', label: 'Meeting', color: 'text-green-700', bgColor: 'bg-green-50' },
];

export function SalesPipelineKanban({ companies }: SalesPipelineKanbanProps) {
  const getCompaniesByStatus = (status: string) => {
    return companies.filter(company => company.status === status);
  };

  const getLikelihoodDisplay = (company: Company): string => {
    if (company.bpo_analysis?.fit_level) {
      const level = company.bpo_analysis.fit_level;
      if (level === 'HIGH') return 'High';
      if (level === 'MEDIUM') return 'Med';
      if (level === 'LOW') return 'Low';
      return 'TBD';
    }
    return 'TBD';
  };

  const getLikelihoodColor = (company: Company): string => {
    if (company.bpo_analysis?.fit_level) {
      const level = company.bpo_analysis.fit_level;
      if (level === 'HIGH') return 'text-green-600 bg-green-50';
      if (level === 'MEDIUM') return 'text-amber-600 bg-amber-50';
      if (level === 'LOW') return 'text-red-600 bg-red-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {columns.map((column) => {
        const columnCompanies = getCompaniesByStatus(column.id);

        return (
          <div key={column.id} className="flex flex-col">
            {/* Column Header */}
            <div className={`${column.bgColor} rounded-t-lg px-3 py-2 border-t border-l border-r border-gray-200`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold ${column.color}`}>
                  {column.label}
                </h3>
                <span className={`text-xs font-bold ${column.color}`}>
                  {columnCompanies.length}
                </span>
              </div>
            </div>

            {/* Column Cards */}
            <div className="flex-1 bg-gray-50 rounded-b-lg border-l border-r border-b border-gray-200 p-2 space-y-2 min-h-[200px]">
              {columnCompanies.map((company) => (
                <Link
                  key={company.id}
                  to="/sales"
                  className="block bg-white rounded border border-gray-200 p-2.5 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* Company Name */}
                  <div className="flex items-start gap-2 mb-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 flex-1">
                      {company.name}
                    </h4>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-1.5">
                    {/* Size */}
                    {company.size && (
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{company.size}</span>
                      </div>
                    )}

                    {/* Likelihood */}
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-gray-400" />
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getLikelihoodColor(company)}`}>
                        {getLikelihoodDisplay(company)}
                      </span>
                    </div>

                    {/* Target Date */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {company.custom_fields?.target_date
                          ? new Date(company.custom_fields.target_date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Not set'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}

              {columnCompanies.length === 0 && (
                <div className="flex items-center justify-center h-32 text-xs text-gray-400">
                  No companies
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
