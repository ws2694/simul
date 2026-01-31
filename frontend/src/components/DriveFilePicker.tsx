'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Loader2,
  Upload,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { listGoogleDriveFiles, importGoogleDoc } from '@/lib/api';
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
import { fadeInVariants, staggerContainerVariants, staggerItemVariants } from '@/lib/animations';

interface DriveFilePickerProps {
  onSessionCreated?: (session: any) => void;
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  owners: string[];
}

export function DriveFilePicker({ onSessionCreated }: DriveFilePickerProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState('design');
  const [gitBranch, setGitBranch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (query?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listGoogleDriveFiles(query || undefined);
      setFiles(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load Drive files');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleSearch = useCallback(() => {
    loadFiles(searchQuery || undefined);
  }, [loadFiles, searchQuery]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleSelect = useCallback((file: DriveFile) => {
    setSelectedFile(file);
    setTitle(file.name);
    setError(null);
  }, []);

  const handleImport = async () => {
    if (!selectedFile || !title.trim()) return;

    setIsImporting(true);
    setError(null);
    try {
      const session = await importGoogleDoc(
        selectedFile.id,
        title,
        sessionType,
        gitBranch || undefined
      );
      toast({
        title: 'Document imported',
        description: 'AI is extracting decisions from your Google Doc...',
      });
      onSessionCreated?.(session);
      setSelectedFile(null);
      setTitle('');
      setGitBranch('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import document');
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search Google Docs..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleSearch} disabled={isLoading}>
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => loadFiles()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-error-50 text-error-700 text-sm"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          No Google Docs found.{' '}
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); loadFiles(); }}
              className="text-primary underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
          className="space-y-1 max-h-64 overflow-y-auto rounded-lg border"
        >
          {files.map((file, i) => (
            <motion.button
              key={file.id}
              variants={staggerItemVariants}
              custom={i}
              onClick={() => handleSelect(file)}
              className={cn(
                'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                selectedFile?.id === file.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-muted/50'
              )}
            >
              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(file.modifiedTime)}
                  {file.owners?.length > 0 && ` \u00b7 ${file.owners[0]}`}
                </p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Import Form (shown when file selected) */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-2 border-t"
          >
            <div className="space-y-2">
              <Label htmlFor="gdoc-title">Session Title *</Label>
              <Input
                id="gdoc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Architecture Design Doc"
                disabled={isImporting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gdoc-type">Session Type</Label>
              <Select
                value={sessionType}
                onValueChange={setSessionType}
                disabled={isImporting}
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
              <Label htmlFor="gdoc-branch">Git Branch (optional)</Label>
              <Input
                id="gdoc-branch"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                placeholder="e.g., feature/design-doc"
                disabled={isImporting}
              />
            </div>

            <Button
              onClick={handleImport}
              disabled={isImporting || !title.trim()}
              className="w-full btn-press"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import & Analyze
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
