'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Laptop, Users, Scroll } from 'lucide-react';
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

  // Unread decisions count (increments when processing completes)
  const [unreadCount, setUnreadCount] = useState(0);

  // Session processing hook
  const { status: processingStatus, startTracking } = useSessionProcessing();

  // Track when processing completes to show unread badge
  useEffect(() => {
    if (processingStatus === 'completed') {
      setUnreadCount(prev => prev + 1);
    }
  }, [processingStatus]);

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
            <Scroll className="w-5 h-5 text-[#9b7ed4]" />
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

      {/* Bot Processing Bubble - Shows while processing */}
      {(processingStatus === 'pending' || processingStatus === 'processing') && (
        <div
          className="absolute z-30 animate-in slide-in-from-left-4 fade-in duration-500"
          style={{ bottom: '42%', left: '14%' }}
        >
          <div className="relative bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl px-5 py-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm text-white">
                  {processingStatus === 'pending' ? 'Starting...' : 'Processing...'}
                </p>
                <p className="text-xs text-white/80">Extracting decisions from your content</p>
              </div>
            </div>
            {/* Speech bubble tail */}
            <div
              className="absolute w-4 h-4 bg-blue-400 transform rotate-45"
              style={{ bottom: '-8px', left: '24px' }}
            />
          </div>
        </div>
      )}

      {/* Bot Notification Bubble - New Decisions Alert */}
      {unreadCount > 0 && processingStatus !== 'pending' && processingStatus !== 'processing' && (
        <div
          className="absolute z-30 cursor-pointer animate-in slide-in-from-left-4 fade-in duration-500"
          style={{ bottom: '42%', left: '14%' }}
          onClick={() => {
            setActivePanel('decisions');
            setUnreadCount(0);
          }}
        >
          <div className="relative bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl px-5 py-3 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-white font-bold">{unreadCount}</span>
              </div>
              <div>
                <p className="font-heading font-semibold text-sm text-white">
                  New Decision{unreadCount > 1 ? 's' : ''} Ready!
                </p>
                <p className="text-xs text-white/80">Click to view extracted insights</p>
              </div>
            </div>
            {/* Speech bubble tail */}
            <div
              className="absolute w-4 h-4 bg-green-400 transform rotate-45"
              style={{ bottom: '-8px', left: '24px' }}
            />
          </div>
        </div>
      )}

      {/* Knowledge Graph Preview - Animated transition to knowledge graph page */}
      <PageTransition
        previewImage="/game-assets/observatory-background.png"
        targetPath="/knowledge-graph"
        position={{ top: '4%', right: '4%' }}
        size={140}
        label="Knowledge Graph"
      />

      {/* Teams Preview - Navigate to teams page */}
      <PageTransition
        previewImage="/asset-environment-1770090935004.png"
        targetPath="/team"
        position={{ bottom: '4%', right: '4%' }}
        size={140}
        label="Teams"
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
