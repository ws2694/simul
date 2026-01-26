'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Brain,
  Mic,
  Users,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams?: Array<{ id: number; name: string }>;
  recentDecisions?: Array<{ id: number; title: string; domain: string }>;
}

export function CommandPalette({
  open,
  onOpenChange,
  teams = [],
  recentDecisions = [],
}: CommandPaletteProps) {
  const router = useRouter();

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search decisions, teams, or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/?tab=query'))}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Query Your Bot</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Ask questions
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/?tab=record'))}
          >
            <Mic className="mr-2 h-4 w-4" />
            <span>Record Session</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Capture decisions
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Recent Decisions */}
        {recentDecisions.length > 0 && (
          <>
            <CommandGroup heading="Recent Decisions">
              {recentDecisions.slice(0, 5).map((decision) => (
                <CommandItem
                  key={decision.id}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(`/decision/${decision.id}`)
                    )
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="truncate">{decision.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {decision.domain}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Teams */}
        {teams.length > 0 && (
          <CommandGroup heading="Teams">
            {teams.map((team) => (
              <CommandItem
                key={team.id}
                onSelect={() =>
                  runCommand(() => router.push(`/team/${team.id}`))
                }
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{team.name}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
            <Brain className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/settings'))}
          >
            <Clock className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
