'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

type ScanResultHandler = (result: {
  ok: boolean;
  result?: unknown;
  followUp?: unknown;
  error?: unknown;
  status?: number;
}) => void;

export function useScanWorker() {
  const [ready, setReady] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const handlersRef = useRef<Map<string, ScanResultHandler>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setReady(false);
      return;
    }

    let cancelled = false;

    navigator.serviceWorker
      .register('/scan-worker.js', { scope: '/' })
      .then((reg) => {
        if (cancelled) return;
        registrationRef.current = reg;
        const setReadyIfActive = () => {
          if (reg.active && !cancelled) setReady(true);
        };
        if (reg.active) {
          setReadyIfActive();
        } else {
          reg.installing?.addEventListener('statechange', setReadyIfActive);
          reg.waiting?.addEventListener('statechange', setReadyIfActive);
        }
      })
      .catch(() => setReady(false));

    const onMessage = (e: MessageEvent) => {
      const { type, id, ok, result, followUp, error, status } = e.data || {};
      if (type !== 'SCAN_RESULT') return;
      const handler = handlersRef.current.get(id);
      if (handler) {
        handlersRef.current.delete(id);
        handler({ ok, result, followUp, error, status });
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }, []);

  const runScan = useCallback(
    (payload: Record<string, unknown>, onResult: ScanResultHandler): boolean => {
      if (!registrationRef.current?.active) return false;
      const id = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      handlersRef.current.set(id, onResult);
      registrationRef.current.active.postMessage({ type: 'SCAN', id, payload });
      return true;
    },
    []
  );

  return { ready, runScan, requestNotificationPermission };
}
