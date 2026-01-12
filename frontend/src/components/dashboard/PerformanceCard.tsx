import type { DashboardAccount } from '../../lib/business-updates-types';
import { CheckCircle, Clock, Users, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PerformanceCardProps {
  account: DashboardAccount;
}

export function PerformanceCard({ account }: PerformanceCardProps) {
  const getRateColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRateBgColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-50';
    if (rate >= 50) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <Link
      to="/business-updates"
      className={`block rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all ${getRateBgColor(account.submission_rate)}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{account.account_name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{account.account_code}</p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* Submission Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-green-100">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Submitted</p>
            <p className="text-sm font-bold text-gray-900">{account.submitted_count}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-amber-100">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-sm font-bold text-gray-900">{account.pending_count}</p>
          </div>
        </div>
      </div>

      {/* Submission Rate */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">Submission Rate</span>
          <span className="font-semibold text-gray-900">{account.submission_rate.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getRateColor(account.submission_rate)}`}
            style={{ width: `${account.submission_rate}%` }}
          ></div>
        </div>
      </div>

      {/* Agent Count */}
      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-1.5 text-xs text-gray-600">
        <Users className="w-3.5 h-3.5" />
        <span>{account.total_agents} agents</span>
      </div>
    </Link>
  );
}
