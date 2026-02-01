'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  Trash2,
  Check,
  Loader2,
  File as FileIcon,
} from 'lucide-react';
import { uploadDocumentSession } from '@/lib/api';
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

interface DocumentUploaderProps {
  onSessionCreated?: (session: any) => void;
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'success';

const ALLOWED_DOC_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const ACCEPT_STRING = Object.values(ALLOWED_DOC_TYPES).join(',');

const MAX_DOC_SIZE_MB = 50;
const MAX_DOC_SIZE_BYTES = MAX_DOC_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType === 'text/plain') return FileIcon;
  return FileText;
}

export function DocumentUploader({ onSessionCreated }: DocumentUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState('design');
  const [gitBranch, setGitBranch] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = useCallback((f: File): string | null => {
    if (!Object.keys(ALLOWED_DOC_TYPES).includes(f.type)) {
      return `Unsupported format: ${f.type || 'unknown'}. Accepted: PDF, TXT, DOCX.`;
    }
    if (f.size > MAX_DOC_SIZE_BYTES) {
      return `File too large (${formatFileSize(f.size)}). Maximum: ${MAX_DOC_SIZE_MB}MB.`;
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
      const session = await uploadDocumentSession(file, title, sessionType, gitBranch || undefined);
      setState('success');
      toast({
        title: 'Document uploaded',
        description: 'AI is extracting decisions from your document...',
      });

      setTimeout(() => {
        onSessionCreated?.(session);
        setFile(null);
        setTitle('');
        setGitBranch('');
        setState('idle');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload document');
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

  const DocIcon = file ? getDocIcon(file.type) : FileText;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
          Upload Document
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
              <p className="text-muted-foreground">Processing your document...</p>
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
                  'py-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                  'flex flex-col items-center justify-center gap-3',
                  isDragOver
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-muted hover:border-amber-400 hover:bg-muted/30'
                )}
              >
                <div className="p-4 rounded-full bg-amber-100">
                  <FileText className="h-8 w-8 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">
                    Drop document here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, TXT, DOCX up to {MAX_DOC_SIZE_MB}MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_STRING}
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
                    className="mt-3 p-3 rounded-lg bg-error-50 text-error-700 text-sm"
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
              className="space-y-6"
            >
              {/* File Info */}
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                <div className="p-2 rounded-lg bg-amber-100">
                  <DocIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} &middot; {ALLOWED_DOC_TYPES[file.type] || file.type}
                  </p>
                </div>
              </div>

              {/* Session Details Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Session Title *</Label>
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Architecture Design Doc"
                    disabled={state === 'uploading'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-type">Session Type</Label>
                  <Select
                    value={sessionType}
                    onValueChange={setSessionType}
                    disabled={state === 'uploading'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="code_review">Code Review</SelectItem>
                      <SelectItem value="debugging">Debugging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-branch">Git Branch (optional)</Label>
                  <Input
                    id="doc-branch"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    placeholder="e.g., feature/new-design"
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
                    className="flex-1 btn-press"
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
