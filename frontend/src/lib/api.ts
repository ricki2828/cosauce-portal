import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sao-flash-kenneth-cab.trycloudflare.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  score?: number;
  score_breakdown?: Record<string, number>;
  apollo_id?: string;
  employee_count?: number;
  status?: string;
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

  recalculateScore: (companyId: string) =>
    api.post(`/api/sales/companies/${companyId}/recalculate-score`),

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
};
