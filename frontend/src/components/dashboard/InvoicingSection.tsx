import { useState, useEffect } from 'react';
import { Receipt, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { invoicingApi } from '../../lib/api';
import type { Invoice } from '../../lib/api';
import { DashboardSection } from './DashboardSection';
import { InvoiceCard } from './InvoiceCard';
import { InvoiceDetailModal } from './InvoiceDetailModal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function InvoicingSection() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period selection - default to previous month (invoices for last month's work)
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [selectedMonth, setSelectedMonth] = useState(lastMonth.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(lastMonth.getFullYear());

  // Modal state
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Rollover state
  const [isRollingOver, setIsRollingOver] = useState(false);

  const canEdit = user?.role === 'director' || user?.role === 'admin';

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await invoicingApi.getInvoices(selectedMonth, selectedYear);
      setInvoices(response.data);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      setError(err.response?.data?.detail || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [selectedMonth, selectedYear]);

  const handleCardClick = (clientName: string) => {
    setSelectedClient(clientName);
    setIsCreatingNew(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedClient(null);
    setIsCreatingNew(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
    setIsCreatingNew(false);
  };

  const handleSave = () => {
    loadInvoices();
  };

  const handleRollover = async () => {
    if (!canEdit) return;

    if (!confirm(`Roll all invoices from ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} to the next month?`)) {
      return;
    }

    setIsRollingOver(true);

    try {
      const response = await invoicingApi.rollover(selectedMonth, selectedYear);
      alert(
        `Created ${response.data.invoices_created} invoices for ${MONTH_NAMES[response.data.to_month - 1]} ${response.data.to_year}`
      );
      // Navigate to the new period
      setSelectedMonth(response.data.to_month);
      setSelectedYear(response.data.to_year);
    } catch (err: any) {
      console.error('Failed to rollover:', err);
      alert(err.response?.data?.detail || 'Failed to rollover invoices');
    } finally {
      setIsRollingOver(false);
    }
  };

  const selectedInvoice = selectedClient
    ? invoices.find((inv) => inv.client_name === selectedClient) || null
    : null;

  return (
    <>
      <DashboardSection
        title="Invoicing"
        icon={Receipt}
        loading={loading}
        error={error}
        onRetry={loadInvoices}
        isEmpty={invoices.length === 0 && !canEdit}
        emptyMessage="No invoices for this period."
        action={
          <div className="flex items-center gap-3">
            {/* Month selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {MONTH_NAMES.map((month, idx) => (
                <option key={idx} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>

            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Rollover button */}
            {canEdit && (
              <button
                onClick={handleRollover}
                disabled={isRollingOver || invoices.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRollingOver ? 'animate-spin' : ''}`} />
                Roll to Next Month
              </button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Show existing invoices */}
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              clientName={invoice.client_name}
              invoice={invoice}
              onClick={() => handleCardClick(invoice.client_name)}
            />
          ))}

          {/* Create new invoice card */}
          {canEdit && (
            <div
              onClick={handleCreateNew}
              className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 hover:border-blue-400 transition-colors cursor-pointer flex items-center justify-center"
            >
              <div className="text-center">
                <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Create Invoice</p>
              </div>
            </div>
          )}
        </div>
      </DashboardSection>

      {/* Detail modal */}
      <InvoiceDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clientName={selectedClient}
        invoice={selectedInvoice}
        periodMonth={selectedMonth}
        periodYear={selectedYear}
        onSave={handleSave}
        isCreatingNew={isCreatingNew}
      />
    </>
  );
}
