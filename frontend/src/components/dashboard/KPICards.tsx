import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import axios from 'axios';
import { ViewModeToggle } from './ViewModeToggle';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface MetricKPI {
  metric_name: string;
  metric_type: string;
  primary_value: number | null;
  daily_average: number | null;
  days_in_period: number | null;
  comparison_value: number | null;
  change_pct: number | null;
  // Legacy fields for backward compatibility
  yesterday_value: number | null;
  avg_30_days: number | null;
  wow_change_pct: number | null;
}

interface AccountKPI {
  account_id: string;
  account_name: string;
  account_code: string;
  metrics: MetricKPI[];
}

interface KPIDashboardData {
  period: ViewMode;
  period_label: string;
  comparison_label: string;
  target_date: string;
  period_start: string;
  period_end: string;
  accounts: AccountKPI[];
}

export function KPICards() {
  const [kpiData, setKpiData] = useState<KPIDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  useEffect(() => {
    loadKPIDashboard();
  }, [viewMode]);

  const loadKPIDashboard = async () => {
    try {
      setLoading(true);

      // Call external Performance Portal API
      const performancePortalUrl = import.meta.env.VITE_PERFORMANCE_PORTAL_API_URL || 'https://performance-api.taiaroa.xyz';
      const apiKey = import.meta.env.VITE_PERFORMANCE_PORTAL_API_KEY || 'dev-external-api-key-change-in-production';

      const response = await axios.get(
        `${performancePortalUrl}/api/dashboard/kpis/external`,
        {
          params: {
            api_key: apiKey,
            period: viewMode
          }
        }
      );

      setKpiData(response.data);
    } catch (error) {
      console.error('Failed to load KPI dashboard from Performance Portal:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number | null, metricType: string): string => {
    if (value === null) return '—';
    if (metricType === 'percentage') return `${value}%`;
    return value.toLocaleString();
  };

  const renderWoWBadge = (changePct: number | null) => {
    if (changePct === null) return null;

    const isPositive = changePct > 0;
    const isNeutral = changePct === 0;

    if (isNeutral) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs text-gray-600">
          <Minus className="w-3 h-3" />
          <span>0%</span>
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-0.5 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{isPositive ? '+' : ''}{changePct.toFixed(1)}%</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!kpiData || kpiData.accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No KPI data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with view mode toggle and period label */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            {kpiData.period_label}
          </p>
        </div>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiData.accounts.map((account) => (
          <div key={account.account_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            {/* Account Header */}
            <div className="mb-3 pb-2 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900">{account.account_name}</h4>
              <p className="text-xs text-gray-500">{account.account_code}</p>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              {account.metrics.slice(0, 4).map((metric, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 truncate">{metric.metric_name}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatValue(metric.primary_value, metric.metric_type)}
                      </span>
                      {viewMode !== 'daily' && metric.daily_average !== null && (
                        <p className="text-xs text-gray-500">
                          ({formatValue(metric.daily_average, metric.metric_type)}/day)
                        </p>
                      )}
                    </div>
                    {renderWoWBadge(metric.change_pct)}
                  </div>
                </div>
              ))}
              {account.metrics.length > 4 && (
                <p className="text-xs text-gray-400 text-center pt-1">
                  +{account.metrics.length - 4} more metrics
                </p>
              )}
            </div>

            {/* Footer - comparison context */}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {kpiData.comparison_label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
