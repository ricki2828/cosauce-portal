import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PipelineOpportunity, PipelineOpportunityCreate, PipelineOpportunityUpdate } from '../../lib/api';

interface OpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PipelineOpportunityCreate | PipelineOpportunityUpdate) => Promise<void>;
  opportunity?: PipelineOpportunity;
}

export function OpportunityModal({ isOpen, onClose, onSave, opportunity }: OpportunityModalProps) {
  const [formData, setFormData] = useState({
    client_name: '',
    size: '',
    likelihood: 'medium' as 'high' | 'medium' | 'low',
    status: 'new' as 'new' | 'meeting' | 'evaluation' | 'design_implementation',
    target_date: '',
    notes: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (opportunity) {
      setFormData({
        client_name: opportunity.client_name,
        size: opportunity.size || '',
        likelihood: opportunity.likelihood,
        status: opportunity.status,
        target_date: opportunity.target_date || '',
        notes: opportunity.notes || '',
      });
    } else {
      setFormData({
        client_name: '',
        size: '',
        likelihood: 'medium',
        status: 'new',
        target_date: '',
        notes: '',
      });
    }
  }, [opportunity, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Build data object with only defined values
      const data: any = {
        client_name: formData.client_name,
        likelihood: formData.likelihood,
        status: formData.status,
      };

      if (formData.size) data.size = formData.size;
      if (formData.target_date) data.target_date = formData.target_date;
      if (formData.notes) data.notes = formData.notes;

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save opportunity:', error);
      alert('Failed to save opportunity. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {opportunity ? 'Edit Opportunity' : 'Add Opportunity'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Client Name */}
            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="client_name"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter client name"
              />
            </div>

            {/* Size */}
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                Size
              </label>
              <input
                type="text"
                id="size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 50-100 employees, $500K ARR"
              />
            </div>

            {/* Likelihood */}
            <div>
              <label htmlFor="likelihood" className="block text-sm font-medium text-gray-700 mb-1">
                Likelihood <span className="text-red-500">*</span>
              </label>
              <select
                id="likelihood"
                required
                value={formData.likelihood}
                onChange={(e) => setFormData({ ...formData, likelihood: e.target.value as 'high' | 'medium' | 'low' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'new' | 'meeting' | 'evaluation' | 'design_implementation' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="new">New</option>
                <option value="meeting">Meeting</option>
                <option value="evaluation">Evaluation</option>
                <option value="design_implementation">Design & Implementation</option>
              </select>
            </div>

            {/* Target Date */}
            <div>
              <label htmlFor="target_date" className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <input
                type="date"
                id="target_date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Additional notes or context"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : opportunity ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
