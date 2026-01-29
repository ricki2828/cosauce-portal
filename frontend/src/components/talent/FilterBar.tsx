import React, { useMemo } from 'react';
import { Filter } from 'lucide-react';
import type { Employee } from '../../lib/talent-types';
import MultiSelect from './MultiSelect';

interface FilterBarProps {
  allEmployees: Employee[];
  statusFilter: string;
  roleFilters: string[];
  departmentFilters: string[];
  clientFilters: string[];
  onStatusChange: (status: string) => void;
  onRoleFiltersChange: (roles: string[]) => void;
  onDepartmentFiltersChange: (depts: string[]) => void;
  onClientFiltersChange: (clients: string[]) => void;
}

export default function FilterBar({
  allEmployees,
  statusFilter,
  roleFilters,
  departmentFilters,
  clientFilters,
  onStatusChange,
  onRoleFiltersChange,
  onDepartmentFiltersChange,
  onClientFiltersChange
}: FilterBarProps) {
  // Extract unique roles from all employees
  const roleOptions = useMemo(() => {
    const roleCounts = new Map<string, number>();
    allEmployees.forEach(emp => {
      roleCounts.set(emp.role, (roleCounts.get(emp.role) || 0) + 1);
    });
    return Array.from(roleCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([role, count]) => ({ value: role, label: role, count }));
  }, [allEmployees]);

  // Extract unique departments from all employees
  const departmentOptions = useMemo(() => {
    const deptCounts = new Map<string, number>();
    allEmployees.forEach(emp => {
      if (emp.department) {
        deptCounts.set(emp.department, (deptCounts.get(emp.department) || 0) + 1);
      }
    });
    return Array.from(deptCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dept, count]) => ({ value: dept, label: dept, count }));
  }, [allEmployees]);

  // Extract unique clients from all employees
  const clientOptions = useMemo(() => {
    const clientCounts = new Map<string, number>();
    allEmployees.forEach(emp => {
      if (emp.account_id) {
        clientCounts.set(emp.account_id, (clientCounts.get(emp.account_id) || 0) + 1);
      }
    });
    return Array.from(clientCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([client, count]) => ({ value: client, label: client, count }));
  }, [allEmployees]);

  const hasActiveFilters = statusFilter !== 'active' || roleFilters.length > 0 ||
                           departmentFilters.length > 0 || clientFilters.length > 0;

  const clearAllFilters = () => {
    onStatusChange('active');
    onRoleFiltersChange([]);
    onDepartmentFiltersChange([]);
    onClientFiltersChange([]);
  };

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex items-center gap-4 flex-wrap">
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

        {/* Job Title multi-select */}
        <div>
          <MultiSelect
            label="Job Titles"
            options={roleOptions}
            selected={roleFilters}
            onChange={onRoleFiltersChange}
            placeholder="All Job Titles"
          />
        </div>

        {/* Department multi-select */}
        <div>
          <MultiSelect
            label="Departments"
            options={departmentOptions}
            selected={departmentFilters}
            onChange={onDepartmentFiltersChange}
            placeholder="All Departments"
          />
        </div>

        {/* Client multi-select */}
        <div>
          <MultiSelect
            label="Clients"
            options={clientOptions}
            selected={clientFilters}
            onChange={onClientFiltersChange}
            placeholder="All Clients"
          />
        </div>

        {/* Clear all filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
