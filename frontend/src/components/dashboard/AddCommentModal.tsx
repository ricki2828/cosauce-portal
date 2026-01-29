import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, Pencil, X } from 'lucide-react';

interface AddCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  title: string;
  placeholder?: string;
  initialContent?: string;
  mode?: 'add' | 'edit';
}

const AddCommentModal: React.FC<AddCommentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder = "Enter your comment...",
  initialContent = '',
  mode = 'add'
}) => {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
    }
  }, [isOpen, initialContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(content);
      setContent('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {mode === 'edit' ? (
              <Pencil className="w-5 h-5 text-blue-600" />
            ) : (
              <MessageSquarePlus className="w-5 h-5 text-blue-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={4}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50"
            autoFocus
          />

          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (mode === 'edit' ? 'Saving...' : 'Adding...') : (mode === 'edit' ? 'Save' : 'Add Comment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCommentModal;
