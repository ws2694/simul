'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ArrowLeft, Bot, Users, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  getMeeting,
  runMeetingDiscussion,
  endMeeting,
  type MeetingDetail,
} from '@/lib/api';
import { BotCharacter } from './BotCharacter';
import { TopicCard } from './TopicCard';
import { MeetingControls } from './MeetingControls';
import { DiscussionPanel } from './DiscussionPanel';
import { TimelineDiscussionView } from './TimelineDiscussionView';
import { ConsensusBadge } from './ConsensusBadge';
import { MeetingSummary } from './MeetingSummary';

interface MeetingRoomProps {
  meetingId: number;
}

export function MeetingRoom({ meetingId }: MeetingRoomProps) {
  const router = useRouter();

  // ============ PRESERVED STATE (unchanged) ============
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============ NEW UI STATE ============
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // ============ PRESERVED LOGIC (unchanged) ============
  const loadMeeting = async () => {
    try {
      const data = await getMeeting(meetingId);
      setMeeting(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load meeting');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meeting?.messages]);

  const handleRunDiscussion = async () => {
    if (!meeting) return;

    setIsRunning(true);
    setError(null);

    try {
      const updated = await runMeetingDiscussion(meetingId, 10);
      setMeeting(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run discussion');
    } finally {
      setIsRunning(false);
    }
  };

  const handleEndMeeting = async () => {
    if (!meeting) return;

    setIsEnding(true);
    setError(null);

    try {
      const updated = await endMeeting(meetingId);
      setMeeting(updated);
      setShowSummary(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to end meeting');
    } finally {
      setIsEnding(false);
    }
  };

  // ============ PRESERVED DERIVED STATE (unchanged) ============
  const isCompleted = meeting?.status === 'completed';
  const isInProgress = meeting?.status === 'in_progress';
  const isScheduled = meeting?.status === 'scheduled';
  const canRun = isScheduled || isInProgress;
  const canEnd = isInProgress && (meeting?.messages?.length ?? 0) > 0;

  // ============ NEW: Speaking detection ============
  const latestSpeakerId = useMemo(() => {
    if (!meeting?.messages?.length) return null;
    // Find latest bot message
    for (let i = meeting.messages.length - 1; i >= 0; i--) {
      if (meeting.messages[i].role === 'bot' && meeting.messages[i].speaker_user_id) {
        return meeting.messages[i].speaker_user_id;
      }
    }
    return null;
  }, [meeting?.messages]);

  // Map participant user_id to index for avatar assignment
  const participantMap = useMemo(() => {
    const map = new Map<number, number>();
    meeting?.participants?.forEach((p, i) => {
      map.set(p.user_id, i);
    });
    return map;
  }, [meeting?.participants]);

  // ============ LOADING STATE ============
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#e8e0f0] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Bot className="w-8 h-8 text-[#9b7ed4]" />
          </div>
          <p className="text-[#8a8498]">Loading meeting...</p>
        </div>
      </div>
    );
  }

  // ============ ERROR STATE ============
  if (error && !meeting) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center p-8 bg-red-50 rounded-2xl max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!meeting) return null;

  // ============ GAME-LIKE UI ============
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-[#faf8f5] rounded-lg text-[#5a5470] hover:bg-[#e8e0f0] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#c4b5e0] to-[#9b7ed4] flex items-center justify-center text-white font-bold">
              C
            </div>
            <span className="font-bold text-[#5a5470]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              {meeting.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
            isCompleted
              ? 'bg-[#d4ede0] text-[#4a8a5a]'
              : isInProgress
              ? 'bg-[#e8e0f0] text-[#9b7ed4]'
              : 'bg-[#faf8f5] text-[#8a8498]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isCompleted ? 'bg-green-500' : isInProgress ? 'bg-[#9b7ed4] animate-pulse' : 'bg-gray-400'
            }`} />
            {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Scheduled'}
          </div>

          {/* Participants Count */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[#faf8f5] rounded-full text-sm text-[#5a5470]">
            <Users className="w-4 h-4" />
            <span className="font-semibold">{meeting.participants.length}</span>
          </div>
        </div>
      </header>

      {/* Main Scene */}
      <main className="pt-16 h-full">
        <div className="relative w-full h-full flex items-center justify-center bg-white">
          {/* Background Image */}
          <Image
            src="/asset-environment-1770090935004.png"
            alt="Meeting Room"
            fill
            className="object-contain"
            priority
          />

          {/* Topic Card */}
          <TopicCard
            topic={meeting.topic}
            description={meeting.description ?? undefined}
            onClick={() => setIsTimelineOpen(true)}
          />

          {/* Bot Characters */}
          {meeting.participants.map((participant, index) => (
            <BotCharacter
              key={participant.user_id}
              participant={participant}
              index={index}
              isSpeaking={isRunning || participant.user_id === latestSpeakerId}
              onClick={() => setIsTimelineOpen(true)}
            />
          ))}

          {/* Meeting Controls */}
          <MeetingControls
            canRun={canRun}
            canEnd={canEnd}
            isRunning={isRunning}
            isEnding={isEnding}
            isCompleted={isCompleted}
            onRunDiscussion={handleRunDiscussion}
            onEndMeeting={handleEndMeeting}
            onViewDiscussion={() => setIsTimelineOpen(true)}
          />

          {/* Consensus Badge */}
          <ConsensusBadge
            consensusReached={meeting.consensus_reached}
            messageCount={meeting.messages.length}
          />

          {/* Error Toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Timeline Discussion View (New Interactive UI) */}
      <TimelineDiscussionView
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        messages={meeting.messages}
        participants={meeting.participants}
        isRunning={isRunning}
      />

      {/* Discussion Panel (Legacy - for quick reference) */}
      <DiscussionPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        messages={meeting.messages}
        isRunning={isRunning}
        participantMap={participantMap}
      />

      {/* Meeting Summary Overlay */}
      <AnimatePresence>
        {(isCompleted && meeting.summary && showSummary) && (
          <motion.div
            className="fixed inset-0 bg-[#5a5470]/20 backdrop-blur-sm z-[70] flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#5a5470]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Meeting Summary
                </h2>
                <button
                  onClick={() => setShowSummary(false)}
                  className="px-4 py-2 bg-[#faf8f5] rounded-lg text-[#8a8498] hover:bg-[#e8e0f0] transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="p-6">
                <MeetingSummary
                  summary={meeting.summary}
                  consensusReached={meeting.consensus_reached}
                  actionItems={meeting.action_items}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-show summary when meeting completes */}
      {isCompleted && meeting.summary && !showSummary && (
        <motion.button
          className="fixed bottom-[5%] left-[5%] z-20 px-5 py-3 bg-white rounded-2xl shadow-lg text-[#5a5470] font-semibold hover:shadow-xl transition-shadow flex items-center gap-2"
          onClick={() => setShowSummary(true)}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ClipboardList className="w-4 h-4" />
          View Summary
        </motion.button>
      )}
    </div>
  );
}
