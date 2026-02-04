'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { MeetingMessage } from '@/lib/api';

// Bot avatar mapping
const BOT_AVATARS = [
  '/Engineer.svg',
  '/Marketing.svg',
  '/PM.svg',
  '/UX.svg',
];

// Facilitator avatar - PM role is typically the facilitator
const FACILITATOR_AVATAR = '/PM.svg';

// Bot standing positions - facilitator in center, others spread around
const BOT_POSITIONS = [
  { left: '5%', bottom: '28%' },
  { left: '22%', bottom: '28%' },
  { left: '58%', bottom: '28%' },
  { left: '75%', bottom: '28%' },
];

// Facilitator position - center of the scene
const FACILITATOR_POSITION = { left: '40%', bottom: '28%' };

interface Participant {
  user_id: number;
  full_name: string;
  is_bot_active: boolean;
}

interface TimelineDiscussionViewProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MeetingMessage[];
  participants: Participant[];
  isRunning?: boolean;
}

export function TimelineDiscussionView({
  isOpen,
  onClose,
  messages,
  participants,
  isRunning,
}: TimelineDiscussionViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Map participant user_id to index for avatar assignment
  const participantMap = useMemo(() => {
    const map = new Map<number, number>();
    participants.forEach((p, i) => {
      map.set(p.user_id, i);
    });
    return map;
  }, [participants]);

  // Current message based on timeline position
  const currentMessage = messages[currentIndex];

  // Check if current speaker is facilitator (speaker_user_id is null and role is facilitator)
  const isFacilitatorSpeaking = useMemo(() => {
    return currentMessage?.role === 'facilitator' || currentMessage?.role === 'system';
  }, [currentMessage]);

  // Get the participant index for current speaker (-1 for facilitator)
  const currentSpeakerIndex = useMemo(() => {
    if (!currentMessage?.speaker_user_id) return -1; // Facilitator
    return participantMap.get(currentMessage.speaker_user_id) ?? -1;
  }, [currentMessage, participantMap]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && messages.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= messages.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000); // 3 seconds per message for reading
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, messages.length]);

  // Update to latest message when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && isRunning) {
      setCurrentIndex(messages.length - 1);
    }
  }, [messages.length, isRunning]);

  // Reset to start when opening
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [isOpen]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(parseInt(e.target.value, 10));
    setIsPlaying(false);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(messages.length - 1, prev + 1));
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (currentIndex >= messages.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Get avatar for timeline thumbnails
  const getAvatarForMessage = (msg: MeetingMessage) => {
    if (msg.role === 'facilitator' || msg.role === 'system' || !msg.speaker_user_id) {
      return FACILITATOR_AVATAR;
    }
    const idx = participantMap.get(msg.speaker_user_id) ?? 0;
    return BOT_AVATARS[idx % BOT_AVATARS.length];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Scene Background */}
          <div className="absolute inset-0">
            <Image
              src="/asset-environment-1770090935004.png"
              alt="Meeting Scene"
              fill
              className="object-cover"
              priority
            />
            {/* Gradient overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-50 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#5a5470] hover:bg-white hover:scale-110 transition-all shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Message Counter Badge */}
          <div className="absolute top-6 left-6 z-50 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg">
            <span className="font-bold text-[#5a5470]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              {messages.length > 0 ? `${currentIndex + 1} / ${messages.length}` : 'No messages'}
            </span>
          </div>

          {/* Bot Characters Standing in Scene */}
          <div className="absolute inset-0">
            {/* Facilitator Bot - Center */}
            <div
              className="absolute"
              style={{
                left: FACILITATOR_POSITION.left,
                bottom: FACILITATOR_POSITION.bottom,
              }}
            >
              {/* Speech Bubble - Only show when facilitator is speaking */}
              <AnimatePresence mode="wait">
                {isFacilitatorSpeaking && currentMessage && (
                  <motion.div
                    className="absolute left-1/2 -translate-x-1/2 w-[320px] md:w-[400px]"
                    style={{ bottom: '100%', marginBottom: '20px' }}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  >
                    <div className="relative bg-white rounded-2xl shadow-2xl p-5 max-h-[300px] overflow-y-auto">
                      {/* Speaker Name */}
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-[#e8e0f0] overflow-hidden">
                          <Image
                            src={FACILITATOR_AVATAR}
                            alt="Facilitator"
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-bold text-[#9b7ed4]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                          {currentMessage.speaker_name}
                        </span>
                        <span className="text-xs bg-[#e8e0f0] text-[#9b7ed4] px-2 py-0.5 rounded-full">
                          Facilitator
                        </span>
                      </div>

                      {/* Message Content */}
                      <MarkdownRenderer
                        content={currentMessage.content}
                        className="text-[#5a5470] text-sm leading-relaxed"
                      />

                      {/* Speech bubble tail */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-5 h-5 bg-white rotate-45 shadow-lg"
                        style={{ bottom: '-10px' }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Facilitator Bot Character */}
              <div className="relative">
                {/* Glow effect when speaking */}
                {isFacilitatorSpeaking && (
                  <div
                    className="absolute rounded-full bg-[#9b7ed4]/25 blur-xl"
                    style={{ width: '180px', height: '180px', left: '-15px', top: '-15px' }}
                  />
                )}

                <motion.div
                  className={`relative transition-all duration-300 ${isFacilitatorSpeaking ? 'z-20' : 'z-10'}`}
                  whileHover={{ scale: 1.05 }}
                >
                  <Image
                    src={FACILITATOR_AVATAR}
                    alt="Facilitator"
                    width={150}
                    height={150}
                    className={`drop-shadow-2xl transition-all duration-300 ${
                      isFacilitatorSpeaking ? 'brightness-110' : 'brightness-90 grayscale-[30%]'
                    }`}
                  />

                  {/* Speaking indicator */}
                  {isFacilitatorSpeaking && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="w-3 h-3 rounded-full bg-[#9b7ed4] shadow-lg" />
                    </div>
                  )}
                </motion.div>

                {/* Name Label */}
                <div className={`
                  absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                  px-3 py-1 rounded-full text-sm font-medium transition-all duration-300
                  ${isFacilitatorSpeaking
                    ? 'bg-[#9b7ed4] text-white shadow-lg'
                    : 'bg-white/80 text-[#5a5470] backdrop-blur-sm'
                  }
                `}>
                  Facilitator
                </div>
              </div>
            </div>

            {/* Participant Bots */}
            {participants.map((participant, index) => {
              const isSpeaking = currentSpeakerIndex === index;
              const position = BOT_POSITIONS[index % BOT_POSITIONS.length];

              return (
                <div
                  key={participant.user_id}
                  className="absolute"
                  style={{
                    left: position.left,
                    bottom: position.bottom,
                  }}
                >
                  {/* Speech Bubble - Only show for current speaker */}
                  <AnimatePresence mode="wait">
                    {isSpeaking && currentMessage && (
                      <motion.div
                        className="absolute left-1/2 -translate-x-1/2 w-[320px] md:w-[400px]"
                        style={{ bottom: '100%', marginBottom: '20px' }}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      >
                        <div className="relative bg-white rounded-2xl shadow-2xl p-5 max-h-[300px] overflow-y-auto">
                          {/* Speaker Name */}
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-[#e8e0f0] overflow-hidden">
                              <Image
                                src={BOT_AVATARS[index % BOT_AVATARS.length]}
                                alt={currentMessage.speaker_name}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-bold text-[#5a5470]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                              {currentMessage.speaker_name}
                            </span>
                          </div>

                          {/* Message Content */}
                          <MarkdownRenderer
                            content={currentMessage.content}
                            className="text-[#5a5470] text-sm leading-relaxed"
                          />

                          {/* Citations */}
                          {currentMessage.cited_decisions && currentMessage.cited_decisions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                              {currentMessage.cited_decisions.map((id: number) => (
                                <span
                                  key={id}
                                  className="text-[10px] px-2 py-0.5 bg-[#e8e0f0] rounded-full text-[#9b7ed4] font-medium"
                                >
                                  Decision #{id}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Speech bubble tail */}
                          <div
                            className="absolute left-1/2 -translate-x-1/2 w-5 h-5 bg-white rotate-45 shadow-lg"
                            style={{ bottom: '-10px' }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bot Character */}
                  <div className="relative">
                    {/* Glow effect for speaking bot */}
                    {isSpeaking && (
                      <div
                        className="absolute rounded-full bg-[#9b7ed4]/25 blur-xl"
                        style={{ width: '180px', height: '180px', left: '-15px', top: '-15px' }}
                      />
                    )}

                    {/* Bot Avatar */}
                    <motion.div
                      className={`relative transition-all duration-300 ${isSpeaking ? 'z-20' : 'z-10'}`}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Image
                        src={BOT_AVATARS[index % BOT_AVATARS.length]}
                        alt={participant.full_name}
                        width={150}
                        height={150}
                        className={`drop-shadow-2xl transition-all duration-300 ${
                          isSpeaking ? 'brightness-110' : 'brightness-90 grayscale-[30%]'
                        }`}
                      />

                      {/* Speaking indicator */}
                      {isSpeaking && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <div className="w-3 h-3 rounded-full bg-[#9b7ed4] shadow-lg" />
                        </div>
                      )}
                    </motion.div>

                    {/* Name Label */}
                    <div className={`
                      absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                      px-3 py-1 rounded-full text-sm font-medium transition-all duration-300
                      ${isSpeaking
                        ? 'bg-[#9b7ed4] text-white shadow-lg'
                        : 'bg-white/80 text-[#5a5470] backdrop-blur-sm'
                      }
                    `}>
                      {participant.full_name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {messages.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center shadow-2xl">
                <p className="text-[#5a5470] text-lg font-medium mb-2">No discussion yet</p>
                <p className="text-[#8a8498] text-sm">Run the discussion to start the conversation</p>
              </div>
            </div>
          )}

          {/* Timeline Scrubber - Fixed at bottom */}
          {messages.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-16 pb-6 px-8">
              {/* Timeline Track */}
              <div className="max-w-4xl mx-auto">
                {/* Speaker thumbnails on timeline */}
                <div className="relative h-12 mb-4">
                  {messages.map((msg, idx) => {
                    const isActive = idx === currentIndex;
                    const position = messages.length === 1 ? 50 : (idx / (messages.length - 1)) * 100;

                    return (
                      <motion.button
                        key={msg.id}
                        className={`absolute -translate-x-1/2 transition-all duration-200 ${
                          isActive ? 'z-20' : 'z-10'
                        }`}
                        style={{ left: `${position}%` }}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setIsPlaying(false);
                        }}
                        whileHover={{ scale: 1.2 }}
                        animate={isActive ? { scale: 1.3, y: -4 } : { scale: 1, y: 0 }}
                      >
                        <div className={`
                          w-10 h-10 rounded-full overflow-hidden border-2 transition-all
                          ${isActive
                            ? 'border-[#9b7ed4] shadow-lg shadow-[#9b7ed4]/50'
                            : 'border-white/50 opacity-60 hover:opacity-100'
                          }
                        `}>
                          <Image
                            src={getAvatarForMessage(msg)}
                            alt={msg.speaker_name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="relative mb-6">
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#9b7ed4] to-[#c4b5e0] rounded-full"
                      initial={false}
                      animate={{ width: `${(currentIndex / Math.max(messages.length - 1, 1)) * 100}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>

                  {/* Invisible slider */}
                  <input
                    type="range"
                    min={0}
                    max={Math.max(messages.length - 1, 0)}
                    value={currentIndex}
                    onChange={handleSliderChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setCurrentIndex(0)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#9b7ed4] shadow-lg hover:scale-110 transition-transform"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === messages.length - 1}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentIndex(messages.length - 1)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
