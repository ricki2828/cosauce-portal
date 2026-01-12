import { useState, useEffect } from 'react';
import { Flag, BarChart3, Users, TrendingUp } from 'lucide-react';
import { prioritiesApi, businessUpdatesApi, peopleApi, salesApi } from '../lib/api';
import type { Requisition, NewHire, Company, JobSignal } from '../lib/api';
import type { Priority } from '../lib/priorities-types';
import type { DashboardData, ShiftUpdate } from '../lib/business-updates-types';
import {
  DashboardSection,
  PriorityCard,
  PerformanceCard,
  RequisitionMiniCard,
  NewHireMiniCard,
  SalesPipelineKanban
} from '../components/dashboard';

export function Dashboard() {
  // Priorities state
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [prioritiesLoading, setPrioritiesLoading] = useState(true);
  const [prioritiesError, setPrioritiesError] = useState<string | null>(null);

  // Performance state
  const [performance, setPerformance] = useState<DashboardData | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [performanceError, setPerformanceError] = useState<string | null>(null);

  // People state
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [requisitionsLoading, setRequisitionsLoading] = useState(true);
  const [requisitionsError, setRequisitionsError] = useState<string | null>(null);

  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [newHiresLoading, setNewHiresLoading] = useState(true);
  const [newHiresError, setNewHiresError] = useState<string | null>(null);

  // Sales state
  const [salesCompanies, setSalesCompanies] = useState<Company[]>([]);
  const [salesSignals, setSalesSignals] = useState<JobSignal[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Shift update state (for recent commentary)
  const [recentCommentary, setRecentCommentary] = useState<ShiftUpdate | null>(null);

  // Load priorities
  const loadPriorities = async () => {
    try {
      setPrioritiesLoading(true);
      setPrioritiesError(null);
      const response = await prioritiesApi.getPriorities('active');
      // Sort by created_at desc and limit to 5
      const sorted = response.data
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setPriorities(sorted);
    } catch (err: any) {
      console.error('Failed to load priorities:', err);
      setPrioritiesError(err.response?.data?.detail || 'Failed to load priorities');
    } finally {
      setPrioritiesLoading(false);
    }
  };

  // Load performance data
  const loadPerformance = async () => {
    try {
      setPerformanceLoading(true);
      setPerformanceError(null);
      const response = await businessUpdatesApi.getDashboard();
      setPerformance(response.data);
    } catch (err: any) {
      console.error('Failed to load performance:', err);
      setPerformanceError(err.response?.data?.detail || 'Failed to load performance data');
    } finally {
      setPerformanceLoading(false);
    }
  };

  // Load requisitions
  const loadRequisitions = async () => {
    try {
      setRequisitionsLoading(true);
      setRequisitionsError(null);
      const response = await peopleApi.getRequisitions('open');
      setRequisitions(response.data);
    } catch (err: any) {
      console.error('Failed to load requisitions:', err);
      setRequisitionsError(err.response?.data?.detail || 'Failed to load requisitions');
    } finally {
      setRequisitionsLoading(false);
    }
  };

  // Load new hires
  const loadNewHires = async () => {
    try {
      setNewHiresLoading(true);
      setNewHiresError(null);
      const response = await peopleApi.getNewHires('active');
      setNewHires(response.data);
    } catch (err: any) {
      console.error('Failed to load new hires:', err);
      setNewHiresError(err.response?.data?.detail || 'Failed to load new hires');
    } finally {
      setNewHiresLoading(false);
    }
  };

  // Load sales data
  const loadSales = async () => {
    try {
      setSalesLoading(true);
      setSalesError(null);
      const [companiesRes, signalsRes] = await Promise.all([
        salesApi.getCompanies({ limit: 100 }),
        salesApi.getJobSignals({ limit: 100 }),
      ]);
      setSalesCompanies(companiesRes.data);
      setSalesSignals(signalsRes.data);
    } catch (err: any) {
      console.error('Failed to load sales data:', err);
      setSalesError(err.response?.data?.detail || 'Failed to load sales data');
    } finally {
      setSalesLoading(false);
    }
  };

  // Load recent shift update for commentary
  const loadRecentCommentary = async () => {
    try {
      const response = await businessUpdatesApi.getShiftUpdates({ });
      // Get the most recent shift update with commentary
      const updates = response.data;
      if (updates && updates.length > 0) {
        // Find most recent update with non-empty commentary
        const withCommentary = updates.find(u => u.commentary && u.commentary.trim().length > 0);
        setRecentCommentary(withCommentary || updates[0]);
      }
    } catch (err: any) {
      console.error('Failed to load shift updates:', err);
      // Don't set error state, just silently fail for commentary
    }
  };

  useEffect(() => {
    loadPriorities();
    loadPerformance();
    loadRequisitions();
    loadNewHires();
    loadSales();
    loadRecentCommentary();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Executive overview of all key areas</p>
      </div>

      {/* Section 1: Key Priorities */}
      <DashboardSection
        title="Key Priorities"
        icon={Flag}
        loading={prioritiesLoading}
        error={prioritiesError}
        onRetry={loadPriorities}
        isEmpty={priorities.length === 0}
        emptyMessage="No active priorities. Add one in the Priorities page."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {priorities.map((priority) => (
            <PriorityCard key={priority.id} priority={priority} />
          ))}
        </div>
      </DashboardSection>

      {/* Section 2: Performance */}
      <DashboardSection
        title="Performance"
        icon={BarChart3}
        loading={performanceLoading}
        error={performanceError}
        onRetry={loadPerformance}
        isEmpty={!performance}
        emptyMessage="No performance data available."
      >
        {performance && (
          <PerformanceCard dashboard={performance} recentCommentary={recentCommentary} />
        )}
      </DashboardSection>

      {/* Section 3: People */}
      <DashboardSection
        title="People"
        icon={Users}
        loading={requisitionsLoading && newHiresLoading}
        error={requisitionsError || newHiresError}
        onRetry={() => {
          loadRequisitions();
          loadNewHires();
        }}
        isEmpty={requisitions.length === 0 && newHires.length === 0}
        emptyMessage="No requisitions or new hires."
      >
        <div className="space-y-6">
          {/* Row 1: Open Requisitions */}
          {requisitions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Open Requisitions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requisitions.map((req) => (
                  <RequisitionMiniCard key={req.id} requisition={req} />
                ))}
              </div>
            </div>
          )}

          {/* Row 2: New Hires (Onboarding) */}
          {newHires.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Onboarding</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {newHires.map((hire) => (
                  <NewHireMiniCard key={hire.id} hire={hire} />
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardSection>

      {/* Section 4: Sales Pipeline */}
      <DashboardSection
        title="Sales Pipeline"
        icon={TrendingUp}
        loading={salesLoading}
        error={salesError}
        onRetry={loadSales}
        isEmpty={salesCompanies.length === 0}
        emptyMessage="No sales pipeline data available."
      >
        <SalesPipelineKanban companies={salesCompanies} />
      </DashboardSection>
    </div>
  );
}
