import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { talentApi } from '../../lib/api';
import type {
  Employee,
  AccountCampaignType,
  PerformanceRating,
  PotentialRating,
} from '../../lib/talent-types';
import EmployeeDot from './EmployeeDot';
import MatrixLegend from './MatrixLegend';

interface TalentMatrixProps {
  employees: Employee[];
  onEmployeeEdit: (employee: Employee) => void;
}

// Map ratings to percentage position (0-100)
// Missing rating = 50 (middle)
const ratingToPercent: Record<string, number> = {
  'Excellent': 90,
  'High': 75,
  'Good': 50,
  'Low': 25,
  'Very Low': 10,
};

function getPosition(rating: PerformanceRating | PotentialRating | null): number {
  if (!rating) return 50; // Middle if no rating
  return ratingToPercent[rating] ?? 50;
}

// Determine which quadrant based on position
function getQuadrantFromPosition(perfPercent: number, potPercent: number): string {
  if (perfPercent >= 50 && potPercent >= 50) return 'stars';
  if (perfPercent < 50 && potPercent >= 50) return 'high-potentials';
  if (perfPercent >= 50 && potPercent < 50) return 'core-players';
  return 'underperformers';
}

export default function TalentMatrix({ employees, onEmployeeEdit }: TalentMatrixProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<AccountCampaignType[]>([]);
  const [loading, setLoading] = useState(true);

  // Get role filters from URL params (persisted across navigation)
  const roleFilters = useMemo(() => {
    const roles = searchParams.get('roles');
    return roles ? roles.split(',').filter(Boolean) : [];
  }, [searchParams]);

  // Update role filters in URL
  const setRoleFilters = useCallback((roles: string[]) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (roles.length > 0) {
        newParams.set('roles', roles.join(','));
      } else {
        newParams.delete('roles');
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  // Load accounts with campaign types
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await talentApi.getAccountsCampaignTypes();
        setAccounts(response.data);
      } catch (err) {
        console.error('Failed to load accounts:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAccounts();
  }, []);

  // Filter employees and calculate positions
  const { filteredEmployees, quadrantCounts } = useMemo(() => {
    let filtered = employees;
    if (roleFilters.length > 0) {
      filtered = filtered.filter((e) => roleFilters.includes(e.role));
    }

    // Count by quadrant
    const counts = {
      stars: 0,
      'high-potentials': 0,
      'core-players': 0,
      underperformers: 0,
    };

    filtered.forEach((emp) => {
      const perfPercent = getPosition(emp.performance);
      const potPercent = getPosition(emp.potential);
      const quadrant = getQuadrantFromPosition(perfPercent, potPercent);
      counts[quadrant as keyof typeof counts]++;
    });

    return { filteredEmployees: filtered, quadrantCounts: counts };
  }, [employees, roleFilters]);

  // Add small random offset to prevent exact overlaps
  const getOffset = (id: string, axis: 'x' | 'y'): number => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Different seed for x vs y
    if (axis === 'y') hash = hash * 31;
    return ((hash % 100) / 100) * 6 - 3; // -3 to +3 percent offset
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Matrix */}
      <div className="flex-1">
        <div className="flex">
          {/* Y-axis label */}
          <div className="w-8 flex items-center justify-center">
            <span
              className="text-xs font-semibold text-gray-500 whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              POTENTIAL
            </span>
          </div>

          <div className="flex-1">
            {/* Y-axis markers */}
            <div className="flex mb-1">
              <div className="w-12" />
              <div className="flex-1 flex justify-between text-xs text-gray-400 max-w-2xl">
                <span></span>
                <span>High</span>
              </div>
            </div>

            {/* Matrix Container */}
            <div className="flex">
              {/* Y-axis scale */}
              <div className="w-12 flex flex-col justify-between text-xs text-gray-400 pr-2">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>

              {/* The Matrix Grid */}
              <div className="relative aspect-square max-w-2xl w-full border-2 border-gray-300 rounded-lg overflow-hidden">
                {/* Quadrant Backgrounds */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  {/* Top-left: High Potentials */}
                  <div className="bg-blue-50 border-r border-b border-gray-200 relative">
                    <div className="absolute top-2 left-2">
                      <h3 className="text-xs font-bold text-blue-700">High Potentials</h3>
                      <p className="text-[10px] text-gray-500">Develop Performance</p>
                    </div>
                    <div className="absolute top-2 right-2 bg-white/80 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                      {quadrantCounts['high-potentials']}
                    </div>
                  </div>
                  {/* Top-right: Stars */}
                  <div className="bg-green-50 border-b border-gray-200 relative">
                    <div className="absolute top-2 left-2">
                      <h3 className="text-xs font-bold text-green-700">Stars</h3>
                      <p className="text-[10px] text-gray-500">Retain & Reward</p>
                    </div>
                    <div className="absolute top-2 right-2 bg-white/80 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                      {quadrantCounts['stars']}
                    </div>
                  </div>
                  {/* Bottom-left: Underperformers */}
                  <div className="bg-red-50 border-r border-gray-200 relative">
                    <div className="absolute bottom-2 left-2">
                      <h3 className="text-xs font-bold text-red-700">Underperformers</h3>
                      <p className="text-[10px] text-gray-500">Coach or Exit</p>
                    </div>
                    <div className="absolute top-2 right-2 bg-white/80 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                      {quadrantCounts['underperformers']}
                    </div>
                  </div>
                  {/* Bottom-right: Core Players */}
                  <div className="bg-amber-50 relative">
                    <div className="absolute bottom-2 left-2">
                      <h3 className="text-xs font-bold text-amber-700">Core Players</h3>
                      <p className="text-[10px] text-gray-500">Develop Potential</p>
                    </div>
                    <div className="absolute top-2 right-2 bg-white/80 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                      {quadrantCounts['core-players']}
                    </div>
                  </div>
                </div>

                {/* Center crosshair lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />
                </div>

                {/* Employee Dots with Labels */}
                {filteredEmployees.map((emp) => {
                  const perfPercent = getPosition(emp.performance);
                  const potPercent = getPosition(emp.potential);

                  // Add slight offset to prevent exact overlaps
                  const xOffset = getOffset(emp.id, 'x');
                  const yOffset = getOffset(emp.id, 'y');

                  // X: 0% = left (low perf), 100% = right (high perf)
                  // Y: 0% = top (high pot), 100% = bottom (low pot) - inverted for CSS
                  const x = Math.max(3, Math.min(97, perfPercent + xOffset));
                  const y = Math.max(3, Math.min(97, 100 - potPercent + yOffset));

                  // Determine if this employee has partial ratings
                  const hasPartialRating = !emp.performance || !emp.potential;
                  const hasNoRating = !emp.performance && !emp.potential;

                  // Get first name or short name for label
                  const shortName = emp.name.split(' ')[0];

                  return (
                    <div
                      key={emp.id}
                      className="absolute flex items-center gap-1 group"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: hasNoRating ? 1 : hasPartialRating ? 5 : 10,
                      }}
                    >
                      <EmployeeDot
                        employee={emp}
                        onClick={() => onEmployeeEdit(emp)}
                        size={hasNoRating ? 'sm' : hasPartialRating ? 'md' : 'lg'}
                        hasPartialRating={hasPartialRating}
                      />
                      <button
                        onClick={() => onEmployeeEdit(emp)}
                        className={`text-[9px] font-medium whitespace-nowrap bg-white/90 px-1 rounded shadow-sm hover:bg-white hover:shadow cursor-pointer ${
                          hasNoRating ? 'text-gray-400' : hasPartialRating ? 'text-gray-500' : 'text-gray-700'
                        }`}
                      >
                        {shortName}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis markers */}
            <div className="flex mt-1">
              <div className="w-12" />
              <div className="flex-1 flex justify-between text-xs text-gray-400 max-w-2xl px-1">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            {/* X-axis label */}
            <div className="flex mt-1">
              <div className="w-12" />
              <div className="flex-1 text-center">
                <span className="text-xs font-semibold text-gray-500">PERFORMANCE</span>
              </div>
            </div>

            {/* Axis indicators */}
            <div className="flex mt-1">
              <div className="w-12" />
              <div className="flex-1 flex justify-between text-xs text-gray-400 max-w-2xl">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4 max-w-2xl ml-12">
          <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
            <div className="text-2xl font-bold text-green-700">{quadrantCounts['stars']}</div>
            <div className="text-xs text-gray-600">Stars</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{quadrantCounts['high-potentials']}</div>
            <div className="text-xs text-gray-600">High Potentials</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
            <div className="text-2xl font-bold text-amber-700">{quadrantCounts['core-players']}</div>
            <div className="text-xs text-gray-600">Core Players</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
            <div className="text-2xl font-bold text-red-700">{quadrantCounts['underperformers']}</div>
            <div className="text-xs text-gray-600">Underperformers</div>
          </div>
        </div>

        {/* Legend for dot sizes */}
        <div className="mt-4 ml-12 flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
            <span>Both ratings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white shadow-sm opacity-70" />
            <span>One rating (other = middle)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow-sm opacity-50" />
            <span>No ratings (center)</span>
          </div>
        </div>
      </div>

      {/* Legend Sidebar */}
      <div className="w-72 flex-shrink-0">
        <MatrixLegend
          employees={employees}
          accounts={accounts}
          roleFilters={roleFilters}
          onRoleFiltersChange={setRoleFilters}
        />
      </div>
    </div>
  );
}
