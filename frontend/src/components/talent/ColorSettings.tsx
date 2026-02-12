import React, { useState, useEffect } from 'react';
import { X, Palette, RotateCcw } from 'lucide-react';
import type { AccountCampaignType, Employee } from '../../lib/talent-types';

// Default colors used by hash function
const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

// Get default color using hash (same as original getGroupColor)
function getDefaultColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

// Storage key for colors
const STORAGE_KEY = 'talent-matrix-colors';

// Get stored colors from localStorage
export function getStoredColors(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save colors to localStorage
export function saveStoredColors(colors: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

// Get color for a group (client or department) - uses stored color or falls back to hash
export function getGroupColor(groupName: string): string {
  const stored = getStoredColors();
  return stored[groupName] || getDefaultColor(groupName);
}

interface ColorSettingsProps {
  accounts: AccountCampaignType[];
  employees: Employee[];
  onClose: () => void;
  onColorsChange: () => void;
}

export default function ColorSettings({ accounts, employees, onClose, onColorsChange }: ColorSettingsProps) {
  const [colors, setColors] = useState<Record<string, string>>({});

  // Get unique departments from employees
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  // Load stored colors on mount
  useEffect(() => {
    setColors(getStoredColors());
  }, []);

  const handleColorChange = (name: string, color: string) => {
    const newColors = { ...colors, [name]: color };
    setColors(newColors);
    saveStoredColors(newColors);
    onColorsChange();
  };

  const handleReset = (name: string) => {
    const newColors = { ...colors };
    delete newColors[name];
    setColors(newColors);
    saveStoredColors(newColors);
    onColorsChange();
  };

  const handleResetAll = () => {
    setColors({});
    saveStoredColors({});
    onColorsChange();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Color Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Reset All Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleResetAll}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reset all to defaults
            </button>
          </div>

          {/* Clients Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Clients</h3>
            <div className="space-y-2">
              {accounts.map(account => {
                const currentColor = colors[account.id] || getDefaultColor(account.id);
                const isCustom = !!colors[account.id];
                return (
                  <div key={account.id} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => handleColorChange(account.id, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                    />
                    <span className="flex-1 text-sm">{account.name}</span>
                    {account.campaign_type && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        account.campaign_type === 'sales' ? 'bg-green-100 text-green-700' :
                        account.campaign_type === 'service' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {account.campaign_type}
                      </span>
                    )}
                    {isCustom && (
                      <button
                        onClick={() => handleReset(account.id)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                        title="Reset to default"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Departments Section */}
          {departments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Departments</h3>
              <div className="space-y-2">
                {departments.sort().map(dept => {
                  const currentColor = colors[dept] || getDefaultColor(dept);
                  const isCustom = !!colors[dept];
                  return (
                    <div key={dept} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => handleColorChange(dept, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <span className="flex-1 text-sm">{dept}</span>
                      {isCustom && (
                        <button
                          onClick={() => handleReset(dept)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                          title="Reset to default"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
