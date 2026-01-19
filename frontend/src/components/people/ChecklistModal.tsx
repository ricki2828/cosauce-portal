import { useState, useEffect } from 'react';
import { X, Plus, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';

interface ChecklistStage {
  id: string;
  checklist_item_id: string;
  stage_label: string;
  stage_category: string | null;
  stage_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
}

interface ChecklistItem {
  id: string;
  team_member_id: string;
  item_name: string;
  order_index: number;
  created_at: string;
  stages: ChecklistStage[];
}

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  hireId: string;
  hireName: string;
}

export function ChecklistModal({ isOpen, onClose, hireId, hireName }: ChecklistModalProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadChecklist();
    }
  }, [isOpen, hireId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const response = await api.get<ChecklistItem[]>(`/api/onboarding/new-hires/${hireId}/checklist`);
      setChecklist(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No checklist exists yet, create default one
        setChecklist([]);
      } else {
        console.error('Failed to load checklist:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStage = async (stageId: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/onboarding/new-hires/${hireId}/checklist/stages/${stageId}`, {
        is_completed: !currentStatus
      });
      await loadChecklist();
    } catch (error) {
      console.error('Failed to toggle stage:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    try {
      const maxOrder = checklist.length > 0 ? Math.max(...checklist.map(item => item.order_index)) : 0;

      await api.post(`/api/onboarding/new-hires/${hireId}/checklist/items`, {
        item_name: newItemName,
        order_index: maxOrder + 1,
        stages: [
          { stage_label: 'Received', stage_category: 'HR' },
          { stage_label: 'Verified', stage_category: 'HR' },
          { stage_label: 'Approved', stage_category: 'Approval' }
        ]
      });

      setNewItemName('');
      setShowAddItem(false);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to add checklist item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}"? This cannot be undone.`)) return;

    try {
      await api.delete(`/api/onboarding/new-hires/${hireId}/checklist/items/${itemId}`);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
    }
  };

  const getCategoryColor = (category: string | null) => {
    if (category === 'HR') return 'bg-blue-100 text-blue-700';
    if (category === 'Approval') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Onboarding Checklist</h2>
            <p className="text-sm text-gray-500 mt-1">{hireName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading checklist...</div>
          ) : checklist.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No checklist items yet. Add items below to get started.
            </div>
          ) : (
            <div className="space-y-6">
              {checklist.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.item_name)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stages */}
                  <div className="space-y-2">
                    {item.stages.map((stage) => (
                      <div
                        key={stage.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleToggleStage(stage.id, stage.is_completed)}
                      >
                        {stage.is_completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={`flex-1 text-sm ${stage.is_completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                          {stage.stage_label}
                        </span>
                        {stage.stage_category && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(stage.stage_category)}`}>
                            {stage.stage_category}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Item */}
          <div className="mt-6">
            {showAddItem ? (
              <div className="border border-gray-200 rounded-lg p-4">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter item name (e.g., 'Resume', 'ID Document')"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem();
                    if (e.key === 'Escape') setShowAddItem(false);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                  <button
                    onClick={() => {
                      setShowAddItem(false);
                      setNewItemName('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Checklist Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
