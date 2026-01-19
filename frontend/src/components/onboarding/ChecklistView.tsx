import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Plus, Trash2, GripVertical } from 'lucide-react';
import type { ChecklistItem, ChecklistStage } from '../../lib/api';

interface ChecklistViewProps {
  hireId: string;
  checklist: ChecklistItem[];
  onStageToggle: (stageId: string, isCompleted: boolean, notes?: string) => Promise<void>;
  onAddItem?: (item: { item_name: string; order_index: number; stages: any[] }) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onReorder?: (reorders: Array<{ item_id: string; new_order: number }>) => Promise<void>;
  editable?: boolean;
}

export function ChecklistView({
  checklist,
  onStageToggle,
  onAddItem,
  onDeleteItem,
  editable = false,
}: ChecklistViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleStageClick = async (stage: ChecklistStage) => {
    if (updatingStage) return; // Prevent double-clicking

    setUpdatingStage(stage.id);
    try {
      await onStageToggle(stage.id, !stage.is_completed);
    } catch (error) {
      console.error('Failed to toggle stage:', error);
    } finally {
      setUpdatingStage(null);
    }
  };

  const handleItemToggle = async (item: ChecklistItem) => {
    if (updatingStage) return; // Prevent double-clicking

    const allComplete = isItemComplete(item);
    const targetState = !allComplete; // If all complete, uncheck all; otherwise check all

    // Toggle all stages in this item
    for (const stage of item.stages) {
      if (stage.is_completed !== targetState) {
        setUpdatingStage(stage.id);
        try {
          await onStageToggle(stage.id, targetState);
        } catch (error) {
          console.error('Failed to toggle stage:', error);
        } finally {
          setUpdatingStage(null);
        }
      }
    }
  };

  const calculateItemProgress = (item: ChecklistItem): number => {
    if (item.stages.length === 0) return 0;
    const completedStages = item.stages.filter(s => s.is_completed).length;
    return Math.round((completedStages / item.stages.length) * 100);
  };

  const calculateOverallProgress = (): number => {
    if (checklist.length === 0) return 0;
    const totalStages = checklist.reduce((sum, item) => sum + item.stages.length, 0);
    if (totalStages === 0) return 0;
    const completedStages = checklist.reduce(
      (sum, item) => sum + item.stages.filter(s => s.is_completed).length,
      0
    );
    return Math.round((completedStages / totalStages) * 100);
  };

  const getItemStatusColor = (progress: number): string => {
    if (progress === 0) return 'text-gray-400';
    if (progress === 100) return 'text-green-600';
    return 'text-blue-600';
  };

  const isItemComplete = (item: ChecklistItem): boolean => {
    return item.stages.length > 0 && item.stages.every(s => s.is_completed);
  };

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Overall Progress</h3>
          <span className="text-sm font-semibold text-gray-900">{calculateOverallProgress()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${calculateOverallProgress()}%` }}
          ></div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {checklist.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          const progress = calculateItemProgress(item);
          const statusColor = getItemStatusColor(progress);

          return (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Item Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3"
                onClick={() => toggleExpand(item.id)}
              >
                {editable && (
                  <button
                    type="button"
                    className="cursor-grab text-gray-400 hover:text-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                )}

                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemToggle(item);
                  }}
                  disabled={updatingStage !== null}
                  className={`flex-shrink-0 ${updatingStage !== null ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-110'} transition-transform`}
                  title={isItemComplete(item) ? "Uncheck all stages" : "Check all stages"}
                >
                  {isItemComplete(item) ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-blue-400 transition-colors"></div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{item.item_name}</h4>
                    <span className={`text-xs font-semibold ${statusColor}`}>
                      {progress}% ({item.stages.filter(s => s.is_completed).length}/{item.stages.length})
                    </span>
                  </div>
                </div>

                {editable && onDeleteItem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${item.item_name}"?`)) {
                        onDeleteItem(item.id);
                      }
                    }}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Stages */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="space-y-2">
                    {item.stages.map((stage) => (
                      <div key={stage.id} className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleStageClick(stage)}
                          disabled={updatingStage === stage.id}
                          className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            stage.is_completed
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 hover:border-blue-400'
                          } ${updatingStage === stage.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                        >
                          {stage.is_completed && <Check className="w-3 h-3 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm ${
                                stage.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'
                              }`}
                            >
                              {stage.stage_label}
                            </span>
                            {stage.stage_category && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                {stage.stage_category}
                              </span>
                            )}
                          </div>
                          {stage.notes && (
                            <p className="mt-1 text-xs text-gray-600 italic">{stage.notes}</p>
                          )}
                          {stage.is_completed && stage.completed_at && (
                            <p className="mt-1 text-xs text-gray-500">
                              Completed {new Date(stage.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {checklist.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
            No checklist items yet.
          </div>
        )}
      </div>

      {/* Add Item Button */}
      {editable && onAddItem && (
        <button
          type="button"
          onClick={() => {
            // This would open a modal to add a custom checklist item
            // For now, just placeholder
          }}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Custom Item
        </button>
      )}
    </div>
  );
}
