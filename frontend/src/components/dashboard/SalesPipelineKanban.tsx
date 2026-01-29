import { useState } from 'react';
import type { PipelineOpportunity, OpportunityComment } from '../../lib/api';
import { Building2, TrendingUp, Calendar, Target, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { pipelineApi } from '../../lib/api';
import AddCommentModal from './AddCommentModal';

interface SalesPipelineKanbanProps {
  opportunities: PipelineOpportunity[];
  onEditOpportunity: (opportunity: PipelineOpportunity) => void;
  onCommentAdded?: () => void;
}

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  bgColor: string;
}

const columns: KanbanColumn[] = [
  { id: 'new', label: 'New Leads', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  { id: 'meeting', label: 'Meeting', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  { id: 'assessing', label: 'Assessing', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  { id: 'implementation', label: 'Implementation', color: 'text-green-700', bgColor: 'bg-green-50' },
];

export function SalesPipelineKanban({ opportunities, onEditOpportunity, onCommentAdded }: SalesPipelineKanbanProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<PipelineOpportunity | null>(null);
  const [editingComment, setEditingComment] = useState<OpportunityComment | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  const getOpportunitiesByStatus = (status: string) => {
    return opportunities.filter(opp => opp.status === status);
  };

  const handleAddComment = async (content: string) => {
    if (!selectedOpportunity) return;
    await pipelineApi.addOpportunityComment(selectedOpportunity.id, { content });
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  const handleEditComment = async (content: string) => {
    if (!selectedOpportunity || !editingComment) return;
    await pipelineApi.updateOpportunityComment(selectedOpportunity.id, editingComment.id, { content });
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  const handleDeleteComment = async (e: React.MouseEvent, opportunity: PipelineOpportunity, comment: OpportunityComment) => {
    e.stopPropagation();
    if (!confirm('Delete this note?')) return;
    await pipelineApi.deleteOpportunityComment(opportunity.id, comment.id);
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  const handleCommentClick = (e: React.MouseEvent, opportunity: PipelineOpportunity) => {
    e.stopPropagation();
    setSelectedOpportunity(opportunity);
    setEditingComment(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, opportunity: PipelineOpportunity, comment: OpportunityComment) => {
    e.stopPropagation();
    setSelectedOpportunity(opportunity);
    setEditingComment(comment);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const getLikelihoodDisplay = (likelihood: 'high' | 'medium' | 'low'): string => {
    if (likelihood === 'high') return 'High';
    if (likelihood === 'medium') return 'Med';
    if (likelihood === 'low') return 'Low';
    return 'TBD';
  };

  const getLikelihoodColor = (likelihood: 'high' | 'medium' | 'low'): string => {
    if (likelihood === 'high') return 'text-green-600 bg-green-50';
    if (likelihood === 'medium') return 'text-amber-600 bg-amber-50';
    if (likelihood === 'low') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {columns.map((column) => {
        const columnOpportunities = getOpportunitiesByStatus(column.id);

        return (
          <div key={column.id} className="flex flex-col">
            {/* Column Header */}
            <div className={`${column.bgColor} rounded-t-lg px-3 py-2 border-t border-l border-r border-gray-200`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold ${column.color}`}>
                  {column.label}
                </h3>
                <span className={`text-xs font-bold ${column.color}`}>
                  {columnOpportunities.length}
                </span>
              </div>
            </div>

            {/* Column Cards */}
            <div className="flex-1 bg-gray-50 rounded-b-lg border-l border-r border-b border-gray-200 p-2 space-y-2 min-h-[200px]">
              {columnOpportunities.map((opportunity) => (
                <button
                  key={opportunity.id}
                  onClick={() => onEditOpportunity(opportunity)}
                  className="w-full text-left bg-white rounded border border-gray-200 p-2.5 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* Client Name */}
                  <div className="flex items-start gap-2 mb-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 flex-1">
                      {opportunity.client_name}
                    </h4>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-1.5">
                    {/* Size */}
                    {opportunity.size && (
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{opportunity.size}</span>
                      </div>
                    )}

                    {/* Likelihood */}
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-gray-400" />
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getLikelihoodColor(opportunity.likelihood)}`}>
                        {getLikelihoodDisplay(opportunity.likelihood)}
                      </span>
                    </div>

                    {/* Target Date */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {opportunity.target_date
                          ? new Date(opportunity.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Not set'}
                      </span>
                    </div>
                  </div>

                  {/* Notes/Commentary - show latest comment first */}
                  {(opportunity.comments && opportunity.comments.length > 0) ? (
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
                      {[...opportunity.comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 2).map((comment) => (
                        <div key={comment.id} className="text-xs bg-blue-50 rounded p-1.5 group/comment">
                          <div className="flex justify-between items-start gap-1">
                            <p className="text-gray-700 line-clamp-2 flex-1">{comment.content}</p>
                            <div className="flex gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleEditClick(e, opportunity, comment)}
                                className="p-0.5 text-gray-400 hover:text-blue-600"
                                title="Edit"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteComment(e, opportunity, comment)}
                                className="p-0.5 text-gray-400 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-500 text-[10px] mt-0.5">
                            — {comment.author_name}, {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      ))}
                      {opportunity.comments.length > 2 && (
                        <p className="text-xs text-gray-400">+{opportunity.comments.length - 2} more notes</p>
                      )}
                    </div>
                  ) : opportunity.notes ? (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-700 line-clamp-2 mb-1">
                        {opportunity.notes}
                      </p>
                      {opportunity.author_name && (
                        <p className="text-xs text-gray-500">
                          — {opportunity.author_name}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* Add Comment Button */}
                  <div className={`${opportunity.notes ? 'mt-2' : 'mt-2'} pt-2 border-t border-gray-100`}>
                    <button
                      onClick={(e) => handleCommentClick(e, opportunity)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      Add note
                    </button>
                  </div>
                </button>
              ))}

              {columnOpportunities.length === 0 && (
                <div className="flex items-center justify-center h-32 text-xs text-gray-400">
                  No opportunities
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add/Edit Comment Modal */}
      <AddCommentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingComment(null);
        }}
        onSubmit={modalMode === 'edit' ? handleEditComment : handleAddComment}
        title={selectedOpportunity ? `${modalMode === 'edit' ? 'Edit' : 'Add'} Note: ${selectedOpportunity.client_name}` : 'Add Note'}
        placeholder="Enter note about this opportunity..."
        initialContent={editingComment?.content || ''}
        mode={modalMode}
      />
    </div>
  );
}
