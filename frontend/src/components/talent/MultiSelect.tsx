import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  options: Array<{ value: string; label: string; count?: number }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...'
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const option = options.find(o => o.value === selected[0]);
      return option?.label || selected[0];
    }
    return `${selected.length} selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between gap-2"
      >
        <span className="flex-1 text-left truncate">
          {getDisplayText()}
        </span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <X
              className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700"
              onClick={clearAll}
            />
          )}
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 space-y-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
            ) : (
              options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="flex-1 text-sm text-gray-900">
                    {option.label}
                    {option.count !== undefined && (
                      <span className="text-gray-500 ml-1">({option.count})</span>
                    )}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected badges below */}
      {selected.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {selected.map((value) => {
            const option = options.find(o => o.value === value);
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {option?.label || value}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-blue-900"
                  onClick={(e) => removeOption(value, e)}
                />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
