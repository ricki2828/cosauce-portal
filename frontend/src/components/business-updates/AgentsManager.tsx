import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, UserCheck, Building2 } from 'lucide-react';
import { businessUpdatesApi } from '../../lib/api';
import type { Agent, AgentCreate, AgentUpdate, Account, TeamLeader } from '../../lib/business-updates-types';

export function AgentsManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTeamLeaders, setAllTeamLeaders] = useState<TeamLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentCreate>({
    name: '',
    email: '',
    phone: '',
    account_id: '',
    team_leader_id: '',
    is_active: true,
  });

  // For cascading dropdown
  const [availableTeamLeaders, setAvailableTeamLeaders] = useState<TeamLeader[]>([]);

  // Filters
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('');
  const [selectedTeamLeaderFilter, setSelectedTeamLeaderFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadAccounts();
    loadAllTeamLeaders();
  }, []);

  useEffect(() => {
    loadAgents();
  }, [page, selectedAccountFilter, selectedTeamLeaderFilter]);

  // Update available team leaders when account is selected in form
  useEffect(() => {
    if (formData.account_id) {
      const filtered = allTeamLeaders.filter(tl =>
        (tl.accounts || []).some(a => a.id === formData.account_id)
      );
      setAvailableTeamLeaders(filtered);

      // Reset team leader if current selection not valid for new account
      if (formData.team_leader_id && !filtered.some(tl => tl.id === formData.team_leader_id)) {
        setFormData(prev => ({ ...prev, team_leader_id: '' }));
      }
    } else {
      setAvailableTeamLeaders([]);
    }
  }, [formData.account_id, allTeamLeaders]);

  const loadAccounts = async () => {
    try {
      const response = await businessUpdatesApi.getAccounts({ page: 1, page_size: 100, active_only: true });
      setAccounts(response.data.items);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadAllTeamLeaders = async () => {
    try {
      const response = await businessUpdatesApi.getTeamLeaders({ page: 1, page_size: 200, active_only: true });
      setAllTeamLeaders(response.data.items);
    } catch (error) {
      console.error('Failed to load team leaders:', error);
    }
  };

  const loadAgents = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        page_size: pageSize,
        active_only: false,
      };
      if (selectedAccountFilter) {
        params.account_id = selectedAccountFilter;
      }
      if (selectedTeamLeaderFilter) {
        params.team_leader_id = selectedTeamLeaderFilter;
      }
      const response = await businessUpdatesApi.getAgents(params);
      setAgents(response.data.items);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      account_id: '',
      team_leader_id: '',
      is_active: true,
    });
    // Reload accounts and team leaders to ensure we have the latest data
    await Promise.all([loadAccounts(), loadAllTeamLeaders()]);
    setIsModalOpen(true);
  };

  const handleEdit = async (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email,
      phone: agent.phone || '',
      account_id: agent.account?.id || agent.account_id,
      team_leader_id: agent.team_leader?.id || agent.team_leader_id,
      is_active: agent.is_active,
    });
    // Reload accounts and team leaders to ensure we have the latest data
    await Promise.all([loadAccounts(), loadAllTeamLeaders()]);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      await businessUpdatesApi.deleteAgent(id);
      await loadAgents();
    } catch (error) {
      console.error('Failed to delete agent:', error);
      alert('Failed to delete agent.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.account_id || !formData.team_leader_id) {
      alert('Please select both account and team leader');
      return;
    }

    try {
      if (editingAgent) {
        await businessUpdatesApi.updateAgent(editingAgent.id, formData as AgentUpdate);
      } else {
        await businessUpdatesApi.createAgent(formData);
      }
      setIsModalOpen(false);
      await loadAgents();
    } catch (error) {
      console.error('Failed to save agent:', error);
      alert('Failed to save agent. Email may already exist in this account.');
    }
  };

  // Get team leaders filtered by selected account for filter dropdown
  const getFilteredTeamLeaders = () => {
    if (!selectedAccountFilter) return allTeamLeaders;
    return allTeamLeaders.filter(tl =>
      (tl.accounts || []).some(a => a.id === selectedAccountFilter)
    );
  };

  if (loading && agents.length === 0) {
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
          <h2 className="text-xl font-semibold text-gray-900">Agents Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage agents across all accounts and team leaders
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Account:</label>
            <select
              value={selectedAccountFilter}
              onChange={(e) => {
                setSelectedAccountFilter(e.target.value);
                setSelectedTeamLeaderFilter('');
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

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Team Leader:</label>
            <select
              value={selectedTeamLeaderFilter}
              onChange={(e) => {
                setSelectedTeamLeaderFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedAccountFilter && getFilteredTeamLeaders().length === 0}
            >
              <option value="">All Team Leaders</option>
              {getFilteredTeamLeaders().map((tl) => (
                <option key={tl.id} value={tl.id}>
                  {tl.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Team Leader
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Status
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-3 md:px-6 py-3 md:py-4">
                    <div className="text-xs md:text-sm font-medium text-gray-900 truncate max-w-[120px] md:max-w-none">{agent.name}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4">
                    <div className="text-xs md:text-sm text-gray-900 truncate max-w-[150px] md:max-w-none">{agent.email}</div>
                    {agent.phone && (
                      <div className="text-xs text-gray-500 hidden md:block">{agent.phone}</div>
                    )}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                    <div className="text-xs md:text-sm text-gray-900 truncate max-w-[120px] md:max-w-none">{agent.team_leader?.name || "N/A"}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[120px] md:max-w-none hidden md:block">{agent.team_leader?.email || ""}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4">
                    <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {agent.account?.code || ""}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-center hidden md:table-cell">
                    <span
                      className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <button
                        onClick={() => handleEdit(agent)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent.id)}
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
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingAgent ? 'Edit Agent' : 'Create Agent'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure agent details and assignment
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
                    placeholder="e.g., Jane Doe"
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
                    placeholder="jane.doe@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be unique within the selected account
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

              {/* Assignment */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-900">Assignment *</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account *
                  </label>
                  <select
                    required
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Leader *
                  </label>
                  <select
                    required
                    value={formData.team_leader_id}
                    onChange={(e) => setFormData({ ...formData, team_leader_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.account_id}
                  >
                    <option value="">
                      {formData.account_id ? 'Select Team Leader' : 'First select an account'}
                    </option>
                    {availableTeamLeaders.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name} ({tl.email})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Team leaders available for the selected account
                  </p>
                </div>
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
                  Agent is active
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
                  {editingAgent ? 'Update' : 'Create'} Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
