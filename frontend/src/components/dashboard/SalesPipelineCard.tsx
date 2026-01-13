import { TrendingUp, Target, MessageCircle, Handshake, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PipelineStage {
  status: string;
  label: string;
  count: number;
  color: string;
  icon: React.ElementType;
}

interface SalesPipelineCardProps {
  stages: PipelineStage[];
  totalCompanies: number;
  totalSignals: number;
}

export function SalesPipelineCard({ stages, totalCompanies, totalSignals }: SalesPipelineCardProps) {
  const getStageIcon = (status: string) => {
    switch (status) {
      case 'new': return AlertCircle;
      case 'meeting': return Handshake;
      case 'evaluation': return Target;
      case 'design_implementation': return MessageCircle;
      default: return TrendingUp;
    }
  };

  const getStageColor = (status: string): string => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      case 'evaluation': return 'bg-purple-100 text-purple-800';
      case 'design_implementation': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link
      to="/sales"
      className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Pipeline Overview</h3>
          <p className="text-xs text-gray-500 mt-0.5">{totalCompanies} companies tracked</p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
          <TrendingUp className="w-5 h-5 text-green-600" />
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="space-y-2 mb-3">
        {stages.map((stage) => {
          const Icon = getStageIcon(stage.status);
          return (
            <div key={stage.status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100">
                  <Icon className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">{stage.label}</span>
              </div>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStageColor(stage.status)}`}>
                {stage.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Signals Count */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Active Signals</span>
          <span className="font-semibold text-gray-900">{totalSignals}</span>
        </div>
      </div>
    </Link>
  );
}
