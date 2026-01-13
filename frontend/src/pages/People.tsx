import { useState, useEffect } from 'react';
import { Users, Briefcase, ClipboardList, Plus, Calendar, CheckCircle, X, MessageSquare, Trash2, Edit2, Settings } from 'lucide-react';
import { peopleApi } from '../lib/api';
import type {
  Requisition,
  RequisitionCreate,
  RequisitionUpdate,
  RequisitionRoleCreate,
  NewHire,
  NewHireCreate,
  OnboardingTemplate,
  OnboardingTemplateCreate,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'requisitions' | 'onboarding' | 'templates';

export function People() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('onboarding');
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateReqModal, setShowCreateReqModal] = useState(false);
  const [showEditReqModal, setShowEditReqModal] = useState(false);
  const [showManageRolesModal, setShowManageRolesModal] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [showCreateHireModal, setShowCreateHireModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'requisitions') {
        const response = await peopleApi.getRequisitions();
        setRequisitions(response.data);
      } else if (activeTab === 'onboarding') {
        const response = await peopleApi.getNewHires();
        setNewHires(response.data);
      } else if (activeTab === 'templates') {
        const response = await peopleApi.getTemplates();
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequisition = async (data: RequisitionCreate) => {
    try {
      await peopleApi.createRequisition(data);
      await loadData();
      setShowCreateReqModal(false);
    } catch (error) {
      console.error('Failed to create requisition:', error);
    }
  };

  const handleEditRequisition = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setShowEditReqModal(true);
  };

  const handleUpdateRequisition = async (id: string, data: RequisitionUpdate) => {
    try {
      await peopleApi.updateRequisition(id, data);
      await loadData();
      setShowEditReqModal(false);
      setSelectedRequisition(null);
    } catch (error) {
      console.error('Failed to update requisition:', error);
    }
  };

  const handleDeleteRequisition = async (requisition: Requisition) => {
    if (!confirm(`Are you sure you want to delete the requisition "${requisition.title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await peopleApi.deleteRequisition(requisition.id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete requisition:', error);
      alert('Failed to delete requisition. Please try again.');
    }
  };

  const handleManageRoles = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setShowManageRolesModal(true);
  };

  const handleCreateNewHire = async (data: NewHireCreate) => {
    try {
      await peopleApi.createNewHire(data);
      await loadData();
      setShowCreateHireModal(false);
    } catch (error) {
      console.error('Failed to create onboarding entry:', error);
    }
  };

  const handleDeleteNewHire = async (hire: NewHire) => {
    if (!confirm(`Are you sure you want to delete "${hire.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await peopleApi.deleteNewHire(hire.id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete onboarding entry:', error);
      alert('Failed to delete onboarding entry. Please try again.');
    }
  };

  const handleCreateTemplate = async (data: OnboardingTemplateCreate, tasks: { task_title: string; day_offset: number }[]) => {
    try {
      const response = await peopleApi.createTemplate(data);
      const templateId = response.data.id;

      // Add each task to the template
      for (const task of tasks) {
        await peopleApi.addTemplateTask(templateId, task);
      }

      await loadData();
      setShowCreateTemplateModal(false);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const isDirectorOrAdmin = user?.role === 'director' || user?.role === 'admin';

  const tabs = [
    { id: 'onboarding' as TabType, label: 'Onboarding', icon: Users },
    { id: 'requisitions' as TabType, label: 'Requisitions', icon: Briefcase },
    { id: 'templates' as TabType, label: 'Templates', icon: ClipboardList },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="mt-1 text-gray-600">Manage requisitions, onboarding, and templates</p>
        </div>
        {isDirectorOrAdmin && (
          <button
            onClick={() => {
              if (activeTab === 'requisitions') setShowCreateReqModal(true);
              else if (activeTab === 'onboarding') setShowCreateHireModal(true);
              else if (activeTab === 'templates') setShowCreateTemplateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'requisitions' && 'New Requisition'}
            {activeTab === 'onboarding' && 'Onboarding Entry'}
            {activeTab === 'templates' && 'New Template'}
          </button>
        )}
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

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          {activeTab === 'requisitions' && (
            <RequisitionsTab
              requisitions={requisitions}
              onEdit={handleEditRequisition}
              onDelete={handleDeleteRequisition}
              onManageRoles={handleManageRoles}
              canEdit={isDirectorOrAdmin}
            />
          )}
          {activeTab === 'onboarding' && (
            <OnboardingTab
              newHires={newHires}
              onDelete={handleDeleteNewHire}
              canEdit={isDirectorOrAdmin}
            />
          )}
          {activeTab === 'templates' && (
            <TemplatesTab templates={templates} />
          )}
        </>
      )}

      {/* Modals */}
      {showCreateReqModal && (
        <CreateRequisitionModal
          onClose={() => setShowCreateReqModal(false)}
          onSubmit={handleCreateRequisition}
        />
      )}
      {showEditReqModal && selectedRequisition && (
        <EditRequisitionModal
          requisition={selectedRequisition}
          onClose={() => {
            setShowEditReqModal(false);
            setSelectedRequisition(null);
          }}
          onSubmit={(data) => handleUpdateRequisition(selectedRequisition.id, data)}
        />
      )}
      {showManageRolesModal && selectedRequisition && (
        <ManageRolesModal
          requisition={selectedRequisition}
          onClose={() => {
            setShowManageRolesModal(false);
            setSelectedRequisition(null);
          }}
          onUpdate={loadData}
        />
      )}
      {showCreateHireModal && (
        <CreateNewHireModal
          onClose={() => setShowCreateHireModal(false)}
          onSubmit={handleCreateNewHire}
          templates={templates}
        />
      )}
      {showCreateTemplateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateTemplateModal(false)}
          onSubmit={handleCreateTemplate}
        />
      )}
    </div>
  );
}

// Requisitions Tab
function RequisitionsTab({
  requisitions,
  onEdit,
  onDelete,
  onManageRoles,
  canEdit,
}: {
  requisitions: Requisition[];
  onEdit: (req: Requisition) => void;
  onDelete: (req: Requisition) => void;
  onManageRoles: (req: Requisition) => void;
  canEdit: boolean;
}) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'interviewing': return 'bg-blue-100 text-blue-800';
      case 'offer_made': return 'bg-purple-100 text-purple-800';
      case 'filled': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleComments = (id: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate totals from roles
  const getTotals = (req: Requisition) => {
    const roles = req.roles || [];
    const totalRequested = roles.reduce((sum, r) => sum + r.requested_count, 0);
    const totalFilled = roles.reduce((sum, r) => sum + r.filled_count, 0);
    const totalRemaining = roles.reduce((sum, r) => sum + r.remaining_count, 0);
    return { totalRequested, totalFilled, totalRemaining };
  };

  return (
    <div className="space-y-4">
      {requisitions.map((req) => {
        const { totalRequested, totalFilled, totalRemaining } = getTotals(req);
        const hasRoles = req.roles && req.roles.length > 0;

        return (
          <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Header Row */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{req.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(req.status)}`}>
                    {req.status.replace('_', ' ')}
                  </span>
                  {req.priority && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                      {req.priority}
                    </span>
                  )}
                </div>

                {/* Department & Location Row */}
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                  <span>{req.department}</span>
                  {req.location && <span>• {req.location}</span>}
                  <span>• {req.employment_type.replace('_', ' ')}</span>
                </div>

                {/* Date Requested & Date Needed Row */}
                <div className="mt-3 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Requested: <strong>{formatDate(req.created_at)}</strong></span>
                  </div>
                  {req.target_start_date && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Needed: <strong>{formatDate(req.target_start_date)}</strong></span>
                    </div>
                  )}
                </div>

                {/* Role Lines */}
                {hasRoles && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-gray-700">Roles:</div>
                    <div className="flex flex-wrap gap-3">
                      {req.roles.map((role) => (
                        <div
                          key={role.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <span className="font-medium text-gray-800">{role.role_type}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-sm text-gray-600">
                            {role.filled_count}/{role.requested_count} filled
                          </span>
                          {role.remaining_count > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                              {role.remaining_count} remaining
                            </span>
                          )}
                          {role.remaining_count === 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              complete
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Totals Summary */}
                    <div className="mt-2 text-sm text-gray-500">
                      Total: {totalFilled}/{totalRequested} filled
                      {totalRemaining > 0 && (
                        <span className="ml-2 text-amber-600 font-medium">
                          ({totalRemaining} remaining)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback for old requisitions without roles */}
                {!hasRoles && req.headcount > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    Positions: {req.headcount}
                  </div>
                )}

                {/* Description */}
                {req.description && (
                  <p className="mt-3 text-sm text-gray-600">{req.description}</p>
                )}

                {/* Comments Section */}
                {req.comments && (
                  <div className="mt-4">
                    <button
                      onClick={() => toggleComments(req.id)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {expandedComments.has(req.id) ? 'Hide Comments' : 'Show Comments'}
                    </button>
                    {expandedComments.has(req.id) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                        {req.comments}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {canEdit && (
                <div className="ml-4 flex items-center gap-2">
                  <button
                    onClick={() => onManageRoles(req)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Manage roles"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onEdit(req)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit requisition"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(req)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete requisition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {requisitions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No requisitions found. Create one to get started.
        </div>
      )}
    </div>
  );
}

// Onboarding Tab
function OnboardingTab({
  newHires,
  onDelete,
  canEdit,
}: {
  newHires: NewHire[];
  onDelete: (hire: NewHire) => void;
  canEdit: boolean;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {newHires.map((hire) => (
        <div key={hire.id} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{hire.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(hire.status)}`}>
                  {hire.status}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>{hire.role}</span>
                {hire.department && <span>• {hire.department}</span>}
                {hire.email && <span>• {hire.email}</span>}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Start date: {new Date(hire.start_date).toLocaleDateString()}
              </div>
              {hire.tasks && hire.tasks.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    Onboarding Tasks ({hire.tasks.filter(t => t.completed).length}/{hire.tasks.length} completed)
                  </div>
                </div>
              )}
            </div>

            {/* Delete Button */}
            {canEdit && (
              <button
                onClick={() => onDelete(hire)}
                className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete onboarding entry"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ))}
      {newHires.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No onboarding entries found. Add a onboarding entry to get started.
        </div>
      )}
    </div>
  );
}

// Templates Tab
function TemplatesTab({ templates }: { templates: OnboardingTemplate[] }) {
  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              {template.role_type && (
                <div className="mt-1 text-sm text-gray-600">
                  Role type: {template.role_type}
                </div>
              )}
              {template.description && (
                <p className="mt-2 text-sm text-gray-600">{template.description}</p>
              )}
              {template.tasks && template.tasks.length > 0 && (
                <div className="mt-3 text-sm text-gray-500">
                  {template.tasks.length} tasks configured
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {templates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No templates found. Create a template to get started.
        </div>
      )}
    </div>
  );
}

// Create Requisition Modal
function CreateRequisitionModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: RequisitionCreate) => void;
}) {
  const [formData, setFormData] = useState<RequisitionCreate>({
    title: '',
    department: '',
    employment_type: 'full_time',
    roles: [],
  });

  const [roleInput, setRoleInput] = useState<RequisitionRoleCreate>({
    role_type: '',
    requested_count: 1,
  });

  const addRole = () => {
    if (roleInput.role_type.trim()) {
      setFormData({
        ...formData,
        roles: [...(formData.roles || []), { ...roleInput }],
      });
      setRoleInput({ role_type: '', requested_count: 1 });
    }
  };

  const removeRole = (index: number) => {
    setFormData({
      ...formData,
      roles: (formData.roles || []).filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const totalRoles = (formData.roles || []).reduce((sum, r) => sum + (r.requested_count || 1), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">New Requisition</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requisition Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., 2 Jan Intake, March Hiring"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department *
            </label>
            <input
              type="text"
              required
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type
              </label>
              <select
                value={formData.employment_type || 'full_time'}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority || ''}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Role Lines Section */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Role Lines {totalRoles > 0 && <span className="text-gray-500">({totalRoles} total positions)</span>}
            </label>

            {/* Existing Roles */}
            {(formData.roles || []).length > 0 && (
              <div className="mb-4 space-y-2">
                {(formData.roles || []).map((role, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{role.role_type}</span>
                      <span className="mx-2 text-gray-400">×</span>
                      <span className="text-gray-600">{role.requested_count || 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRole(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Role Form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Role type (e.g., Team Leader, Agent)"
                value={roleInput.role_type}
                onChange={(e) => setRoleInput({ ...roleInput, role_type: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                min="1"
                placeholder="Count"
                value={roleInput.requested_count}
                onChange={(e) => setRoleInput({ ...roleInput, requested_count: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addRole}
                disabled={!roleInput.role_type.trim()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Add one or more role types with the number of positions needed for each.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Needed
            </label>
            <input
              type="date"
              value={formData.target_start_date || ''}
              onChange={(e) => setFormData({ ...formData, target_start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments
            </label>
            <textarea
              rows={3}
              value={formData.comments || ''}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              placeholder="Internal notes about this requisition..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Create Requisition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Requisition Modal
function EditRequisitionModal({
  requisition,
  onClose,
  onSubmit,
}: {
  requisition: Requisition;
  onClose: () => void;
  onSubmit: (data: RequisitionUpdate) => void;
}) {
  const [formData, setFormData] = useState<RequisitionUpdate>({
    title: requisition.title,
    department: requisition.department,
    employment_type: requisition.employment_type,
    status: requisition.status,
    location: requisition.location ?? undefined,
    priority: requisition.priority ?? undefined,
    target_start_date: requisition.target_start_date ?? undefined,
    description: requisition.description ?? undefined,
    comments: requisition.comments ?? undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const totalRoles = requisition.roles.reduce((sum, r) => sum + (r.requested_count || 1), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Requisition</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requisition Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., 2 Jan Intake, March Hiring"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department *
            </label>
            <input
              type="text"
              required
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="open">Open</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer_made">Offer Made</option>
                <option value="filled">Filled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type
              </label>
              <select
                value={formData.employment_type || 'full_time'}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority || ''}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Role Lines Section (Read-Only) */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Role Lines {totalRoles > 0 && <span className="text-gray-500">({totalRoles} total positions)</span>}
            </label>

            {requisition.roles.length > 0 ? (
              <div className="space-y-2">
                {requisition.roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{role.role_type}</span>
                      <span className="mx-2 text-gray-400">×</span>
                      <span className="text-gray-600">{role.requested_count}</span>
                      {role.filled_count > 0 && (
                        <span className="ml-2 text-green-600">({role.filled_count} filled)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No role lines defined</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Note: Role lines cannot be edited here. Use the requisition details page to manage roles.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Needed
            </label>
            <input
              type="date"
              value={formData.target_start_date || ''}
              onChange={(e) => setFormData({ ...formData, target_start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments
            </label>
            <textarea
              rows={3}
              value={formData.comments || ''}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              placeholder="Internal notes about this requisition..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Update Requisition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Manage Roles Modal
function ManageRolesModal({
  requisition,
  onClose,
  onUpdate,
}: {
  requisition: Requisition;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [roles, setRoles] = useState(requisition.roles || []);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ role_type: string; requested_count: number }>({
    role_type: '',
    requested_count: 1,
  });
  const [newRoleInput, setNewRoleInput] = useState<{ role_type: string; requested_count: number }>({
    role_type: '',
    requested_count: 1,
  });
  const [loading, setLoading] = useState(false);

  // Reload roles after changes
  const reloadRoles = async () => {
    try {
      const response = await peopleApi.getRequisition(requisition.id);
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error('Failed to reload roles:', error);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleInput.role_type.trim()) return;

    try {
      setLoading(true);
      await peopleApi.addRequisitionRole(requisition.id, {
        role_type: newRoleInput.role_type,
        requested_count: newRoleInput.requested_count,
      });
      await reloadRoles();
      setNewRoleInput({ role_type: '', requested_count: 1 });
      onUpdate(); // Notify parent to refresh
    } catch (error) {
      console.error('Failed to add role:', error);
      alert('Failed to add role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (role: typeof roles[0]) => {
    setEditingRole(role.id);
    setEditForm({
      role_type: role.role_type,
      requested_count: role.requested_count,
    });
  };

  const handleSaveEdit = async (roleId: string) => {
    try {
      setLoading(true);
      await peopleApi.updateRequisitionRole(requisition.id, roleId, editForm);
      await reloadRoles();
      setEditingRole(null);
      onUpdate(); // Notify parent to refresh
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
  };

  const handleDeleteRole = async (roleId: string, roleType: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleType}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await peopleApi.deleteRequisitionRole(requisition.id, roleId);
      await reloadRoles();
      onUpdate(); // Notify parent to refresh
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementFilled = async (roleId: string) => {
    try {
      setLoading(true);
      await peopleApi.incrementRoleFilled(requisition.id, roleId, 1);
      await reloadRoles();
      onUpdate(); // Notify parent to refresh
    } catch (error) {
      console.error('Failed to increment filled count:', error);
      alert('Failed to update filled count. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrementFilled = async (roleId: string, currentFilled: number) => {
    if (currentFilled === 0) return;

    try {
      setLoading(true);
      await peopleApi.incrementRoleFilled(requisition.id, roleId, -1);
      await reloadRoles();
      onUpdate(); // Notify parent to refresh
    } catch (error) {
      console.error('Failed to decrement filled count:', error);
      alert('Failed to update filled count. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Manage Roles</h2>
            <p className="text-sm text-gray-600 mt-1">{requisition.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Existing Roles */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Roles</h3>
            {roles.length > 0 ? (
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                    {editingRole === role.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={editForm.role_type}
                            onChange={(e) => setEditForm({ ...editForm, role_type: e.target.value })}
                            placeholder="Role type"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                          />
                          <input
                            type="number"
                            min="1"
                            value={editForm.requested_count}
                            onChange={(e) => setEditForm({ ...editForm, requested_count: parseInt(e.target.value) || 1 })}
                            placeholder="Count"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            disabled={loading}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(role.id)}
                            className="px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            disabled={loading || !editForm.role_type.trim()}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">{role.role_type}</span>
                            <span className="text-gray-400">×</span>
                            <span className="text-gray-700">{role.requested_count}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-sm text-gray-600">
                              Filled: {role.filled_count}/{role.requested_count}
                            </span>
                            {role.remaining_count > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                {role.remaining_count} remaining
                              </span>
                            )}
                            {role.remaining_count === 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                complete
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Increment/Decrement Filled Count */}
                          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleDecrementFilled(role.id, role.filled_count)}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={loading || role.filled_count === 0}
                              title="Decrease filled count"
                            >
                              <span className="text-lg leading-none">−</span>
                            </button>
                            <span className="px-2 py-1 text-sm font-medium border-x border-gray-200">
                              {role.filled_count}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncrementFilled(role.id)}
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={loading || role.filled_count >= role.requested_count}
                              title="Increase filled count"
                            >
                              <span className="text-lg leading-none">+</span>
                            </button>
                          </div>
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(role)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            disabled={loading}
                            title="Edit role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role.id, role.role_type)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            disabled={loading}
                            title="Delete role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No roles defined yet.</p>
            )}
          </div>

          {/* Add New Role */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Role</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Role type (e.g., Team Leader, Agent)"
                value={newRoleInput.role_type}
                onChange={(e) => setNewRoleInput({ ...newRoleInput, role_type: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <input
                type="number"
                min="1"
                placeholder="Count"
                value={newRoleInput.requested_count}
                onChange={(e) => setNewRoleInput({ ...newRoleInput, requested_count: parseInt(e.target.value) || 1 })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddRole}
                disabled={loading || !newRoleInput.role_type.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Role
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            disabled={loading}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Onboarding Entry Modal
function CreateNewHireModal({
  onClose,
  onSubmit,
  templates,
}: {
  onClose: () => void;
  onSubmit: (data: NewHireCreate) => void;
  templates: OnboardingTemplate[];
}) {
  const [formData, setFormData] = useState<NewHireCreate>({
    name: '',
    role: '',
    start_date: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Onboarding Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <input
              type="text"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <input
              type="text"
              value={formData.department || ''}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Onboarding Template
            </label>
            <select
              value={formData.onboarding_template_id || ''}
              onChange={(e) => setFormData({ ...formData, onboarding_template_id: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Create Onboarding Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Template Modal
function CreateTemplateModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: OnboardingTemplateCreate, tasks: { task_title: string; day_offset: number }[]) => void;
}) {
  const [formData, setFormData] = useState<OnboardingTemplateCreate>({
    name: '',
  });

  const [tasks, setTasks] = useState<{ task_title: string; day_offset: number }[]>([]);
  const [taskInput, setTaskInput] = useState({ task_title: '', day_offset: 0 });

  const addTask = () => {
    if (taskInput.task_title) {
      setTasks([...tasks, { ...taskInput }]);
      setTaskInput({ task_title: '', day_offset: 0 });
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, tasks);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">New Onboarding Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Type
            </label>
            <input
              type="text"
              value={formData.role_type || ''}
              onChange={(e) => setFormData({ ...formData, role_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Software Developer, Marketing Manager"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Onboarding Tasks
            </label>

            {/* Task List */}
            {tasks.length > 0 && (
              <div className="mb-4 space-y-2">
                {tasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.task_title}</div>
                      <div className="text-xs text-gray-500">
                        Day {task.day_offset > 0 ? '+' : ''}{task.day_offset}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTask(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Task Form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Task title"
                value={taskInput.task_title}
                onChange={(e) => setTaskInput({ ...taskInput, task_title: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Day"
                value={taskInput.day_offset}
                onChange={(e) => setTaskInput({ ...taskInput, day_offset: parseInt(e.target.value) })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTask}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Day offset: -1 = day before start, 0 = start date, 1 = day after start, etc.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
