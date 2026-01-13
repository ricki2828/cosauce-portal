import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  isEmpty?: boolean;
  action?: ReactNode;
}

export function DashboardSection({
  title,
  icon: Icon,
  children,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No data available',
  isEmpty = false,
  action,
}: DashboardSectionProps) {
  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Failed to load data</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !loading && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && !isEmpty && children}
    </div>
  );
}
