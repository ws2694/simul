'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { MeetingRoom } from '@/components/meetings';

export default function MeetingPage() {
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

  // Full-screen game-like layout - MeetingRoom handles its own header/layout
  return <MeetingRoom meetingId={meetingId} />;
}
