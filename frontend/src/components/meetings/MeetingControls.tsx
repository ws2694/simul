'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface MeetingControlsProps {
  canRun: boolean;
  canEnd: boolean;
  isRunning: boolean;
  isEnding: boolean;
  isCompleted: boolean;
  onRunDiscussion: () => void;
  onEndMeeting: () => void;
  onViewDiscussion: () => void;
}

export function MeetingControls({
  canRun,
  canEnd,
  isRunning,
  isEnding,
  isCompleted,
  onRunDiscussion,
  onEndMeeting,
  onViewDiscussion,
}: MeetingControlsProps) {
  return (
    <motion.div
      className="absolute bottom-[5%] left-1/2 -translate-x-1/2 z-20"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="flex items-center gap-3 px-6 py-3.5 bg-white rounded-2xl shadow-lg">
        {/* View Discussion */}
        <ControlButton
          icon="💬"
          title="View Discussion"
          onClick={onViewDiscussion}
          variant="secondary"
        />

        {/* Topic/Add */}
        <ControlButton
          icon="📝"
          title="Topic"
          onClick={() => {}}
          variant="secondary"
          disabled
        />

        <div className="w-px h-8 bg-gray-200" />

        {/* Run Discussion */}
        {canRun && (
          <ControlButton
            icon={isRunning ? undefined : "▶️"}
            title={isRunning ? "Running..." : "Run Discussion"}
            onClick={onRunDiscussion}
            variant="primary"
            disabled={isRunning}
            isLoading={isRunning}
          />
        )}

        {/* Completed Badge */}
        {isCompleted && (
          <div className="px-4 py-2 bg-[#d4ede0] text-[#4a8a5a] rounded-full text-sm font-semibold">
            ✓ Completed
          </div>
        )}

        {/* Force Consensus */}
        <ControlButton
          icon="🤝"
          title="Consensus"
          onClick={() => {}}
          variant="secondary"
          disabled
        />

        <div className="w-px h-8 bg-gray-200" />

        {/* End Meeting */}
        <ControlButton
          icon={isEnding ? undefined : "⏹️"}
          title={isEnding ? "Ending..." : "End Meeting"}
          onClick={onEndMeeting}
          variant="danger"
          disabled={!canEnd || isEnding}
          isLoading={isEnding}
        />
      </div>
    </motion.div>
  );
}

interface ControlButtonProps {
  icon?: string;
  title: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  isLoading?: boolean;
}

function ControlButton({ icon, title, onClick, variant, disabled, isLoading }: ControlButtonProps) {
  const baseClasses = "w-12 h-12 rounded-full flex items-center justify-center text-xl cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "bg-gradient-to-br from-[#c4b5e0] to-[#9b7ed4] text-white shadow-md hover:scale-110",
    secondary: "bg-[#faf8f5] text-[#5a5470] hover:scale-110",
    danger: "bg-gradient-to-br from-[#e491b3] to-[#d06080] text-white shadow-md hover:scale-110",
  };

  return (
    <div className="relative group">
      <button
        className={`${baseClasses} ${variantClasses[variant]}`}
        onClick={onClick}
        disabled={disabled}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          icon
        )}
      </button>
      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#5a5470] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        {title}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#5a5470]" />
      </div>
    </div>
  );
}
