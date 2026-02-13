import { useState, useRef, useEffect, useCallback } from 'react';

interface EditableCellProps {
  value: number | null;
  onSave: (amount: number) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function EditableCell({ value, onSave, disabled, className = '' }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleClick = () => {
    if (disabled || saving) return;
    setInputValue(value != null ? String(value) : '');
    setEditing(true);
  };

  const commitValue = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      setEditing(false);
      return;
    }
    // Skip if value hasn't changed
    if (value != null && Math.abs(parsed - value) < 0.001) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(parsed);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [inputValue, value, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
    } else if (e.key === 'Escape') {
      setEditing(false);
    } else if (e.key === 'Tab') {
      commitValue();
    }
  };

  const handleBlur = () => {
    // Small delay to allow Tab key to be processed
    debounceRef.current = setTimeout(commitValue, 50);
  };

  const formatDisplay = (v: number | null) => {
    if (v == null) return '-';
    return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full h-7 px-1 text-right text-sm font-mono border border-blue-400 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        step="any"
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer text-right text-sm font-mono px-1 py-0.5 rounded transition-colors
        ${disabled ? 'cursor-default' : 'hover:bg-blue-50'}
        ${saving ? 'opacity-50' : ''}
        ${className}`}
    >
      {saving ? '...' : formatDisplay(value)}
    </div>
  );
}
