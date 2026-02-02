'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Laptop, Users } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { getBotStats } from '@/lib/api';
import {
  GameShell,
  Hotspot,
  BotMascot,
  PageTransition,
  QueryPanel,
  WorkspacePanel,
  DecisionsPanel,
  TeamsPanel,
} from '@/components/game';
import { DashboardSkeleton } from '@/components/skeletons';
import { useSessionProcessing } from '@/hooks/useSessionProcessing';

// Hotspot configurations based on the room background
const HOTSPOTS = {
  bookshelf: {
    position: { top: '18%', left: '48%', width: '18%', height: '32%' },
    title: 'Workspace',
    description: 'Upload documents, record audio, or add videos',
  },
  chair: {
    position: { top: '48%', left: '60%', width: '20%', height: '28%' },
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
        position={{ bottom: '2%', left: '-3%' }}
        size={350}
        label="Ask Query Bot"
        onClick={() => setActivePanel('query')}
      />

      {/* Bookshelf Hotspot - Workspace Panel */}
      <Hotspot
        position={HOTSPOTS.bookshelf.position}
        icon={<Laptop className="w-4 h-4" />}
        title={HOTSPOTS.bookshelf.title}
        description={HOTSPOTS.bookshelf.description}
        onClick={() => setActivePanel('workspace')}
      />

      {/* Bot Speech Bubble - Recent Decisions */}
      <div
        className="absolute z-20 cursor-pointer"
        style={{ bottom: '28%', left: '18%' }}
        onClick={() => setActivePanel('decisions')}
      >
        <div className="relative bg-white rounded-2xl px-5 py-3 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3">
            <span className="text-xl">📜</span>
            <div>
              <p className="font-heading font-semibold text-sm text-game-text-dark">Recent Decisions</p>
              <p className="text-xs text-game-text-light">View your latest captured decisions</p>
            </div>
          </div>
          {/* Speech bubble tail */}
          <div
            className="absolute w-4 h-4 bg-white transform rotate-45"
            style={{ bottom: '-8px', left: '20px' }}
          />
        </div>
      </div>

      {/* Knowledge Graph Preview - Animated transition to knowledge graph page */}
      <PageTransition
        previewImage="/game-assets/observatory-background.png"
        targetPath="/knowledge-graph"
        position={{ top: '4%', right: '4%' }}
        size={140}
        label="Knowledge Graph"
      />

      {/* Chair Hotspot - Teams Panel */}
      <Hotspot
        position={HOTSPOTS.chair.position}
        icon={<Users className="w-4 h-4" />}
        title={HOTSPOTS.chair.title}
        description={HOTSPOTS.chair.description}
        onClick={() => setActivePanel('teams')}
      />


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
