import { Receipt, MessageSquare, CheckCircle } from 'lucide-react';
import type { Invoice } from '../../lib/api';

interface InvoiceCardProps {
  clientName: string;
  invoice: Invoice | null;
  onClick: () => void;
}

export function InvoiceCard({ clientName, invoice, onClick }: InvoiceCardProps) {
  if (!invoice) {
    // No invoice exists - show placeholder
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 hover:border-blue-400 transition-colors cursor-pointer"
      >
        <div className="text-center">
          <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{clientName}</h3>
          <p className="text-xs text-gray-500">No invoice this period</p>
          <button className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
            Create Invoice
          </button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    gathering_data: 'bg-gray-100 text-gray-700',
    checking: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-indigo-100 text-indigo-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    gathering_data: 'Gathering Data',
    checking: 'Checking',
    sent: 'Sent',
    approved: 'Director/MD Approved',
    paid: 'Paid',
    blocked: 'Blocked',
  };

  const isPaid = invoice.status === 'paid';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors cursor-pointer ${
        isPaid ? 'opacity-60' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{clientName}</h3>
        {isPaid && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <span
          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
            statusColors[invoice.status]
          }`}
        >
          {statusLabels[invoice.status]}
        </span>
      </div>

      {/* Roles list */}
      <div className="mb-3">
        {invoice.roles.length > 0 ? (
          <div className="space-y-1">
            {invoice.roles.map((role) => (
              <div key={role.id} className="grid grid-cols-[1fr,auto,auto] gap-2 text-xs items-center">
                <span className="text-gray-700 font-medium truncate">{role.role_name}</span>
                <span className="text-gray-500 text-right tabular-nums">
                  {role.quantity}
                </span>
                <span className="text-gray-500 text-right tabular-nums">
                  {invoice.currency} {role.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">No roles added yet</p>
        )}
      </div>

      {/* Total */}
      <div className="border-t border-gray-200 pt-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Total:</span>
          <span className="text-lg font-bold text-gray-900">
            {invoice.currency} {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Comments */}
      {invoice.comments.length > 0 && (
        <div className="border-t border-gray-200 pt-3 space-y-2">
          <div className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-2">
            <MessageSquare className="w-3 h-3" />
            <span>Comments ({invoice.comments.length})</span>
          </div>
          {invoice.comments.slice(0, 2).map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded p-2 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">{comment.author_name}</span>
                <span>•</span>
                <span>{new Date(comment.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-gray-700 line-clamp-2">{comment.content}</p>
            </div>
          ))}
          {invoice.comments.length > 2 && (
            <p className="text-xs text-gray-500 italic">
              +{invoice.comments.length - 2} more comment{invoice.comments.length - 2 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
