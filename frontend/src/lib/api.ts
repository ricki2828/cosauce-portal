import axios from 'axios';
import type { Priority, PriorityUpdate, PriorityCreate, PriorityUpdateCreate } from './priorities-types';
import type {
  Account, AccountCreate, AccountUpdate,
  TeamLeader, TeamLeaderCreate, TeamLeaderUpdate,
  Agent, AgentCreate, AgentUpdate,
  Metric, MetricCreate, MetricUpdate,
  DashboardData, AgentReport, TrendData, BotHealth,
  PaginatedResponse,
  TeamLeaderProfile, DirectSubmitRequest
} from './business-updates-types';
import type {
  Employee, OrgNode, Department, EmployeeCreate, EmployeeUpdate, TalentStats,
  AccountCampaignType
} from './talent-types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://91.98.79.241:8004';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Setup request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Setup response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken
          });

          const { access_token } = response.data;
          localStorage.setItem('accessToken', access_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        // No refresh token, logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

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

export interface RequisitionRole {
  id: string;
  requisition_id: string;
  role_type: string;
  requested_count: number;
  filled_count: number;
  remaining_count: number;
  created_at: string;
  updated_at: string;
}

export interface RequisitionRoleCreate {
  role_type: string;
  requested_count?: number;
}

export interface RequisitionRoleUpdate {
  role_type?: string;
  requested_count?: number;
  filled_count?: number;
}

export interface RequisitionCommentLatest {
  content: string;
  author_name: string;
  created_at: string;
}

export interface RequisitionComment {
  id: string;
  requisition_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface RequisitionCommentCreate {
  content: string;
}

export interface Requisition {
  id: string;
  title: string;
  department: string;
  location: string | null;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
  status: 'open' | 'interviewing' | 'offer_made' | 'filled' | 'cancelled' | 'pending';
  headcount: number;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  description: string | null;
  requirements: string | null;
  target_start_date: string | null;  // Date needed
  filled_date: string | null;
  comments: string | null;
  created_by: string;
  created_at: string;  // Date requested
  updated_at: string;
  roles: RequisitionRole[];  // Role lines with remaining counts
  latest_comment: RequisitionCommentLatest | null;  // Latest comment with author
}

export interface RequisitionCreate {
  title: string;
  department: string;
  location?: string;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  requirements?: string;
  target_start_date?: string;
  comments?: string;
  roles?: RequisitionRoleCreate[];  // Multiple role lines
}

export interface RequisitionUpdate {
  title?: string;
  department?: string;
  status?: 'open' | 'interviewing' | 'offer_made' | 'filled' | 'cancelled';
  location?: string;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  requirements?: string;
  target_start_date?: string;
  comments?: string;
}

export interface NewHire {
  id: string;
  name: string;
  email: string | null;
  role: string;
  department: string | null;
  start_date: string | null;
  manager_id: string | null;
  onboarding_template_id: string | null;
  status: 'pending' | 'onboarding' | 'active' | 'completed' | 'cancelled';
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
  onboarding: number;
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

  updateRequisition: (id: string, data: RequisitionUpdate) =>
    api.put<Requisition>(`/api/people/requisitions/${id}`, data),

  deleteRequisition: (id: string) =>
    api.delete(`/api/people/requisitions/${id}`),

  getRequisitionStats: () =>
    api.get<RequisitionStats>('/api/people/requisitions/stats'),

  // Requisition Roles
  addRequisitionRole: (requisitionId: string, data: RequisitionRoleCreate) =>
    api.post<RequisitionRole>(`/api/people/requisitions/${requisitionId}/roles`, data),

  updateRequisitionRole: (requisitionId: string, roleId: string, data: RequisitionRoleUpdate) =>
    api.put<RequisitionRole>(`/api/people/requisitions/${requisitionId}/roles/${roleId}`, data),

  deleteRequisitionRole: (requisitionId: string, roleId: string) =>
    api.delete(`/api/people/requisitions/${requisitionId}/roles/${roleId}`),

  incrementRoleFilled: (requisitionId: string, roleId: string, count?: number) =>
    api.post<RequisitionRole>(`/api/people/requisitions/${requisitionId}/roles/${roleId}/fill`, null, { params: { count } }),

  // Requisition Comments
  addRequisitionComment: (requisitionId: string, data: RequisitionCommentCreate) =>
    api.post<RequisitionComment>(`/api/people/requisitions/${requisitionId}/comments`, data),

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

  deleteNewHire: (id: string) =>
    api.delete(`/api/people/new-hires/${id}`),

  completeTask: (newHireId: string, taskId: string, notes?: string) =>
    api.post(`/api/people/new-hires/${newHireId}/tasks/${taskId}/complete`, { notes }),

  updateTaskStatus: (newHireId: string, taskId: string, status: string) =>
    api.put(`/api/people/new-hires/${newHireId}/tasks/${taskId}`, { status }),

  getNewHireStats: () =>
    api.get<NewHireStats>('/api/people/new-hires/stats'),
};

// ==================== BUSINESS UPDATES API ====================

export const businessUpdatesApi = {
  // ============================================
  // Accounts
  // ============================================

  getAccounts: (params?: { page?: number; page_size?: number; active_only?: boolean }) =>
    api.get<PaginatedResponse<Account>>('/api/business-updates/accounts', { params }),

  getAccount: (id: string) =>
    api.get<Account>(`/api/business-updates/accounts/${id}`),

  createAccount: (data: AccountCreate) =>
    api.post<Account>('/api/business-updates/accounts', data),

  updateAccount: (id: string, data: AccountUpdate) =>
    api.put<Account>(`/api/business-updates/accounts/${id}`, data),

  deleteAccount: (id: string) =>
    api.delete(`/api/business-updates/accounts/${id}`),

  // ============================================
  // Team Leaders
  // ============================================

  getTeamLeaders: (params?: { page?: number; page_size?: number; active_only?: boolean }) =>
    api.get<PaginatedResponse<TeamLeader>>('/api/business-updates/team-leaders', { params }),

  getTeamLeader: (id: string) =>
    api.get<TeamLeader>(`/api/business-updates/team-leaders/${id}`),

  createTeamLeader: (data: TeamLeaderCreate) =>
    api.post<TeamLeader>('/api/business-updates/team-leaders', data),

  updateTeamLeader: (id: string, data: TeamLeaderUpdate) =>
    api.put<TeamLeader>(`/api/business-updates/team-leaders/${id}`, data),

  deleteTeamLeader: (id: string, hardDelete: boolean = false) =>
    api.delete(`/api/business-updates/team-leaders/${id}`, { params: { hard_delete: hardDelete } }),

  // ============================================
  // Agents
  // ============================================

  getAgents: (params?: { account_id?: string; team_leader_id?: string; page?: number; page_size?: number; active_only?: boolean }) =>
    api.get<PaginatedResponse<Agent>>('/api/business-updates/agents', { params }),

  getAgent: (id: string) =>
    api.get<Agent>(`/api/business-updates/agents/${id}`),

  createAgent: (data: AgentCreate) =>
    api.post<Agent>('/api/business-updates/agents', data),

  updateAgent: (id: string, data: AgentUpdate) =>
    api.put<Agent>(`/api/business-updates/agents/${id}`, data),

  deleteAgent: (id: string) =>
    api.delete(`/api/business-updates/agents/${id}`),

  // ============================================
  // Metrics
  // ============================================

  getMetrics: (params: { account_id: string }) =>
    api.get<Metric[]>('/api/business-updates/metrics', { params }),

  createMetric: (data: MetricCreate) =>
    api.post<Metric>('/api/business-updates/metrics', data),

  updateMetric: (id: string, data: MetricUpdate) =>
    api.put<Metric>(`/api/business-updates/metrics/${id}`, data),

  deleteMetric: (id: string) =>
    api.delete(`/api/business-updates/metrics/${id}`),

  // ============================================
  // Dashboard & Analytics
  // ============================================

  getDashboard: (params?: { target_date?: string; account_id?: string }) =>
    api.get<DashboardData>('/api/business-updates/dashboard', { params }),

  getAgentReport: (params: { account_id: string; start_date: string; end_date: string }) =>
    api.get<AgentReport>('/api/business-updates/agent-report', { params }),

  getTrends: (params: { account_id: string; metric_key: string; start_date: string; end_date: string }) =>
    api.get<TrendData>('/api/business-updates/trends', { params }),

  // ============================================
  // Exports
  // ============================================

  exportDailyExcel: (params?: { target_date?: string; account_id?: string }) =>
    api.get('/api/business-updates/export/daily/excel', { params, responseType: 'blob' }),

  exportDailyExcelMultiTab: (params?: { target_date?: string }) =>
    api.get('/api/business-updates/export/daily/excel-multi-tab', { params, responseType: 'blob' }),

  exportDailyCsv: (params?: { target_date?: string; account_id?: string }) =>
    api.get('/api/business-updates/export/daily/csv', { params, responseType: 'blob' }),

  exportWeeklyExcel: (params: { week_start: string; week_end: string }) =>
    api.get('/api/business-updates/export/weekly/excel', { params, responseType: 'blob' }),

  exportHistoryExcel: (params: { start_date: string; end_date: string; account_id?: string }) =>
    api.get('/api/business-updates/export/history/excel', { params, responseType: 'blob' }),

  exportWeeklyCsv: (params: { week_start: string; week_end: string }) =>
    api.get('/api/business-updates/export/weekly/csv', { params, responseType: 'blob' }),

  exportHistoryCsv: (params: { start_date: string; end_date: string; account_id?: string }) =>
    api.get('/api/business-updates/export/history/csv', { params, responseType: 'blob' }),

  exportAgentReport: (params: { email: string; start_date: string; end_date: string; format: 'excel' | 'csv' }) =>
    api.get(`/api/business-updates/export/agent/${params.format}`, {
      params: { email: params.email, start_date: params.start_date, end_date: params.end_date },
      responseType: 'blob'
    }),

  // ============================================
  // Bot Controls (Admin only)
  // ============================================

  triggerPrompts: () =>
    api.post('/api/business-updates/trigger/prompts'),

  triggerReminders: () =>
    api.post('/api/business-updates/trigger/reminders'),

  triggerWhatsapp: () =>
    api.post('/api/business-updates/trigger/whatsapp'),

  triggerTeams: () =>
    api.post('/api/business-updates/trigger/teams'),

  getBotHealth: () =>
    api.get<BotHealth>('/api/business-updates/bot/health'),

  // ============================================
  // Shift Reporting
  // ============================================

  submitShiftUpdate: (data: any) =>
    api.post('/api/shift/submit', data),

  getShiftCompliance: (targetDate: string) =>
    api.get('/api/shift/compliance', { params: { target_date: targetDate } }),

  generateEodReport: (data: { report_date: string; report_type: string; include_summary?: boolean }) =>
    api.post('/api/shift/eod', data),

  getShiftUpdates: (params?: { shift_date?: string; team_leader_id?: string; shift_type?: string }) =>
    api.get('/api/shift/updates', { params }),

  getShiftUpdate: (updateId: string) =>
    api.get(`/api/shift/updates/${updateId}`),

  getEodReports: (params?: { date_from?: string; date_to?: string; report_type?: string }) =>
    api.get('/api/shift/eod-reports', { params }),

  getEodReport: (reportId: string) =>
    api.get(`/api/shift/eod-reports/${reportId}`),

  getShiftSettings: () =>
    api.get('/api/shift/settings'),

  updateShiftSettings: (data: any) =>
    api.put('/api/shift/settings', data),
};

// ==================== TEAM LEADER API ====================

export const teamLeaderApi = {
  // Get current user's team leader profile from Azure
  getMyProfile: () =>
    api.get<TeamLeaderProfile>('/api/business-updates/me/team-leader-profile'),

  // Submit metrics directly (proxies to Azure)
  submitUpdate: (data: DirectSubmitRequest) =>
    api.post('/api/business-updates/submit-update', data),

  // Get metrics for a specific account
  getAccountMetrics: (accountId: string) =>
    api.get<Metric[]>('/api/business-updates/metrics', { params: { account_id: accountId } }),

  // Get accounts the team leader has access to
  // Note: This fetches the profile and then gets full account details
  getMyAccounts: async () => {
    const { data: profile } = await api.get<TeamLeaderProfile>('/api/business-updates/me/team-leader-profile');
    const accountPromises = profile.account_ids.map(id =>
      api.get<Account>(`/api/business-updates/accounts/${id}`)
    );
    const accountResponses = await Promise.all(accountPromises);
    return { data: accountResponses.map(r => r.data) };
  },
};

// ==================== PIPELINE TYPES ====================

export interface OpportunityComment {
  id: string;
  opportunity_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface OpportunityCommentCreate {
  content: string;
}

export interface OpportunityCommentUpdate {
  content: string;
}

export interface PipelineOpportunity {
  id: string;
  client_name: string;
  size: string | null;
  likelihood: 'high' | 'medium' | 'low';
  status: 'new' | 'meeting' | 'assessing' | 'implementation';
  target_date: string | null;
  notes: string | null;
  created_by: string;
  author_name: string | null;  // Author name from users table join
  created_at: string;
  updated_at: string;
  comments?: OpportunityComment[];  // Comments on the opportunity
}

export interface PipelineOpportunityCreate {
  client_name: string;
  size?: string;
  likelihood?: 'high' | 'medium' | 'low';
  status?: 'new' | 'meeting' | 'assessing' | 'implementation';
  target_date?: string;
  notes?: string;
}

export interface PipelineOpportunityUpdate {
  client_name?: string;
  size?: string;
  likelihood?: 'high' | 'medium' | 'low';
  status?: 'new' | 'meeting' | 'assessing' | 'implementation';
  target_date?: string;
  notes?: string;
}

export interface PipelineStats {
  total: number;
  new: number;
  meeting: number;
  assessing: number;
  implementation: number;
}

// Pipeline API
export const pipelineApi = {
  getOpportunities: (params?: { status?: string }) =>
    api.get<PipelineOpportunity[]>('/api/pipeline/opportunities', { params }),

  getOpportunity: (id: string) =>
    api.get<PipelineOpportunity>(`/api/pipeline/opportunities/${id}`),

  createOpportunity: (data: PipelineOpportunityCreate) =>
    api.post<PipelineOpportunity>('/api/pipeline/opportunities', data),

  updateOpportunity: (id: string, data: PipelineOpportunityUpdate) =>
    api.put<PipelineOpportunity>(`/api/pipeline/opportunities/${id}`, data),

  deleteOpportunity: (id: string) =>
    api.delete(`/api/pipeline/opportunities/${id}`),

  getStats: () =>
    api.get<PipelineStats>('/api/pipeline/opportunities/stats'),

  // Opportunity Comments
  addOpportunityComment: (opportunityId: string, data: OpportunityCommentCreate) =>
    api.post<OpportunityComment>(`/api/pipeline/opportunities/${opportunityId}/comments`, data),
  updateOpportunityComment: (opportunityId: string, commentId: string, data: OpportunityCommentUpdate) =>
    api.put<OpportunityComment>(`/api/pipeline/opportunities/${opportunityId}/comments/${commentId}`, data),
  deleteOpportunityComment: (opportunityId: string, commentId: string) =>
    api.delete(`/api/pipeline/opportunities/${opportunityId}/comments/${commentId}`),
};

// ==================== USER MANAGEMENT TYPES ====================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'director' | 'viewer' | 'team_leader';
  is_active: number;
  created_at: string;
  last_login: string | null;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: string;
}

export interface UpdateUserData {
  name?: string;
  role?: string;
  is_active?: number;
}

// ==================== USER MANAGEMENT API ====================

export const usersApi = {
  getUsers: () =>
    api.get<User[]>('/api/users'),

  createUser: (data: CreateUserData) =>
    api.post<User>('/api/users', data),

  updateUser: (id: string, data: UpdateUserData) =>
    api.put<User>(`/api/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/api/users/${id}`),

  resetUserPassword: (id: string, newPassword: string) =>
    api.post(`/api/users/${id}/reset-password`, { new_password: newPassword }),
};

// ==================== TALENT ORG CHART API ====================

export const talentApi = {
  // Get all employees with optional filters
  getEmployees: (params?: { status?: string; department?: string; account_id?: string }) =>
    api.get<Employee[]>('/api/talent/employees', { params }),

  // Get single employee by ID
  getEmployee: (id: string) =>
    api.get<Employee>(`/api/talent/employees/${id}`),

  // Get org tree structure (hierarchical)
  getOrgTree: (params?: { status?: string; department?: string }) =>
    api.get<OrgNode[]>('/api/talent/org-tree', { params }),

  // Create new employee
  createEmployee: (data: EmployeeCreate) =>
    api.post<Employee>('/api/talent/employees', data),

  // Update employee
  updateEmployee: (id: string, data: EmployeeUpdate) =>
    api.put<Employee>(`/api/talent/employees/${id}`, data),

  // Delete (offboard) employee
  deleteEmployee: (id: string) =>
    api.delete(`/api/talent/employees/${id}`),

  // Get departments with employee counts
  getDepartments: () =>
    api.get<Department[]>('/api/talent/departments'),

  // Get org chart statistics
  getStats: () =>
    api.get<TalentStats>('/api/talent/stats'),

  // Get accounts with campaign types for Talent Matrix
  getAccountsCampaignTypes: () =>
    api.get<AccountCampaignType[]>('/api/talent/accounts-campaign-types'),
};

// ==================== INVOICING API ====================

export type InvoiceStatus =
  | 'gathering_data'
  | 'checking'
  | 'sent'
  | 'approved'
  | 'paid'
  | 'blocked';

export interface InvoiceRole {
  id: string;
  invoice_id: string;
  role_name: string;
  rate: number;
  quantity: number;
  total: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRoleCreate {
  role_name: string;
  rate?: number;
  quantity?: number;
  sort_order?: number;
}

export interface InvoiceRoleUpdate {
  role_name?: string;
  rate?: number;
  quantity?: number;
  sort_order?: number;
}

export interface InvoiceComment {
  id: string;
  invoice_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface InvoiceCommentCreate {
  content: string;
}

export interface Invoice {
  id: string;
  client_name: string;
  period_month: number;
  period_year: number;
  status: InvoiceStatus;
  currency: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  roles: InvoiceRole[];
  comments: InvoiceComment[];
  total: number;
}

export interface InvoiceCreate {
  client_name: string;
  period_month: number;
  period_year: number;
  currency?: string;
  notes?: string;
}

export interface InvoiceUpdate {
  status?: InvoiceStatus;
  currency?: string;
  notes?: string;
}

export interface InvoicePeriod {
  month: number;
  year: number;
  invoice_count: number;
}

export interface RolloverResult {
  invoices_created: number;
  to_month: number;
  to_year: number;
}

export const invoicingApi = {
  // Get all invoices for a period
  getInvoices: (month: number, year: number) =>
    api.get<Invoice[]>('/api/invoicing/invoices', { params: { month, year } }),

  // Get single invoice
  getInvoice: (id: string) =>
    api.get<Invoice>(`/api/invoicing/invoices/${id}`),

  // Create invoice
  createInvoice: (data: InvoiceCreate) =>
    api.post<Invoice>('/api/invoicing/invoices', data),

  // Update invoice
  updateInvoice: (id: string, data: InvoiceUpdate) =>
    api.put<Invoice>(`/api/invoicing/invoices/${id}`, data),

  // Delete invoice
  deleteInvoice: (id: string) =>
    api.delete(`/api/invoicing/invoices/${id}`),

  // Add role/line item
  addRole: (invoiceId: string, data: InvoiceRoleCreate) =>
    api.post<InvoiceRole>(`/api/invoicing/invoices/${invoiceId}/roles`, data),

  // Update role
  updateRole: (invoiceId: string, roleId: string, data: InvoiceRoleUpdate) =>
    api.put<InvoiceRole>(`/api/invoicing/invoices/${invoiceId}/roles/${roleId}`, data),

  // Delete role
  deleteRole: (invoiceId: string, roleId: string) =>
    api.delete(`/api/invoicing/invoices/${invoiceId}/roles/${roleId}`),

  // Add comment
  addComment: (invoiceId: string, data: InvoiceCommentCreate) =>
    api.post<InvoiceComment>(`/api/invoicing/invoices/${invoiceId}/comments`, data),

  // Roll invoices to next month
  rollover: (fromMonth: number, fromYear: number) =>
    api.post<RolloverResult>('/api/invoicing/invoices/rollover', {
      from_month: fromMonth,
      from_year: fromYear,
    }),

  // Get list of periods with invoices
  getPeriods: () =>
    api.get<InvoicePeriod[]>('/api/invoicing/periods'),

  // Get list of unique client names
  getClients: () =>
    api.get<string[]>('/api/invoicing/clients'),
};
