'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Square,
  Pause,
  Play,
  Upload,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { uploadSession } from '@/lib/api';
import { formatTimestamp, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { fadeInVariants } from '@/lib/animations';

interface AudioRecorderProps {
  onSessionCreated?: (session: any) => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'uploading' | 'success';

// Waveform visualization component
function Waveform({ isActive }: { isActive: boolean }) {
  const bars = 20;

  return (
    <div className="flex items-center justify-center gap-0.5 h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            'w-1 rounded-full',
            isActive ? 'bg-primary-500' : 'bg-muted'
          )}
          animate={
            isActive
              ? {
                  height: [8, 32, 16, 48, 24, 40, 12],
                  transition: {
                    duration: 0.8,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    delay: i * 0.05,
                  },
                }
              : { height: 8 }
          }
        />
      ))}
    </div>
  );
}

// Circular progress timer
function CircularTimer({ duration, isRecording }: { duration: number; isRecording: boolean }) {
  const maxDuration = 3600; // 1 hour max for visual
  const progress = Math.min(duration / maxDuration, 1);
  const radius = 80;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-48 h-48 -rotate-90">
        {/* Background circle */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={cn(
            'stroke-current',
            isRecording ? 'text-error-500' : 'text-primary-500'
          )}
          strokeLinecap="round"
          style={{ strokeDasharray: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'text-4xl font-mono font-bold tabular-nums',
            isRecording ? 'text-error-600' : 'text-foreground'
          )}
        >
          {formatTimestamp(duration)}
        </span>
        {isRecording && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-error-500 mt-1"
          >
            Recording...
          </motion.span>
        )}
      </div>
    </div>
  );
}

// Pulsing record button
function RecordButton({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
}: {
  state: RecordingState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';

  if (state === 'idle') {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className={cn(
          'relative w-20 h-20 rounded-full bg-error-500 text-white',
          'flex items-center justify-center shadow-lg',
          'hover:bg-error-600 transition-colors'
        )}
      >
        <Mic className="w-8 h-8" />
      </motion.button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Pause/Resume */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isPaused ? onResume : onPause}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'bg-warning-500 text-white shadow-md hover:bg-warning-600 transition-colors'
        )}
      >
        {isPaused ? <Play className="w-6 h-6 ml-0.5" /> : <Pause className="w-6 h-6" />}
      </motion.button>

      {/* Recording indicator */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-error-500/30"
          animate={
            isRecording
              ? {
                  scale: [1, 1.3],
                  opacity: [0.5, 0],
                }
              : {}
          }
          transition={
            isRecording
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                }
              : {}
          }
        />
        <div
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center',
            isRecording ? 'bg-error-500' : 'bg-muted',
            'text-white shadow-lg'
          )}
        >
          <Mic className="w-8 h-8" />
        </div>
      </div>

      {/* Stop */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStop}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'bg-foreground text-background shadow-md hover:bg-foreground/90 transition-colors'
        )}
      >
        <Square className="w-5 h-5" />
      </motion.button>
    </div>
  );
}

export function AudioRecorder({ onSessionCreated }: AudioRecorderProps) {
  const { toast } = useToast();
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();

  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState('coding');
  const [gitBranch, setGitBranch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const getState = (): RecordingState => {
    if (showSuccess) return 'success';
    if (isUploading) return 'uploading';
    if (audioBlob && !isRecording) return 'stopped';
    if (isPaused) return 'paused';
    if (isRecording) return 'recording';
    return 'idle';
  };

  const state = getState();

  const handleUpload = async () => {
    if (!audioBlob || !title.trim()) {
      setError('Please provide a title for the session');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const file = new File([audioBlob], `${title}.webm`, { type: 'audio/webm' });
      const session = await uploadSession(file, title, sessionType, gitBranch || undefined);

      setShowSuccess(true);
      toast({
        title: 'Session uploaded',
        description: 'AI is extracting your decisions...',
      });

      setTimeout(() => {
        onSessionCreated?.(session);
        resetRecording();
        setTitle('');
        setGitBranch('');
        setShowSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload session');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-error-100 flex items-center justify-center">
            <Mic className="h-4 w-4 text-error-600" />
          </div>
          Record Coding Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {/* Success State */}
          {state === 'success' && (
            <motion.div
              key="success"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-10 h-10 text-success-600" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">Upload Complete!</h3>
              <p className="text-muted-foreground">
                Processing your session...
              </p>
            </motion.div>
          )}

          {/* Idle State - Start Recording */}
          {state === 'idle' && (
            <motion.div
              key="idle"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center"
            >
              <RecordButton
                state={state}
                onStart={startRecording}
                onPause={pauseRecording}
                onResume={resumeRecording}
                onStop={stopRecording}
              />
              <p className="text-muted-foreground mt-6 text-center">
                Click to start recording your coding session
              </p>
            </motion.div>
          )}

          {/* Recording/Paused State */}
          {(state === 'recording' || state === 'paused') && (
            <motion.div
              key="recording"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="py-8 space-y-8"
            >
              <div className="flex justify-center">
                <CircularTimer duration={duration} isRecording={state === 'recording'} />
              </div>

              <Waveform isActive={state === 'recording'} />

              <div className="flex justify-center">
                <RecordButton
                  state={state}
                  onStart={startRecording}
                  onPause={pauseRecording}
                  onResume={resumeRecording}
                  onStop={stopRecording}
                />
              </div>

              {state === 'paused' && (
                <p className="text-center text-warning-600 font-medium">
                  Recording paused
                </p>
              )}
            </motion.div>
          )}

          {/* Stopped State - Ready to Upload */}
          {(state === 'stopped' || state === 'uploading') && (
            <motion.div
              key="stopped"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Duration Display */}
              <div className="text-center py-4 bg-muted/30 rounded-xl">
                <div className="text-3xl font-mono font-bold text-foreground">
                  {formatTimestamp(duration)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Recording complete
                </p>
              </div>

              {/* Session Details Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Implementing Redis caching"
                    disabled={state === 'uploading'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Session Type</Label>
                  <Select
                    value={sessionType}
                    onValueChange={setSessionType}
                    disabled={state === 'uploading'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="code_review">Code Review</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="debugging">Debugging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Git Branch (optional)</Label>
                  <Input
                    id="branch"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    placeholder="e.g., feature/redis-cache"
                    disabled={state === 'uploading'}
                  />
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg bg-error-50 text-error-700 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={resetRecording}
                    disabled={state === 'uploading'}
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Discard
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={state === 'uploading' || !title.trim()}
                    className="flex-1 btn-press"
                  >
                    {state === 'uploading' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload & Analyze
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
