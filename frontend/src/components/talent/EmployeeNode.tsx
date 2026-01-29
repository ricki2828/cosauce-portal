import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { Employee } from '../../lib/talent-types';
import { Mail, Edit2, Trash2 } from 'lucide-react';

interface EmployeeNodeProps {
  data: {
    employee: Employee;
    onEdit: () => void;
    onDelete: () => void;
  };
}

function EmployeeNode({ data }: EmployeeNodeProps) {
  const { employee, onEdit, onDelete } = data;

  // Status colors
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

  const statusClass = statusColors[employee.status] || statusColors.active;
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
          transition-all hover:shadow-lg
          ${statusClass}
        `}
      >
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

        {/* Email */}
        {employee.email && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{employee.email}</span>
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
