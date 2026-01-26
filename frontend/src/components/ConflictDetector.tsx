'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { detectConflicts } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NoConflicts } from '@/components/empty-states';
import { CardSkeleton } from '@/components/skeletons';
import { staggerContainerVariants, staggerItemVariants, fadeInVariants } from '@/lib/animations';

interface ConflictDetectorProps {
  teamId: number;
}

interface Conflict {
  participants: string[];
  decision_ids: number[];
  conflict_description: string;
  severity: 'low' | 'medium' | 'high';
  suggested_resolution: string;
}

interface ConflictResult {
  conflicts: Conflict[];
  summary: string;
  decisions_analyzed: number;
}

const severityConfig = {
  high: {
    bg: 'bg-error-50',
    border: 'border-error-200',
    badge: 'bg-error-100 text-error-700',
    icon: 'text-error-600',
  },
  medium: {
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    badge: 'bg-warning-100 text-warning-700',
    icon: 'text-warning-600',
  },
  low: {
    bg: 'bg-primary-50',
    border: 'border-primary-200',
    badge: 'bg-primary-100 text-primary-700',
    icon: 'text-primary-600',
  },
};

export function ConflictDetector({ teamId }: ConflictDetectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ConflictResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('7');
  const [expandedConflict, setExpandedConflict] = useState<number | null>(null);

  const loadConflicts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await detectConflicts(teamId, Number(days));
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to detect conflicts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();
  }, [teamId, days]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-warning-100 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-warning-600" />
            </div>
            Conflict Detection
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 days</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadConflicts}
              disabled={isLoading}
              className="h-9 w-9"
            >
              <RefreshCw
                className={cn('h-4 w-4', isLoading && 'animate-spin')}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-lg bg-error-50 text-error-700 border border-error-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && !result && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 shimmer h-16" />
            {[1, 2].map((i) => (
              <CardSkeleton key={i} hasHeader={false} lines={4} />
            ))}
          </div>
        )}

        {/* Results */}
        {result && (
          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            {/* Summary */}
            <motion.div
              variants={fadeInVariants}
              className="p-4 rounded-xl bg-muted/30 border border-border/50"
            >
              <div className="text-sm text-muted-foreground">
                Analyzed{' '}
                <span className="font-medium text-foreground">
                  {result.decisions_analyzed}
                </span>{' '}
                decisions from the past {days} days
              </div>
              {result.summary && (
                <div className="mt-2 text-sm text-foreground">
                  {result.summary}
                </div>
              )}
            </motion.div>

            {/* Conflicts List or Empty State */}
            {result.conflicts.length === 0 ? (
              <NoConflicts />
            ) : (
              <motion.div
                variants={staggerContainerVariants}
                className="space-y-3"
              >
                {result.conflicts.map((conflict, index) => {
                  const config = severityConfig[conflict.severity];
                  const isExpanded = expandedConflict === index;

                  return (
                    <motion.div
                      key={index}
                      variants={staggerItemVariants}
                      className={cn(
                        'rounded-xl border overflow-hidden transition-all duration-200',
                        config.bg,
                        config.border,
                        isExpanded && 'shadow-md'
                      )}
                    >
                      <button
                        onClick={() =>
                          setExpandedConflict(isExpanded ? null : index)
                        }
                        className="w-full p-4 text-left flex items-start justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <Users className={cn('h-4 w-4', config.icon)} />
                              <span className="font-medium">
                                {conflict.participants.join(' & ')}
                              </span>
                            </div>
                            <Badge className={cn('uppercase text-xs', config.badge)}>
                              {conflict.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground/80 line-clamp-2">
                            {conflict.conflict_description}
                          </p>
                        </div>
                        <div className="shrink-0 text-muted-foreground">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0 border-t border-current/10">
                              <div className="pt-4">
                                <span className="text-xs font-medium text-muted-foreground block mb-2">
                                  Suggested Resolution
                                </span>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                  {conflict.suggested_resolution}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
