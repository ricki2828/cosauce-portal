import React, { useState } from 'react';
import type { Employee } from '../../lib/talent-types';
import { getGroupColor } from './ColorSettings';

interface EmployeeDotProps {
  employee: Employee;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  hasPartialRating?: boolean;
}

export default function EmployeeDot({ employee, onClick, size = 'md', hasPartialRating = false }: EmployeeDotProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const color = employee.account_id ? getGroupColor(employee.account_id) : '#6b7280';

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Determine if employee has no ratings at all
  const hasNoRating = !employee.performance && !employee.potential;

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`${sizeClasses[size]} rounded-full border-2 border-white shadow-sm cursor-pointer transition-all hover:scale-125 hover:shadow-md hover:z-10 ${
          hasNoRating ? 'opacity-50' : hasPartialRating ? 'opacity-70' : ''
        }`}
        style={{ backgroundColor: color }}
        aria-label={`${employee.name} - ${employee.role}`}
      />

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
          <div className="font-semibold">{employee.name}</div>
          <div className="text-gray-300">{employee.role}</div>
          {employee.account_id && (
            <div className="text-gray-400 mt-1">Client: {employee.account_name || employee.account_id}</div>
          )}
          <div className="flex gap-3 mt-1 text-gray-400">
            <span>Perf: {employee.performance || <span className="italic">Not rated</span>}</span>
            <span>Pot: {employee.potential || <span className="italic">Not rated</span>}</span>
          </div>
          {(hasNoRating || hasPartialRating) && (
            <div className="text-yellow-400 mt-1 text-[10px]">
              {hasNoRating ? 'Click to add ratings' : 'Missing one rating'}
            </div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
