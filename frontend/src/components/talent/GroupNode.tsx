import React, { memo } from 'react';

interface GroupNodeProps {
  data: {
    label: string;
    type: 'department' | 'account';
    color: string;
  };
}

function GroupNode({ data }: GroupNodeProps) {
  const { label, type, color } = data;

  return (
    <div
      className="rounded-lg border-2 border-dashed p-6 min-w-[300px] min-h-[200px]"
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}40`
      }}
    >
      <div className="absolute top-2 left-2">
        <div
          className="text-xs font-semibold px-2 py-1 rounded"
          style={{
            backgroundColor: `${color}20`,
            color: `${color}`
          }}
        >
          {type === 'department' ? '🏢' : '👥'} {label}
        </div>
      </div>
    </div>
  );
}

export default memo(GroupNode);
