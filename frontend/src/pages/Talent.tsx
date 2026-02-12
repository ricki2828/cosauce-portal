import React, { useState, useEffect, useMemo } from 'react';
import { talentApi } from '../lib/api';
import type { OrgNode, Employee } from '../lib/talent-types';
import { Plus, Loader2, Network, Grid3X3 } from 'lucide-react';
import { OrgChart, EmployeeModal, FilterBar, GroupLegend, TalentMatrix } from '../components/talent';

type TabType = 'org-chart' | 'talent-matrix';

export function Talent() {
  const [activeTab, setActiveTab] = useState<TabType>('org-chart');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Filter state (for org chart)
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [clientFilters, setClientFilters] = useState<string[]>([]);

  // Load data
  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load employees with status filter only (we'll filter client-side for the rest)
      const employeesResponse = await talentApi.getEmployees({
        status: statusFilter
      });

      setAllEmployees(employeesResponse.data);
    } catch (err: any) {
      console.error('Failed to load talent data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to build org tree from flat employee list
  const buildOrgTree = (employees: Employee[], parentId: string | null = null): OrgNode[] => {
    const roots = employees.filter(emp => emp.manager_id === parentId);
    return roots.map(emp => ({
      ...emp,
      reports: buildOrgTree(employees, emp.id)
    }));
  };

  // Filter employees and build org tree client-side
  const { filteredEmployees, orgTree } = useMemo(() => {
    // Apply client-side filters
    let filtered = allEmployees;

    if (roleFilters.length > 0) {
      filtered = filtered.filter(emp => roleFilters.includes(emp.role));
    }

    if (departmentFilters.length > 0) {
      filtered = filtered.filter(emp => emp.department && departmentFilters.includes(emp.department));
    }

    if (clientFilters.length > 0) {
      filtered = filtered.filter(emp => emp.account_id && clientFilters.includes(emp.account_id));
    }

    // Build org tree from filtered employees
    const tree = buildOrgTree(filtered);

    return {
      filteredEmployees: filtered,
      orgTree: tree
    };
  }, [allEmployees, roleFilters, departmentFilters, clientFilters]);

  // CRUD handlers
  const handleCreate = async (data: any) => {
    try {
      await talentApi.createEmployee(data);
      await loadData();
      setShowModal(false);
    } catch (err: any) {
      alert('Failed to create employee: ' + (err.response?.data?.detail || err.message));
      throw err; // Re-throw to keep modal open
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await talentApi.updateEmployee(id, data);
      await loadData();
      setShowModal(false);
      setEditingEmployee(null);
    } catch (err: any) {
      alert('Failed to update employee: ' + (err.response?.data?.detail || err.message));
      throw err; // Re-throw to keep modal open
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Mark this employee as offboarded?')) return;

    try {
      await talentApi.deleteEmployee(id);
      await loadData();
    } catch (err: any) {
      alert('Failed to delete employee: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
  };

  const handleLayoutToggle = async (employeeId: string, currentLayout: 'horizontal' | 'vertical' | 'grouped') => {
    // Cycle through layouts: horizontal -> vertical -> grouped -> horizontal
    const next = currentLayout === 'horizontal' ? 'vertical' : currentLayout === 'vertical' ? 'grouped' : 'horizontal';

    try {
      await talentApi.updateEmployee(employeeId, { layout_direction: next });
      await loadData(); // Reload to get updated layout
    } catch (err: any) {
      console.error('Error updating layout direction:', err);
      alert('Failed to update layout direction: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading talent data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-900 font-semibold mb-2">Error Loading Data</h3>
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Talent</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredEmployees.length} of {allEmployees.length} {statusFilter || 'total'} employee{allEmployees.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Person
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b -mb-4">
          <button
            onClick={() => setActiveTab('org-chart')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'org-chart'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Network className="w-4 h-4" />
            Org Chart
          </button>
          <button
            onClick={() => setActiveTab('talent-matrix')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'talent-matrix'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            Talent Matrix
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'org-chart' && (
        <>
          {/* Filter Bar */}
          <FilterBar
            allEmployees={allEmployees}
            statusFilter={statusFilter}
            roleFilters={roleFilters}
            departmentFilters={departmentFilters}
            clientFilters={clientFilters}
            onStatusChange={setStatusFilter}
            onRoleFiltersChange={setRoleFilters}
            onDepartmentFiltersChange={setDepartmentFilters}
            onClientFiltersChange={setClientFilters}
          />

          {/* Group Legend */}
          <GroupLegend employees={filteredEmployees} />

          {/* Org Chart */}
          <div className="flex-1 overflow-hidden">
            <OrgChart
              orgTree={orgTree}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLayoutToggle={handleLayoutToggle}
            />
          </div>
        </>
      )}

      {activeTab === 'talent-matrix' && (
        <div className="flex-1 overflow-auto p-6">
          <TalentMatrix
            employees={allEmployees}
            onEmployeeEdit={handleEdit}
          />
        </div>
      )}

      {/* Employee Modal */}
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          allEmployees={allEmployees}
          onSave={editingEmployee ?
            (data) => handleUpdate(editingEmployee.id, data) :
            handleCreate
          }
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
