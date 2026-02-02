'use client';

import { useState } from 'react';

interface ClusterBubbleProps {
  domain: string;
  count: number;
  confidence: number;
  position: { top: string; left: string };
  color: string;
  onClick: () => void;
}

// Domain color mapping
const DOMAIN_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  backend: { bg: 'from-mint to-mint-light', text: 'text-green-700', glow: 'shadow-[0_0_30px_rgba(168,213,186,0.6)]' },
  frontend: { bg: 'from-lavender to-lavender-light', text: 'text-purple-700', glow: 'shadow-[0_0_30px_rgba(196,181,224,0.6)]' },
  database: { bg: 'from-soft-blue to-blue-200', text: 'text-blue-700', glow: 'shadow-[0_0_30px_rgba(184,212,232,0.6)]' },
  security: { bg: 'from-peach to-orange-200', text: 'text-orange-700', glow: 'shadow-[0_0_30px_rgba(245,208,197,0.6)]' },
  devops: { bg: 'from-soft-yellow to-yellow-200', text: 'text-amber-700', glow: 'shadow-[0_0_30px_rgba(245,230,184,0.6)]' },
  api: { bg: 'from-sky-300 to-sky-200', text: 'text-sky-700', glow: 'shadow-[0_0_30px_rgba(135,206,235,0.6)]' },
  architecture: { bg: 'from-cosmic-pink to-pink-200', text: 'text-pink-700', glow: 'shadow-[0_0_30px_rgba(228,145,179,0.6)]' },
  testing: { bg: 'from-teal-300 to-teal-200', text: 'text-teal-700', glow: 'shadow-[0_0_30px_rgba(152,216,200,0.6)]' },
};

export default function ClusterBubble({
  domain,
  count,
  confidence,
  position,
  color,
  onClick
}: ClusterBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Determine size based on count
  const getSize = () => {
    if (count >= 15) return { size: 'w-36 h-36', text: 'text-xl' };
    if (count >= 7) return { size: 'w-28 h-28', text: 'text-lg' };
    return { size: 'w-20 h-20', text: 'text-base' };
  };

  const { size, text } = getSize();
  const domainKey = domain.toLowerCase().replace(/\s+/g, '');
  const colors = DOMAIN_COLORS[domainKey] || DOMAIN_COLORS.backend;

  return (
    <button
      className={`
        cluster-bubble ${size}
        bg-gradient-to-br ${colors.bg}
        ${isHovered ? colors.glow : 'shadow-game-card'}
        transition-all duration-300
      `}
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Inner content */}
      <div className="flex flex-col items-center justify-center">
        <span className={`font-heading font-bold ${text} ${colors.text}`}>
          {count}
        </span>
        <span className="text-xs text-game-text-dark/80 font-medium capitalize mt-0.5">
          {domain}
        </span>
      </div>

      {/* Confidence ring (outer) */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          strokeWidth="4"
          className="stroke-white/30"
        />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={colors.text.replace('text-', 'stroke-')}
          strokeDasharray={`${confidence * 289} 289`}
          style={{
            transition: 'stroke-dasharray 0.5s ease-out',
          }}
        />
      </svg>

      {/* Hover tooltip */}
      <div
        className={`
          absolute -top-16 left-1/2 -translate-x-1/2
          bg-white rounded-xl shadow-game-panel px-4 py-2
          transition-all duration-200 whitespace-nowrap z-10
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
        `}
      >
        <p className="font-heading font-semibold text-sm text-game-text-dark capitalize">
          {domain}
        </p>
        <p className="text-xs text-game-text-light">
          {count} decisions • {Math.round(confidence * 100)}% confidence
        </p>
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
    </button>
  );
}
