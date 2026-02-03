'use client';

import { motion } from 'framer-motion';

interface TeamHotspotProps {
  icon: string;
  title: string;
  description: string;
  badge?: number;
  position: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
    width: string;
    height: string;
  };
  onClick: () => void;
}

export function TeamHotspot({ icon, title, description, badge, position, onClick }: TeamHotspotProps) {
  return (
    <div
      className="absolute cursor-pointer z-10 group"
      style={position}
      onClick={onClick}
    >
      {/* Always visible icon button */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-[#e8e0f0]"
        whileHover={{ scale: 1.15 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        {icon}
        {/* Badge on icon */}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#9b7ed4] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </motion.div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-y-2 group-hover:translate-y-0">
        <div className="bg-[#5a5470] px-4 py-2 rounded-xl shadow-lg whitespace-nowrap">
          <h4 className="text-sm font-bold text-white">{title}</h4>
          <p className="text-xs text-white/70">{description}</p>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-[#5a5470]" />
      </div>
    </div>
  );
}
