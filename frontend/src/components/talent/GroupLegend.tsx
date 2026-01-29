import React from 'react';
import type { Employee } from '../../lib/talent-types';

// Generate consistent color for a group name (same as in EmployeeNode)
function getGroupColor(groupName: string): string {
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

  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

interface GroupLegendProps {
  employees: Employee[];
}

export default function GroupLegend({ employees }: GroupLegendProps) {
  // Extract unique departments and clients
  const departments = new Set<string>();
  const clients = new Set<string>();

  employees.forEach(emp => {
    if (emp.department) departments.add(emp.department);
    if (emp.account_id) clients.add(emp.account_id);
  });

  const hasDepartments = departments.size > 0;
  const hasClients = clients.size > 0;

  if (!hasDepartments && !hasClients) {
    return null;
  }

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Departments */}
        {hasDepartments && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Departments:</span>
            <div className="flex gap-2 flex-wrap">
              {Array.from(departments).sort().map(dept => {
                const color = getGroupColor(dept);
                return (
                  <div
                    key={dept}
                    className="text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                      borderLeft: `3px solid ${color}`
                    }}
                  >
                    🏢 {dept}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clients */}
        {hasClients && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Clients:</span>
            <div className="flex gap-2 flex-wrap">
              {Array.from(clients).sort().map(client => {
                const color = getGroupColor(client);
                return (
                  <div
                    key={client}
                    className="text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                      borderLeft: `3px solid ${color}`
                    }}
                  >
                    👥 {client}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
