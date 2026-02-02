'use client';

import { ReactNode, useState } from 'react';

interface HotspotPosition {
  top: string;
  left: string;
  width: string;
  height: string;
}

interface HotspotProps {
  position: HotspotPosition;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

export default function Hotspot({
  position,
  icon,
  title,
  description,
  onClick
}: HotspotProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="hotspot"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Invisible click area */}
      <div className="absolute inset-0" />

      {/* Indicator that appears on hover */}
      <div
        className={`
          hotspot-indicator
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Pulse ring */}
        <div className="hotspot-pulse" />
        {/* Icon */}
        <span className="relative z-10 text-cosmic-purple">
          {icon}
        </span>
      </div>

      {/* Tooltip */}
      <div
        className={`
          absolute z-20 bg-white rounded-xl shadow-game-panel px-4 py-3
          transform transition-all duration-200
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
        `}
        style={{
          bottom: 'calc(100% + 12px)',
          left: '50%',
          transform: `translateX(-50%) ${isHovered ? 'translateY(0)' : 'translateY(8px)'}`,
          minWidth: '160px',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lavender-dark">{icon}</span>
          <span className="font-heading font-semibold text-game-text-dark text-sm">
            {title}
          </span>
        </div>
        <p className="text-xs text-game-text-light">{description}</p>

        {/* Arrow */}
        <div
          className="absolute w-3 h-3 bg-white transform rotate-45"
          style={{
            bottom: '-6px',
            left: '50%',
            marginLeft: '-6px',
          }}
        />
      </div>
    </div>
  );
}
