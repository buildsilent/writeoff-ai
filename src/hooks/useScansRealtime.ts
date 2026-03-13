'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';

export const SCAN_COMPLETE_EVENT = 'taxsnapper:scan-complete';
export const SCANS_REFRESH_CHANNEL = 'taxsnapper-scans-refresh';

export function useScansRealtime() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const [scans, setScans] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/scans', { credentials: 'include' });
      if (res.status === 401) {
        setScans([]);
        setError(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setScans(arr);
      setError(false);
      if (typeof window !== 'undefined') {
        console.log('[useScansRealtime] fetched', arr.length, 'scans', arr.slice(0, 2));
      }
    } catch (err) {
      if (typeof window !== 'undefined') console.error('[useScansRealtime] fetch error', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    let mounted = true;
    refetch();

    const onScanComplete = () => {
      if (mounted) refetch();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) refetch();
    };

    window.addEventListener(SCAN_COMPLETE_EVENT, onScanComplete);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && mounted) refetch();
    }, 15000);

    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SCANS_REFRESH_CHANNEL) : null;
    if (bc) {
      bc.onmessage = () => {
        if (mounted) refetch();
      };
    }

    return () => {
      mounted = false;
      window.removeEventListener(SCAN_COMPLETE_EVENT, onScanComplete);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(pollInterval);
      bc?.close();
    };
  }, [isLoaded, refetch]);

  useEffect(() => {
    if (!supabase || !userId) return;
    const channel = supabase
      .channel('scans-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scans',
          filter: `user_id=eq.${userId}`,
        },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  return { scans, loading, error, refetch };
}

export function notifyScanComplete() {
  window.dispatchEvent(new Event(SCAN_COMPLETE_EVENT));
  if (typeof BroadcastChannel !== 'undefined') {
    new BroadcastChannel(SCANS_REFRESH_CHANNEL).postMessage('refresh');
  }
}
