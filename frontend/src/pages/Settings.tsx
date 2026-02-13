import { useState, useEffect } from 'react';
import { User, Bell, Shield, Brain, Save, RefreshCw, Users, Settings as SettingsIcon } from 'lucide-react';
import { salesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { UsersManager } from '../components/settings/UsersManager';

type SettingsTabType = 'general' | 'users';

const DEFAULT_BPO_PROMPT = `Analyze this company for BPO/outsourcing fit using all available information. Consider:

Company Profile & Growth:
- Industry fit (tech, finance, retail, telecom, healthcare, e-commerce)
- Company size and recent employee growth trends
- Headquarters location and global presence indicators

Operational Signals:
- Job postings indicating CX/sales team scaling
- Multilingual support needs
- 24/7 coverage requirements
- Remote/offshore team mentions
- Multiple similar role postings (growth pains)

Business Context:
- Company description and business model
- Website and online presence
- Customer-facing operations scale
- Technology stack and digital maturity

Rate their likelihood to outsource as HIGH, MEDIUM, or LOW.
List the key signals you detected.
Provide brief reasoning explaining your assessment.`;

export function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTabType>('general');
  const [bpoPrompt, setBpoPrompt] = useState('');
  const [bpoLoading, setBpoLoading] = useState(false);
  const [bpoSaving, setBpoSaving] = useState(false);
  const [bpoSaved, setBpoSaved] = useState(false);

  // Define tabs based on user role
  const tabs = [
    { id: 'general' as SettingsTabType, label: 'General', icon: SettingsIcon },
    ...(user?.role === 'admin' || user?.role === 'superadmin' ? [{ id: 'users' as SettingsTabType, label: 'Users', icon: Users }] : []),
  ];

  // Load BPO prompt on mount
  useEffect(() => {
    const loadBpoPrompt = async () => {
      setBpoLoading(true);
      try {
        const response = await salesApi.getSetting('bpo_analysis_prompt');
        setBpoPrompt(response.data.value || DEFAULT_BPO_PROMPT);
      } catch {
        setBpoPrompt(DEFAULT_BPO_PROMPT);
      } finally {
        setBpoLoading(false);
      }
    };
    loadBpoPrompt();
  }, []);

  const handleSaveBpoPrompt = async () => {
    setBpoSaving(true);
    setBpoSaved(false);
    try {
      await salesApi.setSetting('bpo_analysis_prompt', bpoPrompt);
      setBpoSaved(true);
      setTimeout(() => setBpoSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save BPO prompt:', error);
      alert('Failed to save prompt. Please try again.');
    } finally {
      setBpoSaving(false);
    }
  };

  const handleResetBpoPrompt = () => {
    if (confirm('Reset to default prompt? Your custom prompt will be lost.')) {
      setBpoPrompt(DEFAULT_BPO_PROMPT);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">Manage your account and application settings</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
      <div className="max-w-2xl space-y-6">
        {/* BPO Analysis Prompt */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Brain className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">BPO Analysis Prompt</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Customize how AI analyzes companies for outsourcing fit. Describe what signals matter to your business
            when determining if a company is likely to outsource their customer service or sales operations.
          </p>
          {bpoLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : (
            <>
              <textarea
                value={bpoPrompt}
                onChange={(e) => setBpoPrompt(e.target.value)}
                rows={12}
                className="w-full border border-gray-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your custom analysis prompt..."
              />
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={handleResetBpoPrompt}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset to Default
                </button>
                <button
                  onClick={handleSaveBpoPrompt}
                  disabled={bpoSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {bpoSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {bpoSaved ? 'Saved!' : 'Save Prompt'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value="Ricki Taiaroa"
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value="ricki@cosauce.co"
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">Email notifications for contract generation</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-700">Campaign completion alerts</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
          </div>
        </div>

        {/* API */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">API Configuration</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Backend API URL</label>
            <input
              type="text"
              value="http://169.150.243.5:8004"
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Configure via VITE_API_URL environment variable
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && <UsersManager />}
    </div>
  );
}
