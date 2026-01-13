import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, BarChart3, Building2, MoveUp, MoveDown } from 'lucide-react';
import { businessUpdatesApi } from '../../lib/api';
import type { Metric, MetricCreate, MetricUpdate, Account } from '../../lib/business-updates-types';

export function MetricsManager() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [formData, setFormData] = useState<MetricCreate>({
    name: '',
    key: '',
    data_type: 'text',
    is_required: true,
    display_order: 1,
    account_id: '',
  });

  // Filters
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('');

  // Pagination (not used - API returns all metrics)

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [selectedAccountFilter]);

  const loadAccounts = async () => {
    try {
      const response = await businessUpdatesApi.getAccounts({ page: 1, page_size: 100, active_only: true });
      setAccounts(response.data.items);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);

      // Metrics are account-specific, so only load when an account is selected
      if (!selectedAccountFilter) {
        setMetrics([]);
        setLoading(false);
        return;
      }

      const response = await businessUpdatesApi.getMetrics({ account_id: selectedAccountFilter });
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    // Set the next display_order
    const maxOrder = metrics.length > 0
      ? Math.max(...metrics.filter(m => !selectedAccountFilter || m.account?.id === selectedAccountFilter).map(m => m.display_order ?? 1))
      : 0;

    setEditingMetric(null);
    setFormData({
      name: '',
      key: '',
      data_type: 'text',
      is_required: true,
      display_order: maxOrder + 1,
      account_id: selectedAccountFilter || '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (metric: Metric) => {
    setEditingMetric(metric);
    setFormData({
      name: metric.name,
      key: metric.key,
      data_type: metric.data_type,
      is_required: metric.is_required,
      display_order: metric.display_order,
      account_id: metric.account?.id || metric.account_id,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this metric? This will affect all submissions.')) {
      return;
    }

    try {
      await businessUpdatesApi.deleteMetric(id);
      await loadMetrics();
    } catch (error) {
      console.error('Failed to delete metric:', error);
      alert('Failed to delete metric.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.account_id) {
      alert('Please select an account');
      return;
    }

    try {
      if (editingMetric) {
        await businessUpdatesApi.updateMetric(editingMetric.id, formData as MetricUpdate);
      } else {
        await businessUpdatesApi.createMetric(formData);
      }
      setIsModalOpen(false);
      await loadMetrics();
    } catch (error) {
      console.error('Failed to save metric:', error);
      alert('Failed to save metric.');
    }
  };

  const getDataTypeDisplay = (dataType: string) => {
    const types: Record<string, string> = {
      text: 'Text',
      number: 'Number',
      percentage: 'Percentage',
      boolean: 'Yes/No',
      date: 'Date',
    };
    return types[dataType] || dataType;
  };

  const getDataTypeBadgeColor = (dataType: string) => {
    const colors: Record<string, string> = {
      text: 'bg-gray-100 text-gray-800',
      number: 'bg-blue-100 text-blue-800',
      percentage: 'bg-purple-100 text-purple-800',
      boolean: 'bg-green-100 text-green-800',
      date: 'bg-orange-100 text-orange-800',
    };
    return colors[dataType] || 'bg-gray-100 text-gray-800';
  };

  // Group metrics by account for display
  const groupedMetrics = metrics.reduce((acc, metric) => {
    const accountId = metric.account?.id || metric.account_id;
    if (!accountId) return acc;

    if (!acc[accountId]) {
      acc[accountId] = {
        account: (metric.account || accounts.find(a => a.id === accountId)) as Account || { id: accountId, name: "Unknown", code: "", prompt_time: "", deadline_time: "", reminder_interval_minutes: 0, max_reminders: 0, timezone: "", is_active: true, created_at: "", updated_at: "", team_leader_count: 0, agent_count: 0, metric_count: 0 } as Account,
        metrics: [],
      };
    }
    acc[accountId].metrics.push(metric);
    return acc;
  }, {} as Record<string, { account: Account; metrics: Metric[] }>);

  // Sort metrics within each group by display_order
  Object.values(groupedMetrics).forEach(group => {
    group.metrics.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  });

  if (loading && metrics.length === 0) {
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
          <h2 className="text-xl font-semibold text-gray-900">Metrics Configuration</h2>
          <p className="mt-1 text-sm text-gray-600">
            Define metric definitions for each account's daily submissions
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Metric
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

      {/* Metrics Display - Grouped by Account */}
      <div className="space-y-6">
        {Object.values(groupedMetrics).map(({ account, metrics: accountMetrics }) => (
          <div key={account.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Account Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                    <p className="text-sm text-gray-600">{account.code} · {accountMetrics.length} metrics</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accountMetrics.map((metric, index) => (
                    <tr key={metric.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {metric.display_order}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            {index > 0 && (
                              <button
                                className="p-0.5 text-gray-400 hover:text-gray-600"
                                title="Move up"
                              >
                                <MoveUp className="w-3 h-3" />
                              </button>
                            )}
                            {index < accountMetrics.length - 1 && (
                              <button
                                className="p-0.5 text-gray-400 hover:text-gray-600"
                                title="Move down"
                              >
                                <MoveDown className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{metric.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDataTypeBadgeColor(metric.data_type)}`}>
                          {getDataTypeDisplay(metric.data_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {metric.is_required ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(metric)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(metric.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {Object.keys(groupedMetrics).length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No metrics found</h3>
            <p className="text-gray-600">
              {selectedAccountFilter
                ? 'No metrics configured for this account'
                : 'Get started by adding a metric definition'}
            </p>
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
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingMetric ? 'Edit Metric' : 'Create Metric'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Define what data agents need to submit
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
              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account *
                </label>
                <select
                  required
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!!editingMetric}
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.code})
                    </option>
                  ))}
                </select>
                {editingMetric && (
                  <p className="mt-1 text-xs text-gray-500">
                    Account cannot be changed after creation
                  </p>
                )}
              </div>

              {/* Metric Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Metric Details</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metric Key *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., calls_made, emails_sent"
                    pattern="[a-z_]+"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Lowercase letters and underscores only (used in API)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metric Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Calls Made, Emails Sent, Revenue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Type *
                  </label>
                  <select
                    required
                    value={formData.data_type}
                    onChange={(e) => setFormData({ ...formData, data_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="percentage">Percentage</option>
                    <option value="boolean">Yes/No</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Order *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Order in which agents see this metric
                    </p>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-3 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.is_required}
                        onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Required field
                      </span>
                    </label>
                  </div>
                </div>
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
                  {editingMetric ? 'Update' : 'Create'} Metric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
