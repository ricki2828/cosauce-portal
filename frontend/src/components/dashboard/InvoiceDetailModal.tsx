import { useState, useEffect } from 'react';
import { X, Plus, Trash2, MessageSquarePlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { invoicingApi } from '../../lib/api';
import type {
  Invoice,
  InvoiceCreate,
  InvoiceRole,
  InvoiceRoleCreate,
  InvoiceStatus,
  InvoiceComment,
} from '../../lib/api';
import AddCommentModal from './AddCommentModal';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string | null;
  invoice: Invoice | null;
  periodMonth: number;
  periodYear: number;
  onSave: () => void;
  isCreatingNew?: boolean;
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Director/MD Approved' },
  { value: 'checking', label: 'Checking' },
  { value: 'gathering_data', label: 'Gathering Data' },
  { value: 'paid', label: 'Paid' },
  { value: 'blocked', label: 'Blocked' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function InvoiceDetailModal({
  isOpen,
  onClose,
  clientName,
  invoice,
  periodMonth,
  periodYear,
  onSave,
  isCreatingNew = false,
}: InvoiceDetailModalProps) {
  const { user } = useAuth();
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(invoice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for new client name when creating
  const [newClientName, setNewClientName] = useState('');

  // Role editing state
  const [newRole, setNewRole] = useState<InvoiceRoleCreate>({
    role_name: '',
    rate: 0,
    quantity: 0,
    sort_order: 0,
  });
  const [isAddingRole, setIsAddingRole] = useState(false);

  // Comment modal state
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const canEdit = user?.role === 'director' || user?.role === 'admin';
  const periodLabel = `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`;

  useEffect(() => {
    setCurrentInvoice(invoice);
  }, [invoice]);

  // Reset newClientName when modal opens/closes or when switching modes
  useEffect(() => {
    if (!isOpen || !isCreatingNew) {
      setNewClientName('');
    }
  }, [isOpen, isCreatingNew]);

  if (!isOpen) return null;

  const handleCreateInvoice = async () => {
    if (!canEdit) return;

    const finalClientName = isCreatingNew ? newClientName : clientName;
    if (!finalClientName || finalClientName.trim() === '') {
      setError('Client name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: InvoiceCreate = {
        client_name: finalClientName.trim(),
        period_month: periodMonth,
        period_year: periodYear,
        currency: 'NZD',
      };

      const response = await invoicingApi.createInvoice(data);
      setCurrentInvoice(response.data);
      setNewClientName('');
      onSave();
    } catch (err: any) {
      console.error('Failed to create invoice:', err);
      setError(err.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: InvoiceStatus) => {
    if (!currentInvoice || !canEdit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await invoicingApi.updateInvoice(currentInvoice.id, { status });
      setCurrentInvoice(response.data);
      onSave();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCurrency = async (currency: string) => {
    if (!currentInvoice || !canEdit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await invoicingApi.updateInvoice(currentInvoice.id, { currency });
      setCurrentInvoice(response.data);
      onSave();
    } catch (err: any) {
      console.error('Failed to update currency:', err);
      setError(err.response?.data?.detail || 'Failed to update currency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!currentInvoice || !canEdit) return;

    try {
      const response = await invoicingApi.updateInvoice(currentInvoice.id, { notes });
      setCurrentInvoice(response.data);
      onSave();
    } catch (err: any) {
      console.error('Failed to update notes:', err);
    }
  };

  const handleAddRole = async () => {
    if (!currentInvoice || !newRole.role_name) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await invoicingApi.addRole(currentInvoice.id, newRole);
      // Refresh invoice to get updated roles
      const updatedInvoice = await invoicingApi.getInvoice(currentInvoice.id);
      setCurrentInvoice(updatedInvoice.data);
      setNewRole({ role_name: '', rate: 0, quantity: 0, sort_order: 0 });
      setIsAddingRole(false);
      onSave();
    } catch (err: any) {
      console.error('Failed to add role:', err);
      setError(err.response?.data?.detail || 'Failed to add role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (roleId: string, field: string, value: string | number) => {
    if (!currentInvoice || !canEdit) return;

    try {
      const update: any = {};
      update[field] = field === 'role_name' ? value : Number(value);

      await invoicingApi.updateRole(currentInvoice.id, roleId, update);
      // Refresh invoice
      const updatedInvoice = await invoicingApi.getInvoice(currentInvoice.id);
      setCurrentInvoice(updatedInvoice.data);
      onSave();
    } catch (err: any) {
      console.error('Failed to update role:', err);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!currentInvoice || !canEdit) return;

    if (!confirm('Delete this role?')) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await invoicingApi.deleteRole(currentInvoice.id, roleId);
      // Refresh invoice
      const updatedInvoice = await invoicingApi.getInvoice(currentInvoice.id);
      setCurrentInvoice(updatedInvoice.data);
      onSave();
    } catch (err: any) {
      console.error('Failed to delete role:', err);
      setError(err.response?.data?.detail || 'Failed to delete role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!currentInvoice) return;

    await invoicingApi.addComment(currentInvoice.id, { content });
    // Refresh invoice
    const updatedInvoice = await invoicingApi.getInvoice(currentInvoice.id);
    setCurrentInvoice(updatedInvoice.data);
    onSave();
  };

  if (!currentInvoice) {
    // No invoice - show create button
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isCreatingNew ? `Create Invoice - ${periodLabel}` : `${clientName} - ${periodLabel}`}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isCreatingNew ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Enter the client name for this invoice.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g., Acme Corp, Client XYZ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 mb-6">
              No invoice exists for this client and period.
            </p>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {canEdit && (
            <button
              onClick={handleCreateInvoice}
              disabled={isSubmitting || (isCreatingNew && !newClientName.trim())}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </button>
          )}

          {!canEdit && (
            <p className="text-sm text-gray-500 text-center">
              You don't have permission to create invoices.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {clientName}
            </h2>
            <p className="text-sm text-gray-500">{periodLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={currentInvoice.status}
              onChange={(e) => handleUpdateStatus(e.target.value as InvoiceStatus)}
              disabled={!canEdit || isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <input
              type="text"
              value={currentInvoice.currency}
              onChange={(e) => {
                setCurrentInvoice({ ...currentInvoice, currency: e.target.value });
              }}
              onBlur={(e) => handleUpdateCurrency(e.target.value)}
              disabled={!canEdit || isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Roles table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Roles</h3>
              {canEdit && !isAddingRole && (
                <button
                  onClick={() => setIsAddingRole(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Role
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Role Name
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Rate
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    {canEdit && (
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentInvoice.roles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={role.role_name}
                          onChange={(e) =>
                            handleUpdateRole(role.id, 'role_name', e.target.value)
                          }
                          disabled={!canEdit}
                          className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 rounded focus:border-blue-500 disabled:bg-transparent disabled:hover:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={role.quantity}
                          onChange={(e) =>
                            handleUpdateRole(role.id, 'quantity', e.target.value)
                          }
                          disabled={!canEdit}
                          className="w-24 px-2 py-1 text-sm text-right border border-transparent hover:border-gray-300 rounded focus:border-blue-500 disabled:bg-transparent disabled:hover:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={role.rate}
                          onChange={(e) =>
                            handleUpdateRole(role.id, 'rate', e.target.value)
                          }
                          disabled={!canEdit}
                          className="w-24 px-2 py-1 text-sm text-right border border-transparent hover:border-gray-300 rounded focus:border-blue-500 disabled:bg-transparent disabled:hover:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                        {role.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* New role row */}
                  {isAddingRole && (
                    <tr className="bg-blue-50">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={newRole.role_name}
                          onChange={(e) =>
                            setNewRole({ ...newRole, role_name: e.target.value })
                          }
                          placeholder="Role name"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={newRole.quantity}
                          onChange={(e) =>
                            setNewRole({ ...newRole, quantity: Number(e.target.value) })
                          }
                          className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={newRole.rate}
                          onChange={(e) =>
                            setNewRole({ ...newRole, rate: Number(e.target.value) })
                          }
                          className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                        {(newRole.rate! * newRole.quantity!).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleAddRole}
                            disabled={!newRole.role_name || isSubmitting}
                            className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingRole(false);
                              setNewRole({ role_name: '', rate: 0, quantity: 0, sort_order: 0 });
                            }}
                            className="text-sm text-gray-600 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-right text-sm font-semibold text-gray-900"
                    >
                      Invoice Total:
                    </td>
                    <td className="px-4 py-2 text-right text-lg font-bold text-gray-900">
                      {currentInvoice.currency} {currentInvoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {canEdit && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={currentInvoice.notes || ''}
              onChange={(e) => {
                setCurrentInvoice({ ...currentInvoice, notes: e.target.value });
              }}
              onBlur={(e) => handleUpdateNotes(e.target.value)}
              disabled={!canEdit}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Add notes about this invoice..."
            />
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
              <button
                onClick={() => setIsCommentModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Add Comment
              </button>
            </div>

            {currentInvoice.comments.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No comments yet. Click "Add Comment" to start.
              </p>
            )}

            <div className="space-y-3">
              {currentInvoice.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="font-medium text-gray-900">
                      {comment.author_name}
                    </span>
                    <span>•</span>
                    <span>{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add comment modal */}
      <AddCommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        onSubmit={handleAddComment}
        title="Add Comment"
        placeholder="Write your comment..."
      />
    </div>
  );
}
