import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://169.150.243.5:8004';

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
  scope_of_work: string;
  deliverables?: string;
  timeline?: string;
  payment_terms?: string;
}

export interface GenerateShortFormRequest {
  client_name: string;
  project_name: string;
  scope_summary: string;
  total_value?: string;
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

  draft: (data: DraftRequest) => api.post<{ draft: string }>('/api/contracts/draft', data),

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
