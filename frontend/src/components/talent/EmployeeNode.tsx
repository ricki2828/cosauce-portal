import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { Employee } from '../../lib/talent-types';
import { Mail, Edit2, Trash2, Calendar, MoveHorizontal, MoveVertical } from 'lucide-react';

// Helper function to calculate tenure
function calculateTenure(startDate: string | null): string | null {
  if (!startDate) return null;

  const start = new Date(startDate);
  const now = new Date();

  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Starts soon';
  if (diffDays === 0) return 'Started today';
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;

  const months = Math.floor(diffDays / 30);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  } else {
    return `${years}y ${remainingMonths}m`;
  }
}

interface EmployeeNodeProps {
  data: {
    employee: Employee;
    onEdit: () => void;
    onDelete: () => void;
    hasReports?: boolean;
    layoutDirection?: 'horizontal' | 'vertical';
    onToggleLayout?: () => void;
    groupColor?: string;
  };
}

// Generate consistent color for a group name
function getGroupColor(groupName: string | null): string | null {
  if (!groupName) return null;

  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
  ];

  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function EmployeeNode({ data }: EmployeeNodeProps) {
  const { employee, onEdit, onDelete, hasReports, layoutDirection = 'horizontal', onToggleLayout, groupColor } = data;

  // Determine which group to use for coloring (prioritize account_id over department)
  const groupName = employee.account_id || employee.department;
  const color = groupColor || getGroupColor(groupName);

  // Performance-based colors (takes priority if set)
  const performanceColors = {
    'Excellent': 'bg-emerald-50 border-emerald-300',
    'High': 'bg-green-50 border-green-200',
    'Good': 'bg-amber-50 border-amber-200',
    'Low': 'bg-orange-50 border-orange-300',
    'Very Low': 'bg-red-50 border-red-300'
  };

  // Status colors (fallback)
  const statusColors = {
    active: 'bg-green-50 border-green-200',
    pending: 'bg-yellow-50 border-yellow-200',
    onboarding: 'bg-blue-50 border-blue-200',
    offboarded: 'bg-red-50 border-red-200'
  };

  const statusDots = {
    active: 'bg-green-500',
    pending: 'bg-yellow-500',
    onboarding: 'bg-blue-500',
    offboarded: 'bg-red-500'
  };

  // Use performance color if available, otherwise use status color
  const cardClass = employee.performance
    ? performanceColors[employee.performance]
    : statusColors[employee.status] || statusColors.active;
  const dotClass = statusDots[employee.status] || statusDots.active;

  return (
    <div className="group relative">
      {/* Top handle (for incoming connections) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400"
      />

      {/* Employee card */}
      <div
        className={`
          w-48 rounded-lg border-2 border-dashed p-4 shadow-sm
          transition-all hover:shadow-lg relative
          ${cardClass}
        `}
        style={color ? {
          borderLeftWidth: '6px',
          borderLeftStyle: 'solid',
          borderLeftColor: color,
          boxShadow: `0 0 0 1px ${color}15`
        } : undefined}
      >
        {/* Layout toggle (if has reports) */}
        {hasReports && onToggleLayout && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLayout();
            }}
            className="absolute top-2 left-2 p-1.5 bg-white rounded-md shadow-sm hover:bg-blue-50 hover:shadow transition-all z-10 border border-gray-200"
            title={layoutDirection === 'horizontal' ? 'Switch to vertical layout (stack reports)' : 'Switch to horizontal layout (spread reports)'}
          >
            {layoutDirection === 'horizontal' ? (
              <MoveVertical className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <MoveHorizontal className="w-3.5 h-3.5 text-blue-600" />
            )}
          </button>
        )}

        {/* Status indicator */}
        <div className="absolute top-2 right-2">
          <div className={`w-2 h-2 rounded-full ${dotClass}`} title={employee.status} />
        </div>

        {/* Name */}
        <div className="font-bold text-gray-900 text-sm mb-1 pr-4">
          {employee.name}
        </div>

        {/* Job title */}
        <div className="text-xs text-gray-600 mb-2">
          {employee.role}
        </div>

        {/* Department (if exists) */}
        {employee.department && (
          <div className="text-xs text-gray-500 mb-2 italic">
            {employee.department}
          </div>
        )}

        {/* Client/Account Badge (if exists) */}
        {employee.account_id && color && (
          <div className="mb-2">
            <div
              className="text-[10px] px-2 py-0.5 rounded-full font-medium inline-block"
              style={{
                backgroundColor: `${color}20`,
                color: color
              }}
            >
              👥 {employee.account_id}
            </div>
          </div>
        )}

        {/* Tenure */}
        {calculateTenure(employee.start_date) && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{calculateTenure(employee.start_date)}</span>
          </div>
        )}

        {/* Email */}
        {employee.email && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{employee.email}</span>
          </div>
        )}

        {/* Performance & Potential Badges */}
        {(employee.performance || employee.potential) && (
          <div className="flex gap-1 mt-2">
            {employee.performance && (
              <div className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                P: {employee.performance}
              </div>
            )}
            {employee.potential && (
              <div className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                Pot: {employee.potential}
              </div>
            )}
          </div>
        )}

        {/* Action buttons (show on hover) */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 rounded-lg transition-all">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 justify-center items-center h-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 bg-white rounded-full shadow-md hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
              title="Offboard"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom handle (for outgoing connections) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400"
      />
    </div>
  );
}

export default memo(EmployeeNode);
