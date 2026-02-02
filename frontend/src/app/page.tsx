'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Laptop, Image as ImageIcon, Users, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { getBotStats } from '@/lib/api';
import {
  GameShell,
  Hotspot,
  BotMascot,
  QueryPanel,
  WorkspacePanel,
  DecisionsPanel,
  TeamsPanel,
} from '@/components/game';
import { DashboardSkeleton } from '@/components/skeletons';
import { useSessionProcessing } from '@/hooks/useSessionProcessing';

// Hotspot configurations based on the room background
const HOTSPOTS = {
  desk: {
    position: { top: '45%', left: '25%', width: '18%', height: '25%' },
    title: 'Workspace',
    description: 'Upload documents, record audio, or add videos',
  },
  picture: {
    position: { top: '15%', left: '55%', width: '15%', height: '20%' },
    title: 'Recent Decisions',
    description: 'View your latest captured decisions',
  },
  bookshelf: {
    position: { top: '25%', left: '75%', width: '12%', height: '35%' },
    title: 'Knowledge Graph',
    description: 'Explore your decision clusters',
  },
  chair: {
    position: { top: '60%', left: '70%', width: '15%', height: '25%' },
    title: 'Your Teams',
    description: 'Manage teams and collaborations',
  },
};

function HomeContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Panel states
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // Session processing hook
  const { startTracking } = useSessionProcessing();

  // Handle session created callback
  const handleSessionCreated = useCallback((session: any) => {
    console.log('Session created:', session);
    startTracking(session.id);
  }, [startTracking]);

  // Close any open panel
  const closePanel = () => setActivePanel(null);

  // Handle escape key to close panels
  const handleEscapePress = useCallback(() => {
    if (activePanel) {
      closePanel();
    }
  }, [activePanel]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      setIsAuthenticated(false);
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);

    const loadData = async () => {
      try {
        const statsData = await getBotStats();
        setStats(statsData);
      } catch (err) {
        console.error('Dashboard: Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (isAuthenticated === null || isLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <GameShell
      backgroundImage="/game-assets/room-background.png"
      onEscapePress={handleEscapePress}
    >
      {/* Bot Mascot - Opens Query Panel */}
      <BotMascot
        position={{ bottom: '5%', left: '5%' }}
        size={160}
        label="Ask Query Bot"
        onClick={() => setActivePanel('query')}
      />

      {/* Desk Hotspot - Workspace Panel */}
      <Hotspot
        position={HOTSPOTS.desk.position}
        icon={<Laptop className="w-4 h-4" />}
        title={HOTSPOTS.desk.title}
        description={HOTSPOTS.desk.description}
        onClick={() => setActivePanel('workspace')}
      />

      {/* Picture Hotspot - Recent Decisions Panel */}
      <Hotspot
        position={HOTSPOTS.picture.position}
        icon={<ImageIcon className="w-4 h-4" />}
        title={HOTSPOTS.picture.title}
        description={HOTSPOTS.picture.description}
        onClick={() => setActivePanel('decisions')}
      />

      {/* Bookshelf Hotspot - Navigate to Knowledge Graph */}
      <Hotspot
        position={HOTSPOTS.bookshelf.position}
        icon={<BookOpen className="w-4 h-4" />}
        title={HOTSPOTS.bookshelf.title}
        description={HOTSPOTS.bookshelf.description}
        onClick={() => router.push('/knowledge-graph')}
      />

      {/* Chair Hotspot - Teams Panel */}
      <Hotspot
        position={HOTSPOTS.chair.position}
        icon={<Users className="w-4 h-4" />}
        title={HOTSPOTS.chair.title}
        description={HOTSPOTS.chair.description}
        onClick={() => setActivePanel('teams')}
      />

      {/* Mini Stats Display */}
      {stats && (
        <div className="absolute top-4 right-4 flex gap-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-game-card">
            <span className="text-xs text-game-text-light">Decisions</span>
            <p className="text-lg font-semibold text-game-text-dark">{stats.total_decisions}</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-game-card">
            <span className="text-xs text-game-text-light">Confidence</span>
            <p className="text-lg font-semibold text-cosmic-purple">{Math.round(stats.avg_confidence * 100)}%</p>
          </div>
        </div>
      )}

      {/* Floating Panels */}
      <QueryPanel
        isOpen={activePanel === 'query'}
        onClose={closePanel}
      />

      <WorkspacePanel
        isOpen={activePanel === 'workspace'}
        onClose={closePanel}
        onSessionCreated={handleSessionCreated}
      />

      <DecisionsPanel
        isOpen={activePanel === 'decisions'}
        onClose={closePanel}
      />

      <TeamsPanel
        isOpen={activePanel === 'teams'}
        onClose={closePanel}
      />
    </GameShell>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
