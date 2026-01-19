import { useState, useEffect } from 'react';
import { Flag, BarChart3, Users, TrendingUp, Plus } from 'lucide-react';
import { prioritiesApi, peopleApi, pipelineApi } from '../lib/api';
import type { Requisition, NewHire, PipelineOpportunity, PipelineOpportunityCreate, PipelineOpportunityUpdate } from '../lib/api';
import type { Priority } from '../lib/priorities-types';
import {
  DashboardSection,
  PriorityCard,
  KPICards,
  RequisitionMiniCard,
  NewHireMiniCard,
  SalesPipelineKanban
} from '../components/dashboard';
import { OpportunityModal } from '../components/dashboard/OpportunityModal';

export function Dashboard() {
  // Priorities state
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [prioritiesLoading, setPrioritiesLoading] = useState(true);
  const [prioritiesError, setPrioritiesError] = useState<string | null>(null);

  // Performance state - now handled by KPICards component
  // Removed: performance data is fetched directly by KPICards from Performance Portal

  // People state
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [requisitionsLoading, setRequisitionsLoading] = useState(true);
  const [requisitionsError, setRequisitionsError] = useState<string | null>(null);

  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [newHiresLoading, setNewHiresLoading] = useState(true);
  const [newHiresError, setNewHiresError] = useState<string | null>(null);

  // Pipeline opportunities state
  const [opportunities, setOpportunities] = useState<PipelineOpportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(null);

  // Opportunity modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<PipelineOpportunity | undefined>(undefined);

  // Shift update state - no longer needed with KPICards
  // Removed: commentary functionality replaced by KPICards component

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

  // Load performance data - REMOVED
  // Performance data now fetched directly by KPICards component from Performance Portal

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

  // Load pipeline opportunities
  const loadOpportunities = async () => {
    try {
      setOpportunitiesLoading(true);
      setOpportunitiesError(null);
      const response = await pipelineApi.getOpportunities();
      setOpportunities(response.data);
    } catch (err: any) {
      console.error('Failed to load opportunities:', err);
      setOpportunitiesError(err.response?.data?.detail || 'Failed to load opportunities');
    } finally {
      setOpportunitiesLoading(false);
    }
  };

  // Handle opening modal for add
  const handleAddOpportunity = () => {
    setSelectedOpportunity(undefined);
    setIsModalOpen(true);
  };

  // Handle opening modal for edit
  const handleEditOpportunity = (opportunity: PipelineOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  // Handle saving opportunity (create or update)
  const handleSaveOpportunity = async (data: PipelineOpportunityCreate | PipelineOpportunityUpdate) => {
    try {
      if (selectedOpportunity) {
        // Update existing
        await pipelineApi.updateOpportunity(selectedOpportunity.id, data as PipelineOpportunityUpdate);
      } else {
        // Create new
        await pipelineApi.createOpportunity(data as PipelineOpportunityCreate);
      }
      await loadOpportunities();
    } catch (err: any) {
      console.error('Failed to save opportunity:', err);
      throw err; // Let modal handle the error
    }
  };

  // Load recent shift update for commentary - REMOVED
  // This functionality is no longer needed with KPICards component

  useEffect(() => {
    loadPriorities();
    loadRequisitions();
    loadNewHires();
    loadOpportunities();
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
        loading={false}
        error={null}
        onRetry={() => {}}
        isEmpty={false}
        emptyMessage="No performance data available."
      >
        <KPICards />
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
        loading={opportunitiesLoading}
        error={opportunitiesError}
        onRetry={loadOpportunities}
        isEmpty={opportunities.length === 0}
        emptyMessage="No pipeline opportunities. Click 'Add Opportunity' to get started."
        action={
          <button
            onClick={handleAddOpportunity}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Opportunity
          </button>
        }
      >
        <SalesPipelineKanban opportunities={opportunities} onEditOpportunity={handleEditOpportunity} />
      </DashboardSection>

      {/* Opportunity Modal */}
      <OpportunityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveOpportunity}
        opportunity={selectedOpportunity}
      />
    </div>
  );
}
