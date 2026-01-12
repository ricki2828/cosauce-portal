import type { DashboardData } from '../../lib/business-updates-types';
import type { ShiftUpdate } from '../../lib/business-updates-types';
import { CheckCircle, Clock, Users, TrendingUp, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PerformanceCardProps {
  dashboard: DashboardData;
  recentCommentary?: ShiftUpdate | null;
}

export function PerformanceCard({ dashboard, recentCommentary }: PerformanceCardProps) {
  const getRateColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRateBgColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-50 border-green-200';
    if (rate >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Main KPI Card */}
      <Link
        to="/business-updates"
        className={`block rounded-lg border p-4 hover:shadow-sm transition-all ${getRateBgColor(dashboard.overall_submission_rate)}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-gray-600">Overall Submission Rate</p>
            <p className={`text-3xl font-bold ${getRateColor(dashboard.overall_submission_rate)}`}>
              {dashboard.overall_submission_rate.toFixed(0)}%
            </p>
          </div>
          <TrendingUp className={`w-6 h-6 ${getRateColor(dashboard.overall_submission_rate)}`} />
        </div>
        <div className="text-xs text-gray-500">
          {dashboard.total_accounts} accounts • {dashboard.target_date}
        </div>
      </Link>

      {/* Stats Cards */}
      <Link to="/business-updates" className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all bg-white">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">Submitted</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{dashboard.total_submitted}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{dashboard.total_pending}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-1.5 text-xs text-gray-600">
          <Users className="w-3.5 h-3.5" />
          <span>{dashboard.total_agents} total agents</span>
        </div>
      </Link>

      {/* Recent Commentary */}
      <Link to="/business-updates" className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all bg-white">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <p className="text-xs font-medium text-gray-900">Latest Update</p>
        </div>
        {recentCommentary ? (
          <div>
            <p className="text-xs text-gray-700 line-clamp-3 mb-2">{recentCommentary.commentary}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium">{recentCommentary.team_leader.name}</span>
              <span>•</span>
              <span>{recentCommentary.shift_type}</span>
              <span>•</span>
              <span>{new Date(recentCommentary.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No recent updates</p>
        )}
      </Link>
    </div>
  );
}
