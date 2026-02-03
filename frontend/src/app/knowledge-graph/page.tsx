'use client';

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Users,
  CircleDot,
  Mic,
} from 'lucide-react';
import {
  GameShell,
  PageTransition,
  ClusterBubble,
  ClusterDetailPanel,
  SearchFilterPanel,
} from '@/components/game';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

// --- Skeleton ---

function ClustersSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Skeleton className="h-8 w-56 mx-auto mb-4" />
        <Skeleton className="h-4 w-80 mx-auto" />
        <div className="mt-8 flex gap-4 justify-center">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-24 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Cluster positions around center ---
const CLUSTER_POSITIONS = [
  { top: '15%', left: '45%' },   // top center
  { top: '25%', left: '70%' },   // top right
  { top: '50%', left: '80%' },   // right
  { top: '75%', left: '65%' },   // bottom right
  { top: '80%', left: '40%' },   // bottom center
  { top: '70%', left: '15%' },   // bottom left
  { top: '45%', left: '10%' },   // left
  { top: '20%', left: '20%' },   // top left
];

// --- Empty State ---

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
    >
      <div className="w-20 h-20 rounded-2xl bg-lavender-light/50 flex items-center justify-center mb-6">
        <CircleDot className="h-10 w-10 text-lavender-dark/50" />
      </div>
      <h2 className="text-xl font-heading font-semibold text-game-text-dark mb-2">
        No decisions captured yet
      </h2>
      <p className="text-game-text-light max-w-md mb-6">
        Record a coding session to start capturing decisions. They&apos;ll appear here as
        interactive bubble clusters grouped by domain.
      </p>
      <Button
        asChild
        className="bg-gradient-to-r from-lavender to-cosmic-purple hover:from-lavender-dark hover:to-cosmic-purple text-white border-0"
      >
        <a href="/?tab=record">
          <Mic className="h-4 w-4 mr-2" />
          Record a Session
        </a>
      </Button>
    </motion.div>
  );
}

// --- Main Content ---

function KnowledgeClustersContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Panel states
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<{ domain: string; decisions: Decision[] } | null>(null);

  // Team mode state
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Close any open panel
  const closePanel = () => {
    setActivePanel(null);
    setSelectedCluster(null);
  };

  // Handle escape key to close panels
  const handleEscapePress = useCallback(() => {
    if (activePanel) {
      closePanel();
    }
  }, [activePanel]);

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

    if (selectedDomains.length > 0) {
      result = result.filter((d) => selectedDomains.includes(d.domain));
    }
    if (selectedStatuses.length > 0) {
      result = result.filter((d) => selectedStatuses.includes(d.status));
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.domain.toLowerCase().includes(query)
      );
    }

    return result;
  }, [decisions, selectedDomains, selectedStatuses, searchQuery]);

  // Group by domain
  const clusteredDecisions = useMemo(() => {
    const groups: Record<string, Decision[]> = {};
    filteredDecisions.forEach((d) => {
      const domain = d.domain || 'Uncategorized';
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(d);
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8); // Max 8 clusters for visual layout
  }, [filteredDecisions]);

  // Available statuses
  const availableStatuses = useMemo(() => {
    return [...new Set(decisions.map((d) => d.status))];
  }, [decisions]);

  // Handlers
  const handleDomainToggle = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleClusterClick = (domain: string, clusterDecisions: Decision[]) => {
    setSelectedCluster({ domain, decisions: clusterDecisions });
    setActivePanel('cluster');
  };

  if (isLoading) {
    return <ClustersSkeleton />;
  }

  return (
    <GameShell
      backgroundImage="/game-assets/observatory-background.png"
      onEscapePress={handleEscapePress}
    >
      {/* View Mode Toggle */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-game-card z-20">
        <button
          onClick={() => setViewMode('personal')}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${viewMode === 'personal'
              ? 'bg-lavender text-white shadow-sm'
              : 'text-game-text-light hover:bg-lavender-light'
            }
          `}
        >
          <User className="h-3.5 w-3.5" />
          Personal
        </button>
        <button
          onClick={() => setViewMode('team')}
          disabled={teams.length === 0}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${viewMode === 'team'
              ? 'bg-lavender text-white shadow-sm'
              : 'text-game-text-light hover:bg-lavender-light'
            }
            ${teams.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Users className="h-3.5 w-3.5" />
          Team
        </button>

        {viewMode === 'team' && teams.length > 0 && (
          <select
            value={selectedTeamId || ''}
            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            className="ml-2 px-2 py-1.5 rounded-lg border-lavender-light bg-white text-sm text-game-text-dark"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Home Page Preview - Navigate back */}
      <PageTransition
        previewImage="/game-assets/room-background.png"
        targetPath="/"
        position={{ top: '4%', right: '4%' }}
        size={140}
        label="Back to Home"
      />

      {/* Teams Preview - Navigate to teams */}
      <PageTransition
        previewImage="/asset-environment-1770090935004.png"
        targetPath="/team"
        position={{ bottom: '4%', right: '4%' }}
        size={140}
        label="Teams"
      />

      {/* Cluster Bubbles */}
      {decisions.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatePresence>
          {clusteredDecisions.map(([domain, domainDecisions], index) => {
            const avgConfidence =
              domainDecisions.reduce((sum, d) => sum + d.confidence, 0) / domainDecisions.length;
            const position = CLUSTER_POSITIONS[index % CLUSTER_POSITIONS.length];

            return (
              <motion.div
                key={domain}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  delay: index * 0.1,
                }}
              >
                <ClusterBubble
                  domain={domain}
                  count={domainDecisions.length}
                  confidence={avgConfidence}
                  position={position}
                  color=""
                  onClick={() => handleClusterClick(domain, domainDecisions)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {/* Search/Filter Panel */}
      <SearchFilterPanel
        isOpen={activePanel === 'filter'}
        onClose={closePanel}
        domains={domains}
        selectedDomains={selectedDomains}
        onDomainToggle={handleDomainToggle}
        statuses={availableStatuses}
        selectedStatuses={selectedStatuses}
        onStatusToggle={handleStatusToggle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Cluster Detail Panel */}
      {selectedCluster && (
        <ClusterDetailPanel
          isOpen={activePanel === 'cluster'}
          onClose={closePanel}
          domain={selectedCluster.domain}
          decisions={selectedCluster.decisions.map((d) => ({
            id: d.id,
            title: d.title,
            decision: d.decision_text || d.reasoning || '',
            confidence: d.confidence,
            date: d.created_at,
            status: d.status,
          }))}
        />
      )}
    </GameShell>
  );
}

// --- Page ---

export default function KnowledgeGraphPage() {
  return (
    <Suspense fallback={<ClustersSkeleton />}>
      <KnowledgeClustersContent />
    </Suspense>
  );
}
