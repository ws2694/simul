'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { useAuthStore } from '@/lib/store';
import { listTeams, getRecentReasoning } from '@/lib/api';
import { DashboardSkeleton } from '@/components/skeletons';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [teams, setTeams] = useState<Array<{ id: number; name: string; member_count: number }>>([]);
  const [recentDecisions, setRecentDecisions] = useState<Array<{ id: number; title: string; domain: string }>>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Auth check - runs first, before any API calls
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      console.log('AppShell: no token, redirecting to login');
      setIsAuthenticated(false);
      router.push('/login');
      return;
    }

    console.log('AppShell: token found, authenticated');
    setIsAuthenticated(true);
  }, [router]);

  // Load teams and recent decisions for command palette - only after auth confirmed
  useEffect(() => {
    if (isAuthenticated !== true) return;

    const loadData = async () => {
      try {
        console.log('AppShell: loading shell data...');
        const [teamsData, recentData] = await Promise.all([
          listTeams(),
          getRecentReasoning(7),
        ]);
        setTeams(teamsData);
        setRecentDecisions(recentData.decisions?.slice(0, 5) || []);
        console.log('AppShell: shell data loaded');
      } catch (err) {
        console.error('Failed to load shell data:', err);
      }
    };

    loadData();
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('auth-storage');
    router.push('/login');
  };

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect is happening)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        <Sidebar
          teams={teams}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          user={user}
          onLogout={handleLogout}
        />
        <motion.main
          initial={false}
          animate={{
            marginLeft: sidebarCollapsed ? 80 : 256,
            paddingTop: 64,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="min-h-screen"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.main>
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          teams={teams}
          recentDecisions={recentDecisions}
        />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
