import { useState, useEffect } from 'react';
import { Download, Send } from 'lucide-react';
import { payablesApi } from '../../lib/api';
import type { Payable, PayableStatus, PayablePriority } from '../../lib/finance-types';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';

interface PayableDetailModalProps {
  open: boolean;
  payableId: string;
  onClose: () => void;
}

const statusColors: Record<PayableStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  loaded: 'bg-blue-100 text-blue-800',
  paid: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<PayablePriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PayableDetailModal({ open, payableId, onClose }: PayableDetailModalProps) {
  const { user } = useAuth();
  const [payable, setPayable] = useState<Payable | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isDirectorPlus = user?.role === 'director' || user?.role === 'admin' || user?.role === 'superadmin';
  const isAdminPlus = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    loadPayable();
  }, [payableId]);

  const loadPayable = async () => {
    try {
      setLoading(true);
      const response = await payablesApi.get(payableId);
      setPayable(response.data);
    } catch (error) {
      console.error('Failed to load payable:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await payablesApi.approve(payableId);
      await loadPayable();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await payablesApi.reject(payableId, rejectReason);
      setShowRejectInput(false);
      setRejectReason('');
      await loadPayable();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkLoaded = async () => {
    setActionLoading(true);
    try {
      await payablesApi.markLoaded(payableId);
      await loadPayable();
    } catch (error) {
      console.error('Failed to mark loaded:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setActionLoading(true);
    try {
      await payablesApi.markPaid(payableId);
      await loadPayable();
    } catch (error) {
      console.error('Failed to mark paid:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadAttachment = async () => {
    try {
      const response = await payablesApi.downloadAttachment(payableId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = payable?.attachment_filename || 'attachment';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download attachment:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await payablesApi.addComment(payableId, { content: comment });
      setComment('');
      await loadPayable();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payable Details</DialogTitle>
          <DialogDescription>View and manage payable request.</DialogDescription>
        </DialogHeader>

        {loading || !payable ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status + Priority badges */}
            <div className="flex items-center gap-2">
              <Badge className={statusColors[payable.status]}>
                {payable.status.charAt(0).toUpperCase() + payable.status.slice(1)}
              </Badge>
              <Badge className={priorityColors[payable.priority]}>
                {payable.priority.charAt(0).toUpperCase() + payable.priority.slice(1)} Priority
              </Badge>
              {!payable.in_budget && (
                <Badge className="bg-red-50 text-red-700">Out of Budget</Badge>
              )}
            </div>

            {/* Detail fields */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Vendor</span>
                <p className="font-medium text-gray-900">{payable.vendor_name}</p>
              </div>
              <div>
                <span className="text-gray-500">Amount</span>
                <p className="font-medium text-gray-900">{payable.currency} {formatAmount(payable.amount)}</p>
              </div>
              <div>
                <span className="text-gray-500">Item</span>
                <p className="font-medium text-gray-900">{payable.item_description}</p>
              </div>
              <div>
                <span className="text-gray-500">Due Date</span>
                <p className="font-medium text-gray-900">
                  {payable.due_date ? new Date(payable.due_date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Category</span>
                <p className="font-medium text-gray-900">{payable.category || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Assigned To</span>
                <p className="font-medium text-gray-900">{payable.assigned_to || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Submitted By</span>
                <p className="font-medium text-gray-900">{payable.submitter_name || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Submitted</span>
                <p className="font-medium text-gray-900">{new Date(payable.created_at).toLocaleDateString()}</p>
              </div>
              {payable.budget_notes && (
                <div className="col-span-2">
                  <span className="text-gray-500">Budget Notes</span>
                  <p className="font-medium text-gray-900">{payable.budget_notes}</p>
                </div>
              )}
              {payable.notes && (
                <div className="col-span-2">
                  <span className="text-gray-500">Notes</span>
                  <p className="font-medium text-gray-900">{payable.notes}</p>
                </div>
              )}
            </div>

            {/* Attachment */}
            {payable.attachment_filename && (
              <div>
                <button
                  onClick={handleDownloadAttachment}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  {payable.attachment_filename}
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {payable.status === 'pending' && isDirectorPlus && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              )}
              {payable.status === 'approved' && isAdminPlus && (
                <button
                  onClick={handleMarkLoaded}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Mark Loaded
                </button>
              )}
              {payable.status === 'loaded' && isAdminPlus && (
                <button
                  onClick={handleMarkPaid}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Mark Paid
                </button>
              )}
            </div>

            {/* Reject reason input */}
            {showRejectInput && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Status History */}
            {payable.status_history && payable.status_history.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Status History</h3>
                <div className="space-y-2">
                  {payable.status_history.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 text-sm pl-3 border-l-2 border-gray-200">
                      <span className="text-gray-500">{new Date(entry.changed_at).toLocaleString()}</span>
                      <span className="text-gray-400">-</span>
                      {entry.old_status && (
                        <>
                          <span className="text-gray-600">{entry.old_status}</span>
                          <span className="text-gray-400">&rarr;</span>
                        </>
                      )}
                      <span className="font-medium text-gray-900">{entry.new_status}</span>
                      <span className="text-gray-500">by {entry.changed_by}</span>
                      {entry.notes && <span className="text-gray-500 italic">({entry.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Comments ({payable.comments?.length || 0})
              </h3>
              {payable.comments && payable.comments.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {payable.comments.map((c) => (
                    <div key={c.id} className="pl-3 border-l-2 border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-900">{c.author_name}</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{c.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">No comments yet</p>
              )}

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !comment.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
