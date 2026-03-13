'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';

interface ProCheckoutButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export function ProCheckoutButton({ children, className = '', variant = 'primary' }: ProCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start checkout');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError('No checkout URL received');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const baseClass = 'btn-primary inline-flex items-center justify-center gap-2 rounded-[12px] px-8 py-3.5 text-base font-bold transition-opacity disabled:opacity-50';
  const primaryClass = 'bg-[#4F46E5] text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)]';
  const secondaryClass = 'border-2 border-[#4F46E5] text-[#4F46E5] hover:bg-[#4F46E5]/10';

  return (
    <Show
      when="signed-in"
      fallback={
        <Link
          href="/sign-up?goPro=1"
          className={`${baseClass} ${variant === 'primary' ? primaryClass : secondaryClass} ${className}`}
        >
          {children}
        </Link>
      }
    >
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={`${baseClass} ${variant === 'primary' ? primaryClass : secondaryClass} ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting...
          </>
        ) : (
          children
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </Show>
  );
}
