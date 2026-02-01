'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

type CallbackStatus = 'loading' | 'success' | 'error';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const code = searchParams?.get('code');
    const state = searchParams?.get('state');

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code received from Google.');
      return;
    }

    const exchangeCode = async () => {
      try {
        await api.get('/google/callback', { params: { code, state } });
        setStatus('success');
        setTimeout(() => {
          router.push('/?tab=document');
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.detail || 'Failed to connect Google account.'
        );
      }
    };

    exchangeCode();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-sm mx-auto p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connecting Google Account</h2>
            <p className="text-muted-foreground text-sm">
              Please wait while we complete the connection...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connected!</h2>
            <p className="text-muted-foreground text-sm">
              Your Google account has been connected. Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
            <p className="text-muted-foreground text-sm mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push('/')}
              className="text-primary underline text-sm"
            >
              Return to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
