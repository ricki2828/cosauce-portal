import axios from 'axios';
import type { Priority, PriorityUpdate, PriorityCreate, PriorityUpdateCreate } from './priorities-types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://cosauce.taiaroa.xyz';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Alias for auth context
export const apiClient = api;

// Contract types
export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  type: 'msa' | 'sow' | 'shortform';
}

export interface DraftRequest {
  contract_type: string;
  project_name: string;
  scope_bullets: string;
}

export interface GenerateMSARequest {
  client_name: string;
  jurisdiction?: string;
  effective_date?: string;
}

export interface GenerateSOWRequest {
  client_name: string;
  project_name: string;
  scope_formal: string;
}

export interface GenerateShortFormRequest {
  client_name: string;
  project_name: string;
  scope_formal: string;
}

export interface ContractHistoryItem {
  id: string;
  type: string;
  client_name: string;
  created_at: string;
  filename: string;
}

// Contract API
export const contractsApi = {
  getTemplates: () => api.get<ContractTemplate[]>('/api/contracts/templates'),

  draft: (data: DraftRequest) => api.post<{ draft_scope: string; suggestions: string[] }>('/api/contracts/draft', data),

  generateMSA: (data: GenerateMSARequest) =>
    api.post('/api/contracts/generate/msa', data, { responseType: 'blob' }),

  generateSOW: (data: GenerateSOWRequest) =>
    api.post('/api/contracts/generate/sow', data, { responseType: 'blob' }),

  generateShortForm: (data: GenerateShortFormRequest) =>
    api.post('/api/contracts/generate/shortform', data, { responseType: 'blob' }),

  getHistory: () => api.get<ContractHistoryItem[]>('/api/contracts/history'),

  download: (id: string) =>
    api.get(`/api/contracts/download/${id}`, { responseType: 'blob' }),
};

// Health check
export const healthCheck = () => api.get('/health');

// ==================== SALES TYPES ====================

export interface BPOAnalysis {
  fit_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'DISQUALIFIED';
  signals: string[];
  reasoning: string;
  analyzed_at: string;
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  description: string | null;
  headquarters: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  domain?: string;
  apollo_id?: string;
  employee_count?: number;
  employee_growth?: number;
  status: string;
  bpo_analysis?: BPOAnalysis | null;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  company_name?: string;
}

export interface JobSignal {
  id: string;
  company_id: string;
  company_name: string | null;
  job_title: string;
  job_url: string | null;
  location: string | null;
  source: string;
  signal_type: string;
  signal_strength: number;
  posted_date: string | null;
  discovered_at: string;
}

export interface SalesProject {
  id: string;
  name: string;
  description: string | null;
  target_criteria: Record<string, unknown>;
  signal_weights: Record<string, number>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JobScanRequest {
  query: string;
  location: string;
  num_results: number;
  enrich_with_apollo: boolean;
}

export interface JobScanResponse {
  success: boolean;
  query: string;
  location: string;
  source: string | null;
  total_jobs: number;
  companies_found: number;
  companies_created: number;
  companies_updated: number;
  signals_created: number;
}

export interface PipelineStats {
  companies: number;
  contacts: number;
  contacts_with_linkedin: number;
  contacts_with_email: number;
  signals: number;
  industries: Array<{ industry: string; count: number }>;
}

export interface BulkOperationResult {
  success: string[];
  failed: Array<{ id: string; error: string }>;
  total: number;
  contacts_found?: number;
}

export interface BulkStatusResult {
  success: boolean;
  updated: number;
  status: string;
}

export interface RFP {
  id: string;
  title: string;
  issuer: string;
  description: string | null;
  url: string | null;
  deadline: string | null;
  discovered_at: string;
  source: string;
  status: string;
  region: string | null;
  value_estimate: string | null;
  notes: string | null;
}

export interface RFPCreate {
  title: string;
  issuer: string;
  description?: string;
  url?: string;
  deadline?: string;
  source?: string;
  region?: string;
  value_estimate?: string;
}

export interface RFPAlert {
  id: string;
  name: string;
  search_query: string;
  region: string;
  is_active: boolean;
  created_at: string;
  last_checked: string | null;
  results_count: number;
}

export interface RFPAlertCreate {
  name: string;
  search_query: string;
  region?: string;
}

export interface RFPSearchResult {
  success: boolean;
  query: string;
  region: string;
  searches_performed: string[];
  results: Array<{
    title: string;
    issuer: string;
    url: string;
    snippet: string;
    source: string;
  }>;
  rfps_found: number;
  suggested_sources: Array<{
    name: string;
    url: string;
    description: string;
  }>;
}

// ==================== SALES API ====================

export const salesApi = {
  // Companies
  getCompanies: (params?: { industry?: string; search?: string; limit?: number }) =>
    api.get<Company[]>('/api/sales/companies', { params }),

  getCompany: (id: string) =>
    api.get<Company>(`/api/sales/companies/${id}`),

  createCompany: (data: Partial<Company>) =>
    api.post<Company>('/api/sales/companies', data),

  updateCompany: (id: string, data: Partial<Company>) =>
    api.patch<Company>(`/api/sales/companies/${id}`, data),

  deleteCompany: (id: string) =>
    api.delete(`/api/sales/companies/${id}`),

  // Contacts
  getContacts: (params?: { company_id?: string; limit?: number }) =>
    api.get<Contact[]>('/api/sales/contacts', { params }),

  createContact: (data: Partial<Contact>) =>
    api.post<Contact>('/api/sales/contacts', data),

  // Job Scan
  scanForJobs: (data: JobScanRequest) =>
    api.post<JobScanResponse>('/api/sales/scan', data),

  // Enrichment
  enrichCompany: (companyId: string, domain?: string) =>
    api.post(`/api/sales/companies/${companyId}/enrich`, null, { params: { domain } }),

  findContacts: (companyId: string, limit?: number) =>
    api.post(`/api/sales/companies/${companyId}/find-contacts`, null, { params: { limit } }),

  // Bulk Operations
  bulkEnrich: (companyIds: string[]) =>
    api.post<BulkOperationResult>('/api/sales/bulk/enrich', { company_ids: companyIds }),

  bulkFindContacts: (companyIds: string[], limitPerCompany?: number) =>
    api.post<BulkOperationResult>('/api/sales/bulk/find-contacts', { company_ids: companyIds }, { params: { limit_per_company: limitPerCompany } }),

  bulkUpdateStatus: (companyIds: string[], status: string) =>
    api.post<BulkStatusResult>('/api/sales/bulk/status', { company_ids: companyIds, status }),

  bulkAnalyzeBpo: (companyIds: string[]) =>
    api.post<BulkOperationResult>('/api/sales/bulk/analyze-bpo', { company_ids: companyIds }),

  exportCompanies: (companyIds?: string[], format: 'csv' | 'json' = 'csv') =>
    api.get('/api/sales/export', {
      params: { company_ids: companyIds?.join(','), format },
      responseType: format === 'csv' ? 'blob' : 'json'
    }),

  // Job Signals
  getJobSignals: (params?: { company_id?: string; signal_type?: string; limit?: number }) =>
    api.get<JobSignal[]>('/api/sales/signals/jobs', { params }),

  // Projects
  getProjects: (status?: string) =>
    api.get<SalesProject[]>('/api/sales/projects', { params: { status } }),

  createProject: (data: Partial<SalesProject>) =>
    api.post<SalesProject>('/api/sales/projects', data),

  // Pipeline Stats
  getPipelineStats: () =>
    api.get<PipelineStats>('/api/sales/stats'),

  // RFPs
  getRfps: (status?: string) =>
    api.get<RFP[]>('/api/sales/rfps', { params: { status } }),

  createRfp: (data: RFPCreate) =>
    api.post<RFP>('/api/sales/rfps', data),

  updateRfp: (rfpId: string, data: { status?: string; notes?: string }) =>
    api.patch<RFP>(`/api/sales/rfps/${rfpId}`, data),

  deleteRfp: (rfpId: string) =>
    api.delete(`/api/sales/rfps/${rfpId}`),

  // RFP Search
  searchRfps: (query: string, region: string = 'Canada') =>
    api.get<RFPSearchResult>('/api/sales/rfps/search', { params: { query, region } }),

  // RFP Alerts
  getRfpAlerts: (activeOnly: boolean = true) =>
    api.get<RFPAlert[]>('/api/sales/rfps/alerts', { params: { active_only: activeOnly } }),

  createRfpAlert: (data: RFPAlertCreate) =>
    api.post<RFPAlert>('/api/sales/rfps/alerts', data),

  runRfpAlert: (alertId: string) =>
    api.post(`/api/sales/rfps/alerts/${alertId}/run`),

  runAllRfpAlerts: () =>
    api.post('/api/sales/rfps/alerts/run-all'),

  updateRfpAlert: (alertId: string, isActive: boolean) =>
    api.patch<RFPAlert>(`/api/sales/rfps/alerts/${alertId}`, { is_active: isActive }),

  deleteRfpAlert: (alertId: string) =>
    api.delete(`/api/sales/rfps/alerts/${alertId}`),

  // Settings
  getSetting: (key: string) =>
    api.get<{ key: string; value: string }>(`/api/sales/settings/${key}`),

  setSetting: (key: string, value: string) =>
    api.put(`/api/sales/settings/${key}`, { value }),

  // BPO Analysis
  analyzeBpo: (companyId: string) =>
    api.post<BPOAnalysis & { success: boolean }>(`/api/sales/companies/${companyId}/analyze-bpo`),
};

// ==================== PRIORITIES TYPES ====================

// Re-export from separate file to avoid module resolution issues
export type {
  Priority,
  PriorityUpdate,
  PriorityCreate,
  PriorityUpdateCreate
} from './priorities-types';

// ==================== PRIORITIES API ====================

export const prioritiesApi = {
  // List all priorities
  getPriorities: (status?: string) =>
    api.get<Priority[]>('/api/priorities', { params: { status } }),

  // Get specific priority
  getPriority: (id: string) =>
    api.get<Priority>(`/api/priorities/${id}`),

  // Create priority (directors/admins only)
  createPriority: (data: PriorityCreate) =>
    api.post<Priority>('/api/priorities', data),

  // Update priority (directors/admins only)
  updatePriority: (id: string, data: Partial<PriorityCreate>) =>
    api.put<Priority>(`/api/priorities/${id}`, data),

  // Delete priority (directors/admins only)
  deletePriority: (id: string) =>
    api.delete(`/api/priorities/${id}`),

  // Add update to priority (directors/admins only)
  addUpdate: (priorityId: string, data: PriorityUpdateCreate) =>
    api.post<PriorityUpdate>(`/api/priorities/${priorityId}/updates`, data),
};

// ==================== PEOPLE TYPES ====================

export interface Requisition {
  id: string;
  title: string;
  department: string;
  location: string | null;
  employment_type: 'full_time' | 'part_time' | 'contract';
  status: 'open' | 'interviewing' | 'offer_made' | 'filled' | 'cancelled';
  headcount: number;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  description: string | null;
  requirements: string | null;
  posted_date: string | null;
  target_start_date: string | null;
  filled_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RequisitionCreate {
  title: string;
  department: string;
  location?: string;
  employment_type: 'full_time' | 'part_time' | 'contract';
  headcount?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  requirements?: string;
  posted_date?: string;
  target_start_date?: string;
}

export interface NewHire {
  id: string;
  name: string;
  email: string | null;
  role: string;
  department: string | null;
  start_date: string;
  manager_id: string | null;
  onboarding_template_id: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  tasks?: OnboardingTask[];
}

export interface NewHireCreate {
  name: string;
  email?: string;
  role: string;
  department?: string;
  start_date: string;
  manager_id?: string;
  onboarding_template_id?: string;
}

export interface OnboardingTask {
  id: string;
  new_hire_id: string;
  task_title: string;
  task_description: string | null;
  category: string | null;
  due_date: string | null;
  assigned_to: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  order_index: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  role_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  tasks?: TemplateTask[];
}

export interface OnboardingTemplateCreate {
  name: string;
  description?: string;
  role_type?: string;
}

export interface TemplateTask {
  id: string;
  template_id: string;
  task_title: string;
  task_description: string | null;
  category: string | null;
  day_offset: number;
  assigned_to_role: 'manager' | 'hr' | 'it' | 'buddy' | null;
  order_index: number;
}

export interface TemplateTaskCreate {
  task_title: string;
  task_description?: string;
  category?: string;
  day_offset?: number;
  assigned_to_role?: 'manager' | 'hr' | 'it' | 'buddy';
  order_index?: number;
}

export interface RequisitionStats {
  total: number;
  open: number;
  interviewing: number;
  offer_made: number;
  filled: number;
  cancelled: number;
}

export interface NewHireStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
}

// ==================== PEOPLE API ====================

export const peopleApi = {
  // Requisitions
  getRequisitions: (status?: string) =>
    api.get<Requisition[]>('/api/people/requisitions', { params: { status } }),

  getRequisition: (id: string) =>
    api.get<Requisition>(`/api/people/requisitions/${id}`),

  createRequisition: (data: RequisitionCreate) =>
    api.post<Requisition>('/api/people/requisitions', data),

  updateRequisition: (id: string, data: Partial<RequisitionCreate>) =>
    api.put<Requisition>(`/api/people/requisitions/${id}`, data),

  fillRequisition: (id: string) =>
    api.post(`/api/people/requisitions/${id}/fill`),

  deleteRequisition: (id: string) =>
    api.delete(`/api/people/requisitions/${id}`),

  getRequisitionStats: () =>
    api.get<RequisitionStats>('/api/people/requisitions/stats'),

  // Onboarding Templates
  getTemplates: () =>
    api.get<OnboardingTemplate[]>('/api/people/onboarding-templates'),

  getTemplate: (id: string) =>
    api.get<OnboardingTemplate>(`/api/people/onboarding-templates/${id}`),

  createTemplate: (data: OnboardingTemplateCreate) =>
    api.post<OnboardingTemplate>('/api/people/onboarding-templates', data),

  addTemplateTask: (templateId: string, data: TemplateTaskCreate) =>
    api.post<TemplateTask>(`/api/people/onboarding-templates/${templateId}/tasks`, data),

  // New Hires
  getNewHires: (status?: string) =>
    api.get<NewHire[]>('/api/people/new-hires', { params: { status } }),

  getNewHire: (id: string) =>
    api.get<NewHire>(`/api/people/new-hires/${id}`),

  createNewHire: (data: NewHireCreate) =>
    api.post<NewHire>('/api/people/new-hires', data),

  updateNewHire: (id: string, data: Partial<NewHireCreate>) =>
    api.put<NewHire>(`/api/people/new-hires/${id}`, data),

  completeTask: (newHireId: string, taskId: string, notes?: string) =>
    api.post(`/api/people/new-hires/${newHireId}/tasks/${taskId}/complete`, { notes }),

  updateTaskStatus: (newHireId: string, taskId: string, status: string) =>
    api.put(`/api/people/new-hires/${newHireId}/tasks/${taskId}`, { status }),

  getNewHireStats: () =>
    api.get<NewHireStats>('/api/people/new-hires/stats'),
};
