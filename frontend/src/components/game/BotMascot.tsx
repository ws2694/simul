'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BotMascotProps {
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  size?: number;
  label?: string;
  onClick: () => void;
}

export default function BotMascot({
  position,
  size = 220,
  label = 'Ask Query Bot',
  onClick
}: BotMascotProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="absolute cursor-pointer z-10"
      style={{
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        right: position.right,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Bot Image */}
      <div
        className={`
          transition-transform duration-300
          ${isHovered ? 'scale-110' : 'scale-100'}
        `}
      >
        <Image
          src="/game-assets/bot-mascot.png"
          alt="Query Bot"
          width={size}
          height={size}
          priority
        />
      </div>

      {/* Hover Label */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 -top-4
          bg-white rounded-xl shadow-game-panel px-4 py-2
          transition-all duration-200
          ${isHovered ? 'opacity-100 -translate-y-2' : 'opacity-0 translate-y-0 pointer-events-none'}
        `}
      >
        <span className="font-heading font-semibold text-sm text-cosmic-purple whitespace-nowrap">
          {label}
        </span>
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
