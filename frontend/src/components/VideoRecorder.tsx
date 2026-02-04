'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Square,
  Circle,
  Check,
  Loader2,
  Monitor,
  Camera,
  Trash2,
  Upload,
  Pause,
  Play,
} from 'lucide-react';
import { uploadVideoSession } from '@/lib/api';
import { cn } from '@/lib/utils';
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

interface VideoRecorderProps {
  onSessionCreated?: (session: any) => void;
}

type RecordingState = 'idle' | 'selecting' | 'recording' | 'paused' | 'stopped' | 'uploading' | 'success';
type SourceType = 'camera' | 'screen';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoRecorder({ onSessionCreated }: VideoRecorderProps) {
  const { toast } = useToast();

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<RecordingState>('idle');
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState('coding');
  const [gitBranch, setGitBranch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, []);

  const startRecording = async (source: SourceType) => {
    try {
      setError(null);
      setSourceType(source);
      setState('selecting');

      let stream: MediaStream;

      if (source === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
      }

      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        stopStream();
      };

      // Handle screen share stop
      stream.getVideoTracks()[0].onended = () => {
        if (state === 'recording' || state === 'paused') {
          handleStopRecording();
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setState('recording');
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Recording error:', err);
      setError(err.message || 'Failed to start recording. Please check permissions.');
      setState('idle');
      stopStream();
    }
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;

    if (state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState('paused');
    } else if (state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      setState('recording');
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setState('stopped');
  };

  const handleUpload = async () => {
    if (!recordedBlob || !title.trim()) {
      setError('Please provide a title for the session');
      return;
    }

    setState('uploading');
    setError(null);

    try {
      const file = new File([recordedBlob], `recording_${Date.now()}.webm`, {
        type: 'video/webm',
      });

      const session = await uploadVideoSession(file, title, sessionType, gitBranch || undefined);
      setState('success');

      toast({
        title: 'Recording uploaded',
        description: 'AI is extracting decisions from your recording...',
      });

      // Start tracking immediately so the processing bubble shows
      onSessionCreated?.(session);

      setTimeout(() => {
        handleDiscard();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload recording');
      setState('stopped');
    }
  };

  const handleDiscard = () => {
    stopStream();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordedBlob(null);
    setTitle('');
    setGitBranch('');
    setDuration(0);
    setError(null);
    setSourceType(null);
    setState('idle');
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Video className="h-4 w-4 text-rose-600" />
          </div>
          Record Video
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
              <p className="text-muted-foreground">Processing your recording...</p>
            </motion.div>
          )}

          {/* Idle State - Source Selection */}
          {state === 'idle' && (
            <motion.div
              key="idle"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground text-center mb-4">
                Choose what you want to record
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startRecording('camera')}
                  className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed',
                    'transition-all hover:border-rose-400 hover:bg-rose-50/50',
                    'border-muted'
                  )}
                >
                  <div className="p-3 rounded-full bg-rose-100">
                    <Camera className="h-6 w-6 text-rose-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Camera</p>
                    <p className="text-xs text-muted-foreground">Record from webcam</p>
                  </div>
                </button>

                <button
                  onClick={() => startRecording('screen')}
                  className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed',
                    'transition-all hover:border-blue-400 hover:bg-blue-50/50',
                    'border-muted'
                  )}
                >
                  <div className="p-3 rounded-full bg-blue-100">
                    <Monitor className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Screen</p>
                    <p className="text-xs text-muted-foreground">Record your screen</p>
                  </div>
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-error-50 text-error-700 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Recording / Paused State */}
          {(state === 'recording' || state === 'paused' || state === 'selecting') && (
            <motion.div
              key="recording"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Video Preview */}
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Recording indicator */}
                {state === 'recording' && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-sm font-medium">
                    <Circle className="w-3 h-3 fill-current animate-pulse" />
                    REC
                  </div>
                )}
                {state === 'paused' && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-yellow-600 text-white rounded-full text-sm font-medium">
                    <Pause className="w-3 h-3" />
                    PAUSED
                  </div>
                )}

                {/* Duration */}
                <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/70 text-white rounded-lg text-sm font-mono">
                  {formatDuration(duration)}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handlePauseResume}
                  disabled={state === 'selecting'}
                >
                  {state === 'paused' ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleStopRecording}
                  disabled={state === 'selecting'}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </div>
            </motion.div>
          )}

          {/* Stopped State - Review & Upload */}
          {(state === 'stopped' || state === 'uploading') && recordedBlob && (
            <motion.div
              key="stopped"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Recording Preview */}
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                <video
                  src={URL.createObjectURL(recordedBlob)}
                  controls
                  className="w-full h-full"
                />
              </div>

              {/* Recording Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className="p-2 rounded-lg bg-rose-100">
                  <Video className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Recording</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(duration)} &middot; {formatFileSize(recordedBlob.size)}
                  </p>
                </div>
              </div>

              {/* Session Details Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recording-title">Session Title *</Label>
                  <Input
                    id="recording-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Code review recording"
                    disabled={state === 'uploading'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recording-type">Session Type</Label>
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
                  <Label htmlFor="recording-branch">Git Branch (optional)</Label>
                  <Input
                    id="recording-branch"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    placeholder="e.g., feature/new-feature"
                    disabled={state === 'uploading'}
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-error-50 text-error-700 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleDiscard}
                    disabled={state === 'uploading'}
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Discard
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={state === 'uploading' || !title.trim()}
                    className="flex-1"
                  >
                    {state === 'uploading' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
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
