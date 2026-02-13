import { useState, useEffect } from 'react';
import { Flag, BarChart3, Users, TrendingUp, Plus } from 'lucide-react';
import { prioritiesApi, peopleApi, pipelineApi } from '../lib/api';
import type { Requisition, RequisitionCreate, RequisitionUpdate, RequisitionStats, NewHire, PipelineOpportunity, PipelineOpportunityCreate, PipelineOpportunityUpdate } from '../lib/api';
import type { Priority } from '../lib/priorities-types';
import {
  DashboardSection,
  PriorityCard,
  KPICards,
  RequisitionMiniCard,
  NewHireMiniCard,
  SalesPipelineKanban,
  InvoicingSection
} from '../components/dashboard';
import { OpportunityModal } from '../components/dashboard/OpportunityModal';
import { EditRequisitionModal } from '../components/people/EditRequisitionModal';
import { CreateRequisitionModal } from '../components/people/CreateRequisitionModal';
import { ChecklistModal } from '../components/people/ChecklistModal';

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
  const [requisitionStats, setRequisitionStats] = useState<RequisitionStats | null>(null);

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

  // Requisition modal state
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);
  const [showCreateReqModal, setShowCreateReqModal] = useState(false);

  // Onboarding checklist modal state
  const [selectedHire, setSelectedHire] = useState<NewHire | null>(null);

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
      // Fetch all requisitions and filter for active ones (open, interviewing, pending)
      const response = await peopleApi.getRequisitions();
      const activeRequisitions = response.data.filter(
        req => ['open', 'interviewing', 'pending'].includes(req.status)
      );
      setRequisitions(activeRequisitions);

      // Fetch requisition stats
      try {
        console.log('Fetching requisition stats for Dashboard...');
        const statsResponse = await peopleApi.getRequisitionStats();
        console.log('Dashboard requisition stats loaded:', statsResponse.data);
        setRequisitionStats(statsResponse.data);
      } catch (statsError: any) {
        console.error('Failed to load requisition stats:', statsError);
        console.error('Stats error details:', statsError.response?.data);
      }
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
      // Fetch all new hires and filter for active onboarding (pending, active)
      const response = await peopleApi.getNewHires();
      const activeHires = response.data.filter(
        hire => ['pending', 'active'].includes(hire.status)
      );
      setNewHires(activeHires);
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

  // Handle requisition create
  const handleCreateRequisition = async (data: RequisitionCreate) => {
    try {
      await peopleApi.createRequisition(data);
      setShowCreateReqModal(false);
      await loadRequisitions();
    } catch (error) {
      console.error('Failed to create requisition:', error);
    }
  };

  // Handle requisition edit
  const handleEditRequisition = (requisition: Requisition) => {
    setEditingRequisition(requisition);
  };

  const handleUpdateRequisition = async (data: RequisitionUpdate) => {
    if (!editingRequisition) return;
    try {
      await peopleApi.updateRequisition(editingRequisition.id, data);
      setEditingRequisition(null);
      await loadRequisitions();
    } catch (error) {
      console.error('Failed to update requisition:', error);
    }
  };

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
            <PriorityCard key={priority.id} priority={priority} onCommentAdded={loadPriorities} />
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
        action={
          <button
            onClick={() => setShowCreateReqModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Requisition
          </button>
        }
      >
        <div className="space-y-6">
          {/* Requisition Summary Stats */}
          {requisitionStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500 mb-1">Total</div>
                <div className="text-2xl font-bold text-gray-900">{requisitionStats.total}</div>
              </div>
              <div className="bg-white rounded-lg border border-blue-200 p-4">
                <div className="text-sm text-blue-600 mb-1">Open</div>
                <div className="text-2xl font-bold text-blue-900">{requisitionStats.open}</div>
              </div>
              <div className="bg-white rounded-lg border border-yellow-200 p-4">
                <div className="text-sm text-yellow-600 mb-1">Interviewing</div>
                <div className="text-2xl font-bold text-yellow-900">{requisitionStats.interviewing}</div>
              </div>
              <div className="bg-white rounded-lg border border-purple-200 p-4">
                <div className="text-sm text-purple-600 mb-1">Offer Made</div>
                <div className="text-2xl font-bold text-purple-900">{requisitionStats.offer_made}</div>
              </div>
              <div className="bg-white rounded-lg border border-green-200 p-4">
                <div className="text-sm text-green-600 mb-1">Filled</div>
                <div className="text-2xl font-bold text-green-900">{requisitionStats.filled}</div>
              </div>
              <div className="bg-white rounded-lg border border-red-200 p-4">
                <div className="text-sm text-red-600 mb-1">Cancelled</div>
                <div className="text-2xl font-bold text-red-900">{requisitionStats.cancelled}</div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Stats not loaded (check console for details)</p>
            </div>
          )}

          {/* Row 1: Active Requisitions */}
          {requisitions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Active Requisitions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requisitions.map((req) => (
                  <RequisitionMiniCard key={req.id} requisition={req} onCommentAdded={loadRequisitions} onEdit={handleEditRequisition} />
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
                  <NewHireMiniCard key={hire.id} hire={hire} onClick={setSelectedHire} />
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
        <SalesPipelineKanban
          opportunities={opportunities}
          onEditOpportunity={handleEditOpportunity}
          onCommentAdded={loadOpportunities}
        />
      </DashboardSection>

      {/* Section 5: Invoicing */}
      <InvoicingSection />

      {/* Opportunity Modal */}
      <OpportunityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveOpportunity}
        opportunity={selectedOpportunity}
      />

      {/* Create Requisition Modal */}
      {showCreateReqModal && (
        <CreateRequisitionModal
          onClose={() => setShowCreateReqModal(false)}
          onSubmit={handleCreateRequisition}
        />
      )}

      {/* Edit Requisition Modal */}
      {editingRequisition && (
        <EditRequisitionModal
          requisition={editingRequisition}
          onClose={() => setEditingRequisition(null)}
          onSubmit={handleUpdateRequisition}
        />
      )}

      {/* Onboarding Checklist Modal */}
      {selectedHire && (
        <ChecklistModal
          isOpen={!!selectedHire}
          onClose={() => setSelectedHire(null)}
          hireId={selectedHire.id}
          hireName={selectedHire.name}
        />
      )}
    </div>
  );
}
