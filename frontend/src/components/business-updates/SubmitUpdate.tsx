import { useState, useEffect } from 'react';
import { teamLeaderApi } from '../../lib/api';
import type {
  TeamLeaderProfile,
  Account,
  Metric,
  DirectSubmitRequest
} from '../../lib/business-updates-types';
import { Calendar, Building2, Save, CheckCircle, AlertCircle } from 'lucide-react';

export function SubmitUpdate() {
  const [profile, setProfile] = useState<TeamLeaderProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load team leader profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Load metrics when account changes
  useEffect(() => {
    if (selectedAccount) {
      loadMetrics(selectedAccount);
    }
  }, [selectedAccount]);

  const loadProfile = async () => {
    try {
      const { data } = await teamLeaderApi.getMyProfile();
      setProfile(data);

      // Load accounts the team leader has access to
      const accountsRes = await teamLeaderApi.getMyAccounts();
      setAccounts(accountsRes.data);

      if (accountsRes.data.length === 1) {
        setSelectedAccount(accountsRes.data[0].id);
      }
    } catch (err) {
      setError('Failed to load profile. Please contact an administrator.');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async (accountId: string) => {
    try {
      const { data } = await teamLeaderApi.getAccountMetrics(accountId);
      setMetrics(data);
      // Initialize values with empty strings
      const initialValues: Record<string, string | number> = {};
      data.forEach(m => { initialValues[m.id] = ''; });
      setValues(initialValues);
    } catch (err) {
      setError('Failed to load metrics for this account.');
    }
  };

  const handleSubmit = async () => {
    if (!profile || !selectedAccount) return;

    setSubmitting(true);
    setError(null);

    try {
      const metricsPayload = metrics.map(m => ({
        metric_definition_id: m.id,
        value: values[m.id],
      }));

      const request: DirectSubmitRequest = {
        team_leader_id: profile.id,
        account_id: selectedAccount,
        date,
        metrics: metricsPayload,
        notes: notes || undefined,
      };

      await teamLeaderApi.submitUpdate(request);
      setSuccess(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setValues({});
        setNotes('');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit update');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMetricInput = (metric: Metric) => {
    const value = values[metric.id] ?? '';

    switch (metric.data_type) {
      case 'number':
      case 'percentage':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setValues({ ...values, [metric.id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={metric.data_type === 'percentage' ? '0-100' : 'Enter number'}
          />
        );
      case 'boolean':
        return (
          <select
            value={String(value)}
            onChange={(e) => setValues({ ...values, [metric.id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setValues({ ...values, [metric.id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter value"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-green-800">Update Submitted Successfully!</h2>
        <p className="text-green-600 mt-2">Your metrics have been recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Submit Daily Update</h2>
        <p className="text-gray-600 mt-1">
          Enter your metrics for the selected date and account.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Selection Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Date Picker */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Account Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4" />
            Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select account...</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Form */}
      {selectedAccount && metrics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {metrics.map((metric) => (
              <div key={metric.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {metric.name}
                  {metric.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderMetricInput(metric)}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Add any additional context..."
            />
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Update'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
