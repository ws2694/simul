'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSession } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

type ProcessingStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

interface Session {
  id: number;
  title: string;
  processing_status: string;
  summary?: string;
  duration_seconds?: number;
  open_questions?: string[];
  technologies_mentioned?: string[];
}

interface UseSessionProcessingResult {
  status: ProcessingStatus;
  session: Session | null;
  isProcessing: boolean;
  startTracking: (sessionId: number) => void;
  reset: () => void;
}

export function useSessionProcessing(): UseSessionProcessingResult {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();

  const startTracking = useCallback((id: number) => {
    setSessionId(id);
    setStatus('pending');
    setSession(null);
  }, []);

  const reset = useCallback(() => {
    setSessionId(null);
    setStatus('idle');
    setSession(null);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 60; // Stop after 3 minutes (60 * 3s)

    const pollStatus = async (): Promise<boolean> => {
      try {
        const data = await getSession(sessionId);

        if (!isMounted) return true;

        setSession(data);
        setStatus(data.processing_status as ProcessingStatus);

        if (data.processing_status === 'completed') {
          toast({
            title: "Session Processed!",
            description: "AI has extracted decisions from your recording.",
          });
          return true;
        }

        if (data.processing_status === 'failed') {
          toast({
            title: "Processing Failed",
            description: "There was an error processing your session. Please try again.",
            variant: "destructive",
          });
          return true;
        }

        pollCount++;
        if (pollCount >= maxPolls) {
          toast({
            title: "Processing Timeout",
            description: "Processing is taking longer than expected. Check back later.",
            variant: "destructive",
          });
          return true;
        }

        return false;
      } catch (error) {
        console.error('Error polling session status:', error);
        return false; // Continue polling on error
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval
    const interval = setInterval(async () => {
      const done = await pollStatus();
      if (done) {
        clearInterval(interval);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, toast]);

  return {
    status,
    session,
    isProcessing: status === 'pending' || status === 'processing',
    startTracking,
    reset,
  };
}
