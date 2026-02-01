'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Loader2, AlertCircle } from 'lucide-react';
import { getGoogleAuthUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { fadeInVariants } from '@/lib/animations';

export function GoogleConnectPrompt() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getGoogleAuthUrl();
      window.location.href = data.authorization_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start Google connection');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      className="py-12 flex flex-col items-center justify-center text-center"
    >
      <div className="p-4 rounded-full bg-blue-100 mb-4">
        <Link2 className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Connect Google Account</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Connect your Google account to import documents directly from Google Drive.
        We only request read-only access to your files.
      </p>
      {error && (
        <div className="flex items-center gap-2 text-sm text-error-700 bg-error-50 rounded-lg px-4 py-2 mb-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <Button onClick={handleConnect} disabled={isLoading} size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Link2 className="mr-2 h-4 w-4" />
            Connect Google Account
          </>
        )}
      </Button>
    </motion.div>
  );
}
