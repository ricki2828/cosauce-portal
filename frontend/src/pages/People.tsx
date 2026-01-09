import { useState, useEffect } from 'react';
import { Users, Briefcase, ClipboardList, Plus, Calendar, CheckCircle, X } from 'lucide-react';
import { peopleApi } from '../lib/api';
import type {
  Requisition,
  RequisitionCreate,
  NewHire,
  NewHireCreate,
  OnboardingTemplate,
  OnboardingTemplateCreate,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'requisitions' | 'new-hires' | 'templates';

export function People() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('new-hires');
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateReqModal, setShowCreateReqModal] = useState(false);
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
      } else if (activeTab === 'new-hires') {
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

  const handleCreateNewHire = async (data: NewHireCreate) => {
    try {
      await peopleApi.createNewHire(data);
      await loadData();
      setShowCreateHireModal(false);
    } catch (error) {
      console.error('Failed to create new hire:', error);
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
    { id: 'new-hires' as TabType, label: 'New Hires', icon: Users },
    { id: 'requisitions' as TabType, label: 'Requisitions', icon: Briefcase },
    { id: 'templates' as TabType, label: 'Templates', icon: ClipboardList },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="mt-1 text-gray-600">Manage requisitions, new hires, and onboarding</p>
        </div>
        {isDirectorOrAdmin && (
          <button
            onClick={() => {
              if (activeTab === 'requisitions') setShowCreateReqModal(true);
              else if (activeTab === 'new-hires') setShowCreateHireModal(true);
              else if (activeTab === 'templates') setShowCreateTemplateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'requisitions' && 'New Requisition'}
            {activeTab === 'new-hires' && 'New Hire'}
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
            <RequisitionsTab requisitions={requisitions} />
          )}
          {activeTab === 'new-hires' && (
            <NewHiresTab newHires={newHires} />
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
function RequisitionsTab({ requisitions }: { requisitions: Requisition[] }) {
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

  return (
    <div className="space-y-4">
      {requisitions.map((req) => (
        <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-6">
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
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>{req.department}</span>
                {req.location && <span>• {req.location}</span>}
                <span>• {req.employment_type.replace('_', ' ')}</span>
                <span>• {req.headcount} {req.headcount === 1 ? 'position' : 'positions'}</span>
              </div>
              {req.description && (
                <p className="mt-2 text-sm text-gray-600">{req.description}</p>
              )}
              {req.target_start_date && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Target start: {new Date(req.target_start_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {requisitions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No requisitions found. Create one to get started.
        </div>
      )}
    </div>
  );
}

// New Hires Tab
function NewHiresTab({ newHires }: { newHires: NewHire[] }) {
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
          </div>
        </div>
      ))}
      {newHires.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No new hires found. Add a new hire to get started.
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
    headcount: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

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
              Job Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                Employment Type *
              </label>
              <select
                required
                value={formData.employment_type}
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
                Headcount *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.headcount}
                onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Start Date
            </label>
            <input
              type="date"
              value={formData.target_start_date || ''}
              onChange={(e) => setFormData({ ...formData, target_start_date: e.target.value })}
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

// Create New Hire Modal
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
          <h2 className="text-xl font-semibold">New Hire</h2>
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
              Create New Hire
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
