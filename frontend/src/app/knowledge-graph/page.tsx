'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  Search,
  Filter,
  CircleDot,
  Mic,
  Tag,
  Calendar,
  Brain,
  Users,
  User,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { listDecisions, getDomains, listTeams, getTeamDecisions, type TeamDecision } from '@/lib/api';

// --- Types ---

interface Decision {
  id: number;
  title: string;
  domain: string;
  confidence: number;
  status: string;
  reasoning?: string;
  tags?: string[];
  created_at: string;
  decision_text?: string;
  context?: string;
  owner_name?: string;
}

// --- Constants ---

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-400/80 shadow-blue-400/30',
  IMPLEMENTED: 'bg-emerald-400/80 shadow-emerald-400/30',
  DRAFT: 'bg-slate-400/60 shadow-slate-400/20',
  SUPERSEDED: 'bg-amber-400/60 shadow-amber-400/20',
  ABANDONED: 'bg-red-400/40 shadow-red-400/20',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  IMPLEMENTED: 'Implemented',
  DRAFT: 'Draft',
  SUPERSEDED: 'Superseded',
  ABANDONED: 'Abandoned',
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700 border-blue-200',
  IMPLEMENTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  SUPERSEDED: 'bg-amber-100 text-amber-700 border-amber-200',
  ABANDONED: 'bg-red-100 text-red-700 border-red-200',
};

const DOMAIN_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Database: { bg: 'from-blue-50 to-blue-100/50', text: 'text-blue-700', accent: 'bg-blue-200' },
  Frontend: { bg: 'from-purple-50 to-purple-100/50', text: 'text-purple-700', accent: 'bg-purple-200' },
  Backend: { bg: 'from-emerald-50 to-emerald-100/50', text: 'text-emerald-700', accent: 'bg-emerald-200' },
  Security: { bg: 'from-red-50 to-red-100/50', text: 'text-red-700', accent: 'bg-red-200' },
  DevOps: { bg: 'from-orange-50 to-orange-100/50', text: 'text-orange-700', accent: 'bg-orange-200' },
  Architecture: { bg: 'from-indigo-50 to-indigo-100/50', text: 'text-indigo-700', accent: 'bg-indigo-200' },
  API: { bg: 'from-cyan-50 to-cyan-100/50', text: 'text-cyan-700', accent: 'bg-cyan-200' },
  Testing: { bg: 'from-teal-50 to-teal-100/50', text: 'text-teal-700', accent: 'bg-teal-200' },
  Infrastructure: { bg: 'from-yellow-50 to-yellow-100/50', text: 'text-yellow-700', accent: 'bg-yellow-200' },
  Performance: { bg: 'from-pink-50 to-pink-100/50', text: 'text-pink-700', accent: 'bg-pink-200' },
};

const DEFAULT_DOMAIN_COLOR = { bg: 'from-gray-50 to-gray-100/50', text: 'text-gray-700', accent: 'bg-gray-200' };

function getDomainColor(domain: string) {
  return DOMAIN_COLORS[domain] || DEFAULT_DOMAIN_COLOR;
}

function getBubbleSize(confidence: number): { className: string; label: string } {
  if (confidence >= 0.8) return { className: 'w-[4.5rem] h-[4.5rem]', label: 'large' };
  if (confidence >= 0.5) return { className: 'w-14 h-14', label: 'medium' };
  return { className: 'w-10 h-10', label: 'small' };
}

// --- Skeleton ---

function ClustersSkeleton() {
  return (
    <div className="flex-1 p-6">
      <div className="space-y-2 mb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// --- Decision Bubble ---

function DecisionBubble({
  decision,
  index,
  onClick,
  showOwner = false,
}: {
  decision: Decision;
  index: number;
  onClick: () => void;
  showOwner?: boolean;
}) {
  const size = getBubbleSize(decision.confidence);
  const statusColor = STATUS_COLORS[decision.status] || STATUS_COLORS.DRAFT;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            delay: index * 0.03,
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className={cn(
            'rounded-full flex items-center justify-center cursor-pointer',
            'text-white font-semibold shadow-lg transition-shadow',
            'hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50',
            size.className,
            statusColor
          )}
          aria-label={`${decision.title} - ${Math.round(decision.confidence * 100)}% confidence`}
        >
          <span className={cn(
            'select-none',
            size.label === 'large' ? 'text-sm' : size.label === 'medium' ? 'text-xs' : 'text-[10px]'
          )}>
            {Math.round(decision.confidence * 100)}%
          </span>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{decision.title}</p>
        <p className="text-xs opacity-80 mt-0.5">
          {Math.round(decision.confidence * 100)}% confidence &middot; {STATUS_LABELS[decision.status] || decision.status}
        </p>
        {showOwner && decision.owner_name && (
          <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
            <User className="h-3 w-3" />
            {decision.owner_name}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// --- Domain Cluster ---

function DomainCluster({
  domain,
  decisions,
  index,
  onBubbleClick,
  onDomainFilter,
  showOwner = false,
}: {
  domain: string;
  decisions: Decision[];
  index: number;
  onBubbleClick: (decision: Decision) => void;
  onDomainFilter: (domain: string) => void;
  showOwner?: boolean;
}) {
  const colors = getDomainColor(domain);
  const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;

  const topTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    decisions.forEach((d) => {
      d.tags?.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
  }, [decisions]);

  return (
    <motion.div
      layout
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 25,
        delay: index * 0.08,
      }}
      className={cn(
        'rounded-2xl border bg-gradient-to-br p-5 transition-shadow hover:shadow-md',
        colors.bg
      )}
    >
      {/* Cluster header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onDomainFilter(domain)}
          className="flex items-center gap-2 group"
        >
          <div className={cn('w-3 h-3 rounded-full', colors.accent)} />
          <h3 className={cn('font-semibold text-base group-hover:underline', colors.text)}>
            {domain}
          </h3>
        </button>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {decisions.length}
        </Badge>
      </div>

      {/* Bubbles */}
      <div className="flex flex-wrap gap-2.5 items-center min-h-[3.5rem]">
        {decisions.map((decision, i) => (
          <DecisionBubble
            key={decision.id}
            decision={decision}
            index={i}
            onClick={() => onBubbleClick(decision)}
            showOwner={showOwner}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
        <span className={cn('text-xs', colors.text)}>
          Avg confidence: {Math.round(avgConfidence * 100)}%
        </span>
        {topTags.length > 0 && (
          <div className="flex gap-1">
            {topTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Detail Panel ---

function DecisionDetailPanel({ decision, showOwner = false }: { decision: Decision; showOwner?: boolean }) {
  return (
    <div className="space-y-5">
      {/* Title & badges */}
      <div>
        <h3 className="font-semibold text-lg leading-snug">{decision.title}</h3>
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
              STATUS_BADGE_COLORS[decision.status] || STATUS_BADGE_COLORS.DRAFT
            )}
          >
            {STATUS_LABELS[decision.status] || decision.status}
          </span>
          <Badge variant="outline">{decision.domain}</Badge>
          {showOwner && decision.owner_name && (
            <Badge variant="secondary" className="gap-1">
              <User className="h-3 w-3" />
              {decision.owner_name}
            </Badge>
          )}
        </div>
      </div>

      {/* Confidence */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Confidence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${decision.confidence * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  decision.confidence >= 0.7 && 'bg-emerald-500',
                  decision.confidence >= 0.4 && decision.confidence < 0.7 && 'bg-amber-500',
                  decision.confidence < 0.4 && 'bg-red-500'
                )}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {Math.round(decision.confidence * 100)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Reasoning */}
      {decision.reasoning && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reasoning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {decision.reasoning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {decision.tags && decision.tags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {decision.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Created
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {new Date(decision.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Empty State ---

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
        <CircleDot className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No decisions captured yet</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Record a coding session to start capturing decisions. They&apos;ll appear here as
        interactive bubble clusters grouped by domain.
      </p>
      <Button asChild>
        <a href="/sessions">
          <Mic className="h-4 w-4 mr-2" />
          Record a Session
        </a>
      </Button>
    </motion.div>
  );
}

// --- Status Filter ---

const ALL_STATUSES = ['ACTIVE', 'IMPLEMENTED', 'DRAFT', 'SUPERSEDED', 'ABANDONED'];

// --- Main Content ---

function KnowledgeClustersContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [detailDecision, setDetailDecision] = useState<Decision | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Team mode state
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Load teams on mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teamsData = await listTeams();
        setTeams(teamsData);
        if (teamsData.length > 0) {
          setSelectedTeamId(teamsData[0].id);
        }
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    };
    loadTeams();
  }, []);

  // Load data based on view mode
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        if (viewMode === 'personal') {
          const [decisionsRes, domainsRes] = await Promise.all([
            listDecisions({ limit: 200 }),
            getDomains(),
          ]);

          const decisionList: Decision[] = Array.isArray(decisionsRes)
            ? decisionsRes
            : decisionsRes?.items ?? decisionsRes?.decisions ?? [];

          const domainList: string[] = Array.isArray(domainsRes)
            ? domainsRes
            : domainsRes?.domains ?? [];

          setDecisions(decisionList);
          setDomains(domainList);
        } else if (selectedTeamId) {
          const teamData = await getTeamDecisions(selectedTeamId, { limit: 200 });
          // Map team decisions to the Decision interface
          const decisionList: Decision[] = teamData.decisions.map((d: TeamDecision) => ({
            ...d,
            status: d.status,
          }));
          setDecisions(decisionList);
          setDomains(teamData.domains);
        }
      } catch (error) {
        toast.error('Failed to load decisions');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [viewMode, selectedTeamId]);

  // Filter decisions
  const filteredDecisions = useMemo(() => {
    let result = decisions;
    if (selectedDomain) {
      result = result.filter((d) => d.domain === selectedDomain);
    }
    if (selectedStatus) {
      result = result.filter((d) => d.status === selectedStatus);
    }
    return result;
  }, [decisions, selectedDomain, selectedStatus]);

  // Group by domain
  const clusteredDecisions = useMemo(() => {
    const groups: Record<string, Decision[]> = {};
    filteredDecisions.forEach((d) => {
      const domain = d.domain || 'Uncategorized';
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(d);
    });
    // Sort domains by decision count descending
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredDecisions]);

  // Stats
  const stats = useMemo(() => {
    if (decisions.length === 0) return { total: 0, domainCount: 0, avgConfidence: 0 };
    const avgConfidence =
      decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
    const uniqueDomains = new Set(decisions.map((d) => d.domain)).size;
    return { total: decisions.length, domainCount: uniqueDomains, avgConfidence };
  }, [decisions]);

  // Active statuses present in data
  const activeStatuses = useMemo(() => {
    const statuses = new Set(decisions.map((d) => d.status));
    return ALL_STATUSES.filter((s) => statuses.has(s));
  }, [decisions]);

  // Handlers
  const handleBubbleClick = (decision: Decision) => {
    setDetailDecision(decision);
    setDetailOpen(true);
  };

  const handleDomainFilter = (domain: string) => {
    setSelectedDomain((prev) => (prev === domain ? null : domain));
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus((prev) => (prev === status ? null : status));
  };

  if (isLoading) {
    return <ClustersSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-5 border-b bg-card/50 shrink-0"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Boxes className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Knowledge Clusters</h1>
                <p className="text-sm text-muted-foreground">
                  Decisions grouped by domain, sized by confidence
                </p>
              </div>
            </div>
          </div>

          {/* View mode toggle and stats */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg bg-muted p-1">
              <button
                onClick={() => setViewMode('personal')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'personal'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <User className="h-3.5 w-3.5" />
                Personal
              </button>
              <button
                onClick={() => setViewMode('team')}
                disabled={teams.length === 0}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'team'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                  teams.length === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Team
              </button>
            </div>

            {/* Team selector (when in team mode) */}
            {viewMode === 'team' && teams.length > 0 && (
              <select
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                className="px-3 py-1.5 rounded-md border bg-background text-sm"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}

            {/* Stats badges */}
            {stats.total > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="gap-1 tabular-nums">
                  {stats.total} decision{stats.total !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary" className="gap-1 tabular-nums">
                  {stats.domainCount} domain{stats.domainCount !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary" className="gap-1 tabular-nums">
                  {Math.round(stats.avgConfidence * 100)}% avg confidence
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        {stats.total > 0 && (
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            {/* Domain filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              <button
                onClick={() => setSelectedDomain(null)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  !selectedDomain
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                All
              </button>
              {domains.map((domain) => {
                const colors = getDomainColor(domain);
                const isActive = selectedDomain === domain;
                return (
                  <button
                    key={domain}
                    onClick={() => handleDomainFilter(domain)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                      isActive
                        ? cn(colors.accent, colors.text)
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {domain}
                  </button>
                );
              })}
            </div>

            {/* Status filter chips */}
            {activeStatuses.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Status:</span>
                <button
                  onClick={() => setSelectedStatus(null)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    !selectedStatus
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  All
                </button>
                {activeStatuses.map((status) => {
                  const isActive = selectedStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusFilter(status)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                        isActive
                          ? STATUS_BADGE_COLORS[status]
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {decisions.length === 0 ? (
          <EmptyState />
        ) : filteredDecisions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No decisions match the current filters.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSelectedDomain(null);
                setSelectedStatus(null);
              }}
            >
              Clear filters
            </Button>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {clusteredDecisions.map(([domain, domainDecisions], i) => (
                <DomainCluster
                  key={domain}
                  domain={domain}
                  decisions={domainDecisions}
                  index={i}
                  onBubbleClick={handleBubbleClick}
                  onDomainFilter={handleDomainFilter}
                  showOwner={viewMode === 'team'}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Legend */}
        {filteredDecisions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground flex-wrap"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-400/80" />
              Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
              Implemented
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-400/60" />
              Draft
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400/60" />
              Superseded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400/40" />
              Abandoned
            </span>
            <span className="text-muted-foreground/60">|</span>
            <span>Bubble size = confidence level</span>
          </motion.div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Decision Details</SheetTitle>
            <SheetDescription>
              Full information about this decision
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {detailDecision && <DecisionDetailPanel decision={detailDecision} showOwner={viewMode === 'team'} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// --- Page ---

export default function KnowledgeGraphPage() {
  return (
    <AppShell>
      <Suspense fallback={<ClustersSkeleton />}>
        <KnowledgeClustersContent />
      </Suspense>
    </AppShell>
  );
}
