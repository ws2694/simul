'use client';

import { useState } from 'react';

interface TopicCardProps {
  topic: string;
  description?: string;
  onClick: () => void;
}

export function TopicCard({ topic, description, onClick }: TopicCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="absolute top-[15%] cursor-pointer z-5"
      style={{
        left: '50%',
        transform: `translateX(-50%) translateY(${isHovered ? '-4px' : '0'})`,
        transition: 'transform 0.3s ease',
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white px-7 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-center">
        <p className="text-[11px] font-semibold text-[#8a8498] uppercase tracking-wider mb-1">
          Current Topic
        </p>
        <h3 className="font-bold text-[#5a5470] text-base" style={{ fontFamily: 'Quicksand, sans-serif' }}>
          {topic}
        </h3>
        {description && (
          <p className="text-xs text-[#8a8498] mt-1 max-w-[300px]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
