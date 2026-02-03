'use client';

import { motion } from 'framer-motion';

interface ConsensusBadgeProps {
  consensusReached: boolean | null;
  messageCount?: number;
}

export function ConsensusBadge({ consensusReached, messageCount = 0 }: ConsensusBadgeProps) {
  // Calculate a "consensus score" based on message count and consensus status
  // This is a simple heuristic - could be replaced with actual backend calculation
  const getConsensusDisplay = () => {
    if (consensusReached === true) {
      return { value: '100%', color: '#a8d5ba', label: 'Consensus Reached' };
    }
    if (consensusReached === false) {
      return { value: '50%', color: '#f5d0c5', label: 'No Consensus' };
    }
    // In progress - show based on message count
    const progress = Math.min(90, 40 + messageCount * 5);
    return { value: `${progress}%`, color: '#c4b5e0', label: 'Building...' };
  };

  const display = getConsensusDisplay();

  return (
    <motion.div
      className="absolute bottom-[5%] right-[5%] z-20"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      <div className="bg-white px-5 py-4 rounded-2xl shadow-lg text-center min-w-[120px]">
        <p className="text-[11px] font-semibold text-[#8a8498] uppercase tracking-wider mb-1">
          Consensus
        </p>
        <p
          className="text-3xl font-extrabold"
          style={{ color: display.color }}
        >
          {display.value}
        </p>
        <p className="text-[10px] text-[#8a8498] mt-1">
          {display.label}
        </p>
      </div>
    </motion.div>
  );
}
