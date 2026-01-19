import type { Requisition } from '../../lib/api';
import { Users, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RequisitionMiniCardProps {
  requisition: Requisition;
}

export function RequisitionMiniCard({ requisition }: RequisitionMiniCardProps) {
  const statusColors = {
    open: 'bg-green-100 text-green-800',
    interviewing: 'bg-blue-100 text-blue-800',
    offer_made: 'bg-purple-100 text-purple-800',
    filled: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const roles = requisition.roles || [];
  const totalRemaining = roles.reduce((sum, role) => sum + role.remaining_count, 0);
  const totalRequested = roles.reduce((sum, role) => sum + role.requested_count, 0);
  const totalFilled = roles.reduce((sum, role) => sum + role.filled_count, 0);

  return (
    <Link
      to="/people"
      className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
          {requisition.title}
        </h3>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[requisition.status]}`}>
          {requisition.status.replace('_', ' ')}
        </span>
      </div>

      {/* Department & Location */}
      <div className="space-y-1 mb-3">
        <p className="text-xs text-gray-600">{requisition.department}</p>
        {requisition.location && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span>{requisition.location}</span>
          </div>
        )}
      </div>

      {/* Role Summary */}
      <div className="mb-2">
        <p className="text-xs text-gray-500 mb-1.5">Roles</p>
        {roles.length > 0 ? (
          <div className="space-y-1">
            {roles.slice(0, 2).map((role, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{role.role_type}</span>
                <span className="text-gray-500">
                  {role.filled_count}/{role.requested_count}
                  {role.remaining_count > 0 && (
                    <span className="ml-1 text-amber-600">({role.remaining_count} rem)</span>
                  )}
                </span>
              </div>
            ))}
            {roles.length > 2 && (
              <p className="text-xs text-gray-400">+{roles.length - 2} more</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No roles defined</p>
        )}
      </div>

      {/* Total Progress */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="w-3 h-3" />
            <span>Total Progress</span>
          </div>
          <span className="font-semibold text-gray-900">
            {totalFilled}/{totalRequested}
            {totalRemaining > 0 && (
              <span className="ml-1 text-amber-600">({totalRemaining} remaining)</span>
            )}
          </span>
        </div>
      </div>

      {/* Target Start Date */}
      {requisition.target_start_date && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>Needed: {new Date(requisition.target_start_date).toLocaleDateString()}</span>
        </div>
      )}

      {/* Latest Comment */}
      {requisition.latest_comment && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-700 line-clamp-2 mb-1">
            {requisition.latest_comment.content}
          </p>
          <p className="text-xs text-gray-500">
            — {requisition.latest_comment.author_name}
          </p>
        </div>
      )}
    </Link>
  );
}
