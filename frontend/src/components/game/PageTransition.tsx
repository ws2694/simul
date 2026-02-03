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

  // Determine label position based on element position
  const isAtBottom = !!position.bottom;
  const isAtRight = !!position.right;

  return (
    <div
      className="absolute cursor-pointer z-10"
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
          relative overflow-hidden transition-transform duration-300 rounded-xl
          ${isHovered ? 'scale-110' : 'scale-100'}
        `}
      >
        <Image
          src={previewImage}
          alt={label}
          width={size}
          height={size}
          className="object-cover rounded-xl"
          style={{ filter: 'none' }}
          priority
        />
      </div>

      {/* Hover label - positioned based on element location */}
      <div
        className={`
          absolute bg-[#5a5470] rounded-xl shadow-lg px-4 py-2 whitespace-nowrap
          transition-all duration-200
          ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          ${isAtRight ? 'right-0' : 'left-1/2 -translate-x-1/2'}
        `}
        style={isAtBottom
          ? { bottom: `calc(100% + 12px)` }
          : { top: `calc(100% + 12px)` }
        }
      >
        <span className="font-semibold text-sm text-white">
          {label}
        </span>
        {/* Arrow pointing to image */}
        <div
          className="absolute w-3 h-3 bg-[#5a5470] transform rotate-45"
          style={isAtBottom
            ? { bottom: '-6px', right: isAtRight ? '20px' : '50%', marginRight: isAtRight ? '0' : '-6px' }
            : { top: '-6px', right: isAtRight ? '20px' : '50%', marginRight: isAtRight ? '0' : '-6px' }
          }
        />
      </div>
    </div>
  );
}
