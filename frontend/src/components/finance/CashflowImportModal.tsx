import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { cashflowApi } from '../../lib/api';
import type { CashflowImport } from '../../lib/finance-types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../ui/table';

interface CashflowImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CashflowImportModal({ open, onClose, onSuccess }: CashflowImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [imports, setImports] = useState<CashflowImport[]>([]);
  const [loadingImports, setLoadingImports] = useState(true);

  useEffect(() => {
    loadImports();
  }, []);

  const loadImports = async () => {
    try {
      setLoadingImports(true);
      const response = await cashflowApi.getImports();
      setImports(response.data);
    } catch (error) {
      console.error('Failed to load imports:', error);
    } finally {
      setLoadingImports(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await cashflowApi.importExcel(formData);
      const data = response.data as any;
      setResult({
        success: true,
        message: `Successfully imported ${data.rows_imported || 0} rows from ${file.name}`,
      });
      setFile(null);
      await loadImports();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to import file',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Cashflow Data</DialogTitle>
          <DialogDescription>Upload an Excel file to import cashflow data.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setResult(null);
                }}
                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>

            {result && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  result.success
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {result.message}
              </div>
            )}

            {result?.success && (
              <div className="flex justify-end">
                <button
                  onClick={onSuccess}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Previous imports */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Import History</h3>
            {loadingImports ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : imports.length === 0 ? (
              <p className="text-sm text-gray-500">No previous imports</p>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Imported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports.map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell className="text-sm">{imp.filename}</TableCell>
                        <TableCell className="text-sm">{imp.rows_imported}</TableCell>
                        <TableCell className="text-sm">
                          {imp.period_start && imp.period_end
                            ? `${imp.period_start} - ${imp.period_end}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(imp.imported_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
