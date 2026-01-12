import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Users, Building2 } from 'lucide-react';
import { businessUpdatesApi } from '../../lib/api';
import type { TeamLeader, TeamLeaderCreate, TeamLeaderUpdate, Account } from '../../lib/business-updates-types';

export function TeamLeadersManager() {
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<TeamLeader | null>(null);
  const [formData, setFormData] = useState<TeamLeaderCreate>({
    name: '',
    email: '',
    phone: '',
    account_id: "",
    account_ids: [],
    shift_start: '',
    shift_end: '',
    timezone: 'UTC',
    whatsapp_number: '',
    is_active: true,
  });

  // Filters
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadTeamLeaders();
  }, [page, selectedAccountFilter]);

  const loadAccounts = async () => {
    try {
      const response = await businessUpdatesApi.getAccounts({ page: 1, page_size: 100, active_only: true });
      setAccounts(response.data.items);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadTeamLeaders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        page_size: pageSize,
        active_only: true,
      };
      if (selectedAccountFilter) {
        params.account_id = selectedAccountFilter;
      }
      const response = await businessUpdatesApi.getTeamLeaders(params);
      setTeamLeaders(response.data.items);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Failed to load team leaders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingLeader(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      account_id: "",
      account_ids: [],
      shift_start: '',
      shift_end: '',
      timezone: 'UTC',
      whatsapp_number: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (leader: TeamLeader) => {
    setEditingLeader(leader);
    setFormData({
      name: leader.name,
      email: leader.email,
      phone: leader.phone || '',
      account_id: leader.account_id,
      account_ids: leader.accounts?.map(a => a.id) || [],
      shift_start: leader.shift_start || '',
      shift_end: leader.shift_end || '',
      timezone: leader.timezone || 'UTC',
      whatsapp_number: leader.whatsapp_number || '',
      is_active: leader.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team leader? This will affect all their agents.')) {
      return;
    }

    try {
      await businessUpdatesApi.deleteTeamLeader(id);
      await loadTeamLeaders();
    } catch (error) {
      console.error('Failed to delete team leader:', error);
      alert('Failed to delete team leader. They may have dependent agents.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((formData.account_ids || []).length === 0) {
      alert('Please select at least one account');
      return;
    }

    try {
      if (editingLeader) {
        await businessUpdatesApi.updateTeamLeader(editingLeader.id, formData as TeamLeaderUpdate);
      } else {
        await businessUpdatesApi.createTeamLeader(formData);
      }
      setIsModalOpen(false);
      await loadTeamLeaders();
    } catch (error) {
      console.error('Failed to save team leader:', error);
      alert('Failed to save team leader. Email may already exist in selected accounts.');
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setFormData(prev => ({
      ...prev,
      account_ids: (prev.account_ids || []).includes(accountId)
        ? (prev.account_ids || []).filter(id => id !== accountId)
        : [...(prev.account_ids || []), accountId]
    }));
  };

  if (loading && teamLeaders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Leaders Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage team leaders and their account assignments
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Leader
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Account:</label>
          <select
            value={selectedAccountFilter}
            onChange={(e) => {
              setSelectedAccountFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Team Leaders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Leader
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Assigned Accounts
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Agents
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Status
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamLeaders.map((leader) => (
                <tr key={leader.id} className="hover:bg-gray-50">
                  <td className="px-3 md:px-6 py-3 md:py-4">
                    <div className="text-xs md:text-sm font-medium text-gray-900 truncate max-w-[120px] md:max-w-none">{leader.name}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4">
                    <div className="text-xs md:text-sm text-gray-900 truncate max-w-[150px] md:max-w-none">{leader.email}</div>
                    {leader.phone && (
                      <div className="text-xs text-gray-500 hidden md:block">{leader.phone}</div>
                    )}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(leader.accounts || []).map((account) => (
                        <span
                          key={account.id}
                          className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {account.code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-center hidden sm:table-cell">
                    <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {leader.agent_count}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-center hidden lg:table-cell">
                    <span
                      className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        leader.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {leader.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <button
                        onClick={() => handleEdit(leader)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(leader.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingLeader ? 'Edit Team Leader' : 'Create Team Leader'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure team leader details and account assignments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Basic Information</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john.smith@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be unique within each assigned account
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+65 9123 4567"
                  />
                </div>
              </div>

              {/* Shift Reporting Configuration */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Shift Reporting Configuration (Optional)</h4>
                <p className="text-sm text-gray-600">
                  Configure shift times for automated SOS/EOS reporting
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.shift_start}
                      onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      e.g., 08:00 for 8:00 AM
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift End Time
                    </label>
                    <input
                      type="time"
                      value={formData.shift_end}
                      onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      e.g., 17:00 for 5:00 PM
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Denver">America/Denver (MST/MDT)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEDT/AEST)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Shift times are interpreted in this timezone
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+65 9123 4567"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    For direct shift reminders (Phase 2 feature)
                  </p>
                </div>
              </div>

              {/* Account Assignment */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-900">Account Assignment *</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Select which accounts this team leader manages
                </p>

                <div className="border border-gray-300 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(formData.account_ids || []).includes(account.id)}
                        onChange={() => toggleAccountSelection(account.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{account.name}</div>
                        <div className="text-xs text-gray-500">{account.code}</div>
                      </div>
                      {!account.is_active && (
                        <span className="text-xs text-gray-500">(Inactive)</span>
                      )}
                    </label>
                  ))}
                </div>

                {(formData.account_ids || []).length === 0 && (
                  <p className="text-sm text-red-600">
                    Please select at least one account
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Team leader is active
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingLeader ? 'Update' : 'Create'} Team Leader
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
