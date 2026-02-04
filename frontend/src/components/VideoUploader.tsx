'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Trash2,
  Check,
  Loader2,
  FileVideo,
} from 'lucide-react';
import { uploadVideoSession } from '@/lib/api';
import { cn } from '@/lib/utils';
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

interface VideoUploaderProps {
  onSessionCreated?: (session: any) => void;
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'success';

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
];

const MAX_VIDEO_SIZE_MB = 500;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function VideoUploader({ onSessionCreated }: VideoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState('coding');
  const [gitBranch, setGitBranch] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = useCallback((f: File): string | null => {
    if (!ALLOWED_VIDEO_TYPES.includes(f.type)) {
      return `Unsupported format: ${f.type || 'unknown'}. Accepted: MP4, WebM, MOV, AVI, MPEG.`;
    }
    if (f.size > MAX_VIDEO_SIZE_BYTES) {
      return `File too large (${formatFileSize(f.size)}). Maximum: ${MAX_VIDEO_SIZE_MB}MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((f: File) => {
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(f);
    setError(null);
    setState('selected');
    if (!title) {
      setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  }, [validateFile, title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Please provide a title for the session');
      return;
    }

    setState('uploading');
    setError(null);

    try {
      const session = await uploadVideoSession(file, title, sessionType, gitBranch || undefined);
      setState('success');
      toast({
        title: 'Video uploaded',
        description: 'AI is extracting decisions from your video...',
      });

      // Start tracking immediately so the processing bubble shows
      onSessionCreated?.(session);

      setTimeout(() => {
        setFile(null);
        setTitle('');
        setGitBranch('');
        setState('idle');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload video');
      setState('selected');
    }
  };

  const handleDiscard = () => {
    setFile(null);
    setTitle('');
    setGitBranch('');
    setError(null);
    setState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
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
            className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-green-600" />
          </motion.div>
          <h3 className="text-lg font-semibold mb-2">Upload Complete!</h3>
          <p className="text-muted-foreground text-sm">Processing your video...</p>
        </motion.div>
      )}

      {/* Idle State - Drop Zone */}
      {state === 'idle' && (
        <motion.div
          key="idle"
          variants={fadeInVariants}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0 }}
        >
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
              'flex flex-col items-center justify-center gap-2',
              isDragOver
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-muted hover:border-blue-400 hover:bg-muted/30'
            )}
          >
            <div className="text-center">
              <p className="font-medium text-foreground">
                Drop video here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                MP4, WebM, MOV up to {MAX_VIDEO_SIZE_MB}MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_VIDEO_TYPES.join(',')}
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          {/* Error below drop zone */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Selected / Uploading State */}
      {(state === 'selected' || state === 'uploading') && file && (
        <motion.div
          key="selected"
          variants={fadeInVariants}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          {/* File Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileVideo className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} &middot; {file.type}
              </p>
            </div>
          </div>

          {/* Session Details Form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="video-title" className="text-xs">Session Title *</Label>
              <Input
                id="video-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sprint planning recording"
                disabled={state === 'uploading'}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="video-type" className="text-xs">Session Type</Label>
              <Select
                value={sessionType}
                onValueChange={setSessionType}
                disabled={state === 'uploading'}
              >
                <SelectTrigger className="h-9">
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

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-2 rounded-lg bg-red-50 text-red-700 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={state === 'uploading'}
                className="flex-1"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={state === 'uploading' || !title.trim()}
                className="flex-1"
              >
                {state === 'uploading' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
