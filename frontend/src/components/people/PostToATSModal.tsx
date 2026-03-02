import { useState } from 'react';
import { X } from 'lucide-react';
import type { Requisition, PostToATSRequest } from '../../lib/api';

interface PostToATSModalProps {
  requisition: Requisition;
  onClose: () => void;
  onSubmit: (data: PostToATSRequest) => void;
}

export function PostToATSModal({ requisition, onClose, onSubmit }: PostToATSModalProps) {
  // Pre-fill positions_count from total requested across roles
  const totalRequested = requisition.roles?.reduce((sum, r) => sum + r.requested_count, 0) || requisition.headcount || 1;

  const [formData, setFormData] = useState<PostToATSRequest>({
    work_arrangement: 'onsite',
    positions_count: totalRequested,
    salary_min: undefined,
    salary_max: undefined,
    salary_currency: 'NZD',
    description: requisition.description || '',
    responsibilities: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Post to Heapsbetter ATS</h2>
            <p className="text-sm text-gray-500 mt-1">{requisition.title} — {requisition.department}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Pre-filled info banner */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800">
            Title, department, location, and employment type will be synced from the requisition.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Arrangement</label>
            <select
              value={formData.work_arrangement || ''}
              onChange={(e) => setFormData({ ...formData, work_arrangement: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Positions</label>
            <input
              type="number"
              min={1}
              value={formData.positions_count || ''}
              onChange={(e) => setFormData({ ...formData, positions_count: parseInt(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={formData.salary_min || ''}
                onChange={(e) => setFormData({ ...formData, salary_min: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max</label>
              <input
                type="number"
                placeholder="e.g. 70000"
                value={formData.salary_max || ''}
                onChange={(e) => setFormData({ ...formData, salary_max: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={formData.salary_currency || 'NZD'}
                onChange={(e) => setFormData({ ...formData, salary_currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="NZD">NZD</option>
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="ZAR">ZAR</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description Override</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Leave empty to use requisition description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
            <textarea
              rows={3}
              value={formData.responsibilities || ''}
              onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Key responsibilities for the role"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700">
              Post to ATS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
