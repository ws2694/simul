'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

// Bot avatar mapping - cycles through available avatars
const BOT_AVATARS = [
  '/Engineer.svg',
  '/Marketing.svg',
  '/PM.svg',
  '/UX.svg',
];

// Positions spread horizontally above the summary button
const BOT_POSITIONS = [
  { left: '2%', bottom: '18%' },
  { left: '18%', bottom: '18%' },
  { left: '34%', bottom: '18%' },
  { left: '50%', bottom: '18%' },
];

interface BotCharacterProps {
  participant: {
    user_id: number;
    full_name: string;
    is_bot_active: boolean;
  };
  index: number;
  isSpeaking: boolean;
  onClick: () => void;
}

export function BotCharacter({ participant, index, isSpeaking, onClick }: BotCharacterProps) {
  const avatar = BOT_AVATARS[index % BOT_AVATARS.length];
  const position = BOT_POSITIONS[index % BOT_POSITIONS.length];

  return (
    <motion.div
      className="absolute cursor-pointer z-10 group"
      style={{
        ...position,
        width: '140px',
      }}
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -10 }}
      animate={isSpeaking ? {
        scale: [1.05, 1.1, 1.05],
        y: [-5, -12, -5],
      } : {}}
      transition={isSpeaking ? {
        duration: 0.5,
        repeat: Infinity,
        ease: 'easeInOut',
      } : {
        duration: 0.3,
      }}
    >
      {/* Speaking Waves */}
      <div className={`absolute -top-5 left-1/2 -translate-x-1/2 flex gap-[3px] transition-opacity duration-300 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-1 bg-[#9b7ed4] rounded-sm"
            style={{ height: [10, 16, 12, 18, 10][i] }}
            animate={isSpeaking ? {
              scaleY: [1, 0.5, 1],
            } : {}}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.1,
            }}
          />
        ))}
      </div>

      {/* Bot Avatar */}
      <div className="relative">
        <Image
          src={avatar}
          alt={`${participant.full_name}'s Bot`}
          width={140}
          height={140}
        />

        {/* Active indicator */}
        <div className={`absolute bottom-2 right-2 w-3 h-3 rounded-full border-2 border-white ${participant.is_bot_active ? 'bg-green-500' : 'bg-gray-400'}`} />
      </div>

      {/* Hover Label */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="bg-white px-5 py-2.5 rounded-xl shadow-lg whitespace-nowrap text-center">
          <h4 className="text-sm font-bold text-[#5a5470]">{participant.full_name}</h4>
          <p className="text-xs text-[#8a8498]">
            {participant.is_bot_active ? 'Bot Active' : 'Bot Inactive'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export { BOT_POSITIONS };
