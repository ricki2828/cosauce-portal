import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const modes: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'weekly', label: 'Weekly', icon: CalendarDays },
    { id: 'monthly', label: 'Monthly', icon: CalendarRange },
  ];

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all
            ${value === id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
