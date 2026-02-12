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
  performance: 'Excellent' | 'High' | 'Good' | 'Low' | 'Very Low' | null;
  potential: 'Excellent' | 'High' | 'Good' | 'Low' | 'Very Low' | null;
  layout_direction: 'horizontal' | 'vertical' | 'grouped';
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
  performance?: 'Excellent' | 'High' | 'Good' | 'Low' | 'Very Low';
  potential?: 'Excellent' | 'High' | 'Good' | 'Low' | 'Very Low';
  layout_direction?: 'horizontal' | 'vertical' | 'grouped';
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
  performance?: 'Excellent' | 'High' | 'Good' | 'Low' | 'Very Low';
  potential?: 'Excellent' | 'High' | 'Good' | 'Low' | 'Very Low';
  layout_direction?: 'horizontal' | 'vertical' | 'grouped';
}

export interface TalentStats {
  total: number;
  active: number;
  pending: number;
  onboarding: number;
  offboarded: number;
  by_department: Record<string, number>;
}

// ============================================
// Talent Matrix Types
// ============================================

export type QuadrantType = 'stars' | 'high-potentials' | 'core-players' | 'underperformers';

export type CampaignType = 'sales' | 'service' | 'appointment_setting' | 'processing' | null;

export interface AccountCampaignType {
  id: string;
  name: string;
  campaign_type: CampaignType;
}

export type PerformanceRating = 'Excellent' | 'High' | 'Good' | 'Low' | 'Very Low';
export type PotentialRating = 'Excellent' | 'High' | 'Good' | 'Low' | 'Very Low';

// Helper function to determine quadrant from ratings
export function getQuadrant(
  performance: PerformanceRating | null,
  potential: PotentialRating | null
): QuadrantType | null {
  if (!performance || !potential) return null;

  const highPerformance = ['Excellent', 'High'].includes(performance);
  const highPotential = ['Excellent', 'High'].includes(potential);

  if (highPerformance && highPotential) return 'stars';
  if (!highPerformance && highPotential) return 'high-potentials';
  if (highPerformance && !highPotential) return 'core-players';
  return 'underperformers';
}

// Rating to percentage position (for positioning within quadrant)
export const ratingToPercent: Record<PerformanceRating | PotentialRating, number> = {
  'Excellent': 85,
  'High': 65,
  'Good': 50,
  'Low': 35,
  'Very Low': 15,
};
