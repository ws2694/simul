'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  FileText,
} from 'lucide-react';
import { queryMyBot, queryUserBot, queryTeam } from '@/lib/api';
import { formatTimestamp, formatConfidence, formatRelativeTime, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NoResults } from '@/components/empty-states';
import { SourceCardSkeleton } from '@/components/skeletons';
import {
  fadeInVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/animations';

interface BotQueryProps {
  mode: 'personal' | 'user' | 'team';
  targetId?: number;
  targetName?: string;
}

interface QueryResult {
  answer: string;
  sources: Array<{
    id: number;
    title: string;
    decision: string;
    reasoning: string;
    domain: string;
    confidence: number;
    date: string;
    timestamp_start?: number;
    owner_name?: string;
  }>;
  confidence: number;
  latency_ms: number;
  contributors?: string[];
  synthesis?: string;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary-500 animate-pulse" />
      <span className="text-sm text-muted-foreground">Thinking</span>
      <div className="thinking-dots flex gap-1">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ConfidenceRing({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const strokeDasharray = 2 * Math.PI * 18;
  const strokeDashoffset = strokeDasharray * (1 - confidence);

  const getColor = () => {
    if (confidence >= 0.7) return 'text-success-500';
    if (confidence >= 0.4) return 'text-warning-500';
    return 'text-error-500';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r="18"
          strokeWidth="4"
          fill="none"
          className="stroke-muted"
        />
        <motion.circle
          cx="24"
          cy="24"
          r="18"
          strokeWidth="4"
          fill="none"
          className={cn('stroke-current', getColor())}
          strokeLinecap="round"
          initial={{ strokeDashoffset: strokeDasharray }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ strokeDasharray }}
        />
      </svg>
      <span className={cn('absolute text-xs font-semibold', getColor())}>
        {percentage}%
      </span>
    </div>
  );
}

export function BotQuery({ mode, targetId, targetName }: BotQueryProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  const handleQuery = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      let response;
      if (mode === 'personal') {
        response = await queryMyBot(question);
      } else if (mode === 'user' && targetId) {
        response = await queryUserBot(targetId, question);
      } else if (mode === 'team' && targetId) {
        response = await queryTeam(targetId, question);
      }
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to query');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSource = (id: number) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSources(newExpanded);
  };

  const getPlaceholder = () => {
    if (mode === 'personal') return 'Ask your bot anything... e.g., "Why did I use Redis?"';
    if (mode === 'user') return `Ask ${targetName}'s bot...`;
    return 'Ask the team... e.g., "Who decided on the database architecture?"';
  };

  const getTitle = () => {
    if (mode === 'personal') return 'Query Your Cognitive State';
    if (mode === 'user') return `Query ${targetName}'s Bot`;
    return 'Query Team Knowledge';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <Search className="h-4 w-4 text-primary-600" />
          </div>
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input - Glass morphism style */}
        <div className="relative group">
          <div
            className={cn(
              'absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 blur transition duration-300',
              'group-focus-within:opacity-20'
            )}
          />
          <div className="relative flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              placeholder={getPlaceholder()}
              className={cn(
                'flex-1 h-12 px-4 bg-background/50 backdrop-blur-sm',
                'border-muted-foreground/20 focus:border-primary-500',
                'transition-all duration-200'
              )}
            />
            <Button
              onClick={handleQuery}
              disabled={isLoading || !question.trim()}
              className="h-12 px-6 btn-press"
            >
              {isLoading ? (
                <ThinkingDots />
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-lg bg-error-50 text-error-700 border border-error-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="p-6 rounded-lg bg-muted/50 shimmer">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </div>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <SourceCardSkeleton key={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && !isLoading && (
            <motion.div
              variants={staggerContainerVariants}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              {/* Answer */}
              <motion.div variants={fadeInVariants}>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {result.latency_ms}ms
                  </div>
                  {result.contributors && result.contributors.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {result.contributors.join(', ')}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div
                    className={cn(
                      'p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30',
                      'border border-border/50'
                    )}
                  >
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {result.synthesis || result.answer}
                    </p>
                  </div>
                  <div className="absolute -top-3 -right-3">
                    <ConfidenceRing confidence={result.confidence} />
                  </div>
                </div>
              </motion.div>

              {/* Sources */}
              {result.sources && result.sources.length > 0 && (
                <motion.div variants={fadeInVariants}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Sources ({result.sources.length})
                    </span>
                  </div>
                  <motion.div
                    variants={staggerContainerVariants}
                    className="space-y-2"
                  >
                    {result.sources.map((source) => (
                      <motion.div
                        key={source.id}
                        variants={staggerItemVariants}
                        className={cn(
                          'border rounded-xl overflow-hidden transition-all duration-200',
                          'hover:shadow-md hover:border-primary-200',
                          expandedSources.has(source.id) && 'border-primary-200 shadow-sm'
                        )}
                      >
                        <button
                          onClick={() => toggleSource(source.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge
                              variant={
                                source.confidence >= 0.7
                                  ? 'default'
                                  : source.confidence >= 0.4
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className={cn(
                                'shrink-0',
                                source.confidence >= 0.7 &&
                                  'bg-success-100 text-success-700 hover:bg-success-100',
                                source.confidence >= 0.4 &&
                                  source.confidence < 0.7 &&
                                  'bg-warning-100 text-warning-700 hover:bg-warning-100'
                              )}
                            >
                              {formatConfidence(source.confidence)}
                            </Badge>
                            <span className="font-medium truncate">
                              {source.title}
                            </span>
                            {source.owner_name && (
                              <span className="text-sm text-muted-foreground shrink-0">
                                by {source.owner_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground shrink-0 ml-2">
                            <span className="text-sm">
                              {formatRelativeTime(source.date)}
                            </span>
                            {expandedSources.has(source.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>
                        <AnimatePresence>
                          {expandedSources.has(source.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
                                <div className="pt-4 space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">{source.domain}</Badge>
                                    {source.timestamp_start !== undefined && (
                                      <Badge variant="outline" className="font-mono">
                                        {formatTimestamp(source.timestamp_start)}
                                      </Badge>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground block mb-1.5">
                                      Reasoning
                                    </span>
                                    <p className="text-sm text-foreground/80 leading-relaxed">
                                      {source.reasoning}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !error && !isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-muted-foreground mb-2">
              Ask a question to search your cognitive state
            </p>
            <p className="text-sm text-muted-foreground/70">
              Examples: "Why did I choose Postgres?" • "What's my caching strategy?"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
