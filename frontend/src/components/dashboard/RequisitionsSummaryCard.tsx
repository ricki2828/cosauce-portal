import { Briefcase, Users, MessageSquare, CheckCircle, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RoleStats {
  totalPositions: number;
  filledPositions: number;
  remainingPositions: number;
  openPositions: number;
  interviewingPositions: number;
  offerMadePositions: number;
}

interface RequisitionsSummaryCardProps {
  roleStats: RoleStats;
}

export function RequisitionsSummaryCard({ roleStats }: RequisitionsSummaryCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {/* Open Positions */}
      <Link
        to="/people?tab=requisitions"
        className="block rounded-lg border border-green-200 bg-green-50 p-4 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-gray-600">Open</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600">{roleStats.openPositions}</p>
          </div>
          <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
        </div>
        <p className="text-xs text-gray-500">Positions to fill</p>
      </Link>

      {/* Interviewing Positions */}
      <Link
        to="/people?tab=requisitions"
        className="block rounded-lg border border-blue-200 bg-blue-50 p-4 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-gray-600">Interviewing</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600">{roleStats.interviewingPositions}</p>
          </div>
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
        </div>
        <p className="text-xs text-gray-500">In interview stage</p>
      </Link>

      {/* Offers Made Positions */}
      <Link
        to="/people?tab=requisitions"
        className="block rounded-lg border border-purple-200 bg-purple-50 p-4 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-gray-600">Offers Made</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-600">{roleStats.offerMadePositions}</p>
          </div>
          <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
        </div>
        <p className="text-xs text-gray-500">Pending acceptance</p>
      </Link>

      {/* Filled Positions */}
      <Link
        to="/people?tab=requisitions"
        className="block rounded-lg border border-emerald-200 bg-emerald-50 p-4 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-gray-600">Filled</p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-600">{roleStats.filledPositions}</p>
          </div>
          <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
        </div>
        <p className="text-xs text-gray-500">Roles filled</p>
      </Link>

      {/* Total Positions */}
      <Link
        to="/people?tab=requisitions"
        className="block rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-gray-600">Total Positions</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{roleStats.totalPositions}</p>
          </div>
          <Users className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
        </div>
        <p className="text-xs text-gray-500">{roleStats.remainingPositions} remaining</p>
      </Link>
    </div>
  );
}
