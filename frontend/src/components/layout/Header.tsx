'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onOpenCommandPalette: () => void;
  user?: { full_name: string; email: string } | null;
  onLogout: () => void;
}

export function Header({
  sidebarCollapsed,
  onOpenCommandPalette,
  user,
  onLogout,
}: HeaderProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  return (
    <motion.header
      initial={false}
      animate={{
        marginLeft: sidebarCollapsed ? 80 : 256,
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 right-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-md',
        'flex items-center justify-between px-6'
      )}
      style={{ left: 0 }}
    >
      {/* Search Bar / Command Palette Trigger */}
      <div className="flex-1 max-w-xl">
        <Button
          variant="outline"
          onClick={onOpenCommandPalette}
          className={cn(
            'w-full justify-start text-muted-foreground font-normal h-10 rounded-lg',
            'bg-muted/50 border-transparent hover:bg-muted hover:border-primary-200'
          )}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Search decisions, sessions...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            {isMac ? (
              <>
                <Command className="h-3 w-3" />K
              </>
            ) : (
              'Ctrl+K'
            )}
          </kbd>
        </Button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4 ml-4">
        <UserMenu user={user} onLogout={onLogout} />
      </div>
    </motion.header>
  );
}
