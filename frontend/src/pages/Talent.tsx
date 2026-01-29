import React, { useState, useEffect } from 'react';
import { talentApi } from '../lib/api';
import type { OrgNode, Employee } from '../lib/talent-types';
import { Plus, Loader2 } from 'lucide-react';
import { OrgChart, EmployeeModal, FilterBar, GroupLegend } from '../components/talent';

export function Talent() {
  const [orgTree, setOrgTree] = useState<OrgNode[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Load data
  useEffect(() => {
    loadData();
  }, [statusFilter, departmentFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load org tree and flat employee list
      const [treeResponse, employeesResponse] = await Promise.all([
        talentApi.getOrgTree({ status: statusFilter, department: departmentFilter }),
        talentApi.getEmployees({
          status: statusFilter,
          department: departmentFilter || undefined
        })
      ]);

      setOrgTree(treeResponse.data);
      setAllEmployees(employeesResponse.data);
    } catch (err: any) {
      console.error('Failed to load talent data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading org chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-900 font-semibold mb-2">Error Loading Org Chart</h3>
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
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Org Chart</h1>
          <p className="text-sm text-gray-500 mt-1">
            {allEmployees.length} {statusFilter || 'total'} employee{allEmployees.length !== 1 ? 's' : ''}
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

      {/* Filter Bar */}
      <FilterBar
        statusFilter={statusFilter}
        departmentFilter={departmentFilter}
        onStatusChange={setStatusFilter}
        onDepartmentChange={setDepartmentFilter}
      />

      {/* Group Legend */}
      <GroupLegend employees={allEmployees} />

      {/* Org Chart */}
      <div className="flex-1 overflow-hidden">
        <OrgChart
          orgTree={orgTree}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

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
