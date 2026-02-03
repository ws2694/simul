'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Meeting } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

interface MeetingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  meetings: Meeting[];
  onNewMeeting: () => void;
}

export function MeetingsPanel({ isOpen, onClose, meetings, onNewMeeting }: MeetingsPanelProps) {
  const getStatusConfig = (status: Meeting['status']) => {
    switch (status) {
      case 'in_progress':
        return { icon: '💬', bg: 'bg-[#e8e0f0]', badge: 'bg-[#e8e0f0] text-[#9b8ac4]' };
      case 'completed':
        return { icon: '✅', bg: 'bg-[#d4ede0]', badge: 'bg-[#d4ede0] text-[#4a8a5a]' };
      case 'cancelled':
        return { icon: '❌', bg: 'bg-red-100', badge: 'bg-red-100 text-red-600' };
      default:
        return { icon: '🕐', bg: 'bg-[#faf8f5]', badge: 'bg-[#faf8f5] text-[#8a8498]' };
    }
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
            className="fixed top-1/2 left-1/2 w-[520px] max-w-[95vw] max-h-[85vh] bg-white rounded-3xl shadow-2xl z-[60] flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#e8e0f0] flex items-center justify-center text-xl">
                  🤖
                </div>
                <div>
                  <h2 className="font-bold text-[#5a5470] text-lg" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Bot Meetings
                  </h2>
                  <p className="text-xs text-[#8a8498]">Team discussion sessions</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-[#faf8f5] flex items-center justify-center text-[#8a8498] hover:bg-[#e8e0f0] hover:text-[#5a5470] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {meetings.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-[#faf8f5] rounded-full flex items-center justify-center mx-auto mb-4 opacity-60">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <h3 className="text-base font-bold text-[#5a5470] mb-2">No meetings yet</h3>
                  <p className="text-sm text-[#8a8498] mb-5">
                    Start a meeting to have bots discuss and reach consensus
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => {
                    const config = getStatusConfig(meeting.status);
                    return (
                      <Link href={`/meeting/${meeting.id}`} key={meeting.id}>
                        <motion.div
                          className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer border-2 border-transparent hover:border-[#c4b5e0] hover:bg-[#faf8f5] transition-all"
                          whileHover={{ x: 4 }}
                        >
                          <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center text-xl`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-[#5a5470] truncate">
                              {meeting.title}
                            </h4>
                            <p className="text-xs text-[#8a8498]">
                              {meeting.participant_count} participants · {meeting.message_count} messages · {formatRelativeTime(meeting.created_at)}
                            </p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold capitalize ${config.badge}`}>
                            {meeting.status.replace('_', ' ')}
                          </span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* New Meeting Button */}
              <button
                onClick={() => {
                  onClose();
                  onNewMeeting();
                }}
                className="w-full mt-4 py-4 bg-gradient-to-r from-[#c4b5e0] to-[#9b7ed4] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
              >
                <Plus className="w-4 h-4" />
                Start New Meeting
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
