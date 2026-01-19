import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { NewHire, ChecklistItem } from '../../lib/api';
import { peopleApi } from '../../lib/api';
import { ChecklistView } from './ChecklistView';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hire: NewHire | null;
  onUpdate: () => void;
}

export function OnboardingModal({ isOpen, onClose, hire, onUpdate }: OnboardingModalProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<NewHire['status']>('pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && hire) {
      loadChecklist();
      setStatus(hire.status);
    }
  }, [isOpen, hire]);

  const loadChecklist = async () => {
    if (!hire) return;

    setLoading(true);
    try {
      const response = await peopleApi.getOnboardingChecklist(hire.id);
      setChecklist(response.data);
    } catch (error) {
      console.error('Failed to load checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageToggle = async (stageId: string, isCompleted: boolean, notes?: string) => {
    if (!hire) return;

    try {
      await peopleApi.updateChecklistStage(hire.id, stageId, { is_completed: isCompleted, notes });
      await loadChecklist();
    } catch (error) {
      console.error('Failed to update stage:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!hire) return;

    setSaving(true);
    try {
      await peopleApi.updateNewHire(hire.id, { status });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !hire) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{hire.name}</h2>
            <p className="text-sm text-gray-600">{hire.role}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Status Selector */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Onboarding Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as NewHire['status'])}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Checklist */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ChecklistView
              hireId={hire.id}
              checklist={checklist}
              onStageToggle={handleStageToggle}
              editable={true}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
