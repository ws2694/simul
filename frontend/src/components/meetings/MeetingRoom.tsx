'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  Users,
  Bot,
  Sparkles,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  getMeeting,
  runMeetingDiscussion,
  endMeeting,
  type MeetingDetail,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MeetingMessage } from './MeetingMessage';
import { MeetingSummary } from './MeetingSummary';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  staggerContainerVariants,
  staggerItemVariants,
  fadeInVariants,
} from '@/lib/animations';

interface MeetingRoomProps {
  meetingId: number;
}

export function MeetingRoom({ meetingId }: MeetingRoomProps) {
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to end meeting');
    } finally {
      setIsEnding(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getStatusBadge = () => {
    if (!meeting) return null;

    const statusConfig = {
      scheduled: { label: 'Scheduled', className: 'bg-muted text-muted-foreground' },
      in_progress: { label: 'In Progress', className: 'bg-primary-100 text-primary-700' },
      completed: { label: 'Completed', className: 'bg-success-100 text-success-700' },
      cancelled: { label: 'Cancelled', className: 'bg-error-100 text-error-700' },
    };

    const config = statusConfig[meeting.status];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <Card className="border-error-200 bg-error-50">
        <CardContent className="p-6 text-center">
          <p className="text-error-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!meeting) return null;

  const isCompleted = meeting.status === 'completed';
  const isInProgress = meeting.status === 'in_progress';
  const isScheduled = meeting.status === 'scheduled';
  const canRun = isScheduled || isInProgress;
  const canEnd = isInProgress && meeting.messages.length > 0;

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 lg:grid-cols-4 gap-6"
    >
      {/* Main Content */}
      <motion.div variants={fadeInVariants} className="lg:col-span-3 space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-semibold truncate">{meeting.title}</h1>
                  {getStatusBadge()}
                </div>
                <p className="text-sm text-muted-foreground">{meeting.topic}</p>
                {meeting.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {meeting.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Started {meeting.started_at ? formatRelativeTime(meeting.started_at) : 'Not started'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {meeting.participant_count} participants
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {canRun && (
                  <Button
                    onClick={handleRunDiscussion}
                    disabled={isRunning}
                    className="gap-2"
                  >
                    {isRunning ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run Discussion
                      </>
                    )}
                  </Button>
                )}
                {canEnd && (
                  <Button
                    variant="outline"
                    onClick={handleEndMeeting}
                    disabled={isEnding}
                    className="gap-2"
                  >
                    {isEnding ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        Ending...
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4" />
                        End Meeting
                      </>
                    )}
                  </Button>
                )}
                {isCompleted && (
                  <Badge variant="outline" className="bg-success-50 text-success-700 border-success-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Meeting Complete
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-lg bg-error-50 text-error-700 border border-error-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages or Summary */}
        {isCompleted && meeting.summary ? (
          <MeetingSummary
            summary={meeting.summary}
            consensusReached={meeting.consensus_reached}
            actionItems={meeting.action_items}
          />
        ) : (
          <Card className="min-h-[400px] flex flex-col">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Discussion
                {meeting.messages.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {meeting.messages.length} messages
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {meeting.messages.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-muted-foreground mb-2">
                      No messages yet
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Click "Run Discussion" to start the bot conversation
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1 p-4">
                    {meeting.messages.map((message, index) => (
                      <MeetingMessage
                        key={message.id}
                        message={message}
                        isLatest={index === meeting.messages.length - 1}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show summary section for completed meetings with transcript */}
        {isCompleted && meeting.messages.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Full Transcript
                <Badge variant="secondary" className="text-xs">
                  {meeting.messages.length} messages
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <div className="space-y-1 p-4">
                  {meeting.messages.map((message) => (
                    <MeetingMessage key={message.id} message={message} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Sidebar - Participants */}
      <motion.div variants={fadeInVariants} className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <motion.div
              variants={staggerContainerVariants}
              className="space-y-2"
            >
              {meeting.participants.map((participant, i) => (
                <motion.div
                  key={participant.user_id}
                  variants={staggerItemVariants}
                  custom={i}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary-100 text-primary-700 text-xs font-medium">
                        {getInitials(participant.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5',
                        participant.is_bot_active
                          ? 'text-success-500 fill-success-500'
                          : 'text-muted fill-muted'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {participant.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      Bot {participant.is_bot_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>

        {/* Meeting Info */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Meeting Info</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initiated by</span>
              <span className="font-medium">{meeting.initiator_name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatRelativeTime(meeting.created_at)}</span>
            </div>
            {meeting.started_at && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span>{formatRelativeTime(meeting.started_at)}</span>
                </div>
              </>
            )}
            {meeting.ended_at && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ended</span>
                  <span>{formatRelativeTime(meeting.ended_at)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
