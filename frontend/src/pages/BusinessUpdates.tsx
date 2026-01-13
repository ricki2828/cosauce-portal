import { useState } from 'react';
import { LayoutDashboard, Building2, Users, UserCheck, BarChart3, FileDown, Settings, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from '../components/business-updates/Dashboard';
import { AccountsManager } from '../components/business-updates/AccountsManager';
import { TeamLeadersManager } from '../components/business-updates/TeamLeadersManager';
import { AgentsManager } from '../components/business-updates/AgentsManager';
import { MetricsManager } from '../components/business-updates/MetricsManager';
import { ReportsExport } from '../components/business-updates/ReportsExport';
import { BotControls } from '../components/business-updates/BotControls';
import { ShiftReporting } from '../components/business-updates/ShiftReporting';
import { SubmitUpdate } from '../components/business-updates/SubmitUpdate';
import { DirectorSubmitUpdate } from '../components/business-updates/DirectorSubmitUpdate';

type TabType = 'dashboard' | 'accounts' | 'team-leaders' | 'agents' | 'metrics' | 'reports' | 'shift-reporting' | 'bot-controls';

export function BusinessUpdates() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');


  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts' as TabType, label: 'Accounts', icon: Building2 },
    { id: 'team-leaders' as TabType, label: 'Team Leaders', icon: Users },
    { id: 'agents' as TabType, label: 'Agents', icon: UserCheck },
    { id: 'metrics' as TabType, label: 'Metrics', icon: BarChart3 },
    { id: 'reports' as TabType, label: 'Reports', icon: FileDown },
    { id: 'shift-reporting' as TabType, label: 'Shift Reporting', icon: ClipboardList },
    { id: 'bot-controls' as TabType, label: 'Bot Controls', icon: Settings },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Daily Business Updates</h1>
        <p className="mt-1 text-gray-600">
          Track agent metrics, manage accounts, and view daily submissions
        </p>
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
      <div>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'accounts' && <AccountsManager />}
        {activeTab === 'team-leaders' && <TeamLeadersManager />}
        {activeTab === 'agents' && <AgentsManager />}
        {activeTab === 'metrics' && <MetricsManager />}
        {activeTab === 'reports' && <ReportsExport />}
        {activeTab === 'shift-reporting' && (
          user?.role === 'team_leader' ? <SubmitUpdate /> : <DirectorSubmitUpdate />
        )}
        {activeTab === 'bot-controls' && <BotControls />}
      </div>
    </div>
  );
}
