import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Save, Building2, Clock, AlertCircle } from 'lucide-react';
import { businessUpdatesApi } from '../../lib/api';
import type { Account, AccountCreate, AccountUpdate } from '../../lib/business-updates-types';

export function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountCreate>({
    name: '',
    code: '',
    prompt_time: '09:00',
    deadline_time: '17:00',
    reminder_interval_minutes: 60,
    max_reminders: 3,
    timezone: 'Asia/Singapore',
    is_active: true,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Calculate deadline info based on prompt and deadline times
  const deadlineInfo = useMemo(() => {
    if (!formData.prompt_time || !formData.deadline_time) {
      return null;
    }

    const [promptHour, promptMin] = formData.prompt_time.split(':').map(Number);
    const [deadlineHour, deadlineMin] = formData.deadline_time.split(':').map(Number);

    const promptMinutes = promptHour * 60 + promptMin;
    const deadlineMinutes = deadlineHour * 60 + deadlineMin;

    let hoursDiff: number;
    let isSameDay: boolean;

    if (deadlineMinutes >= promptMinutes) {
      // Same day deadline
      hoursDiff = (deadlineMinutes - promptMinutes) / 60;
      isSameDay = true;
    } else {
      // Next day deadline
      hoursDiff = ((24 * 60) - promptMinutes + deadlineMinutes) / 60;
      isSameDay = false;
    }

    return {
      isSameDay,
      hoursDiff: Math.round(hoursDiff * 10) / 10, // Round to 1 decimal
    };
  }, [formData.prompt_time, formData.deadline_time]);

  useEffect(() => {
    loadAccounts();
  }, [page]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await businessUpdatesApi.getAccounts({
        page,
        page_size: pageSize,
        active_only: true,
      });
      setAccounts(response.data.items);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      code: '',
      prompt_time: '09:00',
      deadline_time: '17:00',
      reminder_interval_minutes: 60,
      max_reminders: 3,
      timezone: 'Asia/Singapore',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      code: account.code,
      prompt_time: account.prompt_time,
      deadline_time: account.deadline_time,
      reminder_interval_minutes: account.reminder_interval_minutes,
      max_reminders: account.max_reminders,
      timezone: account.timezone,
      is_active: account.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? This will affect all team leaders and agents.')) {
      return;
    }

    try {
      await businessUpdatesApi.deleteAccount(id);
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. It may have dependent team leaders or agents.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAccount) {
        await businessUpdatesApi.updateAccount(editingAccount.id, formData as AccountUpdate);
      } else {
        await businessUpdatesApi.createAccount(formData);
      }
      setIsModalOpen(false);
      await loadAccounts();
    } catch (error: any) {
      console.error('Failed to save account:', error);

      // Extract the actual error message from the Azure API response
      let errorMessage = 'Failed to save account. Please check all required fields.';

      if (error.response?.data?.detail) {
        // FastAPI returns errors in a 'detail' field
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Validation errors come as an array
          errorMessage = error.response.data.detail.map((e: any) => e.msg).join(', ');
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    }
  };

  if (loading && accounts.length === 0) {
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
          <h2 className="text-xl font-semibold text-gray-900">Accounts Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage client accounts and their daily update configurations
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Schedule
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Reminders
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Team Leaders
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Agents
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-3 md:px-6 py-3 md:py-4">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-gray-900 truncate max-w-[120px] md:max-w-none">{account.name}</div>
                      <div className="text-xs md:text-sm text-gray-500">{account.code}</div>
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 hidden lg:table-cell">
                    <div className="text-xs md:text-sm text-gray-900">
                      Prompt: {account.prompt_time}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">
                      Deadline: {account.deadline_time}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {account.timezone}
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 hidden xl:table-cell">
                    <div className="text-xs md:text-sm text-gray-900">
                      Every {account.reminder_interval_minutes}min
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">
                      Max: {account.max_reminders}
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-center hidden md:table-cell">
                    <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {account.team_leader_count}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-center hidden md:table-cell">
                    <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {account.agent_count}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-center hidden sm:table-cell">
                    <span
                      className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <button
                        onClick={() => handleEdit(account)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingAccount ? 'Edit Account' : 'Create Account'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure account details and schedule
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
            <form
              key={editingAccount?.id || 'new'}
              onSubmit={handleSubmit}
              className="p-6 space-y-6"
            >
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Basic Information</h4>

                <div>
                  <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    id="account-name"
                    type="text"
                    required
                    autoComplete="organization"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Acme Corporation"
                  />
                </div>

                <div>
                  <label htmlFor="account-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Account Code *
                  </label>
                  <input
                    id="account-code"
                    type="text"
                    required
                    autoComplete="off"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., ACME"
                    maxLength={10}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Unique identifier (will be converted to uppercase)
                  </p>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">Schedule</h4>
                </div>

                {/* Info Box - Submission Window */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">Submission Window</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Agents can submit metrics for <strong>today</strong> or <strong>yesterday</strong> by default.
                        Set the prompt and deadline times to define the daily submission cycle.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prompt Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.prompt_time}
                      onChange={(e) => setFormData({ ...formData, prompt_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      When to send daily prompt
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.deadline_time}
                      onChange={(e) => setFormData({ ...formData, deadline_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Submission deadline
                    </p>
                  </div>
                </div>

                {/* Deadline Info Display */}
                {deadlineInfo && (
                  <div className={`p-3 rounded-lg border ${
                    deadlineInfo.isSameDay
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Clock className={`w-4 h-4 mt-0.5 ${
                        deadlineInfo.isSameDay ? 'text-blue-600' : 'text-amber-600'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          deadlineInfo.isSameDay ? 'text-blue-900' : 'text-amber-900'
                        }`}>
                          {deadlineInfo.isSameDay ? 'Same-Day Deadline' : 'Next-Day Deadline'}
                        </p>
                        <p className={`text-xs mt-1 ${
                          deadlineInfo.isSameDay ? 'text-blue-700' : 'text-amber-700'
                        }`}>
                          Agents have <strong>{deadlineInfo.hoursDiff} hours</strong> to submit after the prompt is sent
                          {deadlineInfo.isSameDay
                            ? ' (prompt and deadline on the same calendar day)'
                            : ' (deadline is the following day)'}
                        </p>
                        <p className={`text-xs mt-1 ${
                          deadlineInfo.isSameDay ? 'text-blue-600' : 'text-amber-600'
                        }`}>
                          <strong>Example:</strong> Prompt sent at {formData.prompt_time} → Deadline at {formData.deadline_time}
                          {deadlineInfo.isSameDay ? '' : ' (next day)'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone *
                  </label>
                  <select
                    required
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                    <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                    <option value="Australia/Sydney">Australia/Sydney (GMT+11)</option>
                    <option value="Pacific/Auckland">Pacific/Auckland (GMT+13)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (GMT+2)</option>
                    <option value="Europe/London">Europe/London (GMT+0)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                  </select>
                </div>
              </div>

              {/* Reminders */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Reminder Settings</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reminder Interval (minutes) *
                    </label>
                    <input
                      type="number"
                      required
                      min="15"
                      max="240"
                      value={formData.reminder_interval_minutes}
                      onChange={(e) => setFormData({ ...formData, reminder_interval_minutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      How often to remind (15-240 min)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Reminders *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10"
                      value={formData.max_reminders}
                      onChange={(e) => setFormData({ ...formData, max_reminders: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum reminder count (1-10)
                    </p>
                  </div>
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
                  Account is active
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
                  {editingAccount ? 'Update' : 'Create'} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
