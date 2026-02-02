'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, RefreshCw, ChevronRight } from 'lucide-react';
import FloatingPanel from '../FloatingPanel';
import { getRecentReasoning } from '@/lib/api';
import { formatConfidence, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DecisionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DecisionsPanel({ isOpen, onClose }: DecisionsPanelProps) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleDecisionClick = (decisionId: number) => {
    onClose();
    router.push(`/decisions/${decisionId}`);
  };

  const loadDecisions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getRecentReasoning(14);
      setDecisions(data.decisions || []);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDecisions();
    }
  }, [isOpen, loadDecisions]);

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Recent Decisions"
      icon={<ImageIcon className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #f5d0c5, #e491b3)"
      width="480px"
      maxHeight="85vh"
    >
      {/* Header Actions */}
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={loadDecisions}
          disabled={isLoading}
          className="h-8 gap-2 text-game-text-light hover:text-game-text-dark hover:bg-lavender-light"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Decisions List */}
      <div className="space-y-2">
        {decisions.length > 0 ? (
          decisions.map((decision) => (
            <div
              key={decision.id}
              onClick={() => handleDecisionClick(decision.id)}
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
                      className="text-xs bg-lavender-light text-game-text-dark border-0"
                    >
                      {decision.domain}
                    </Badge>
                    <span className="text-xs text-game-text-light">
                      {formatRelativeTime(decision.date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold
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
                  <ChevronRight className="w-4 h-4 text-game-text-light group-hover:text-cosmic-purple transition-colors" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-lavender-light flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-lavender-dark opacity-50" />
            </div>
            <p className="text-game-text-light">No recent decisions found</p>
            <p className="text-sm text-game-text-light/70 mt-1">
              Record a session to start capturing decisions
            </p>
          </div>
        )}
      </div>
    </FloatingPanel>
  );
}
