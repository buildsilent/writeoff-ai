'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Loader2 } from 'lucide-react';

export default function GoProPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    setRedirecting(true);
    fetch('/api/stripe/checkout', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error || 'Failed to start checkout');
          setRedirecting(false);
        }
      })
      .catch(() => {
        setError('Network error');
        setRedirecting(false);
      });
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <main className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold text-white">Sign in to go Pro</h1>
          <p className="mt-4 text-zinc-500">Create an account or sign in to upgrade to TaxSnapper Pro.</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up?goPro=1"
              className="rounded-xl bg-[#FF6B00] px-8 py-3.5 font-bold text-black"
            >
              Sign up
            </Link>
            <Link
              href="/sign-in?redirect_url=/go-pro"
              className="rounded-xl border border-white/[0.2] px-8 py-3.5 font-medium text-white"
            >
              Sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
      <Header />
      <main className="text-center px-6">
        {redirecting ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[#FF6B00] mx-auto" />
            <p className="mt-4 text-white">Redirecting to checkout...</p>
          </>
        ) : error ? (
          <>
            <p className="text-red-400">{error}</p>
            <Link href="/" className="mt-4 inline-block text-[#FF6B00]">Back to home</Link>
          </>
        ) : null}
      </main>
    </div>
  );
}
