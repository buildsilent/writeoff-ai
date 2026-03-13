'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { AppFooter } from '@/components/AppFooter';
import { Check, Loader2 } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams?.get?.('session_id');
  const [status, setStatus] = useState<'syncing' | 'polling' | 'ready' | 'error'>('syncing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const pollUntilPro = async () => {
      for (let i = 0; i < 10 && mounted; i++) {
        try {
          const res = await fetch('/api/usage');
          if (res.ok) {
            const data = await res.json();
            if (data?.hasSubscription) {
              if (mounted) setStatus('ready');
              return;
            }
          }
        } catch {
          // ignore
        }
        if (mounted && i < 9) {
          setStatus('polling');
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (mounted) setStatus('ready');
    };

    const run = async () => {
      if (sessionId) {
        try {
          const res = await fetch('/api/stripe/sync-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (mounted) {
              setErrorMessage(data?.error || 'Could not verify payment');
              setStatus('error');
            }
            return;
          }
        } catch (err) {
          if (mounted) {
            setErrorMessage('Could not verify payment');
            setStatus('error');
          }
          return;
        }
      }

      if (mounted) await pollUntilPro();
    };

    run();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (status !== 'ready') return;
    const t = setTimeout(() => {
      router.replace('/dashboard?upgraded=1');
    }, 800);
    return () => clearTimeout(t);
  }, [status, router]);

  return (
    <div className="flex min-h-screen flex-col bg-[#080B14]">
      <Header />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4F46E5]/20">
            <Check className="h-8 w-8 text-[#4F46E5]" />
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-white">
          Welcome to Pro!
        </h1>
        <p className="mt-2 text-zinc-500">
          Enjoy unlimited receipt scans and all Pro features.
        </p>

        {(status === 'syncing' || status === 'polling') && (
          <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === 'syncing' ? 'Verifying your subscription...' : 'Setting up your account...'}
          </div>
        )}

        {status === 'ready' && (
          <p className="mt-6 text-sm text-[#4F46E5]">Redirecting to dashboard...</p>
        )}

        {status === 'error' && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-amber-400">{errorMessage}</p>
            <a
              href="/dashboard"
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-[12px] bg-[#4F46E5] px-8 py-3.5 font-bold text-white"
            >
              Go to dashboard
            </a>
          </div>
        )}

        {!status || status === 'syncing' || status === 'polling' ? null : status === 'ready' ? (
          <p className="mt-4 text-xs text-zinc-500">Taking you there...</p>
        ) : null}
      </main>
      <AppFooter />
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-[#080B14]">
          <Header />
          <main className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
          </main>
          <AppFooter />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
