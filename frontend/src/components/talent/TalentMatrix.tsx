import React, { useState, useEffect, useMemo } from 'react';
import { talentApi } from '../../lib/api';
import type {
  Employee,
  AccountCampaignType,
  QuadrantType,
  PerformanceRating,
  PotentialRating,
  getQuadrant,
  ratingToPercent,
} from '../../lib/talent-types';
import EmployeeDot from './EmployeeDot';
import MatrixLegend from './MatrixLegend';

// Import the helper functions from talent-types
import { getQuadrant as getQuadrantFn, ratingToPercent as ratingToPercentMap } from '../../lib/talent-types';

interface TalentMatrixProps {
  employees: Employee[];
  onEmployeeEdit: (employee: Employee) => void;
}

interface QuadrantInfo {
  id: QuadrantType;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
}

const quadrants: QuadrantInfo[] = [
  {
    id: 'high-potentials',
    title: 'High Potentials',
    subtitle: 'Develop Performance',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'stars',
    title: 'Stars',
    subtitle: 'Retain & Reward',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  {
    id: 'underperformers',
    title: 'Underperformers',
    subtitle: 'Coach or Exit',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  {
    id: 'core-players',
    title: 'Core Players',
    subtitle: 'Develop Potential',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
];

export default function TalentMatrix({ employees, onEmployeeEdit }: TalentMatrixProps) {
  const [accounts, setAccounts] = useState<AccountCampaignType[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [showUnrated, setShowUnrated] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Filter and categorize employees
  const { ratedEmployees, unratedEmployees, employeesByQuadrant } = useMemo(() => {
    // Apply role filter
    let filtered = employees;
    if (roleFilters.length > 0) {
      filtered = filtered.filter((e) => roleFilters.includes(e.role));
    }

    // Separate rated and unrated
    const rated = filtered.filter((e) => e.performance && e.potential);
    const unrated = filtered.filter((e) => !e.performance || !e.potential);

    // Group by quadrant
    const byQuadrant: Record<QuadrantType, Employee[]> = {
      stars: [],
      'high-potentials': [],
      'core-players': [],
      underperformers: [],
    };

    rated.forEach((emp) => {
      const quadrant = getQuadrantFn(emp.performance, emp.potential);
      if (quadrant) {
        byQuadrant[quadrant].push(emp);
      }
    });

    return {
      ratedEmployees: rated,
      unratedEmployees: unrated,
      employeesByQuadrant: byQuadrant,
    };
  }, [employees, roleFilters]);

  // Calculate position within quadrant based on exact rating
  const getPositionInQuadrant = (
    performance: PerformanceRating,
    potential: PotentialRating,
    quadrant: QuadrantType
  ): { x: number; y: number } => {
    const perfPercent = ratingToPercentMap[performance];
    const potPercent = ratingToPercentMap[potential];

    // Map to quadrant-relative position
    // Stars (top-right): high perf, high pot
    // High Potentials (top-left): low perf, high pot
    // Core Players (bottom-right): high perf, low pot
    // Underperformers (bottom-left): low perf, low pot

    let x: number, y: number;

    switch (quadrant) {
      case 'stars':
        // High performance (65-85) maps to 10-90% of quadrant width
        // High potential (65-85) maps to 10-90% of quadrant height (inverted for CSS)
        x = ((perfPercent - 65) / 20) * 80 + 10;
        y = 90 - ((potPercent - 65) / 20) * 80;
        break;
      case 'high-potentials':
        // Low performance (15-50) maps to 10-90% of quadrant width
        // High potential (65-85) maps to 10-90% of quadrant height
        x = ((perfPercent - 15) / 35) * 80 + 10;
        y = 90 - ((potPercent - 65) / 20) * 80;
        break;
      case 'core-players':
        // High performance (65-85) maps to 10-90%
        // Low potential (15-50) maps to 10-90%
        x = ((perfPercent - 65) / 20) * 80 + 10;
        y = 90 - ((potPercent - 15) / 35) * 80;
        break;
      case 'underperformers':
        // Low performance (15-50) maps to 10-90%
        // Low potential (15-50) maps to 10-90%
        x = ((perfPercent - 15) / 35) * 80 + 10;
        y = 90 - ((potPercent - 15) / 35) * 80;
        break;
    }

    // Clamp values
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));

    return { x, y };
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
        {/* Y-axis label */}
        <div className="flex">
          <div className="w-8 flex items-center justify-center">
            <span
              className="text-xs font-semibold text-gray-500 transform -rotate-90 whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              POTENTIAL
            </span>
          </div>

          <div className="flex-1">
            {/* Matrix Grid */}
            <div className="grid grid-cols-2 gap-1 aspect-square max-w-2xl">
              {quadrants.map((quadrant) => {
                const quadrantEmployees = employeesByQuadrant[quadrant.id];
                return (
                  <div
                    key={quadrant.id}
                    className={`relative ${quadrant.bgColor} rounded-lg border-2 border-gray-200 p-3 min-h-[200px]`}
                  >
                    {/* Quadrant Header */}
                    <div className="absolute top-2 left-2 right-2">
                      <h3 className={`text-sm font-bold ${quadrant.color}`}>{quadrant.title}</h3>
                      <p className="text-xs text-gray-500">{quadrant.subtitle}</p>
                    </div>

                    {/* Count Badge */}
                    <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-0.5 text-xs font-semibold text-gray-600 shadow-sm">
                      {quadrantEmployees.length}
                    </div>

                    {/* Employee Dots */}
                    <div className="absolute inset-0 mt-12 mb-2 mx-2">
                      {quadrantEmployees.map((emp) => {
                        const pos = getPositionInQuadrant(
                          emp.performance!,
                          emp.potential!,
                          quadrant.id
                        );
                        return (
                          <div
                            key={emp.id}
                            className="absolute"
                            style={{
                              left: `${pos.x}%`,
                              top: `${pos.y}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <EmployeeDot employee={emp} onClick={() => onEmployeeEdit(emp)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis label */}
            <div className="text-center mt-2">
              <span className="text-xs font-semibold text-gray-500">PERFORMANCE</span>
            </div>

            {/* Axis indicators */}
            <div className="flex justify-between text-xs text-gray-400 mt-1 max-w-2xl">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Unrated Employees Section */}
        {showUnrated && unratedEmployees.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">
              Unrated Employees ({unratedEmployees.length})
            </h4>
            <div className="flex flex-wrap gap-3">
              {unratedEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => onEmployeeEdit(emp)}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border hover:shadow-md transition-shadow text-sm"
                >
                  <span className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="font-medium">{emp.name}</span>
                  <span className="text-gray-500">{emp.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          {quadrants.map((quadrant) => (
            <div key={quadrant.id} className={`${quadrant.bgColor} rounded-lg p-3 text-center`}>
              <div className={`text-2xl font-bold ${quadrant.color}`}>
                {employeesByQuadrant[quadrant.id].length}
              </div>
              <div className="text-xs text-gray-600">{quadrant.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend Sidebar */}
      <div className="w-72 flex-shrink-0">
        <MatrixLegend
          employees={employees}
          accounts={accounts}
          roleFilters={roleFilters}
          onRoleFiltersChange={setRoleFilters}
          showUnrated={showUnrated}
          onShowUnratedChange={setShowUnrated}
        />
      </div>
    </div>
  );
}
