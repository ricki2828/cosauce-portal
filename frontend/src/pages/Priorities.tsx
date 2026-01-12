import { useState, useEffect } from 'react';
import { Plus, Calendar, User, MessageSquare, X, Check, Clock, Archive } from 'lucide-react';
import { prioritiesApi } from '../lib/api';
import type { Priority, PriorityCreate } from '../lib/priorities-types';
import { useAuth } from '../contexts/AuthContext';

export function Priorities() {
  const { user } = useAuth();
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [filteredPriorities, setFilteredPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'deferred'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Load priorities
  useEffect(() => {
    loadPriorities();
  }, []);

  // Filter priorities when filter changes
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredPriorities(priorities);
    } else {
      setFilteredPriorities(priorities.filter(p => p.status === statusFilter));
    }
  }, [priorities, statusFilter]);

  const loadPriorities = async () => {
    try {
      setLoading(true);
      const response = await prioritiesApi.getPriorities();
      setPriorities(response.data);
    } catch (error) {
      console.error('Failed to load priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePriority = async (data: PriorityCreate) => {
    try {
      await prioritiesApi.createPriority(data);
      await loadPriorities();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create priority:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'completed' | 'deferred') => {
    try {
      await prioritiesApi.updatePriority(id, { status });
      await loadPriorities();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddUpdate = async (priorityId: string, content: string) => {
    try {
      await prioritiesApi.addUpdate(priorityId, { content });
      await loadPriorities();
      setShowUpdateModal(false);
      setSelectedPriority(null);
    } catch (error) {
      console.error('Failed to add update:', error);
    }
  };

  const isDirectorOrAdmin = user?.role === 'director' || user?.role === 'admin';

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Key Priorities</h1>
          <p className="mt-1 text-gray-600">Track and manage executive priorities</p>
        </div>
        {isDirectorOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Priority
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex gap-2">
        {(['all', 'active', 'completed', 'deferred'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Priorities List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPriorities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No priorities found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPriorities.map((priority) => (
            <PriorityCard
              key={priority.id}
              priority={priority}
              onUpdateStatus={handleUpdateStatus}
              onAddUpdate={() => {
                setSelectedPriority(priority);
                setShowUpdateModal(true);
              }}
              isDirectorOrAdmin={isDirectorOrAdmin}
            />
          ))}
        </div>
      )}

      {/* Create Priority Modal */}
      {showCreateModal && (
        <CreatePriorityModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePriority}
        />
      )}

      {/* Add Update Modal */}
      {showUpdateModal && selectedPriority && (
        <AddUpdateModal
          priority={selectedPriority}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedPriority(null);
          }}
          onAdd={(content) => handleAddUpdate(selectedPriority.id, content)}
        />
      )}
    </div>
  );
}

// Priority Card Component
interface PriorityCardProps {
  priority: Priority;
  onUpdateStatus: (id: string, status: 'active' | 'completed' | 'deferred') => void;
  onAddUpdate: () => void;
  isDirectorOrAdmin: boolean;
}

function PriorityCard({ priority, onUpdateStatus, onAddUpdate, isDirectorOrAdmin }: PriorityCardProps) {
  const [showUpdates, setShowUpdates] = useState(false);

  const statusColors = {
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    deferred: 'bg-gray-100 text-gray-700',
  };

  const statusIcons = {
    active: Clock,
    completed: Check,
    deferred: Archive,
  };

  const StatusIcon = statusIcons[priority.status];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">{priority.title}</h3>
            <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusColors[priority.status]}`}>
              <StatusIcon className="w-3 h-3" />
              {priority.status.charAt(0).toUpperCase() + priority.status.slice(1)}
            </span>
          </div>
          {priority.description && (
            <p className="mt-2 text-gray-600">{priority.description}</p>
          )}
        </div>
      </div>

      {/* Meta Info */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          {priority.owner_name}
        </div>
        {priority.due_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(priority.due_date).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" />
          {priority.updates.length} updates
        </div>
      </div>

      {/* Actions */}
      {isDirectorOrAdmin && (
        <div className="mt-4 flex gap-2">
          {priority.status === 'active' && (
            <>
              <button
                onClick={() => onUpdateStatus(priority.id, 'completed')}
                className="px-3 py-1 text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
              >
                Mark Completed
              </button>
              <button
                onClick={() => onUpdateStatus(priority.id, 'deferred')}
                className="px-3 py-1 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                Defer
              </button>
            </>
          )}
          {priority.status !== 'active' && (
            <button
              onClick={() => onUpdateStatus(priority.id, 'active')}
              className="px-3 py-1 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              Reactivate
            </button>
          )}
          <button
            onClick={onAddUpdate}
            className="px-3 py-1 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            Add Update
          </button>
        </div>
      )}

      {/* Updates */}
      {priority.updates.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowUpdates(!showUpdates)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showUpdates ? 'Hide' : 'Show'} {priority.updates.length} update{priority.updates.length !== 1 ? 's' : ''}
          </button>
          {showUpdates && (
            <div className="mt-3 space-y-3">
              {priority.updates.map((update) => (
                <div key={update.id} className="pl-4 border-l-2 border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">{update.author_name}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">{new Date(update.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-gray-700">{update.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Create Priority Modal
interface CreatePriorityModalProps {
  onClose: () => void;
  onCreate: (data: PriorityCreate) => void;
}

function CreatePriorityModal({ onClose, onCreate }: CreatePriorityModalProps) {
  const [formData, setFormData] = useState<PriorityCreate>({
    title: '',
    description: '',
    status: 'active',
    due_date: '',
    sort_order: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">New Priority</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Priority
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Update Modal
interface AddUpdateModalProps {
  priority: Priority;
  onClose: () => void;
  onAdd: (content: string) => void;
}

function AddUpdateModal({ priority, onClose, onAdd }: AddUpdateModalProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onAdd(content);
      setContent('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add Update</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">Adding update to: {priority.title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Update</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Enter update details..."
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
