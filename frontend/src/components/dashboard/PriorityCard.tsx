import type { Priority } from '../../lib/priorities-types';
import { MessageSquare, Calendar, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PriorityCardProps {
  priority: Priority;
}

export function PriorityCard({ priority }: PriorityCardProps) {
  const statusColors = {
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    deferred: 'bg-gray-100 text-gray-700',
  };

  const latestUpdate = priority.updates && priority.updates.length > 0
    ? priority.updates[0]
    : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Link
      to="/priorities"
      className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
          {priority.title}
        </h3>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[priority.status]}`}>
          {priority.status}
        </span>
      </div>

      {/* Latest Update */}
      {latestUpdate ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 line-clamp-2">
            {latestUpdate.content}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{latestUpdate.author_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(latestUpdate.created_at)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          No updates yet
        </div>
      )}
    </Link>
  );
}
