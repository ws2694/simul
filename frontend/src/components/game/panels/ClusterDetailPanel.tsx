'use client';

import { GitBranch } from 'lucide-react';
import FloatingPanel from '../FloatingPanel';
import { formatConfidence, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Decision {
  id: number;
  title: string;
  decision: string;
  confidence: number;
  date: string;
  status: string;
}

interface ClusterDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  decisions: Decision[];
}

export default function ClusterDetailPanel({
  isOpen,
  onClose,
  domain,
  decisions
}: ClusterDetailPanelProps) {
  // Calculate stats
  const totalDecisions = decisions.length;
  const avgConfidence = decisions.length > 0
    ? decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length
    : 0;
  const activeCount = decisions.filter(d => d.status === 'active').length;

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title={`${domain} Cluster`}
      icon={<GitBranch className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #c4b5e0, #9b7ed4)"
      width="520px"
      maxHeight="85vh"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-lavender-light/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-game-text-dark">{totalDecisions}</p>
          <p className="text-xs text-game-text-light">Total</p>
        </div>
        <div className="bg-mint-light/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{Math.round(avgConfidence * 100)}%</p>
          <p className="text-xs text-game-text-light">Avg Confidence</p>
        </div>
        <div className="bg-soft-blue/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{activeCount}</p>
          <p className="text-xs text-game-text-light">Active</p>
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-2">
        <h3 className="font-heading font-semibold text-sm text-game-text-dark mb-3">
          Decisions in this cluster
        </h3>

        {decisions.length > 0 ? (
          decisions.map((decision) => (
            <div
              key={decision.id}
              className="p-4 rounded-xl bg-cream/50 hover:bg-cream transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-game-text-dark truncate group-hover:text-cosmic-purple transition-colors">
                    {decision.title}
                  </p>
                  <p className="text-xs text-game-text-light mt-1 line-clamp-2">
                    {decision.decision}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs border-0 ${
                        decision.status === 'active'
                          ? 'bg-mint-light text-green-700'
                          : decision.status === 'superseded'
                          ? 'bg-soft-yellow text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {decision.status}
                    </Badge>
                    <span className="text-xs text-game-text-light">
                      {formatRelativeTime(decision.date)}
                    </span>
                  </div>
                </div>
                <div
                  className={`
                    shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold
                    ${decision.confidence >= 0.7
                      ? 'bg-mint-light text-green-700'
                      : decision.confidence >= 0.4
                      ? 'bg-soft-yellow text-amber-700'
                      : 'bg-peach text-red-700'
                    }
                  `}
                >
                  {formatConfidence(decision.confidence)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-game-text-light">No decisions in this cluster yet</p>
          </div>
        )}
      </div>
    </FloatingPanel>
  );
}
