'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  Tag,
  GitCommit,
  Clock,
  User,
  FileCode,
  GitPullRequest,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Share2,
} from 'lucide-react';
import { getDecision } from '@/lib/api';
import { GameShell } from '@/components/game';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime, cn } from '@/lib/utils';

// Decision status colors
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-mint-light text-mint-dark',
  implemented: 'bg-lavender-light text-lavender-dark',
  superseded: 'bg-soft-yellow text-amber-700',
  abandoned: 'bg-soft-pink text-rose-600',
};

// Confidence color based on value
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-mint-dark bg-mint-light';
  if (confidence >= 0.6) return 'text-lavender-dark bg-lavender-light';
  if (confidence >= 0.4) return 'text-amber-600 bg-soft-yellow';
  return 'text-rose-600 bg-soft-pink';
};

interface Decision {
  id: number;
  title: string;
  decision_text: string;
  reasoning: string;
  alternatives_considered: string[];
  confidence: number;
  domain: string;
  tags: string[];
  status: string;
  visibility: string;
  source_type: string;
  source_timestamp_start: number | null;
  source_timestamp_end: number | null;
  git_commits: string[];
  pr_numbers: number[];
  file_paths: string[];
  owner_id: number;
  session_id: number | null;
  created_at: string;
  updated_at: string;
}

function DecisionSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-light via-mint-light to-soft-blue flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-2xl w-full mx-4">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

function DecisionDetailContent() {
  const router = useRouter();
  const params = useParams();
  const decisionId = params?.id as string;

  const [decision, setDecision] = useState<Decision | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    const loadDecision = async () => {
      try {
        setIsLoading(true);
        const data = await getDecision(parseInt(decisionId));
        setDecision(data);
      } catch (err) {
        console.error('Failed to load decision:', err);
        setError('Decision not found');
      } finally {
        setIsLoading(false);
      }
    };

    if (decisionId) {
      loadDecision();
    }
  }, [decisionId, router]);

  if (isLoading) {
    return <DecisionSkeleton />;
  }

  if (error || !decision) {
    return (
      <GameShell backgroundImage="/game-assets/room-background.png">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md"
          >
            <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
            <h2 className="text-xl font-heading font-bold text-game-text-dark mb-2">
              Decision Not Found
            </h2>
            <p className="text-game-text-light mb-6">
              This decision may have been deleted or you don&apos;t have permission to view it.
            </p>
            <Button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-lavender to-cosmic-purple text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </motion.div>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell backgroundImage="/game-assets/room-background.png">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-game-card"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-cream z-10">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={cn('capitalize', STATUS_COLORS[decision.status] || STATUS_COLORS.draft)}>
                      {decision.status}
                    </Badge>
                    <Badge variant="outline" className="text-lavender-dark border-lavender">
                      {decision.domain}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-heading font-bold text-game-text-dark">
                    {decision.title}
                  </h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-game-text-light">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatRelativeTime(decision.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Brain className="w-4 h-4" />
                      {decision.source_type}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-bold',
                  getConfidenceColor(decision.confidence)
                )}>
                  <CheckCircle2 className="w-5 h-5" />
                  {Math.round(decision.confidence * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Decision Text */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-heading font-semibold text-game-text-dark mb-3">
                <Lightbulb className="w-5 h-5 text-cosmic-purple" />
                Decision
              </h2>
              <div className="bg-lavender-light/30 rounded-2xl p-4">
                <p className="text-game-text-dark leading-relaxed whitespace-pre-wrap">
                  {decision.decision_text || 'No decision text provided.'}
                </p>
              </div>
            </section>

            {/* Reasoning */}
            {decision.reasoning && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-heading font-semibold text-game-text-dark mb-3">
                  <Brain className="w-5 h-5 text-cosmic-purple" />
                  Reasoning
                </h2>
                <div className="bg-mint-light/30 rounded-2xl p-4">
                  <p className="text-game-text-dark leading-relaxed whitespace-pre-wrap">
                    {decision.reasoning}
                  </p>
                </div>
              </section>
            )}

            {/* Alternatives Considered */}
            {decision.alternatives_considered && decision.alternatives_considered.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-heading font-semibold text-game-text-dark mb-3">
                  <AlertCircle className="w-5 h-5 text-cosmic-purple" />
                  Alternatives Considered
                </h2>
                <div className="space-y-2">
                  {decision.alternatives_considered.map((alt, index) => (
                    <div
                      key={index}
                      className="bg-soft-yellow/30 rounded-xl p-3 flex items-start gap-2"
                    >
                      <span className="text-amber-600 font-semibold">{index + 1}.</span>
                      <p className="text-game-text-dark">{alt}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {decision.tags && decision.tags.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-heading font-semibold text-game-text-dark mb-3">
                  <Tag className="w-5 h-5 text-cosmic-purple" />
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {decision.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-cream text-game-text-dark"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Code Links */}
            {(decision.git_commits?.length > 0 || decision.pr_numbers?.length > 0 || decision.file_paths?.length > 0) && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-heading font-semibold text-game-text-dark mb-3">
                  <FileCode className="w-5 h-5 text-cosmic-purple" />
                  Code References
                </h2>
                <div className="space-y-3">
                  {decision.git_commits?.length > 0 && (
                    <div className="bg-cream rounded-xl p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-game-text-dark mb-2">
                        <GitCommit className="w-4 h-4" />
                        Commits
                      </div>
                      <div className="space-y-1">
                        {decision.git_commits.map((commit, index) => (
                          <code key={index} className="block text-xs text-lavender-dark bg-white rounded px-2 py-1">
                            {commit}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {decision.pr_numbers?.length > 0 && (
                    <div className="bg-cream rounded-xl p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-game-text-dark mb-2">
                        <GitPullRequest className="w-4 h-4" />
                        Pull Requests
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {decision.pr_numbers.map((pr, index) => (
                          <Badge key={index} variant="outline" className="text-cosmic-purple border-cosmic-purple">
                            PR #{pr}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {decision.file_paths?.length > 0 && (
                    <div className="bg-cream rounded-xl p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-game-text-dark mb-2">
                        <FileCode className="w-4 h-4" />
                        Files
                      </div>
                      <div className="space-y-1">
                        {decision.file_paths.map((file, index) => (
                          <code key={index} className="block text-xs text-game-text-light bg-white rounded px-2 py-1">
                            {file}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Metadata Footer */}
            <section className="pt-4 border-t border-cream">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-game-text-light">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Owner ID: {decision.owner_id}
                  </span>
                  {decision.session_id && (
                    <span>Session: {decision.session_id}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-game-text-light">
                    {decision.visibility}
                  </Badge>
                </div>
              </div>
            </section>
          </div>

          {/* Actions Footer */}
          <div className="sticky bottom-0 bg-white rounded-b-3xl border-t border-cream p-4">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-game-text-light hover:text-game-text-dark"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-lavender-dark border-lavender hover:bg-lavender-light"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-cosmic-purple border-cosmic-purple hover:bg-lavender-light"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </GameShell>
  );
}

export default function DecisionDetailPage() {
  return (
    <Suspense fallback={<DecisionSkeleton />}>
      <DecisionDetailContent />
    </Suspense>
  );
}
