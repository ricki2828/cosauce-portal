import { useState, useEffect } from 'react';
import { Settings, Activity, Clock, MessageSquare, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { businessUpdatesApi } from '../../lib/api';
import type { BotHealth } from '../../lib/business-updates-types';

type TriggerType = 'prompts' | 'reminders' | 'whatsapp' | 'teams';

export function BotControls() {
  const { user } = useAuth();
  const [health, setHealth] = useState<BotHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<TriggerType | null>(null);
  const [confirmTrigger, setConfirmTrigger] = useState<TriggerType | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadHealth();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const loadHealth = async () => {
    try {
      const response = await businessUpdatesApi.getBotHealth();
      setHealth(response.data);
    } catch (error) {
      console.error('Failed to load bot health:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async (type: TriggerType) => {
    setTriggering(type);
    setMessage(null);
    try {
      switch (type) {
        case 'prompts':
          await businessUpdatesApi.triggerPrompts();
          break;
        case 'reminders':
          await businessUpdatesApi.triggerReminders();
          break;
        case 'whatsapp':
          await businessUpdatesApi.triggerWhatsapp();
          break;
        case 'teams':
          await businessUpdatesApi.triggerTeams();
          break;
      }
      setMessage({ type: 'success', text: `${type.charAt(0).toUpperCase() + type.slice(1)} triggered successfully` });
      await loadHealth(); // Refresh health status
    } catch (error: any) {
      console.error(`Failed to trigger ${type}:`, error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || `Failed to trigger ${type}. Please try again.`
      });
    } finally {
      setTriggering(null);
      setConfirmTrigger(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600">
          Bot controls are only available to administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: BotHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: BotHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5" />;
      case 'down':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const triggers = [
    {
      id: 'prompts' as TriggerType,
      label: 'Trigger Daily Prompts',
      description: 'Send daily metric collection prompts to all agents',
      lastRun: health?.last_prompt_run,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      id: 'reminders' as TriggerType,
      label: 'Trigger Reminders',
      description: 'Send reminders to agents who haven\'t submitted today',
      lastRun: health?.last_reminder_run,
      color: 'bg-orange-600 hover:bg-orange-700',
    },
    {
      id: 'whatsapp' as TriggerType,
      label: 'Send WhatsApp Summary',
      description: 'Send daily summary to WhatsApp groups',
      lastRun: health?.last_whatsapp_run,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      id: 'teams' as TriggerType,
      label: 'Send Teams Summary',
      description: 'Send daily summary to Microsoft Teams',
      lastRun: health?.last_teams_run,
      color: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Bot Controls</h2>
        <p className="mt-1 text-sm text-gray-600">
          Trigger bot actions and monitor system health
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <p
              className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Health Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
              <p className="text-sm text-gray-600">Real-time status</p>
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getStatusColor(
              health?.status || 'healthy'
            )}`}
          >
            {getStatusIcon(health?.status || 'healthy')}
            <span className="text-sm font-medium capitalize">{health?.status || 'Unknown'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pending Submissions */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <MessageSquare className="w-4 h-4" />
              <span>Pending Submissions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{health?.pending_submissions || 0}</p>
          </div>

          {/* Last Activity Times */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                <span>Last Prompts</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatTimestamp(health?.last_prompt_run || null)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                <span>Last Reminders</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatTimestamp(health?.last_reminder_run || null)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                <span>Last WhatsApp</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatTimestamp(health?.last_whatsapp_run || null)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                <span>Last Teams</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatTimestamp(health?.last_teams_run || null)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {triggers.map((trigger) => (
          <div key={trigger.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{trigger.label}</h3>
            <p className="text-sm text-gray-600 mb-4">{trigger.description}</p>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Last run: {formatTimestamp(trigger.lastRun)}
              </div>
              <button
                onClick={() => setConfirmTrigger(trigger.id)}
                disabled={triggering !== null}
                className={`px-4 py-2 ${trigger.color} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {triggering === trigger.id ? 'Triggering...' : 'Trigger'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {confirmTrigger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Action</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to trigger{' '}
              <span className="font-medium">{confirmTrigger}</span>? This will immediately execute
              the action for all relevant agents.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTrigger(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTrigger(confirmTrigger)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
