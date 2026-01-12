import { X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ProgressData {
  processed: number;
  total: number;
  current_company: string;
  success_count: number;
  failed_count: number;
  percentage: number;
  done?: boolean;
}

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ProgressData | null;
  title?: string;
}

export function ProgressModal({ isOpen, onClose, progress, title = 'Processing Companies' }: ProgressModalProps) {
  if (!isOpen || !progress) return null;

  const canClose = progress.done || false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={canClose ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border-2 border-foreground shadow-pop w-full max-w-md mx-4 p-6 animate-popIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-heading font-extrabold text-foreground tracking-tight">{title}</h3>
          {canClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg border-2 border-transparent hover:border-foreground transition-all"
            >
              <X className="w-5 h-5 text-foreground" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-body font-bold text-foreground">
              {progress.processed} of {progress.total}
            </span>
            <span className="text-sm font-heading font-extrabold text-accent">
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden border-2 border-border">
            <div
              className="bg-accent h-full rounded-full transition-all duration-300 ease-bounce"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-card rounded-xl border-2 border-foreground shadow-pop p-4 mb-4">
          <div className="flex items-center gap-3">
            {!progress.done ? (
              <Loader2 className="w-5 h-5 text-accent animate-spin flex-shrink-0" strokeWidth={2.5} />
            ) : (
              <Check className="w-5 h-5 text-quaternary flex-shrink-0" strokeWidth={2.5} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading font-bold text-foreground truncate">
                {progress.current_company}
              </p>
              <p className="text-xs font-body text-foreground/60 mt-0.5">
                {progress.done ? 'Analysis complete' : 'Analyzing BPO fit...'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-quaternary/10 rounded-xl p-4 border-2 border-quaternary/30 shadow-pop">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-quaternary" strokeWidth={2.5} />
              <span className="text-sm font-body font-bold text-foreground">Success</span>
            </div>
            <p className="text-3xl font-heading font-extrabold text-quaternary mt-2">
              {progress.success_count}
            </p>
          </div>

          <div className="bg-secondary/10 rounded-xl p-4 border-2 border-secondary/30 shadow-pop">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-secondary" strokeWidth={2.5} />
              <span className="text-sm font-body font-bold text-foreground">Failed</span>
            </div>
            <p className="text-3xl font-heading font-extrabold text-secondary mt-2">
              {progress.failed_count}
            </p>
          </div>
        </div>

        {/* Done Button */}
        {progress.done && (
          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-3 bg-accent text-accentForeground rounded-full font-body font-bold text-sm border-2 border-foreground shadow-pop hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pop-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active transition-all duration-300 ease-bounce"
          >
            Done
          </button>
        )}

        {/* Processing message */}
        {!progress.done && (
          <p className="text-xs font-body text-foreground/60 text-center mt-4">
            Please wait while we analyze the selected companies...
          </p>
        )}
      </div>
    </div>
  );
}
