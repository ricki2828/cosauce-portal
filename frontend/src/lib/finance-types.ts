export type PayableStatus = 'pending' | 'approved' | 'rejected' | 'loaded' | 'paid';
export type PayablePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Payable {
  id: string;
  vendor_name: string;
  item_description: string;
  assigned_to: string | null;
  amount: number;
  currency: string;
  due_date: string | null;
  category: string | null;
  priority: PayablePriority;
  in_budget: boolean;
  budget_notes: string | null;
  notes: string | null;
  attachment_path: string | null;
  attachment_filename: string | null;
  status: PayableStatus;
  xero_bill_id: string | null;
  submitted_by: string;
  submitter_name: string | null;
  approved_by: string | null;
  approved_at: string | null;
  loaded_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  comments: PayableComment[];
  status_history: PayableStatusHistory[];
}

export interface PayableComment {
  id: string;
  payable_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface PayableStatusHistory {
  id: string;
  payable_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  notes: string | null;
  changed_at: string;
}

export interface CashflowAccount {
  id: string;
  account_type: string;
  category: string;
  subcategory: string | null;
  line_item: string;
  display_order: number;
  is_computed: boolean;
  is_active: boolean;
}

export interface CashflowAccountCreate {
  account_type: string;
  category: string;
  subcategory?: string | null;
  line_item: string;
  display_order?: number;
}

export interface CashflowCellUpdate {
  account_id: string;
  month: number;
  year: number;
  amount: number;
  is_actual?: boolean;
  notes?: string | null;
}

export interface CashflowMonthly {
  id: string;
  month: number;
  year: number;
  category: string;
  subcategory: string | null;
  line_item: string | null;
  amount: number;
  currency: string;
  is_actual: boolean;
  notes: string | null;
  source: string;
  imported_at: string;
  account_id: string | null;
}

export interface CashflowSummaryMonth {
  month: number;
  year: number;
  total_revenue: number;
  total_expenses: number;
  net: number;
  bank_balance: number;
}

export interface CashflowSummary {
  year: number;
  months: CashflowSummaryMonth[];
  total_revenue: number;
  total_expenses: number;
  net: number;
}

export interface CashflowImport {
  id: string;
  filename: string;
  import_type: string;
  rows_imported: number;
  period_start: string | null;
  period_end: string | null;
  imported_by: string;
  imported_at: string;
}

export interface FXRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  source: string;
  created_at: string;
}
