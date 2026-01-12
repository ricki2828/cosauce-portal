import { ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-muted text-mutedForeground border-border' },
  { value: 'target', label: 'Target', color: 'bg-accent/20 text-accent border-accent/40' },
  { value: 'contacted', label: 'Contacted', color: 'bg-tertiary/20 text-tertiary border-tertiary/40' },
  { value: 'meeting', label: 'Meeting', color: 'bg-quaternary/20 text-quaternary border-quaternary/40' },
];

// Signal type styling for job signals
const SIGNAL_TYPE_CONFIG: Record<string, { label: string; color: string; priority: number }> = {
  cx_leadership: { label: 'CX Leadership', color: 'bg-accent/20 text-accent border-accent/40', priority: 4 },
  bpo: { label: 'BPO', color: 'bg-secondary/20 text-secondary border-secondary/40', priority: 3 },
  bilingual_cx: { label: 'Bilingual', color: 'bg-tertiary/20 text-tertiary border-tertiary/40', priority: 3 },
  contact_center: { label: 'Contact Center', color: 'bg-quaternary/20 text-quaternary border-quaternary/40', priority: 2 },
  customer_service: { label: 'Customer Service', color: 'bg-quaternary/20 text-quaternary border-quaternary/40', priority: 2 },
  general: { label: 'General', color: 'bg-muted text-mutedForeground border-border', priority: 1 },
};

export function getSignalTypeConfig(type: string) {
  return SIGNAL_TYPE_CONFIG[type] || SIGNAL_TYPE_CONFIG.general;
}

interface StatusDropdownProps {
  value: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}

export function StatusDropdown({ value, onChange, disabled }: StatusDropdownProps) {
  const currentStatus = STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          appearance-none cursor-pointer font-body font-bold
          px-3 py-1.5 pr-7 rounded-full text-xs
          ${currentStatus.color}
          border-2 focus:outline-none focus:shadow-pop transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {STATUS_OPTIONS.map(status => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" strokeWidth={2.5} />
    </div>
  );
}

export function getStatusColor(status: string): string {
  const option = STATUS_OPTIONS.find(s => s.value === status);
  return option?.color || STATUS_OPTIONS[0].color;
}
