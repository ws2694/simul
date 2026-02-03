'use client';

import { motion } from 'framer-motion';

interface StatsBarProps {
  meetingsCount: number;
  decisionsCount: number;
  consensusRate?: number;
}

export function StatsBar({ meetingsCount, decisionsCount, consensusRate }: StatsBarProps) {
  return (
    <motion.div
      className="absolute bottom-[5%] left-1/2 -translate-x-1/2 z-20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="flex gap-4 px-6 py-4 bg-white rounded-2xl shadow-lg">
        <div className="text-center px-4 border-r border-gray-100">
          <div className="text-2xl font-extrabold text-[#9b7ed4]">{meetingsCount}</div>
          <div className="text-[11px] text-[#8a8498] uppercase tracking-wide">Meetings</div>
        </div>
        <div className="text-center px-4 border-r border-gray-100">
          <div className="text-2xl font-extrabold text-[#4a8a5a]">{decisionsCount}</div>
          <div className="text-[11px] text-[#8a8498] uppercase tracking-wide">Decisions</div>
        </div>
        {consensusRate !== undefined && (
          <div className="text-center px-4">
            <div className="text-2xl font-extrabold text-[#5a9bd4]">{consensusRate}%</div>
            <div className="text-[11px] text-[#8a8498] uppercase tracking-wide">Consensus</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
