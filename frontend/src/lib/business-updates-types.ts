// Business Updates module types

// ============================================
// Accounts
// ============================================

export interface Account {
  id: string;
  name: string;
  code: string;
  prompt_time: string;
  deadline_time: string;
  reminder_interval_minutes: number;
  max_reminders: number;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  team_leader_count: number;
  agent_count: number;
  metric_count: number;
}

export interface AccountCreate {
  name: string;
  code: string;
  prompt_time: string;
  deadline_time: string;
  reminder_interval_minutes?: number;
  max_reminders?: number;
  timezone: string;
  is_active?: boolean;
}

export interface AccountUpdate {
  name?: string;
  code?: string;
  prompt_time?: string;
  deadline_time?: string;
  reminder_interval_minutes?: number;
  max_reminders?: number;
  timezone?: string;
  is_active?: boolean;
}

// ============================================
// Team Leaders
// ============================================

export interface TeamLeader {
  id: string;
  name: string;
  email: string;
  phone?: string;
  account_id: string;
  account_name?: string;
  accounts?: { id: string; name: string; code: string }[];
  shift_start?: string;  // Time in HH:MM format (e.g., "08:00")
  shift_end?: string;    // Time in HH:MM format (e.g., "17:00")
  timezone?: string;     // IANA timezone (e.g., "America/New_York")
  whatsapp_number?: string;  // WhatsApp phone number for reminders
  is_active: boolean;
  created_at: string;
  updated_at: string;
  agent_count: number;
}

export interface TeamLeaderCreate {
  name: string;
  email: string;
  phone?: string;
  account_id: string;
  account_ids?: string[];
  shift_start?: string;  // Time in HH:MM format
  shift_end?: string;    // Time in HH:MM format
  timezone?: string;     // IANA timezone
  whatsapp_number?: string;  // WhatsApp phone number
  is_active?: boolean;
}

export interface TeamLeaderUpdate {
  name?: string;
  email?: string;
  phone?: string;
  account_id?: string;
  account_ids?: string[];
  shift_start?: string;  // Time in HH:MM format
  shift_end?: string;    // Time in HH:MM format
  timezone?: string;     // IANA timezone
  whatsapp_number?: string;  // WhatsApp phone number
  is_active?: boolean;
}

// ============================================
// Agents
// ============================================

export interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  account_id: string;
  account_name?: string;
  account?: { id: string; name: string; code: string };
  team_leader_id: string;
  team_leader_name?: string;
  team_leader?: { id: string; name: string; email: string };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentCreate {
  name: string;
  email: string;
  phone?: string;
  account_id: string;
  team_leader_id: string;
  is_active?: boolean;
}

export interface AgentUpdate {
  name?: string;
  email?: string;
  account_id?: string;
  team_leader_id?: string;
  is_active?: boolean;
}

// ============================================
// Metrics
// ============================================

export interface Metric {
  id: string;
  account_id: string;
  account_name?: string;
  account?: { id: string; name: string; code: string };
  key: string;
  name: string;
  description: string | null;
  data_type: 'number' | 'text' | 'boolean' | 'percentage';
  validation_rule: string | null;
  sort_order: number;
  display_order?: number;
  is_required?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricCreate {
  account_id: string;
  key: string;
  name: string;
  description?: string;
  data_type: 'number' | 'text' | 'boolean' | 'percentage';
  validation_rule?: string;
  sort_order?: number;
  display_order?: number;
  is_required?: boolean;
}

export interface MetricUpdate {
  key?: string;
  name?: string;
  description?: string;
  data_type?: 'number' | 'text' | 'boolean' | 'percentage';
  validation_rule?: string;
  sort_order?: number;
  is_active?: boolean;
}

// ============================================
// Dashboard & Analytics
// ============================================

export interface DashboardAccount {
  account_id: string;
  account_name: string;
  account_code: string;
  total_agents: number;
  submitted_count: number;
  pending_count: number;
  submission_rate: number;
}

export interface DashboardData {
  target_date: string;
  total_accounts: number;
  total_agents: number;
  total_submitted: number;
  total_pending: number;
  overall_submission_rate: number;
  accounts: DashboardAccount[];
}

export interface AgentMetric {
  metric_key: string;
  metric_name: string;
  value: string;
}

export interface AgentReportItem {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  team_leader_name: string;
  submission_count: number;
  submission_dates: string[];
  metrics: AgentMetric[];
}

export interface AgentReport {
  account_id: string;
  account_name: string;
  start_date: string;
  end_date: string;
  total_agents: number;
  agents: AgentReportItem[];
}

export interface TrendDataPoint {
  date: string;
  value: number;
  agent_count: number;
}

export interface TrendData {
  account_id: string;
  account_name: string;
  metric_key: string;
  metric_name: string;
  start_date: string;
  end_date: string;
  data_points: TrendDataPoint[];
  average: number;
  min: number;
  max: number;
}

// ============================================
// Bot Controls
// ============================================

export interface BotHealth {
  status: 'healthy' | 'degraded' | 'down';
  last_prompt_run: string | null;
  last_reminder_run: string | null;
  last_whatsapp_run: string | null;
  last_teams_run: string | null;
  pending_submissions: number;
}

// ============================================
// Shift Reporting
// ============================================

export interface ShiftUpdate {
  id: string;
  team_leader_id: string;
  team_leader: {
    id: string;
    name: string;
    email: string;
  };
  shift_type: 'SOS' | 'EOS';
  shift_date: string;
  submitted_at: string;
  deadline: string;
  is_on_time: boolean;
  staffing_present?: number;
  staffing_total?: number;
  commentary: string;
  posted_to_whatsapp: boolean;
  posted_to_teams_channel: boolean;
}

export interface ComplianceStats {
  target_date: string;
  total_team_leaders: number;
  sos_on_time: number;
  sos_late: number;
  sos_missing: number;
  eos_on_time: number;
  eos_late: number;
  eos_missing: number;
}

export interface EodReport {
  id: string;
  report_date: string;
  report_type: 'interim' | 'final';
  generated_at: string;
  executive_summary?: string;
  compliance_stats: {
    sos_on_time: number;
    sos_late: number;
    sos_missing: number;
    eos_on_time: number;
    eos_late: number;
    eos_missing: number;
  };
  posted_to_whatsapp: boolean;
  emailed_to_execs: boolean;
}

export interface ShiftSettings {
  shift_sos_deadline_buffer_hours: number;
  shift_eos_deadline_buffer_hours: number;
  exec_email_list: string;
}

export interface ShiftSettingsUpdate {
  shift_sos_deadline_buffer_hours?: number;
  shift_eos_deadline_buffer_hours?: number;
  exec_email_list?: string;
}

// ============================================
// Paginated Responses
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
