'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import type { MeetingMessage } from '@/lib/api';

// Bot avatar mapping
const BOT_AVATARS = [
  '/Engineer.svg',
  '/Marketing.svg',
  '/PM.svg',
  '/UX.svg',
];

interface DiscussionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MeetingMessage[];
  isRunning?: boolean;
  participantMap?: Map<number, number>; // user_id -> index for avatar
}

export function DiscussionPanel({
  isOpen,
  onClose,
  messages,
  isRunning,
  participantMap,
}: DiscussionPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Get avatar for a speaker
  const getAvatar = (speakerUserId: number | null, role: string): string => {
    if (role === 'facilitator' || role === 'system' || !speakerUserId) {
      return '/PM.svg'; // Default for facilitator
    }
    const index = participantMap?.get(speakerUserId) ?? 0;
    return BOT_AVATARS[index % BOT_AVATARS.length];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-[#5a5470]/15 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-1/2 left-1/2 w-[500px] max-w-[95vw] max-h-[85vh] bg-white rounded-3xl shadow-2xl z-[60] flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#e8e0f0] flex items-center justify-center text-xl">
                  💬
                </div>
                <div>
                  <h2 className="font-bold text-[#5a5470] text-lg" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Discussion
                  </h2>
                  <p className="text-xs text-[#8a8498]">Bot conversation thread</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-[#faf8f5] flex items-center justify-center text-[#8a8498] hover:bg-[#e8e0f0] hover:text-[#5a5470] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#faf8f5] flex items-center justify-center mb-4">
                    <span className="text-3xl opacity-50">🤖</span>
                  </div>
                  <p className="text-[#8a8498] mb-1">No messages yet</p>
                  <p className="text-sm text-[#8a8498]/70">
                    Click "Run Discussion" to start
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      avatar={getAvatar(message.speaker_user_id, message.role)}
                    />
                  ))}

                  {/* Typing indicator */}
                  {isRunning && (
                    <div className="flex gap-3 items-start">
                      <div className="w-9 h-9 rounded-full bg-[#faf8f5] overflow-hidden flex-shrink-0">
                        <Image
                          src="/Engineer.svg"
                          alt="Typing"
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-1 px-4 py-3 bg-[#e8e0f0] rounded-xl rounded-tl-sm">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-2 h-2 bg-[#c4b5e0] rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface MessageBubbleProps {
  message: MeetingMessage;
  avatar: string;
}

function MessageBubble({ message, avatar }: MessageBubbleProps) {
  const isFacilitator = message.role === 'facilitator';
  const isSystem = message.role === 'system';

  return (
    <motion.div
      className="flex gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-9 h-9 rounded-full bg-[#faf8f5] overflow-hidden flex-shrink-0">
        <Image
          src={avatar}
          alt={message.speaker_name}
          width={36}
          height={36}
          className="w-full h-full object-cover"
        />
      </div>
      <div
        className={`flex-1 px-4 py-3 rounded-xl rounded-tl-sm ${
          isFacilitator
            ? 'bg-gradient-to-br from-[#e8e0f0] to-[#d8cce8]'
            : isSystem
            ? 'bg-gray-100'
            : 'bg-[#faf8f5]'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-[#5a5470]">
            {message.speaker_name}
          </span>
          <span className="text-[11px] text-[#8a8498]">
            {formatTime(message.created_at)}
          </span>
        </div>
        <p className="text-sm text-[#8a8498] leading-relaxed">
          {message.content}
        </p>

        {/* Citations */}
        {message.cited_decisions && message.cited_decisions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.cited_decisions.map((id: number) => (
              <span
                key={id}
                className="text-[10px] px-2 py-0.5 bg-white rounded-full text-[#9b7ed4] font-medium"
              >
                Decision #{id}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.floor(diffMins / 60)}h ago`;
}
