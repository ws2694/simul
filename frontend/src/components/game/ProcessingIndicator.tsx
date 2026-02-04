'use client';

import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

type ProcessingStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

interface ProcessingIndicatorProps {
  status: ProcessingStatus;
  sessionTitle?: string;
  onDismiss?: () => void;
}

export default function ProcessingIndicator({
  status,
  sessionTitle,
  onDismiss,
}: ProcessingIndicatorProps) {
  if (status === 'idle') return null;

  const statusConfig = {
    pending: {
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-900',
      subtext: 'text-amber-700',
      title: 'Queued for Processing',
      description: 'Your session will be processed shortly...',
    },
    processing: {
      icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      subtext: 'text-blue-700',
      title: 'Processing Session',
      description: 'AI is extracting decisions from your recording...',
    },
    completed: {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-900',
      subtext: 'text-green-700',
      title: 'Processing Complete!',
      description: 'Decisions have been extracted successfully.',
    },
    failed: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-900',
      subtext: 'text-red-700',
      title: 'Processing Failed',
      description: 'There was an error processing your session.',
    },
  };

  const config = statusConfig[status];
  if (!config) return null;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        flex items-start gap-3 p-4 rounded-xl border shadow-lg
        ${config.bg}
        animate-in slide-in-from-top-2 fade-in duration-300
        max-w-sm
      `}
    >
      <div className="shrink-0 mt-0.5">
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${config.text}`}>
          {config.title}
        </p>
        <p className={`text-xs mt-0.5 ${config.subtext}`}>
          {sessionTitle || config.description}
        </p>
        {status === 'processing' && (
          <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
          </div>
        )}
      </div>
      {(status === 'completed' || status === 'failed') && onDismiss && (
        <button
          onClick={onDismiss}
          className={`shrink-0 text-xs ${config.subtext} hover:underline`}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
