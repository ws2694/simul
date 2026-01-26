'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  LayoutDashboard,
  Search,
  Mic,
  Users,
  GitBranch,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Query Bot',
    href: '/?tab=query',
    icon: Search,
  },
  {
    title: 'Record Session',
    href: '/?tab=record',
    icon: Mic,
  },
  {
    title: 'Knowledge Graph',
    href: '/knowledge-graph',
    icon: Network,
  },
];

interface SidebarProps {
  teams: Array<{ id: number; name: string; member_count: number }>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ teams, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [expandedTeams, setExpandedTeams] = useState(true);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card',
        'flex flex-col'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Brain className="h-5 w-5" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-semibold text-foreground whitespace-nowrap overflow-hidden"
              >
                CSP
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href ? isActive(item.href) : false;

            if (isCollapsed) {
              return (
                <Tooltip key={item.title} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href || '#'}
                      className={cn(
                        'flex h-10 w-full items-center justify-center rounded-lg transition-colors',
                        active
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.title}
                href={item.href || '#'}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-lg px-3 transition-colors',
                  active
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Teams Section */}
        {teams.length > 0 && (
          <>
            <Separator className="my-4 mx-3" />
            <div className="px-3">
              {!isCollapsed && (
                <button
                  onClick={() => setExpandedTeams(!expandedTeams)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Teams
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      expandedTeams && 'rotate-180'
                    )}
                  />
                </button>
              )}
              <AnimatePresence>
                {(expandedTeams || isCollapsed) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {teams.map((team) => {
                      const active = pathname === `/team/${team.id}`;

                      if (isCollapsed) {
                        return (
                          <Tooltip key={team.id} delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/team/${team.id}`}
                                className={cn(
                                  'flex h-10 w-full items-center justify-center rounded-lg transition-colors',
                                  active
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                              >
                                <span className="text-sm font-medium">
                                  {team.name.charAt(0).toUpperCase()}
                                </span>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {team.name}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return (
                        <Link
                          key={team.id}
                          href={`/team/${team.id}`}
                          className={cn(
                            'flex h-9 items-center gap-3 rounded-lg px-3 pl-8 transition-colors',
                            active
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <GitBranch className="h-4 w-4 shrink-0" />
                          <span className="truncate text-sm">{team.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {team.member_count}
                          </span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </ScrollArea>

      {/* Settings */}
      <div className="border-t border-border p-3">
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className="flex h-10 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/settings"
            className="flex h-10 items-center gap-3 rounded-lg px-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>Settings</span>
          </Link>
        )}
      </div>
    </motion.aside>
  );
}
