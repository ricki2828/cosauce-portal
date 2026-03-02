import { useState, useEffect } from 'react';
import { Flag, Users, TrendingUp, Plus, X } from 'lucide-react';
import { prioritiesApi, peopleApi, pipelineApi, atsApi } from '../lib/api';
import type { Requisition, RequisitionCreate, RequisitionUpdate, RequisitionStats, NewHire, NewHireCreate, PipelineOpportunity, PipelineOpportunityCreate, PipelineOpportunityUpdate, ATSJobMetrics, PostToATSRequest } from '../lib/api';
import type { Priority } from '../lib/priorities-types';
import {
  DashboardSection,
  PriorityCard,
  RequisitionMiniCard,
  NewHireMiniCard,
  SalesPipelineKanban,
  InvoicingSection
} from '../components/dashboard';
import { OpportunityModal } from '../components/dashboard/OpportunityModal';
import { EditRequisitionModal } from '../components/people/EditRequisitionModal';
import { CreateRequisitionModal } from '../components/people/CreateRequisitionModal';
import { ChecklistModal } from '../components/people/ChecklistModal';
import { ManageRolesModal } from '../components/people/ManageRolesModal';
import { PostToATSModal } from '../components/people/PostToATSModal';

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

  // Manage roles modal state
  const [managingRolesRequisition, setManagingRolesRequisition] = useState<Requisition | null>(null);

  // Onboarding checklist modal state
  const [selectedHire, setSelectedHire] = useState<NewHire | null>(null);
  const [showCreateHireModal, setShowCreateHireModal] = useState(false);

  // ATS state
  const [atsConfigured, setAtsConfigured] = useState(false);
  const [atsMetrics, setAtsMetrics] = useState<Record<string, ATSJobMetrics>>({});
  const [postToATSRequisition, setPostToATSRequisition] = useState<Requisition | null>(null);

  // Shift update state - no longer needed with KPICards
  // Removed: commentary functionality replaced by KPICards component

  // Load priorities
  const loadPriorities = async () => {
    try {
      setPrioritiesLoading(true);
      setPrioritiesError(null);
      const response = await prioritiesApi.getPriorities({ status: 'active' });
      // Sort by priority level (P1 > P2 > P3), then created_at desc, limit to 8
      const levelOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2 };
      const sorted = response.data
        .sort((a, b) => {
          const levelDiff = (levelOrder[a.priority_level] ?? 1) - (levelOrder[b.priority_level] ?? 1);
          if (levelDiff !== 0) return levelDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 8);
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

      // Load ATS status + metrics
      try {
        const atsStatus = await atsApi.getStatus();
        setAtsConfigured(atsStatus.data.configured);
        if (atsStatus.data.configured) {
          const linkedReqs = response.data.filter((r: Requisition) => r.heapsbetter_job_id);
          const metricsMap: Record<string, ATSJobMetrics> = {};
          await Promise.all(
            linkedReqs.map(async (r: Requisition) => {
              try {
                const m = await atsApi.getJobMetrics(r.id);
                metricsMap[r.id] = m.data;
              } catch { /* skip */ }
            })
          );
          setAtsMetrics(metricsMap);
        }
      } catch {
        // ATS not available, no UI shown
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
        hire => ['pending', 'active', 'onboarding', 'in_progress'].includes(hire.status)
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

  // Handle post to ATS
  const handlePostToATS = (requisition: Requisition) => {
    setPostToATSRequisition(requisition);
  };

  const handlePostToATSSubmit = async (data: PostToATSRequest) => {
    if (!postToATSRequisition) return;
    try {
      await atsApi.postToATS(postToATSRequisition.id, data);
      setPostToATSRequisition(null);
      await loadRequisitions();
    } catch (error) {
      console.error('Failed to post to ATS:', error);
      alert('Failed to post to ATS. Please try again.');
    }
  };

  // Handle create new hire
  const handleCreateNewHire = async (data: NewHireCreate) => {
    try {
      await peopleApi.createNewHire(data);
      setShowCreateHireModal(false);
      await loadNewHires();
    } catch (error) {
      console.error('Failed to create new hire:', error);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {priorities.map((priority) => (
            <PriorityCard key={priority.id} priority={priority} onCommentAdded={loadPriorities} />
          ))}
        </div>
      </DashboardSection>

      {/* Section 2: People */}
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
                  <RequisitionMiniCard key={req.id} requisition={req} onCommentAdded={loadRequisitions} onEdit={handleEditRequisition} atsConfigured={atsConfigured} atsMetrics={atsMetrics[req.id]} onPostToATS={handlePostToATS} />
                ))}
              </div>
            </div>
          )}

          {/* Row 2: New Hires (Onboarding) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Onboarding</h4>
              <button
                onClick={() => setShowCreateHireModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Onboarding
              </button>
            </div>
            {newHires.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {newHires.map((hire) => (
                  <NewHireMiniCard key={hire.id} hire={hire} onClick={setSelectedHire} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No active onboarding entries
              </div>
            )}
          </div>
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
          onManageRoles={() => {
            setManagingRolesRequisition(editingRequisition);
            setEditingRequisition(null);
          }}
        />
      )}

      {/* Manage Roles Modal */}
      {managingRolesRequisition && (
        <ManageRolesModal
          requisition={managingRolesRequisition}
          onClose={() => {
            setManagingRolesRequisition(null);
          }}
          onUpdate={loadRequisitions}
        />
      )}

      {/* Onboarding Checklist Modal */}
      {selectedHire && (
        <ChecklistModal
          isOpen={!!selectedHire}
          onClose={() => setSelectedHire(null)}
          hire={selectedHire}
          onUpdate={loadNewHires}
        />
      )}

      {/* Post to ATS Modal */}
      {postToATSRequisition && (
        <PostToATSModal
          requisition={postToATSRequisition}
          onClose={() => setPostToATSRequisition(null)}
          onSubmit={handlePostToATSSubmit}
        />
      )}

      {/* Create New Hire Modal */}
      {showCreateHireModal && (
        <CreateOnboardingModal
          onClose={() => setShowCreateHireModal(false)}
          onSubmit={handleCreateNewHire}
        />
      )}
    </div>
  );
}

function CreateOnboardingModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: NewHireCreate) => void;
}) {
  const [formData, setFormData] = useState<NewHireCreate>({
    name: '',
    role: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Onboarding Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <input
                type="text"
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g. Team Leader"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || undefined })}
                placeholder="name@company.co"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value || undefined })}
                placeholder="e.g. Operations"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
              Add to Onboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
