import React from 'react';
import { Settings } from 'lucide-react';
import type { AccountCampaignType, Employee } from '../../lib/talent-types';
import { getGroupColor } from './ColorSettings';
import MultiSelect from './MultiSelect';

interface MatrixLegendProps {
  employees: Employee[];
  accounts: AccountCampaignType[];
  roleFilters: string[];
  onRoleFiltersChange: (roles: string[]) => void;
  clientFilters: string[];
  onClientFiltersChange: (clients: string[]) => void;
  departmentFilters: string[];
  onDepartmentFiltersChange: (departments: string[]) => void;
  onOpenColorSettings: () => void;
}

export default function MatrixLegend({
  employees,
  accounts,
  roleFilters,
  onRoleFiltersChange,
  clientFilters,
  onClientFiltersChange,
  departmentFilters,
  onDepartmentFiltersChange,
  onOpenColorSettings,
}: MatrixLegendProps) {
  // Get unique values from employees
  const uniqueRoles = [...new Set(employees.map((e) => e.role))].sort();
  const uniqueDepartments = [...new Set(employees.map((e) => e.department).filter(Boolean))] as string[];
  const uniqueClients = [...new Set(employees.map((e) => e.account_id).filter(Boolean))] as string[];

  // Group accounts by campaign type
  const salesAccounts = accounts.filter((a) => a.campaign_type === 'sales');
  const serviceAccounts = accounts.filter((a) => a.campaign_type === 'service');
  const otherAccounts = accounts.filter(
    (a) => !a.campaign_type || !['sales', 'service'].includes(a.campaign_type)
  );

  // Get accounts that have employees assigned
  const activeAccountIds = new Set(employees.map((e) => e.account_id).filter(Boolean));

  // Count ratings status
  const fullyRated = employees.filter((e) => e.performance && e.potential).length;
  const partiallyRated = employees.filter(
    (e) => (e.performance && !e.potential) || (!e.performance && e.potential)
  ).length;
  const unrated = employees.filter((e) => !e.performance && !e.potential).length;

  // Get account name by ID
  const getAccountName = (id: string) => {
    const account = accounts.find(a => a.id === id);
    return account?.name || id;
  };

  const renderAccountBadge = (account: AccountCampaignType) => {
    const color = getGroupColor(account.id);
    const isActive = activeAccountIds.has(account.id);

    return (
      <div
        key={account.id}
        className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
          isActive ? '' : 'opacity-40'
        }`}
        style={{
          backgroundColor: `${color}20`,
          color: color,
          borderLeft: `3px solid ${color}`,
        }}
      >
        {account.name}
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      {/* Filters Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-600">Filters</h4>
          <button
            onClick={onOpenColorSettings}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Color Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Role Filter */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Role</label>
          <MultiSelect
            options={uniqueRoles.map((role) => ({ value: role, label: role }))}
            selected={roleFilters}
            onChange={onRoleFiltersChange}
            placeholder="All Roles"
          />
        </div>

        {/* Client Filter */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Client</label>
          <MultiSelect
            options={uniqueClients.map((id) => ({ value: id, label: getAccountName(id) }))}
            selected={clientFilters}
            onChange={onClientFiltersChange}
            placeholder="All Clients"
          />
        </div>

        {/* Department Filter */}
        {uniqueDepartments.length > 0 && (
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <MultiSelect
              options={uniqueDepartments.sort().map((dept) => ({ value: dept, label: dept }))}
              selected={departmentFilters}
              onChange={onDepartmentFiltersChange}
              placeholder="All Departments"
            />
          </div>
        )}
      </div>

      {/* Rating Status Summary */}
      <div className="border-t pt-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-2">Rating Status</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Fully rated</span>
            <span className="font-medium text-green-600">{fullyRated}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Partially rated</span>
            <span className="font-medium text-amber-600">{partiallyRated}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Not rated</span>
            <span className="font-medium text-gray-500">{unrated}</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-gray-700 font-medium">Total</span>
            <span className="font-bold">{employees.length}</span>
          </div>
        </div>
      </div>

      {/* Client Colors by Category */}
      <div className="border-t pt-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-3">Clients by Type</h4>

        {/* Sales Clients */}
        {salesAccounts.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Sales
            </div>
            <div className="flex flex-wrap gap-1">{salesAccounts.map(renderAccountBadge)}</div>
          </div>
        )}

        {/* Service Clients */}
        {serviceAccounts.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-blue-700 font-medium mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              Service
            </div>
            <div className="flex flex-wrap gap-1">{serviceAccounts.map(renderAccountBadge)}</div>
          </div>
        )}

        {/* Other Clients */}
        {otherAccounts.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-600 font-medium mb-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              Other
            </div>
            <div className="flex flex-wrap gap-1">{otherAccounts.map(renderAccountBadge)}</div>
          </div>
        )}
      </div>

      {/* Quadrant Key */}
      <div className="border-t pt-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-2">Quadrant Key</h4>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">Stars - Retain & Reward</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-600">High Potentials - Develop Perf</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-gray-600">Core Players - Develop Potential</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-400" />
            <span className="text-gray-600">Underperformers - Coach/Exit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
