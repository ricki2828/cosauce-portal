/**
 * TypeScript types for Talent Org Chart Module
 */

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  role: string;  // Job title
  department: string | null;  // Department (HR, Technology, etc.)
  account_id: string | null;  // Client account (if applicable)
  manager_id: string | null;  // Reports to
  status: 'pending' | 'onboarding' | 'active' | 'offboarded';
  start_date: string | null;  // ISO date string
  created_at: string;
  updated_at: string;
}

export interface OrgNode extends Employee {
  reports: OrgNode[];  // Recursive structure for org tree
}

export interface Department {
  id: string;
  name: string;
  employee_count: number;
}

export interface EmployeeCreate {
  name: string;
  email?: string;
  role: string;
  department?: string;
  account_id?: string;
  manager_id?: string;
  status?: 'pending' | 'onboarding' | 'active' | 'offboarded';
  start_date?: string;
}

export interface EmployeeUpdate {
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  account_id?: string;
  manager_id?: string;
  status?: 'pending' | 'onboarding' | 'active' | 'offboarded';
  start_date?: string;
}

export interface TalentStats {
  total: number;
  active: number;
  pending: number;
  onboarding: number;
  offboarded: number;
  by_department: Record<string, number>;
}
