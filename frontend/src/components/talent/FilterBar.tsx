import React, { useEffect, useState } from 'react';
import { talentApi } from '../../lib/api';
import type { Department } from '../../lib/talent-types';
import { Filter } from 'lucide-react';

interface FilterBarProps {
  statusFilter: string;
  departmentFilter: string;
  onStatusChange: (status: string) => void;
  onDepartmentChange: (dept: string) => void;
}

export default function FilterBar({
  statusFilter,
  departmentFilter,
  onStatusChange,
  onDepartmentChange
}: FilterBarProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoadingDepts(true);
      const response = await talentApi.getDepartments();
      setDepartments(response.data);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoadingDepts(false);
    }
  };

  return (
    <div className="bg-white border-b px-6 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2 text-gray-700">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters:</span>
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="onboarding">Onboarding</option>
        <option value="offboarded">Offboarded</option>
        <option value="">All Statuses</option>
      </select>

      {/* Department filter */}
      <select
        value={departmentFilter}
        onChange={(e) => onDepartmentChange(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={loadingDepts}
      >
        <option value="">All Departments</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name} ({dept.employee_count})
          </option>
        ))}
      </select>

      {/* Active filter indicator */}
      {(statusFilter !== 'active' || departmentFilter) && (
        <button
          onClick={() => {
            onStatusChange('active');
            onDepartmentChange('');
          }}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
