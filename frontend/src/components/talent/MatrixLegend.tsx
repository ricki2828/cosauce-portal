import React from 'react';
import type { AccountCampaignType, Employee } from '../../lib/talent-types';
import { getGroupColor } from './EmployeeDot';
import MultiSelect from './MultiSelect';

interface MatrixLegendProps {
  employees: Employee[];
  accounts: AccountCampaignType[];
  roleFilters: string[];
  onRoleFiltersChange: (roles: string[]) => void;
  showUnrated: boolean;
  onShowUnratedChange: (show: boolean) => void;
}

export default function MatrixLegend({
  employees,
  accounts,
  roleFilters,
  onRoleFiltersChange,
  showUnrated,
  onShowUnratedChange,
}: MatrixLegendProps) {
  // Get unique roles from employees
  const uniqueRoles = [...new Set(employees.map((e) => e.role))].sort();

  // Group accounts by campaign type
  const salesAccounts = accounts.filter((a) => a.campaign_type === 'sales');
  const serviceAccounts = accounts.filter((a) => a.campaign_type === 'service');
  const otherAccounts = accounts.filter(
    (a) => !a.campaign_type || !['sales', 'service'].includes(a.campaign_type)
  );

  // Get accounts that have employees assigned
  const activeAccountIds = new Set(employees.map((e) => e.account_id).filter(Boolean));

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
      {/* Role Filter */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Filter by Role</label>
        <MultiSelect
          options={uniqueRoles.map((role) => ({ value: role, label: role }))}
          selected={roleFilters}
          onChange={onRoleFiltersChange}
          placeholder="All Roles"
        />
      </div>

      {/* Show Unrated Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="show-unrated"
          checked={showUnrated}
          onChange={(e) => onShowUnratedChange(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="show-unrated" className="text-sm text-gray-600">
          Show employees without ratings
        </label>
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
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">Stars (Retain & Reward)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-600">High Potentials (Develop)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-gray-600">Core Players (Maintain)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-400" />
            <span className="text-gray-600">Underperformers (Coach)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
