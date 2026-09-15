'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProspectPoller({ status }: { status?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== 'running') return;

    // Direct interval: Every 3 seconds refresh server state
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [status, router]);

  return null; // Interface par dikhayega kuch nahi, bas background polling karega
}