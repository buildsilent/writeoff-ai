'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { getCachedScans, setCachedScans } from '@/lib/scans-cache';

export const SCAN_COMPLETE_EVENT = 'taxsnapper:scan-complete';
export const SCANS_REFRESH_CHANNEL = 'taxsnapper-scans-refresh';

export function useScansRealtime() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const [scans, setScans] = useState<unknown[]>(() => getCachedScans(userId) ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  const refetch = useCallback(async () => {
    if (!userId) {
      setScans([]);
      setLoading(false);
      setError(true);
      return;
    }
    const url = typeof window !== 'undefined' ? `${window.location.origin}/api/scans` : '/api/scans';
    if (typeof window !== 'undefined') {
      console.log('[useScansRealtime] fetching', url, 'credentials: include');
    }
    try {
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      const raw = await res.text();
      if (typeof window !== 'undefined') {
        console.log('[useScansRealtime] response status', res.status, 'body length', raw.length, 'preview', raw.slice(0, 200));
      }
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error('[useScansRealtime] invalid JSON', raw.slice(0, 100));
        setScans([]);
        setError(true);
        setLoading(false);
        return;
      }
      if (res.status === 401) {
        setScans([]);
        setError(true);
        setLoading(false);
        return;
      }
      const arr = Array.isArray(data) ? data : [];
      if (typeof window !== 'undefined') {
        console.log('[useScansRealtime] parsed', arr.length, 'scans', Array.isArray(data) ? 'ok' : 'NOT ARRAY:', typeof data, data && typeof data === 'object' && 'error' in data ? (data as { error?: string }).error : '');
      }
      setScans(arr);
      if (userId) setCachedScans(userId, arr);
      setError(false);
    } catch (err) {
      if (typeof window !== 'undefined') console.error('[useScansRealtime] fetch error', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) return;
    let mounted = true;
    const cached = userId ? getCachedScans(userId) : null;
    if (cached && cached.length >= 0) {
      setScans(cached);
      setLoading(false);
    }
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
