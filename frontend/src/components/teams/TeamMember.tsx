'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

// Bot avatar mapping
const BOT_AVATARS = [
  '/Engineer.svg',
  '/Marketing.svg',
  '/PM.svg',
  '/UX.svg',
];

// Positions spread horizontally in the floor area
const MEMBER_POSITIONS = [
  { left: '2%', bottom: '18%' },
  { left: '18%', bottom: '18%' },
  { left: '34%', bottom: '18%' },
  { left: '50%', bottom: '18%' },
];

interface TeamMemberProps {
  member: {
    user_id: number;
    full_name: string;
    bot_enabled: boolean;
    role: string;
  };
  index: number;
  onClick?: () => void;
}

export function TeamMember({ member, index, onClick }: TeamMemberProps) {
  const avatar = BOT_AVATARS[index % BOT_AVATARS.length];
  const position = MEMBER_POSITIONS[index % MEMBER_POSITIONS.length];

  return (
    <motion.div
      className="absolute cursor-pointer z-10 group"
      style={{
        ...position,
        width: '100px',
      }}
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      {/* Bot Avatar */}
      <div className="relative">
        <Image
          src={avatar}
          alt={member.full_name}
          width={100}
          height={100}
        />

        {/* Bot status indicator */}
        <div
          className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white ${
            member.bot_enabled ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      </div>

      {/* Hover Label */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="bg-white px-4 py-2 rounded-xl shadow-lg whitespace-nowrap text-center">
          <h4 className="text-[13px] font-bold text-[#5a5470]">{member.full_name}</h4>
          <p className="text-[11px] text-[#8a8498]">
            {member.bot_enabled ? 'Bot Active' : 'Bot Inactive'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
