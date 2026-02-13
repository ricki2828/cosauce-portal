import type { NewHire } from '../../lib/api';
import { User, Calendar, CheckCircle, Clock } from 'lucide-react';

interface NewHireMiniCardProps {
  hire: NewHire;
  onClick?: (hire: NewHire) => void;
}

export function NewHireMiniCard({ hire, onClick }: NewHireMiniCardProps) {
  const statusColors = {
    pending: 'bg-amber-100 text-amber-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  // Calculate task completion percentage
  const totalTasks = hire.tasks?.length || 0;
  const completedTasks = hire.tasks?.filter(t => t.completed).length || 0;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <div
      onClick={() => onClick?.(hire)}
      className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
          <User className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{hire.name}</h3>
          <p className="text-xs text-gray-500 truncate">{hire.role}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-3">
        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[hire.status]}`}>
          {hire.status}
        </span>
      </div>

      {/* Start Date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
        <Calendar className="w-3.5 h-3.5" />
        <span>Started: {formatDate(hire.start_date)}</span>
      </div>

      {/* Task Progress */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1 text-gray-600">
            {completionPercentage === 100 ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            <span>Onboarding</span>
          </div>
          <span className="font-semibold text-gray-900">
            {completedTasks}/{totalTasks} tasks
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getProgressColor(completionPercentage)}`}
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{completionPercentage.toFixed(0)}% complete</p>
      </div>
    </div>
  );
}
