'use client';

import type { ReactNode } from 'react';

interface TeamHotspotProps {
  icon: ReactNode;
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
      {/* Subtle button that blends with background */}
      <div
        className="absolute top-1/2 left-1/2 w-12 h-12 bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-xl shadow-md border border-white/50 transition-all duration-200 group-hover:bg-white/70 group-hover:shadow-lg"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        {icon}
        {/* Badge on icon */}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#9b7ed4] text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">
            {badge}
          </span>
        )}
      </div>

      {/* Tooltip on hover */}
      <div
        className="absolute bottom-full left-1/2 mb-8 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none"
        style={{ transform: 'translateX(-50%)' }}
      >
        <div className="bg-[#5a5470] px-4 py-2 rounded-xl shadow-lg whitespace-nowrap">
          <h4 className="text-sm font-bold text-white">{title}</h4>
          <p className="text-xs text-white/70">{description}</p>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#5a5470]" />
      </div>
    </div>
  );
}
