'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface PageTransitionProps {
  previewImage: string;
  targetPath: string;
  position: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  size?: number;
  label?: string;
}

export default function PageTransition({
  previewImage,
  targetPath,
  position,
  size = 120,
  label = 'Knowledge Graph',
}: PageTransitionProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    router.push(targetPath);
  };

  return (
    <div
      className="absolute cursor-pointer z-20"
      style={{
        top: position.top,
        right: position.right,
        bottom: position.bottom,
        left: position.left,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div
        className={`
          relative overflow-hidden transition-transform duration-300
          ${isHovered ? 'scale-110' : 'scale-100'}
        `}
      >
        <Image
          src={previewImage}
          alt={label}
          width={size}
          height={size}
          className="object-cover"
          style={{ filter: 'none' }}
          priority
        />
      </div>

      {/* Hover label */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-game-panel px-4 py-2 whitespace-nowrap
          transition-all duration-200
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
        `}
        style={{ top: `calc(100% + 12px)` }}
      >
        <span className="font-heading font-semibold text-sm text-cosmic-purple">
          {label}
        </span>
        <div
          className="absolute w-3 h-3 bg-white transform rotate-45"
          style={{
            top: '-6px',
            left: '50%',
            marginLeft: '-6px',
          }}
        />
      </div>
    </div>
  );
}
