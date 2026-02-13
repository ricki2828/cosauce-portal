import { useState } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import { peopleApi } from '../../lib/api';
import type { Requisition } from '../../lib/api';

export function ManageRolesModal({
  requisition,
  onClose,
  onUpdate,
}: {
  requisition: Requisition;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [roles, setRoles] = useState(requisition.roles || []);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ role_type: string; requested_count: number }>({
    role_type: '',
    requested_count: 1,
  });
  const [newRoleInput, setNewRoleInput] = useState<{ role_type: string; requested_count: number }>({
    role_type: '',
    requested_count: 1,
  });
  const [loading, setLoading] = useState(false);

  // Reload roles after changes
  const reloadRoles = async () => {
    try {
      const response = await peopleApi.getRequisition(requisition.id);
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error('Failed to reload roles:', error);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleInput.role_type.trim()) return;

    try {
      setLoading(true);
      await peopleApi.addRequisitionRole(requisition.id, {
        role_type: newRoleInput.role_type,
        requested_count: newRoleInput.requested_count,
      });
      await reloadRoles();
      setNewRoleInput({ role_type: '', requested_count: 1 });
      onUpdate();
    } catch (error) {
      console.error('Failed to add role:', error);
      alert('Failed to add role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (role: typeof roles[0]) => {
    setEditingRole(role.id);
    setEditForm({
      role_type: role.role_type,
      requested_count: role.requested_count,
    });
  };

  const handleSaveEdit = async (roleId: string) => {
    try {
      setLoading(true);
      await peopleApi.updateRequisitionRole(requisition.id, roleId, editForm);
      await reloadRoles();
      setEditingRole(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
  };

  const handleDeleteRole = async (roleId: string, roleType: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleType}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await peopleApi.deleteRequisitionRole(requisition.id, roleId);
      await reloadRoles();
      onUpdate();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementFilled = async (roleId: string) => {
    try {
      setLoading(true);
      await peopleApi.incrementRoleFilled(requisition.id, roleId, 1);
      await reloadRoles();
      onUpdate();
    } catch (error) {
      console.error('Failed to increment filled count:', error);
      alert('Failed to update filled count. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrementFilled = async (roleId: string, currentFilled: number) => {
    if (currentFilled === 0) return;

    try {
      setLoading(true);
      await peopleApi.incrementRoleFilled(requisition.id, roleId, -1);
      await reloadRoles();
      onUpdate();
    } catch (error) {
      console.error('Failed to decrement filled count:', error);
      alert('Failed to update filled count. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Manage Roles</h2>
            <p className="text-sm text-gray-600 mt-1">{requisition.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Existing Roles */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Roles</h3>
            {roles.length > 0 ? (
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                    {editingRole === role.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={editForm.role_type}
                            onChange={(e) => setEditForm({ ...editForm, role_type: e.target.value })}
                            placeholder="Role type"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                          />
                          <input
                            type="number"
                            min="1"
                            value={editForm.requested_count}
                            onChange={(e) => setEditForm({ ...editForm, requested_count: parseInt(e.target.value) || 1 })}
                            placeholder="Count"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            disabled={loading}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(role.id)}
                            className="px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            disabled={loading || !editForm.role_type.trim()}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">{role.role_type}</span>
                            <span className="text-gray-400">&times;</span>
                            <span className="text-gray-700">{role.requested_count}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-sm text-gray-600">
                              Filled: {role.filled_count}/{role.requested_count}
                            </span>
                            {role.remaining_count > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                {role.remaining_count} remaining
                              </span>
                            )}
                            {role.remaining_count === 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                complete
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Increment/Decrement Filled Count */}
                          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleDecrementFilled(role.id, role.filled_count)}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={loading || role.filled_count === 0}
                              title="Decrease filled count"
                            >
                              <span className="text-lg leading-none">&minus;</span>
                            </button>
                            <span className="px-2 py-1 text-sm font-medium border-x border-gray-200">
                              {role.filled_count}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncrementFilled(role.id)}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={loading || role.filled_count >= role.requested_count}
                              title="Increase filled count"
                            >
                              <span className="text-lg leading-none">+</span>
                            </button>
                          </div>
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(role)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            disabled={loading}
                            title="Edit role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role.id, role.role_type)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            disabled={loading}
                            title="Delete role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No roles defined yet.</p>
            )}
          </div>

          {/* Add New Role */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Role</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Role type (e.g., Team Leader, Agent)"
                value={newRoleInput.role_type}
                onChange={(e) => setNewRoleInput({ ...newRoleInput, role_type: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <input
                type="number"
                min="1"
                placeholder="Count"
                value={newRoleInput.requested_count}
                onChange={(e) => setNewRoleInput({ ...newRoleInput, requested_count: parseInt(e.target.value) || 1 })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddRole}
                disabled={loading || !newRoleInput.role_type.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Role
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            disabled={loading}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
