import { Zap, Users, Download, X, Trash2 } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  onAnalyzeBpo: () => void;
  onFindContacts: () => void;
  onStatusChange: (status: string) => void;
  onExport: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isLoading: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  onAnalyzeBpo,
  onFindContacts,
  onStatusChange,
  onExport,
  onDelete,
  onClearSelection,
  isLoading,
}: BulkActionToolbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-card border-2 border-foreground rounded-xl shadow-pop px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="font-heading font-bold text-foreground text-lg">{selectedCount} selected</span>

        <div className="hidden md:block h-6 w-1 bg-border rounded-full" />

        <button
          onClick={onAnalyzeBpo}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accentForeground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          <Zap className="w-4 h-4" strokeWidth={2.5} />
          BPO Fit
        </button>

        <button
          onClick={onFindContacts}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-quaternary text-foreground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          <Users className="w-4 h-4" strokeWidth={2.5} />
          Find Contacts
        </button>

        <div className="hidden md:block h-6 w-1 bg-border rounded-full" />

        <select
          onChange={(e) => {
            if (e.target.value) {
              onStatusChange(e.target.value);
              e.target.value = '';
            }
          }}
          disabled={isLoading}
          className="px-4 py-2 bg-tertiary text-foreground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover transition-all duration-300 ease-bounce"
          defaultValue=""
        >
          <option value="" disabled>Change Status</option>
          <option value="target">Set as Target</option>
          <option value="contacted">Mark Contacted</option>
          <option value="meeting">Set Meeting</option>
          <option value="new">Reset to New</option>
        </select>

        <button
          onClick={onExport}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-input text-foreground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          <Download className="w-4 h-4" strokeWidth={2.5} />
          Export CSV
        </button>

        <div className="hidden md:block h-6 w-1 bg-border rounded-full" />

        <button
          onClick={() => {
            if (confirm(`Delete ${selectedCount} companies? This cannot be undone.`)) {
              onDelete();
            }
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
          Delete
        </button>
      </div>

      <button
        onClick={onClearSelection}
        className="p-2 hover:bg-muted rounded-lg border-2 border-transparent hover:border-foreground transition-all"
      >
        <X className="w-5 h-5 text-foreground" strokeWidth={2.5} />
      </button>
    </div>
  );
}
