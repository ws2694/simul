'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: ReactNode;
  iconBg: string;
  width?: string;
  maxHeight?: string;
  children: ReactNode;
}

export default function FloatingPanel({
  isOpen,
  onClose,
  title,
  icon,
  iconBg,
  width = '500px',
  maxHeight = '80vh',
  children
}: FloatingPanelProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="game-backdrop"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="floating-panel relative z-10 flex flex-col"
        style={{ width, maxHeight }}
      >
        {/* Header */}
        <div className="panel-header flex-shrink-0">
          <div
            className="panel-icon"
            style={{ backgroundColor: iconBg }}
          >
            {icon}
          </div>
          <h2 className="font-heading font-semibold text-lg text-game-text-dark flex-1">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-game-text-light hover:bg-lavender-light hover:text-game-text-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
