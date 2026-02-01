'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bot } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { AppShell } from '@/components/layout';
import { MeetingRoom } from '@/components/meetings';
import { Button } from '@/components/ui/button';
import { fadeInVariants } from '@/lib/animations';

function MeetingPageContent() {
  const router = useRouter();
  const params = useParams();
  const meetingId = Number(params?.id || 0);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  if (!token) return null;

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Bot Meeting</h1>
            <p className="text-sm text-muted-foreground">
              Watch bots discuss and reach consensus
            </p>
          </div>
        </div>
      </div>

      {/* Meeting Room */}
      <MeetingRoom meetingId={meetingId} />
    </motion.div>
  );
}

export default function MeetingPage() {
  return (
    <AppShell>
      <MeetingPageContent />
    </AppShell>
  );
}
