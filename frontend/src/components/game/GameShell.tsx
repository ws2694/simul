'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import GameHeader from './GameHeader';

interface GameShellProps {
  children: ReactNode;
  backgroundImage: string;
  onEscapePress?: () => void;
}

export default function GameShell({
  children,
  backgroundImage,
  onEscapePress
}: GameShellProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && onEscapePress) {
      onEscapePress();
    }
  }, [onEscapePress]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <GameHeader />

      <main className="flex-1 relative flex items-center justify-center">
        {/* Background Image */}
        <div
          className="relative bg-contain bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            width: '95vw',
            height: 'calc(100vh - 64px)',
            maxWidth: '1600px',
          }}
        >
          {/* Interactive Layer */}
          {children}
        </div>
      </main>
    </div>
  );
}
