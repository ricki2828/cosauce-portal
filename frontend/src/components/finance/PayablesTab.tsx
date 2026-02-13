import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { payablesApi } from '../../lib/api';
import type { Payable, PayableStatus, PayablePriority } from '../../lib/finance-types';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../ui/table';
import { PayableSubmitModal } from './PayableSubmitModal';
import { PayableDetailModal } from './PayableDetailModal';

const STATUS_FILTERS: { label: string; value: PayableStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Loaded', value: 'loaded' },
  { label: 'Paid', value: 'paid' },
  { label: 'Rejected', value: 'rejected' },
];

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

export function PayablesTab() {
  const { user } = useAuth();
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PayableStatus | 'all'>('all');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);

  const isDirectorPlus = user?.role === 'director' || user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    loadPayables();
  }, [statusFilter]);

  const loadPayables = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const response = isDirectorPlus
        ? await payablesApi.getAll(params)
        : await payablesApi.getMySubmissions();
      let data = response.data;
      if (!isDirectorPlus && statusFilter !== 'all') {
        data = data.filter((p) => p.status === statusFilter);
      }
      setPayables(data);
    } catch (error) {
      console.error('Failed to load payables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSuccess = () => {
    setShowSubmitModal(false);
    loadPayables();
  };

  const handleDetailClose = () => {
    setSelectedPayable(null);
    loadPayables();
  };

  return (
    <div className="mt-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        {/* Status filters */}
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Submit Payable
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : payables.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No payables found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.map((payable) => (
                <TableRow
                  key={payable.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedPayable(payable)}
                >
                  <TableCell className="font-medium">{payable.vendor_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{payable.item_description}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(payable.amount)}</TableCell>
                  <TableCell>{payable.currency}</TableCell>
                  <TableCell>
                    {payable.due_date ? new Date(payable.due_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[payable.priority]}>
                      {payable.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[payable.status]}>
                      {payable.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{payable.submitter_name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <PayableSubmitModal
          open={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onSuccess={handleSubmitSuccess}
        />
      )}

      {/* Detail Modal */}
      {selectedPayable && (
        <PayableDetailModal
          open={!!selectedPayable}
          payableId={selectedPayable.id}
          onClose={handleDetailClose}
        />
      )}
    </div>
  );
}
